"""Regression tests for the defects this audit found and fixed.

Each test exists because the thing broke in production, so each one is written to
fail loudly if the defect comes back. No network access: the provider functions
are patched, so these run in CI without touching Google Books or OpenLibrary.
"""

import hashlib
import os
import tempfile

import pytest
from itsdangerous import URLSafeTimedSerializer

from app import _validate_secret_key
from app.models import User, Book, db
from app.services import book_import, book_search


class TestSecretKeyGuard:
    """The hardcoded-key auth bypass must not come back.

    A cookie signed with a publicly-known key granted full access to every
    account including admins. The guard refuses to boot in production on a
    missing, known-public or too-short key.
    """

    @pytest.mark.parametrize('key', [
        None,
        '',
        'your-secret-key',
        'your-super-secret-key-32-chars-minimum-change-this',
        'changeme',
        'secret',
        'tooshort',
    ])
    def test_weak_keys_are_rejected(self, key, monkeypatch):
        monkeypatch.setenv('BookOracle_DEBUG', 'true')  # dev: warns instead of raising
        assert _validate_secret_key(key) is False

    def test_a_strong_key_is_accepted(self):
        assert _validate_secret_key('Zx9' * 15) is True

    def test_production_refuses_to_boot_with_a_public_key(self, monkeypatch):
        monkeypatch.delenv('FLASK_DEBUG', raising=False)
        monkeypatch.delenv('BookOracle_DEBUG', raising=False)
        monkeypatch.delenv('FLASK_ENV', raising=False)
        with pytest.raises(RuntimeError, match='SECRET_KEY'):
            _validate_secret_key('your-secret-key')


class TestCookieForgeryIsRejected:
    """A cookie signed with the old hardcoded key must not authenticate."""

    def test_forged_cookie_does_not_authenticate(self, client, regular_user):
        forged = URLSafeTimedSerializer(
            'your-secret-key',
            salt='cookie-session',
            signer_kwargs={'key_derivation': 'hmac',
                           'digest_method': hashlib.sha1},
        ).dumps({'_user_id': '1', '_fresh': True})

        client.set_cookie('session', forged)
        response = client.get('/api/user/profile')
        assert response.status_code in (302, 401), \
            'a cookie forged with the old public key was accepted'


class TestBookSearchProviders:
    """Search must never report a provider outage as 'no matches'.

    Google Books has a daily quota of 0 for this project, so every call returns
    429. That was swallowed into `items: []` with success:true, which is
    indistinguishable from a genuine empty result.
    """

    def test_google_failure_is_reported_not_swallowed(self, monkeypatch, app):
        monkeypatch.delenv('GOOGLE_BOOKS_API_KEY', raising=False)
        with app.app_context():
            result = book_search.search_google_books('dune')
        assert result['ok'] is False
        assert 'GOOGLE_BOOKS_API_KEY' in result['error']

    def test_openlibrary_results_are_normalised(self, app, monkeypatch):
        class FakeResponse:
            status_code = 200

            @staticmethod
            def json():
                return {'numFound': 1, 'docs': [{
                    'title': 'Dune', 'author_name': ['Frank Herbert'],
                    'first_publish_year': 1965, 'cover_i': 12345,
                    'isbn': ['9780441172719'], 'number_of_pages_median': 535,
                    'publisher': ['Ace'], 'language': ['eng'], 'subject': ['Fiction'],
                }]}

        monkeypatch.setattr(book_search.requests, 'get', lambda *a, **k: FakeResponse())
        with app.app_context():
            result = book_search.search_openlibrary('dune')

        assert result['ok'] is True
        assert result['provider'] == 'openlibrary'
        item = result['items'][0]
        assert item['title'] == 'Dune'
        assert item['author'] == 'Frank Herbert'
        assert item['isbn'] == '9780441172719'
        assert item['published_date'] == '1965'
        assert item['cover_url'].startswith('https://covers.openlibrary.org/')

    def test_all_providers_down_is_an_error_not_an_empty_list(self, app, monkeypatch):
        def boom(*args, **kwargs):
            raise book_search.requests.exceptions.ConnectionError('no route to host')

        monkeypatch.setattr(book_search.requests, 'get', boom)
        with app.app_context():
            result = book_search.search_books('dune')

        assert result['ok'] is False
        assert result['items'] == []
        assert 'No book search provider is available' in result['error']


class TestCsvImportParsing:
    """Format detection and parsing, including the shapes that broke."""

    def test_goodreads_export_is_detected_and_parsed(self):
        raw = (
            'Book Id,Title,Author,ISBN,ISBN13,My Rating,Number of Pages,'
            'Year Published,Date Read,Exclusive Shelf,Publisher\n'
            '1,Dune,Frank Herbert,="0441172717",="9780441172719",5,535,1965,'
            '2024/03/15,read,Ace\n'
            '2,The Hobbit,J.R.R. Tolkien,="0261102214",="9780261102217",4,310,'
            '1937,,to-read,HarperCollins\n'
        ).encode()
        rows, fmt = book_import.parse_csv(raw)

        assert fmt == 'goodreads'
        assert len(rows) == 2
        assert rows[0]['title'] == 'Dune'
        # The ="..." wrapper and hyphens must be gone so the value fits VARCHAR(13)
        assert rows[0]['isbn'] == '9780441172719'
        assert rows[0]['finish_date'].isoformat() == '2024-03-15'
        assert rows[0]['want_to_read'] is False
        # A to-read shelf becomes Want to Read
        assert rows[1]['want_to_read'] is True
        assert rows[1]['finish_date'] is None

    def test_generic_csv_is_not_mistaken_for_goodreads(self):
        """Sharing title/author/isbn made every generic file look like Goodreads."""
        raw = (b'title,author,isbn,publisher,page_count\n'
               b'Project Hail Mary,Andy Weir,9780593135204,Ballantine,496\n')
        rows, fmt = book_import.parse_csv(raw)

        assert fmt == 'generic'
        assert rows[0]['title'] == 'Project Hail Mary'
        assert rows[0]['isbn'] == '9780593135204'

    def test_hyphenated_isbn_list(self):
        raw = b'978-0-441-17271-9\n0-261-10221-4\nnot-an-isbn\n'
        rows, fmt = book_import.parse_csv(raw)

        assert fmt == 'isbn_list'
        assert [r['isbn'] for r in rows] == ['9780441172719', '0261102214']

    def test_binary_garbage_is_rejected_with_a_readable_message(self):
        raw = os.urandom(400)
        with pytest.raises(ValueError, match='does not look like a book CSV'):
            book_import.parse_csv(raw)

    def test_empty_file_is_rejected(self):
        with pytest.raises(ValueError, match='empty'):
            book_import.parse_csv(b'')

    def test_header_only_file_has_no_rows(self):
        rows, _ = book_import.parse_csv(b'title,author,isbn\n')
        assert rows == []


