import os
import shutil
from datetime import datetime
from flask import Flask, session
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_mail import Mail
from sqlalchemy import text
from .models import db, User, InviteToken, UserRating
from config import Config

login_manager = LoginManager()
csrf = CSRFProtect()
mail = Mail()

# The value this file used to hardcode, plus the placeholder shipped in
# .env.example. Both are public, so any session cookie signed with them can be
# forged by anyone with read access to the repo.
_KNOWN_WEAK_SECRET_KEYS = {
    'your-secret-key',
    'your-super-secret-key-32-chars-minimum-change-this',
    'changeme',
    'secret',
}

# A 32-char urlsafe token (what `secrets.token_urlsafe(32)` returns) is 43
# characters. Anything much shorter is not a serious signing key.
_MIN_SECRET_KEY_LENGTH = 32


def _is_production():
    """True when this process looks like a real deployment, not a dev run.

    Production means: not Flask debug mode, not the app's own debug switch.
    """
    if os.environ.get('FLASK_DEBUG', 'false').lower() in ('true', 'on', '1'):
        return False
    if os.environ.get('BookOracle_DEBUG', 'false').lower() in ('true', 'on', '1'):
        return False
    return os.environ.get('FLASK_ENV', '').lower() != 'development'


def _validate_secret_key(secret_key):
    """Refuse a publicly-known SECRET_KEY in production.

    Session cookies (and therefore every @login_required route, including the
    admin API) are signed with this value. Flask-Login only checks that the
    session deserialises, so a forged cookie carrying someone else's _user_id is
    fully sufficient to act as that user. A hardcoded key in a public repo is
    therefore a total authentication bypass, not a hardening nit.

    Fails closed in production; warns loudly in development so local work and
    the test suite keep working.
    """
    weak = (
        not secret_key
        or secret_key in _KNOWN_WEAK_SECRET_KEYS
        or len(secret_key) < _MIN_SECRET_KEY_LENGTH
    )
    if not weak:
        return True

    reason = (
        'is not set' if not secret_key
        else 'is a known public default' if secret_key in _KNOWN_WEAK_SECRET_KEYS
        else f'is shorter than {_MIN_SECRET_KEY_LENGTH} characters'
    )
    message = (
        f"SECRET_KEY {reason}. Session cookies signed with it can be forged, "
        "which grants full access to every account, including admins.\n"
        "Generate one with:  python3 -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
        "then set SECRET_KEY in the environment (or .env) and restart."
    )

    if _is_production():
        raise RuntimeError(message)

    import warnings
    warnings.warn(f"[DEV ONLY] {message}", RuntimeWarning, stacklevel=3)
    return False


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def check_if_migrations_needed(inspector):
    """Check if any migrations are needed before creating backup"""
    existing_tables = inspector.get_table_names()
    
    # Check if this is a fresh database
    if not existing_tables:
        return False, "fresh_database"
    
    migrations_needed = []
    
    # Check for missing user table
    if 'user' not in existing_tables:
        migrations_needed.append("user_table")
    
    # Check for missing invite_token table
    if 'invite_token' not in existing_tables:
        migrations_needed.append("invite_token_table")
    
    # Check for missing columns in existing tables
    if 'book' in existing_tables:
        columns = [column['name'] for column in inspector.get_columns('book')]
        book_fields = ['user_id', 'description', 'published_date', 'page_count', 'categories', 
                      'publisher', 'language', 'average_rating', 'rating_count', 'created_at']
        missing_book_fields = [field for field in book_fields if field not in columns]
        if missing_book_fields:
            migrations_needed.append(f"book_columns: {missing_book_fields}")
    
    if 'user' in existing_tables:
        columns = [column['name'] for column in inspector.get_columns('user')]
        user_fields = ['failed_login_attempts', 'locked_until', 'last_login', 
                      'share_current_reading', 'share_reading_activity', 'share_library',
                      'reading_streak_offset', 'invite_tokens_remaining', 'invite_tokens_granted', 'invite_tokens_used', 'profile_picture', 'is_pro']  # Add invite token fields and profile picture
        missing_user_fields = [field for field in user_fields if field not in columns]
        if missing_user_fields:
            migrations_needed.append(f"user_security_privacy: {missing_user_fields}")
    
    if 'reading_log' in existing_tables:
        columns = [column['name'] for column in inspector.get_columns('reading_log')]
        if 'user_id' not in columns or 'created_at' not in columns:
            migrations_needed.append("reading_log_fields")
    
    return len(migrations_needed) > 0, migrations_needed

