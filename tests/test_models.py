"""Model-level tests.

The password rules are asserted directly against `User.is_password_strong`, which
is what `set_password` enforces: the historical failures here came from fixtures
using passwords the model itself rejects.
"""

import pytest

from app.models import User, Book, db
from tests.conftest import TEST_PASSWORD


class TestPasswordPolicy:
    """The rules set_password enforces."""

    @pytest.mark.parametrize('password', [
        'Short1!',             # too short
        'alllowercase1!',      # no uppercase
        'ALLUPPERCASE1!',      # no lowercase
        'NoDigitsHere!!',      # no digit
        'NoSpecials1234',      # no special character
    ])
    def test_weak_passwords_are_rejected(self, password):
        assert User.is_password_strong(password) is False

    def test_the_shared_test_password_is_acceptable(self):
        assert User.is_password_strong(TEST_PASSWORD) is True

    def test_set_password_refuses_a_weak_password(self, app):
        with app.app_context():
            user = User(username='weak', email='weak@test.com')
            with pytest.raises(ValueError):
                user.set_password('password123')

    def test_set_password_can_bypass_validation(self, app):
        """Used when provisioning an account with an unusable random password."""
        with app.app_context():
            user = User(username='svc', email='svc@test.com')
            user.set_password('x', validate=False)
            assert user.password_hash


class TestUserModel:
    """Creating and reading users."""

    def test_user_creation(self, app):
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            user.set_password(TEST_PASSWORD)
            db.session.add(user)
            db.session.flush()  # apply defaults without committing

            assert user.username == 'testuser'
            assert user.email == 'test@example.com'
            assert user.check_password(TEST_PASSWORD)
            assert not user.check_password('WrongPassword!9')
            assert not user.is_admin  # default
            assert user.is_active     # default

    def test_password_is_hashed_not_stored(self, app):
        with app.app_context():
            user = User(username='test', email='test@example.com')
            user.set_password(TEST_PASSWORD)
            assert user.password_hash != TEST_PASSWORD
            assert TEST_PASSWORD not in user.password_hash
            assert user.check_password(TEST_PASSWORD)

    def test_email_is_normalised(self, app):
        with app.app_context():
            user = User(username='Mixed', email='MiXeD@Example.COM')
            user.set_password(TEST_PASSWORD)
            db.session.add(user)
            db.session.commit()
            assert User.find_by_email('mixed@example.com') is not None

    def test_inactive_user_is_not_active(self, app):
        with app.app_context():
            user = User(username='gone', email='gone@test.com', is_active=False)
            user.set_password(TEST_PASSWORD)
            db.session.add(user)
            db.session.commit()
            assert user.is_active is False


class TestBookModel:
    """Books and their relationship to users."""

    def test_book_gets_a_uid(self, app, regular_user):
        with app.app_context():
            book = Book(title='T', author='A', isbn='9780000000010',
                        user_id=regular_user.id)
            db.session.add(book)
            db.session.commit()
            assert book.uid
            assert len(book.uid) <= 12

    def test_book_can_be_saved_without_an_isbn(self, app, regular_user):
        """Manual books have no ISBN; the model allows it and so must the schema."""
        with app.app_context():
            book = Book(title='No ISBN Book', author='A', user_id=regular_user.id)
            db.session.add(book)
            db.session.commit()
            assert book.id is not None
            assert book.isbn is None

    def test_user_relationships(self, app, regular_user, sample_book):
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            assert user is not None
            assert len(user.books) == 1
            assert user.books[0].title == 'Test Book'

    def test_admin_user(self, app, admin_user):
        with app.app_context():
            user = User.query.filter_by(username='admin').first()
            assert user is not None
            assert user.is_admin
            assert user.is_active