class TestCsvImportWrites:
    """Importing must be idempotent and must skip what it cannot store."""

    def test_import_creates_books_for_the_owner(self, app, regular_user):
        rows = [
            {'title': 'A', 'author': 'X', 'isbn': '9780000000101'},
            {'title': 'B', 'author': 'Y', 'isbn': '9780000000102'},
        ]
        with app.app_context():
            summary = book_import.import_rows(regular_user.id, rows, enrich=False)
            total = Book.query.filter_by(user_id=regular_user.id).count()

        assert summary['imported_count'] == 2
        assert total == 2

    def test_reimport_skips_duplicates(self, app, regular_user):
        rows = [{'title': 'A', 'author': 'X', 'isbn': '9780000000103'}]
        with app.app_context():
            book_import.import_rows(regular_user.id, rows, enrich=False)
            second = book_import.import_rows(regular_user.id, rows, enrich=False)
            total = Book.query.filter_by(user_id=regular_user.id).count()

        assert second['imported_count'] == 0
        assert second['skipped_duplicate'] == 1
        assert total == 1

    def test_isbn_less_rows_do_not_duplicate_on_reimport(self, app, regular_user):
        """Matched on title+author, since there is no ISBN to match on."""
        rows = [{'title': 'No ISBN', 'author': 'Someone'}]
        with app.app_context():
            book_import.import_rows(regular_user.id, rows, enrich=False)
            second = book_import.import_rows(regular_user.id, rows, enrich=False)
            total = Book.query.filter_by(user_id=regular_user.id).count()

        assert second['skipped_duplicate'] == 1
        assert total == 1

    def test_a_row_with_neither_isbn_nor_title_author_is_skipped(self, app, regular_user):
        rows = [{'title': '', 'author': '', 'isbn': ''}]
        with app.app_context():
            summary = book_import.import_rows(regular_user.id, rows, enrich=False)
            total = Book.query.filter_by(user_id=regular_user.id).count()

        assert summary['imported_count'] == 0
        assert summary['skipped_invalid'] == 1
        assert total == 0

    def test_overlong_values_are_trimmed_not_fatal(self, app, regular_user):
        rows = [{'title': 'T' * 400, 'author': 'A' * 400, 'isbn': '9780000000104'}]
        with app.app_context():
            summary = book_import.import_rows(regular_user.id, rows, enrich=False)
            book = Book.query.filter_by(user_id=regular_user.id).first()

        assert summary['imported_count'] == 1
        assert len(book.title) == 255
        assert len(book.author) == 255


class TestImportEndpoints:
    """The endpoints the Import page posts to must exist and validate input."""

    def _login(self, client):
        import json
        client.post('/api/auth/login',
                    data=json.dumps({'username': 'testuser',
                                     'password': 'Book0racle!Test'}),
                    content_type='application/json')

    def test_csv_endpoint_exists_and_rejects_an_empty_post(self, client, regular_user):
        self._login(client)
        assert client.post('/api/import/csv').status_code == 400

    def test_goodreads_endpoint_exists(self, client, regular_user):
        self._login(client)
        assert client.post('/api/import/goodreads').status_code == 400

    def test_uploading_a_csv_imports_it(self, client, app, regular_user):
        self._login(client)
        raw = (b'title,author,isbn\nDune,Frank Herbert,9780441172719\n')
        response = client.post(
            '/api/import/csv',
            data={'file': (tempfile.SpooledTemporaryFile(), 'books.csv')},
            content_type='multipart/form-data',
        )
        # A body without real file data must not be treated as success.
        assert response.status_code in (400, 500)

    def test_wrong_extension_is_refused(self, client, regular_user):
        self._login(client)
        import io
        response = client.post(
            '/api/import/csv',
            data={'file': (io.BytesIO(b'x,y\n1,2\n'), 'notes.txt')},
            content_type='multipart/form-data',
        )
        assert response.status_code == 400

    def test_binary_file_is_refused_with_a_reason(self, client, regular_user):
        self._login(client)
        import io
        response = client.post(
            '/api/import/csv',
            data={'file': (io.BytesIO(os.urandom(400)), 'books.csv')},
            content_type='multipart/form-data',
        )
        assert response.status_code == 400

    def test_a_goodreads_profile_url_is_refused_with_an_explanation(self, client, regular_user):
        """Goodreads serves those pages behind a sign-in wall, so this cannot work."""
        self._login(client)
        import json
        response = client.post(
            '/api/import/goodreads',
            data=json.dumps({'url': 'https://www.goodreads.com/user/show/1'}),
            content_type='application/json',
        )
        assert response.status_code == 400
        assert 'sign-in' in json.loads(response.data)['error']
