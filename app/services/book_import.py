"""CSV book import.

Context
-------
The React frontend has always posted to `/api/import/csv` and
`/api/import/goodreads`, but neither endpoint existed, so both Import buttons
404'd. The Flask side had two template-era routes (`/import_goodreads` taking a
Goodreads CSV upload, and `/bulk_import` taking one-ISBN-per-line) that the SPA
never called.

The Goodreads half of the UI asked for a *profile URL*. That cannot work:
Goodreads redirects `/review/list/<id>` to its sign-in page regardless of
whether the profile is public, so importing from a URL would require the user's
Goodreads credentials, which this app must never handle. Goodreads' supported
path is its own CSV export (My Books -> Import/Export -> Export Library).

So the URL flow is replaced by an upload of that export, and the parser
auto-detects which CSV dialect it was given.
"""

import csv
import io

# Goodreads' "Export Library" column names that a generic CSV will NOT have.
# Deliberately excludes title/author/isbn/isbn13: generic CSVs use those too, and
# including them misclassified every generic file as a Goodreads export.
GOODREADS_ONLY_COLUMNS = {
    'book id', 'author l-f', 'additional authors', 'my rating',
    'average rating', 'binding', 'date read', 'date added', 'bookshelves',
    'bookshelves with positions', 'exclusive shelf', 'my review', 'read count',
    'owned copies',
}

# The columns the generic BookOracle importer looks for.
GENERIC_COLUMNS = {'title', 'author', 'isbn', 'isbn13', 'cover_url', 'description',
                   'published_date', 'page_count', 'publisher', 'language', 'categories'}

MAX_ROWS = 5000


def _clean_isbn(value):
    """Unwrap the =\"9780000000000\" form Goodreads exports into."""
    if not value:
        return ''
    value = str(value).strip()
    if value.startswith('="') and value.endswith('"'):
        value = value[2:-1]
    return value.strip().strip('"')


def _first(row, *names):
    """First non-empty value among the given column names (case-insensitive)."""
    lowered = {str(k).strip().lower(): v for k, v in row.items() if k is not None}
    for name in names:
        value = lowered.get(str(name).strip().lower())
        if value not in (None, ''):
            return str(value).strip()
    return ''


def detect_format(fieldnames):
    """Return 'goodreads', 'generic' or 'isbn_list' for the given CSV header.

    Goodreads is detected only on columns unique to its export. Using shared
    columns like `title`/`author`/`isbn` made every generic CSV look like a
    Goodreads file, which then imported nothing because the Goodreads branch
    looks for its own capitalised headers.
    """
    names = {str(f).strip().lower() for f in (fieldnames or []) if f is not None}
    if not names:
        return 'isbn_list'
    if names & GOODREADS_ONLY_COLUMNS:
        return 'goodreads'
    if names & GENERIC_COLUMNS:
        return 'generic'
    if len(names) == 1:
        return 'isbn_list'
    return 'generic'


# Column widths from app/models.py. Overflowing them raises at INSERT time with a
# database-level error, so values are trimmed here where it can be reported nicely.
_MAX_LENGTHS = {
    'title': 255, 'author': 255, 'isbn': 13, 'cover_url': 512, 'published_date': 50,
    'publisher': 255, 'language': 10, 'categories': 500,
}


def _normalize_isbn(value):
    """Strip separators so a stored ISBN fits the 13-char column.

    '978-0-441-17271-9' is 17 characters; stored raw it would be truncated to
    '978-0-441-172'. Unwrapping Goodreads' ="..." form and removing hyphens/spaces
    yields the canonical 13 digits.
    """
    value = _clean_isbn(value)
    if not value:
        return ''
    return value.replace('-', '').replace(' ', '')


def _looks_like_isbn(value):
    """True for a plausible ISBN-10/13, ignoring hyphens and spaces."""
    if not value:
        return False
    cleaned = str(value).replace('-', '').replace(' ', '').strip()
    if len(cleaned) not in (10, 13):
        return False
    body = cleaned[:-1]
    check = cleaned[-1].upper()
    return body.isdigit() and (check.isdigit() or check == 'X')


