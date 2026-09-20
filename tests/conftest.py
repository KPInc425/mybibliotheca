"""Shared fixtures.

Why things look the way they do:

* `SECRET_KEY` is set before `create_app()`, because the app refuses to start in
  what it considers production without a real key, and a short one is fine here.
* Passwords must satisfy the app's own validator (12+ chars, upper, lower, digit,
  special). The shared `TEST_PASSWORD` does, so fixtures stop tripping over the
  model's own rules, which was the cause of most of the historical test failures.
* The Flask app also serves a JSON API; `api_client` is for tests that exercise
  that surface the way the React frontend does.
"""

import os
import tempfile

import pytest

from app import create_app
from app.models import db, User, Book, ReadingLog

# Meets User.is_password_strong(): length, upper, lower, digit, special.
TEST_PASSWORD = 'Book0racle!Test'

TEST_SECRET_KEY = 'test-secret-key-for-pytest-only-32chars'


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)

    os.environ.setdefault('SECRET_KEY', TEST_SECRET_KEY)
    os.environ.setdefault('FLASK_DEBUG', 'true')  # keeps the strict prod check off

    app = create_app()
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_path}",
        WTF_CSRF_ENABLED=False,  # Disable CSRF for testing
        SECRET_KEY=TEST_SECRET_KEY,
    )

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

    try:
        os.unlink(db_path)
    except OSError:
        pass


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def api_client(app):
    """A JSON-speaking test client, as the React frontend uses."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        admin = User(
            username='admin',
            email='admin@test.com',
            is_admin=True,
            is_active=True,  # Explicitly set for testing
        )
        admin.set_password(TEST_PASSWORD)
        db.session.add(admin)
        db.session.commit()
        db.session.refresh(admin)
        return admin


@pytest.fixture
def regular_user(app):
    """Create a regular user for testing."""
    with app.app_context():
        user = User(
            username='testuser',
            email='user@test.com',
            is_admin=False,
            is_active=True,  # Explicitly set for testing
        )
        user.set_password(TEST_PASSWORD)
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user


@pytest.fixture
def sample_book(app, regular_user):
    """Create a sample book for testing."""
    with app.app_context():
        book = Book(
            title='Test Book',
            author='Test Author',
            isbn='9781234567897',
            user_id=regular_user.id,
        )
        db.session.add(book)
        db.session.commit()
        return book
