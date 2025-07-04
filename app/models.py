from datetime import datetime, timezone, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import re

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = db.Column(db.Boolean, default=True)
    
    # Security fields for account lockout
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Privacy settings for sharing
    share_current_reading = db.Column(db.Boolean, default=True)
    share_reading_activity = db.Column(db.Boolean, default=True)
    share_library = db.Column(db.Boolean, default=True)
    
    # Password security
    password_must_change = db.Column(db.Boolean, default=False)
    password_changed_at = db.Column(db.DateTime, nullable=True)
    
    # Reading streak offset
    reading_streak_offset = db.Column(db.Integer, default=0)
    
    # Debug mode setting (user-specific)
    debug_enabled = db.Column(db.Boolean, default=False)
    
    # Relationships
    books = db.relationship('Book', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password, validate=True):
        """Set password hash"""
        # Validate password strength before setting (unless explicitly bypassed)
        if validate and not self.is_password_strong(password):
            raise ValueError("Password does not meet security requirements")
        
        self.password_hash = generate_password_hash(password)
        self.password_changed_at = datetime.now(timezone.utc)
        # Clear password change requirement when password is set (unless it's initial setup)
        if validate:
            self.password_must_change = False
    
    def check_password(self, password):
        """Check password hash"""
        return check_password_hash(self.password_hash, password)
    
    @staticmethod
    def is_password_strong(password):
        """
        Check if password meets security requirements:
        - At least 12 characters long
        - Contains uppercase letter
        - Contains lowercase letter
        - Contains number
        - Contains special character
        - Not in common password blacklist
        """
        if len(password) < 12:
            print("Password validation failed: Too short")
            return False
        
        if not re.search(r'[A-Z]', password):
            print("Password validation failed: Missing uppercase letter")
            return False
        
        if not re.search(r'[a-z]', password):
            print("Password validation failed: Missing lowercase letter")
            return False
        
        if not re.search(r'\d', password):
            print("Password validation failed: Missing number")
            return False
        
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
            print("Password validation failed: Missing special character")
            return False
        
        # Common password blacklist
        common_passwords = {
            'password123', 'password1234', 'admin123', 'administrator',
            'qwerty123', 'welcome123', 'letmein123', 'password!',
        }
        
        if password.lower() in common_passwords:
            print("Password validation failed: Password is in the common password blacklist")
            return False
        
        return True
    
    @staticmethod
    def get_password_requirements():
        """Return a list of password requirements for display to users"""
        return [
            "At least 12 characters long",
            "Contains at least one uppercase letter (A-Z)",
            "Contains at least one lowercase letter (a-z)",
            "Contains at least one number (0-9)",
            "Contains at least one special character (!@#$%^&*()_+-=[]{};\':\"\\|,.<>/?)",
            "Not a commonly used password"
        ]
    
    def is_locked(self):
        """Check if account is currently locked"""
        if self.locked_until is None:
            return False
        return datetime.now(timezone.utc) < self.locked_until
    
    def increment_failed_login(self):
        """Increment failed login attempts and lock account if needed"""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            # Lock account for 30 minutes
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
        db.session.commit()
    
    def reset_failed_login(self):
        """Reset failed login attempts (called on successful login)"""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login = datetime.now(timezone.utc)
        db.session.commit()
    
    def unlock_account(self):
        """Admin function to unlock a locked account"""
        self.failed_login_attempts = 0
        self.locked_until = None
        db.session.commit()
    
    def get_reading_streak(self):
        """Get the user's current reading streak with their personal offset"""
        from app.utils import calculate_reading_streak
        return calculate_reading_streak(self.id, self.reading_streak_offset)
    
    def is_debug_enabled(self):
        """Check if debug mode is enabled for this user"""
        return self.debug_enabled
    
    def toggle_debug_mode(self):
        """Toggle debug mode for this user"""
        self.debug_enabled = not self.debug_enabled
        db.session.commit()
        return self.debug_enabled
    
    def __repr__(self):
        return f'<User {self.username}>'