def _fit(value, field):
    """Trim a value to its column width, or return None when empty."""
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    limit = _MAX_LENGTHS.get(field)
    if limit and len(value) > limit:
        return value[:limit]
    return value


def parse_csv(raw_bytes):
    """Parse an uploaded CSV into a list of normalised row dicts.

    Returns (rows, detected_format). Raises ValueError with a readable message
    when the file cannot be read at all.
    """
    if not raw_bytes:
        raise ValueError('The uploaded file is empty.')

    for encoding in ('utf-8-sig', 'utf-8', 'latin-1'):
        try:
            text = raw_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError('The file is not readable as text. Upload a CSV, not a spreadsheet binary.')

    lines = text.splitlines()
    if not lines:
        raise ValueError('The uploaded file has no lines.')

    # A single-column file of bare ISBNs (the old /bulk_import behaviour).
    sniff = lines[0]
    if '\t' not in sniff and ',' not in sniff and ';' not in sniff:
        # A single-column file. Only accept entries that actually look like ISBNs;
        # otherwise random bytes (a binary uploaded with a .csv name) fall through
        # into this branch and reach the database as junk.
        candidates = [_normalize_isbn(line) for line in lines if line.strip()]
        isbns = [c for c in candidates if _looks_like_isbn(c)]
        if not isbns:
            raise ValueError(
                'This file does not look like a book CSV. Expected a header row with columns '
                'such as title, author and isbn, a Goodreads "Export Library" file, or one '
                'ISBN per line.'
            )
        return [{'isbn': _fit(i, 'isbn'), 'title': '', 'author': ''} for i in isbns], 'isbn_list'

    try:
        dialect = csv.Sniffer().sniff('\n'.join(lines[:20]), delimiters=',;\t')
    except csv.Error:
        dialect = csv.excel

    reader = csv.DictReader(lines, dialect=dialect)
    fmt = detect_format(reader.fieldnames)

    # Reject anything that is not recognisably a book CSV. Without this, a binary
    # file (or any random bytes) decoded as latin-1 and produced rows of noise,
    # which then failed deep inside the ORM with an unreadable autoflush error.
    header = {str(f).strip().lower() for f in (reader.fieldnames or []) if f is not None}
    if fmt != 'isbn_list' and not (header & (GENERIC_COLUMNS | GOODREADS_ONLY_COLUMNS)):
        raise ValueError(
            'This file does not look like a book CSV. Expected a header row with columns '
            'such as title, author and isbn, or a Goodreads "Export Library" file.'
        )

    rows = []
    for row in reader:
        if len(rows) >= MAX_ROWS:
            break

        if fmt == 'goodreads':
            isbn = _normalize_isbn(_first(row, 'ISBN13')) or _normalize_isbn(_first(row, 'ISBN'))
            title = _first(row, 'Title')
            author = _first(row, 'Author')
            shelves = _first(row, 'Bookshelves', 'Exclusive Shelf').lower()
            date_read = _first(row, 'Date Read')
            want_to_read = 'to-read' in shelves
            page_count = _first(row, 'Number of Pages')
            published = _first(row, 'Year Published', 'Original Publication Year')
            rows.append({
                'title': _fit(title, 'title'),
                'author': _fit(author, 'author'),
                'isbn': _fit(isbn, 'isbn'),
                'description': '',
                'cover_url': '',
                'published_date': _fit(published, 'published_date'),
                'page_count': page_count,
                'publisher': _fit(_first(row, 'Publisher'), 'publisher'),
                'language': '',
                'categories': '',
                'finish_date': _parse_date(date_read),
                'want_to_read': want_to_read,
                'library_only': False,
            })
        else:
            isbn = _normalize_isbn(_first(row, 'isbn13')) or _normalize_isbn(_first(row, 'isbn'))
            rows.append({
                'title': _fit(_first(row, 'title'), 'title'),
                'author': _fit(_first(row, 'author'), 'author'),
                'isbn': _fit(isbn, 'isbn'),
                'description': _first(row, 'description'),
                'cover_url': _fit(_first(row, 'cover_url'), 'cover_url'),
                'published_date': _fit(_first(row, 'published_date'), 'published_date'),
                'page_count': _first(row, 'page_count'),
                'publisher': _fit(_first(row, 'publisher'), 'publisher'),
                'language': _fit(_first(row, 'language'), 'language'),
                'categories': _fit(_first(row, 'categories'), 'categories'),
                'finish_date': None,
                'want_to_read': False,
                'library_only': False,
            })

    return rows, fmt