def run_security_privacy_migration(inspector, db_engine):
    """Add security and privacy fields to user table"""
    if 'user' not in inspector.get_table_names():
        return  # User table doesn't exist yet
    
    try:
        columns = [column['name'] for column in inspector.get_columns('user')]
        
        # Security and privacy fields to add
        security_privacy_fields = [
            ('failed_login_attempts', 'INTEGER DEFAULT 0'),
            ('locked_until', 'DATETIME'),
            ('last_login', 'DATETIME'),
            ('share_current_reading', 'BOOLEAN DEFAULT 1'),
            ('share_reading_activity', 'BOOLEAN DEFAULT 1'),
            ('share_library', 'BOOLEAN DEFAULT 1'),
            ('debug_enabled', 'BOOLEAN DEFAULT 0'),
            ('invite_tokens_remaining', 'INTEGER DEFAULT 0'),
            ('invite_tokens_granted', 'INTEGER DEFAULT 0'),
            ('invite_tokens_used', 'INTEGER DEFAULT 0'),
            ('profile_picture', 'VARCHAR(512)'),
            ('is_pro', 'BOOLEAN DEFAULT 0')
        ]
        
        missing_fields = [field for field, _ in security_privacy_fields if field not in columns]
        
        if missing_fields:
            print(f"🔄 Adding security/privacy fields: {missing_fields}")
            with db_engine.connect() as conn:
                for field_name, field_def in security_privacy_fields:
                    if field_name not in columns:
                        conn.execute(text(f"ALTER TABLE user ADD COLUMN {field_name} {field_def}"))
                        print(f"✅ Added {field_name} to user table")
                conn.commit()
            print("✅ Security/privacy migration completed.")
        else:
            print("✅ Security/privacy fields already present.")
            
    except Exception as e:
        print(f"⚠️  Security/privacy migration failed: {e}")

def add_streak_offset_column(inspector, engine):
    """Add reading_streak_offset column to users table"""
    try:
        columns = [column['name'] for column in inspector.get_columns('user')]
        if 'reading_streak_offset' not in columns:
            print("🔄 Adding reading_streak_offset column to user table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE user ADD COLUMN reading_streak_offset INTEGER DEFAULT 0"))
                conn.commit()
            print("✅ reading_streak_offset column added successfully")
        else:
            print("✅ reading_streak_offset column already exists")
    except Exception as e:
        print(f"⚠️  Error adding reading_streak_offset column: {e}")

def assign_existing_books_to_admin():
    """Assign existing books without user_id to the admin user"""
    try:
        # Import Book model here to avoid circular imports
        from .models import Book
        
        # Find the admin user
        admin_user = User.query.filter_by(is_admin=True).first()
        if not admin_user:
            print("⚠️  No admin user found, cannot assign books")
            return
        
        # Find books without user_id
        orphaned_books = Book.query.filter_by(user_id=None).all()
        if not orphaned_books:
            print("✅ No orphaned books found")
            return
            
        # Assign orphaned books to admin
        for book in orphaned_books:
            book.user_id = admin_user.id
            
        db.session.commit()
        print(f"✅ Assigned {len(orphaned_books)} orphaned books to admin user: {admin_user.username}")
        
    except Exception as e:
        print(f"⚠️  Failed to assign orphaned books to admin: {e}")
        db.session.rollback()

