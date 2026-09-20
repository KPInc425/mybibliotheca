"""Authentication and data-isolation tests.

These cover the Flask JSON API, which is what the React frontend actually uses,
plus the two behaviours that matter most for safety: a protected route refuses an
anonymous caller, and one user can never read another user's books.
"""

import json

import pytest

from app.models import User, db
from tests.conftest import TEST_PASSWORD


def _json(response):
    return json.loads(response.data.decode('utf-8'))


class TestAuthentication:
    """Authentication over the JSON API."""

    def test_login_succeeds_with_valid_credentials(self, client, regular_user):
        response = client.post(
            '/api/auth/login',
            data=json.dumps({'username': 'testuser', 'password': TEST_PASSWORD}),
            content_type='application/json',
        )
        assert response.status_code == 200
        body = _json(response)
        assert body['success'] is True
        assert body['data']['username'] == 'testuser'

    def test_login_rejects_wrong_password(self, client, regular_user):
        response = client.post(
            '/api/auth/login',
            data=json.dumps({'username': 'testuser', 'password': 'NotThePassword!9'}),
            content_type='application/json',
        )
        assert response.status_code == 401
        assert _json(response)['success'] is False

    def test_login_rejects_unknown_user(self, client):
        response = client.post(
            '/api/auth/login',
            data=json.dumps({'username': 'nobody', 'password': TEST_PASSWORD}),
            content_type='application/json',
        )
        assert response.status_code == 401

    def test_login_requires_a_body(self, client):
        response = client.post('/api/auth/login', data=json.dumps({}),
                               content_type='application/json')
        assert response.status_code == 400

    def test_logout_clears_the_session(self, client, regular_user):
        client.post('/api/auth/login',
                    data=json.dumps({'username': 'testuser', 'password': TEST_PASSWORD}),
                    content_type='application/json')
        assert client.get('/api/user/profile').status_code == 200

        client.post('/api/auth/logout')
        # After logout the protected endpoint must no longer serve the profile.
        assert client.get('/api/user/profile').status_code in (302, 401)

    def test_health_endpoint_is_public(self, client):
        response = client.get('/api/health')
        assert response.status_code == 200
        assert _json(response)['status'] == 'ok'


class TestAuthorization:
    """Protected surfaces must refuse anonymous and unprivileged callers."""

    @pytest.mark.parametrize('path', [
        '/api/user/profile',
        '/api/books',
        '/api/user/statistics',
        '/api/admin/users',
        '/api/admin/stats',
    ])
    def test_protected_endpoints_reject_anonymous(self, client, path):
        response = client.get(path)
        assert response.status_code in (302, 401), f'{path} served an anonymous caller'

    def test_admin_endpoints_reject_a_non_admin(self, client, regular_user):
        client.post('/api/auth/login',
                    data=json.dumps({'username': 'testuser', 'password': TEST_PASSWORD}),
                    content_type='application/json')
        response = client.get('/api/admin/users')
        assert response.status_code == 403

    def test_admin_endpoints_allow_an_admin(self, client, admin_user):
        client.post('/api/auth/login',
                    data=json.dumps({'username': 'admin', 'password': TEST_PASSWORD}),
                    content_type='application/json')
        assert client.get('/api/admin/users').status_code == 200


class TestUserDataSeparation:
    """A user must only ever see their own library."""

    def test_users_see_only_their_books(self, client, app):
        with app.app_context():
            from app.models import Book

            user1 = User(username='user1', email='user1@test.com', is_active=True)
            user1.set_password(TEST_PASSWORD)
            user2 = User(username='user2', email='user2@test.com', is_active=True)
            user2.set_password(TEST_PASSWORD)
            db.session.add_all([user1, user2])
            db.session.commit()

            db.session.add_all([
                Book(title='User1Book', author='Author1', isbn='9780000000001',
                     user_id=user1.id),
                Book(title='User2Book', author='Author2', isbn='9780000000002',
                     user_id=user2.id),
            ])
            db.session.commit()

        client.post('/api/auth/login',
                    data=json.dumps({'username': 'user1', 'password': TEST_PASSWORD}),
                    content_type='application/json')
        titles = [b['title'] for b in _json(client.get('/api/books'))['data']]
        assert titles == ['User1Book']

        client.post('/api/auth/logout')
        client.post('/api/auth/login',
                    data=json.dumps({'username': 'user2', 'password': TEST_PASSWORD}),
                    content_type='application/json')
        titles = [b['title'] for b in _json(client.get('/api/books'))['data']]
        assert titles == ['User2Book']

    def test_a_user_cannot_read_another_users_book(self, client, app):
        with app.app_context():
            from app.models import Book

            owner = User(username='owner', email='owner@test.com', is_active=True)
            owner.set_password(TEST_PASSWORD)
            other = User(username='other', email='other@test.com', is_active=True)
            other.set_password(TEST_PASSWORD)
            db.session.add_all([owner, other])
            db.session.commit()

            book = Book(title='Owned', author='A', isbn='9780000000003', user_id=owner.id)
            db.session.add(book)
            db.session.commit()
            book_uid = book.uid

        client.post('/api/auth/login',
                    data=json.dumps({'username': 'other', 'password': TEST_PASSWORD}),
                    content_type='application/json')
        response = client.get(f'/api/books/{book_uid}')
        assert response.status_code == 404, 'a user could read another user\'s book'