def _parse_date(value):
    """Parse a Goodreads date string, tolerating slashes, dashes and ISO."""
    if not value:
        return None
    from datetime import datetime
    value = value.strip()
    for fmt in ('%Y/%m/%d', '%Y-%m-%d', '%m/%d/%Y', '%Y/%m', '%Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _lookup_metadata(isbn, max_lookups, lookups):
    """Best-effort metadata lookup for one ISBN, or None.

    Bounded by max_lookups because the request runs under gunicorn's timeout and
    a large ISBN list would otherwise do thousands of sequential HTTP calls.
    """
    if lookups[0] >= max_lookups:
        return None
    from ..utils import fetch_book_data, get_google_books_cover
    try:
        data = fetch_book_data(isbn)
        if not data or not data.get('title'):
            data = get_google_books_cover(isbn, fetch_title_author=True) or data
        return data
    except Exception:
        return None


def _enrich_one(book, data):
    """Fill only the fields the book is still missing. Returns True if it changed."""
    changed = False
    if not book.cover_url and data.get('cover'):
        book.cover_url = data['cover']
        changed = True
    if not book.title and data.get('title'):
        book.title = data['title']
        changed = True
    if not book.author and data.get('author'):
        book.author = data['author']
        changed = True
    if not book.description and data.get('description'):
        book.description = data['description']
        changed = True
    if not book.page_count and data.get('page_count'):
        book.page_count = data['page_count']
        changed = True
    if not book.publisher and data.get('publisher'):
        book.publisher = data['publisher']
        changed = True
    return changed


def enrich_books(book_ids, max_enrichments=30):
    """Fetch missing covers/metadata for the given books. Safe to call in a thread.

    Bounded because each lookup is a network round trip.
    """
    from ..models import db, Book
    from ..utils import fetch_book_data, get_google_books_cover
    from flask import current_app

    done = 0
    for book_id in book_ids:
        if done >= max_enrichments:
            break
        book = db.session.get(Book, book_id)
        if book is None or not book.isbn:
            continue
        if book.cover_url and book.description:
            continue
        try:
            data = fetch_book_data(book.isbn) or get_google_books_cover(
                book.isbn, fetch_title_author=True
            )
        except Exception as exc:  # never fail an import over metadata
            current_app.logger.warning(f'Enrichment failed for ISBN {book.isbn}: {exc}')
            continue
        if not data:
            continue
        if _enrich_one(book, data):
            done += 1

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        current_app.logger.warning(f'Enrichment commit failed: {exc}')
    return done


def start_enrichment(book_ids, max_enrichments=30):
    """Run enrich_books on a background thread with its own app context.

    Returns True when the thread started. Enrichment is best effort: if the
    process recycles mid-job the books are already imported, just without covers.
    """
    import threading
    from flask import current_app

    try:
        app = current_app._get_current_object()
    except Exception:
        return False

    def worker():
        with app.app_context():
            try:
                enrich_books(book_ids, max_enrichments=max_enrichments)
            except Exception as exc:  # pragma: no cover - defensive
                app.logger.warning(f'Background enrichment failed: {exc}')

    try:
        threading.Thread(target=worker, name='book-enrichment', daemon=True).start()
        return True
    except Exception:
        return False


def import_rows(user_id, rows, enrich=True, max_enrichments=30, max_lookups=30):
    """Create books for `rows`, skipping duplicates.

    Books are saved from the CSV alone (fast, no network). Metadata enrichment
    for the ones still missing a cover is then handed to a background thread.

    It is deliberately NOT done inline: each lookup is a network round trip, so a
    real Goodreads export blew past the client's 10s timeout and the UI reported
    "Import failed" for an import that had already succeeded.
    """
    from ..models import db, Book

    imported = 0
    skipped_duplicate = 0
    skipped_invalid = 0
    errors = []
    created = []
    lookups = [0]

    for index, row in enumerate(rows, start=1):
        isbn = row.get('isbn') or ''
        title = (row.get('title') or '').strip()
        author = (row.get('author') or '').strip()

        if not isbn and not (title and author):
            skipped_invalid += 1
            if len(errors) < 10:
                errors.append(f'Row {index}: needs an ISBN, or both a title and an author.')
            continue

        if isbn:
            existing = Book.query.filter_by(isbn=isbn, user_id=user_id).first()
            if existing:
                skipped_duplicate += 1
                continue
        else:
            # No ISBN (a Goodreads row with a blank ISBN cell). Without a key to
            # match on, re-uploading the same file used to create a second copy
            # of every such row, so match on title+author instead.
            existing = Book.query.filter_by(
                user_id=user_id, title=title or None, author=author or None
            ).first()
            if existing:
                skipped_duplicate += 1
                continue

        # `book.title` is NOT NULL, so a row carrying only an ISBN (a bare ISBN
        # list, or a Goodreads row with a blank title) must resolve metadata
        # before it can be stored. The legacy template route did the same.
        if isbn and not (title and author):
            lookup = _lookup_metadata(isbn, max_lookups, lookups)
            if lookup:
                lookups[0] += 1
                title = title or (lookup.get('title') or '').strip()
                author = author or (lookup.get('author') or '').strip()
                row.setdefault('cover_url', lookup.get('cover') or lookup.get('cover_url'))
                row.setdefault('description', lookup.get('description'))
                row.setdefault('published_date', lookup.get('published_date'))
                row.setdefault('page_count', lookup.get('page_count'))
                row.setdefault('publisher', lookup.get('publisher'))
                row.setdefault('language', lookup.get('language'))
                row.setdefault('categories', lookup.get('categories'))

        if not title or not author:
            skipped_invalid += 1
            if len(errors) < 10:
                detail = f'ISBN {isbn}' if isbn else 'no ISBN'
                errors.append(
                    f'Row {index}: could not determine a title and author ({detail}). '
                    'Skipped rather than stored blank.'
                )
            continue

        page_count = row.get('page_count') or None
        if isinstance(page_count, str):
            digits = ''.join(c for c in page_count if c.isdigit())
            page_count = int(digits) if digits else None

        book = Book(
            title=_fit(title, 'title'),
            author=_fit(author, 'author'),
            isbn=_fit(isbn, 'isbn'),
            user_id=user_id,
            cover_url=_fit(row.get('cover_url'), 'cover_url'),
            description=row.get('description') or None,
            published_date=_fit(row.get('published_date'), 'published_date'),
            page_count=page_count,
            categories=_fit(row.get('categories'), 'categories'),
            publisher=_fit(row.get('publisher'), 'publisher'),
            language=_fit(row.get('language'), 'language'),
            finish_date=row.get('finish_date'),
            want_to_read=bool(row.get('want_to_read')),
            library_only=bool(row.get('library_only')),
        )
        db.session.add(book)
        created.append(book)
        imported += 1

    # Commit before enrichment so partial progress survives an enrichment error.
    db.session.commit()

    enriched = 0
    if enrich and created:
        book_ids = [book.id for book in created]
        if start_enrichment(book_ids, max_enrichments):
            enriched = -1  # signal: queued in the background

    return {
        'imported_count': imported,
        'skipped_duplicate': skipped_duplicate,
        'skipped_invalid': skipped_invalid,
        'enriched_count': enriched,
        'enrichment_pending': enriched == -1,
        'errors': errors,
    }