class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(12), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(6))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(255), nullable=False)
    isbn = db.Column(db.String(13), nullable=True)  # Made optional for manual books
    shared_book_id = db.Column(db.Integer, db.ForeignKey('shared_book_data.id'), nullable=True)  # Reference to shared data
    start_date = db.Column(db.Date, nullable=True)
    finish_date = db.Column(db.Date, nullable=True)
    cover_url = db.Column(db.String(512), nullable=True)
    want_to_read = db.Column(db.Boolean, default=False)
    library_only = db.Column(db.Boolean, default=False)
    # New metadata fields
    description = db.Column(db.Text, nullable=True)
    published_date = db.Column(db.String(50), nullable=True)
    page_count = db.Column(db.Integer, nullable=True)
    categories = db.Column(db.String(500), nullable=True)  # Store as comma-separated string
    publisher = db.Column(db.String(255), nullable=True)
    language = db.Column(db.String(10), nullable=True)
    average_rating = db.Column(db.Float, nullable=True)
    rating_count = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Add unique constraint for ISBN per user (only when ISBN is not null)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'isbn', name='unique_user_isbn'),
    )
    
    # Relationship to shared book data
    shared_book = db.relationship('SharedBookData', backref='books')

    def __init__(self, title, author, user_id, isbn=None, shared_book_id=None, start_date=None, finish_date=None, cover_url=None, want_to_read=False, library_only=False, description=None, published_date=None, page_count=None, categories=None, publisher=None, language=None, average_rating=None, rating_count=None, **kwargs):
        self.title = title
        self.author = author
        self.isbn = isbn
        self.user_id = user_id
        self.shared_book_id = shared_book_id
        self.start_date = start_date
        self.finish_date = finish_date
        self.cover_url = cover_url
        self.want_to_read = want_to_read
        self.library_only = library_only
        self.description = description
        self.published_date = published_date
        self.page_count = page_count
        self.categories = categories
        self.publisher = publisher
        self.language = language
        self.average_rating = average_rating
        self.rating_count = rating_count
        # If you have other fields, set them here or with kwargs

    def save(self):
        db.session.add(self)
        db.session.commit()

    @classmethod
    def get_all_books(cls):
        return cls.query.all()
    
    @classmethod
    def get_user_books(cls, user_id):
        return cls.query.filter_by(user_id=user_id).all()

    @classmethod
    def get_book_by_isbn(cls, isbn):
        return cls.query.filter_by(isbn=isbn).first()
    
    @classmethod
    def get_user_book_by_isbn(cls, user_id, isbn):
        return cls.query.filter_by(user_id=user_id, isbn=isbn).first()
    
    @classmethod
    def get_user_book_by_shared_id(cls, user_id, shared_book_id):
        """Get a user's book by shared book ID"""
        return cls.query.filter_by(user_id=user_id, shared_book_id=shared_book_id).first()
    
    @classmethod
    def find_by_title_author(cls, title, author):
        """Find books by title and author (case-insensitive)"""
        return cls.query.filter(
            db.func.lower(cls.title) == db.func.lower(title),
            db.func.lower(cls.author) == db.func.lower(author)
        ).all()
    
    @property
    def secure_cover_url(self):
        """Return HTTPS version of cover URL for security."""
        if self.cover_url and self.cover_url.startswith('http://'):
            return self.cover_url.replace('http://', 'https://')
        return self.cover_url
    
    @property
    def custom_id(self):
        """Get the custom ID from shared book data if available"""
        if self.shared_book:
            return self.shared_book.custom_id
        return None
    
    def __repr__(self):
        return f'<Book {self.title} by {self.author}>'

class ReadingLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    pages_read = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    book = db.relationship('Book', backref=db.backref('reading_logs', lazy=True))
    user = db.relationship('User', backref=db.backref('reading_logs', lazy=True))
    
    # Ensure unique log per user per book per date
    __table_args__ = (
        db.UniqueConstraint('user_id', 'book_id', 'date', name='unique_user_book_date'),
    )
    
    def __repr__(self):
        return f'<ReadingLog {self.book_id} {self.user_id} {self.date}>'

class SystemSettings(db.Model):
    """System-wide settings controlled by administrators"""
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    description = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    updated_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    def __repr__(self):
        return f'<SystemSettings {self.key}={self.value}>'
    
    @classmethod
    def get_setting(cls, key, default=None):
        """Get a system setting value"""
        setting = cls.query.filter_by(key=key).first()
        return setting.value if setting else default
    
    @classmethod
    def set_setting(cls, key, value, description=None, user_id=None):
        """Set a system setting value"""
        setting = cls.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            setting.updated_by = user_id
        else:
            setting = cls(key=key, value=value, description=description, updated_by=user_id)
            db.session.add(setting)
        db.session.commit()
        return setting
    
    @classmethod
    def is_debug_enabled(cls):
        """Check if debug mode is enabled"""
        return cls.get_setting('debug_mode', 'false').lower() == 'true'

class SharedBookData(db.Model):
    """Shared book data that can be referenced by multiple users"""
    id = db.Column(db.Integer, primary_key=True)
    custom_id = db.Column(db.String(20), unique=True, nullable=False)  # Custom ID for books without ISBN
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(255), nullable=False)
    isbn = db.Column(db.String(13), nullable=True)  # Optional ISBN
    cover_url = db.Column(db.String(512), nullable=True)
    description = db.Column(db.Text, nullable=True)
    published_date = db.Column(db.String(50), nullable=True)
    page_count = db.Column(db.Integer, nullable=True)
    categories = db.Column(db.String(500), nullable=True)
    publisher = db.Column(db.String(255), nullable=True)
    language = db.Column(db.String(10), nullable=True)
    average_rating = db.Column(db.Float, nullable=True)
    rating_count = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    creator = db.relationship('User', backref='shared_books_created')
    
    def __init__(self, title, author, custom_id=None, isbn=None, created_by=None, **kwargs):
        self.title = title
        self.author = author
        self.isbn = isbn
        self.created_by = created_by
        self.custom_id = custom_id or self._generate_custom_id(title, author)
        
        # Set other fields from kwargs
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def _generate_custom_id(self, title, author):
        """Generate a custom ID based on title and author"""
        # Create a base from title and author
        base = f"{title[:10]}_{author[:10]}".replace(' ', '_').lower()
        # Remove special characters
        base = re.sub(r'[^a-z0-9_]', '', base)
        # Add a random suffix
        suffix = secrets.token_urlsafe(4)
        return f"{base}_{suffix}"
    
    @classmethod
    def find_by_title_author(cls, title, author):
        """Find shared book data by title and author (case-insensitive)"""
        return cls.query.filter(
            db.func.lower(cls.title) == db.func.lower(title),
            db.func.lower(cls.author) == db.func.lower(author)
        ).first()
    
    @classmethod
    def find_by_isbn(cls, isbn):
        """Find shared book data by ISBN"""
        return cls.query.filter_by(isbn=isbn).first()
    
    @classmethod
    def find_by_custom_id(cls, custom_id):
        """Find shared book data by custom ID"""
        return cls.query.filter_by(custom_id=custom_id).first()
    
    def save(self):
        db.session.add(self)
        db.session.commit()
    
    def __repr__(self):
        return f'<SharedBookData {self.title} by {self.author} (ID: {self.custom_id})>'