def run_email_normalization_migration():
    """Normalize all email addresses in the database to lowercase"""
    try:
        # Import User model and normalize_email function
        from .models import User, normalize_email
        
        # Get all users
        users = User.query.all()
        if not users:
            print("✅ No users found for email normalization")
            return
        
        # Check which emails need normalization
        emails_to_normalize = []
        for user in users:
            normalized = normalize_email(user.email)
            if user.email != normalized:
                emails_to_normalize.append((user, normalized))
        
        if not emails_to_normalize:
            print("✅ All email addresses are already normalized")
            return
        
        print(f"🔄 Normalizing {len(emails_to_normalize)} email addresses...")
        
        # Perform the normalization
        updated_count = 0
        for user, normalized in emails_to_normalize:
            print(f"  Normalizing user {user.username}: '{user.email}' -> '{normalized}'")
            user.email = normalized
            updated_count += 1
        
        # Commit all changes
        db.session.commit()
        print(f"✅ Successfully normalized {updated_count} email addresses")
        
    except Exception as e:
        print(f"⚠️  Email normalization migration failed: {e}")
        db.session.rollback()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    _validate_secret_key(app.config.get('SECRET_KEY'))

    # Initialize debug utilities
    from .debug_utils import setup_debug_logging, print_debug_banner, debug_middleware
    
    # Enable debug logging if DEBUG_MODE true; print banner regardless
    # Ensure Flask app logger outputs INFO by default or env-driven
    log_level = os.environ.get('FLASK_LOG_LEVEL', 'INFO').upper()
    try:
        import logging
        app.logger.setLevel(getattr(logging, log_level, logging.INFO))
    except Exception:
        pass

    with app.app_context():
        try:
            setup_debug_logging()
            print_debug_banner()
        except Exception as e:
            print(f"Debug logging init error: {e}")

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    # Configure CSRF protection (enable for server-rendered forms; we'll exempt API below)
    csrf.init_app(app)
    # Initialize mail extension
    mail.init_app(app)

    # Dynamic cookie security configuration for Capacitor apps
    @app.before_request
    def configure_cookies_for_capacitor():
        """Configure cookie security settings based on request source"""
        from flask import request
        
        # Check if this is a Capacitor app request
        is_capacitor = Config.is_hybrid_app_request(request)
        
        if is_capacitor:
            # For Capacitor apps, use less restrictive cookie settings
            app.config['SESSION_COOKIE_SECURE'] = False
            app.config['REMEMBER_COOKIE_SECURE'] = False
            app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        else:
            # For web browsers, use secure cookies in production
            app.config['SESSION_COOKIE_SECURE'] = not app.config.get('is_development', True)
            app.config['REMEMBER_COOKIE_SECURE'] = not app.config.get('is_development', True)
            app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'



    # NOTE: schema creation, migrations and the pre-migration backup no longer
    # run here. They used to execute inside every gunicorn worker's import of
    # run:app, so N workers raced each other on a fresh database and the losers
    # died with "table user already exists" (gunicorn then shut the master
    # down). Measured cold starts at WORKERS=4 survived 0/3 trials.
    #
    # They now run exactly once per container start, before gunicorn, via
    # `python -m app.bootstrap` in docker-entrypoint.sh. See app/bootstrap.py.
    # Nothing under /api depends on them: the api blueprint is registered below
    # and only touches the schema per-request.

    # Add middleware to check for setup and forced password changes
    @app.before_request
    def check_setup_and_password_requirements():
        from flask import request, redirect, url_for
        from flask_login import current_user
        from .debug_utils import debug_middleware
        
        # Run debug middleware if enabled
        debug_middleware()
        
        # Check if setup is needed (no users exist)
        if User.query.count() == 0:
            # Skip for setup route, API endpoints (to allow health checks), and static files
            if request.endpoint in ['auth.setup', 'static'] \
               or (request.endpoint and request.endpoint.startswith('static')) \
               or (request.endpoint and request.endpoint.startswith('api.')):
                return
            # Redirect to setup page
            return redirect(url_for('auth.setup'))
        
        # Skip if user is not authenticated
        if not current_user.is_authenticated:
            return
        
        # Skip for certain routes to avoid redirect loops
        allowed_endpoints = [
            'auth.forced_password_change',
            'auth.logout',
            'auth.setup',
            'static'
        ]
        
        # Allow API and AJAX requests, and skip for static files
        if request.endpoint in allowed_endpoints or (request.endpoint and request.endpoint.startswith('static')):
            return
        
        # Check if user must change password
        if hasattr(current_user, 'password_must_change') and current_user.password_must_change:
            if request.endpoint != 'auth.forced_password_change':
                return redirect(url_for('auth.forced_password_change'))

    # Register blueprints
    from .routes import bp
    from .auth import auth
    from .admin import admin
    from .api import api
    app.register_blueprint(bp)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(admin, url_prefix='/admin')
    app.register_blueprint(api)

    # Exempt API blueprint from CSRF (JSON clients)
    csrf.exempt(api)

    return app
