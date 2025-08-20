"""
API Blueprint - RESTful API endpoints for BookOracle
Uses service layer for business logic separation
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user, login_user, logout_user
from datetime import date, datetime, timezone, timedelta
from typing import Dict, Any
import requests
import secrets

from .services.book_service import BookService, BookNotFoundError
from .services.user_service import UserService, UserNotFoundError
from .models import db, User, Book, ReadingLog, InviteToken, UserRating

from .utils import get_reading_streak
from flask_mail import Message, Mail
import itsdangerous

api = Blueprint('api', __name__, url_prefix='/api')


# Authentication endpoints
@api.route('/health', methods=['GET'])
def health_check():
    """Lightweight health endpoint for container orchestration."""
    return jsonify({'success': True, 'status': 'ok'}), 200

# Authentication endpoints
@api.route('/auth/login', methods=['POST'])
def api_login():
    """
    JSON-based login endpoint for API clients
    
    POST /api/auth/login
    Body: {
        "username": "user@example.com",
        "password": "password",
        "remember_me": false
    }
    
    Returns:
        200: Login successful
        401: Invalid credentials
        400: Invalid data
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        username = data.get('username')
        password = data.get('password')
        remember_me = data.get('remember_me', False)
        
        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Username and password are required'
            }), 400
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username) | 
            (User.email == username)
        ).first()
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'Invalid username or password'
            }), 401
        
        # Check if account is locked
        if user.is_locked():
            return jsonify({
                'success': False,
                'error': 'Account is temporarily locked due to too many failed login attempts'
            }), 401
        
        # Check if account is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'error': 'Account has been deactivated'
            }), 401
        
        # Check password
        if not user.check_password(password):
            # Increment failed login attempts
            user.increment_failed_login()
            db.session.commit()
            
            return jsonify({
                'success': False,
                'error': 'Invalid username or password'
            }), 401
        
        # Successful login
        user.reset_failed_login()
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
        
        # Log in user
        login_user(user, remember=remember_me)
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in API login: {e}")
        import traceback
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/auth/logout', methods=['POST'])
@login_required
def api_logout():
    """
    JSON-based logout endpoint for API clients
    
    POST /api/auth/logout
    
    Returns:
        200: Logout successful
    """
    try:
        logout_user()
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in API logout: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Initiate password reset by sending a reset link to user's email."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'success': False, 'error': 'Email is required'}), 400

        user = User.query.filter_by(email=email).first()
        # Always respond success to prevent user enumeration
        if not user:
            return jsonify({'success': True, 'message': 'If that email exists, a reset link was sent.'})

        s = itsdangerous.URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        token = s.dumps({'user_id': user.id}, salt='password-reset')
        base_url = request.headers.get('X-Forwarded-Proto', 'https') + '://' + request.headers.get('X-Forwarded-Host', request.host)
        reset_url = f"{base_url}/auth/reset-password?token={token}"

        try:
            mail = Mail(current_app)
            msg = Message(
                subject='BookOracle Password Reset',
                recipients=[email],
                body=f"Click to reset your password: {reset_url}\nThis link expires in 1 hour."
            )
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Failed to send reset email: {e}")
            # Still return success

        return jsonify({'success': True, 'message': 'If that email exists, a reset link was sent.'})
    except Exception as e:
        current_app.logger.error(f"Error in forgot_password: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@api.route('/auth/reset-password', methods=['POST'])
def reset_password_api():
    """Finalize password reset with token and new password via API."""
    try:
        data = request.get_json() or {}
        token = data.get('token')
        new_password = data.get('new_password')
        if not token or not new_password:
            return jsonify({'success': False, 'error': 'Token and new_password are required'}), 400

        s = itsdangerous.URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        payload = s.loads(token, salt='password-reset', max_age=3600)
        user_id = payload.get('user_id')
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'Invalid token'}), 400

        try:
            user.set_password(new_password)
        except ValueError as ve:
            return jsonify({'success': False, 'error': str(ve)}), 400
        db.session.commit()
        return jsonify({'success': True, 'message': 'Password has been reset.'})
    except itsdangerous.SignatureExpired:
        return jsonify({'success': False, 'error': 'Token expired'}), 400
    except itsdangerous.BadSignature:
        return jsonify({'success': False, 'error': 'Invalid token'}), 400
    except Exception as e:
        current_app.logger.error(f"Error in reset_password_api: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@api.route('/auth/register', methods=['POST'])
def api_register():
    """
    JSON-based registration endpoint with invite token validation
    
    POST /api/auth/register
    Body: {
        "username": "newuser",
        "email": "user@example.com",
        "password": "securepassword",
        "confirm_password": "securepassword",
        "invite_token": "token123..."
    }
    
    Returns:
        201: Registration successful
        400: Invalid data or invite token
        409: Username/email already exists
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'confirm_password', 'invite_token']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'{field.replace("_", " ").title()} is required'
                }), 400
        
        # Check if passwords match
        if data['password'] != data['confirm_password']:
            return jsonify({
                'success': False,
                'error': 'Passwords do not match'
            }), 400
        
        # Validate invite token
        invite_token = InviteToken.find_valid_token(data['invite_token'])
        if not invite_token:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired invite token'
            }), 400
        
        # Check if email matches invite (if invite has specific email)
        if invite_token.email and invite_token.email.lower() != data['email'].lower():
            return jsonify({
                'success': False,
                'error': 'Email does not match the invite'
            }), 400
        
        # Check if username already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({
                'success': False,
                'error': 'Username already exists'
            }), 409
        
        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False,
                'error': 'Email already exists'
            }), 409
        
        # Validate password strength
        if not User.is_password_strong(data['password']):
            return jsonify({
                'success': False,
                'error': 'Password does not meet security requirements'
            }), 400
        
        # Create new user
        new_user = User(
            username=data['username'],
            email=data['email'],
            is_admin=False,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        new_user.set_password(data['password'])
        
        # Mark invite token as used
        invite_token.use_token(new_user.id)
        
        # Save to database
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'data': {
                'username': new_user.username,
                'email': new_user.email,
                'id': new_user.id
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error in API registration: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# Book-related endpoints
@api.route('/books/lookup/<isbn>', methods=['GET'])
@login_required
def lookup_book(isbn: str):
    """
    Lookup book data by ISBN
    
    GET /api/books/lookup/<isbn>
    
    Returns:
        200: Book data found
        404: Book not found
    """
    try:
        book_service = BookService(db.session)
        book_data = book_service.lookup_isbn(isbn)
        
        return jsonify({
            'success': True,
            'data': book_data
        }), 200
        
    except BookNotFoundError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404
        
    except Exception as e:
        current_app.logger.error(f"Error in book lookup: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/books', methods=['POST'])
@login_required
def add_book():
    """
    Add a new book to user's library
    
    POST /api/books
    Body: {
        "title": "Book Title",
        "author": "Author Name",
        "isbn": "1234567890",
        "cover": "https://...",
        ...
    }
    
    Returns:
        201: Book added successfully
        400: Invalid data or book already exists
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        if not data.get('title') or not data.get('author'):
            return jsonify({
                'success': False,
                'error': 'Title and author are required'
            }), 400
        
        book_service = BookService(db.session)
        book = book_service.add_book(current_user.id, data)
        
        return jsonify({
            'success': True,
            'data': book.to_dict(),
            'message': 'Book added successfully'
        }), 201
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
        
    except Exception as e:
        current_app.logger.error(f"Error adding book: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/books', methods=['GET'])
@login_required
def get_books():
    """
    Get user's books with optional filtering
    
    GET /api/books?status=currently_reading&search=title
    
    Query Parameters:
        status: currently_reading, finished, want_to_read, library_only
        search: Search term for title, author, or ISBN
    
    Returns:
        200: List of books
    """
    try:
        # Get query parameters
        status = request.args.get('status')
        search = request.args.get('search')
        owned = request.args.get('owned') or request.args.get('ownedOnly')
        
        filters = {}
        if status:
            filters['status'] = status
        if search:
            filters['search'] = search
        if owned is not None:
            filters['owned'] = owned
        
        book_service = BookService(db.session)
        books = book_service.get_user_books(current_user.id, filters)
        
        return jsonify({
            'success': True,
            'data': [book.to_dict() for book in books]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting books: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/books/<uid>', methods=['GET'])
@login_required
def get_book(uid: str):
    """
    Get a specific book by UID
    
    GET /api/books/<uid>
    
    Returns:
        200: Book data
        404: Book not found
    """
    try:
        book_service = BookService(db.session)
        book = book_service.get_book_by_uid(uid, current_user.id)
        
        if not book:
            return jsonify({
                'success': False,
                'error': 'Book not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': book.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting book: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/books/<uid>', methods=['PUT'])
@login_required
def update_book(uid: str):
    """
    Update simple book fields (owned, want_to_read, library_only, cover_url, description, etc.)
    PUT /api/books/<uid>
    Body: { "owned": true }
    """
    try:
        data = request.get_json() or {}
        if not isinstance(data, dict) or not data:
            return jsonify({ 'success': False, 'error': 'No update data provided' }), 400

        book_service = BookService(db.session)
        book = book_service.update_book_fields(uid, current_user.id, data)

        return jsonify({ 'success': True, 'data': book.to_dict() }), 200
    except BookNotFoundError:
        return jsonify({ 'success': False, 'error': 'Book not found' }), 404
    except Exception as e:
        current_app.logger.error(f"Error updating book: {e}")
        return jsonify({ 'success': False, 'error': 'Internal server error' }), 500

@api.route('/books/<uid>/status', methods=['PUT'])
@login_required
def update_book_status(uid: str):
    """
    Update book status
    
    PUT /api/books/<uid>/status
    Body: {
        "status": "finished" | "currently_reading" | "want_to_read" | "library_only"
    }
    
    Returns:
        200: Status updated successfully
        404: Book not found
    """
    try:
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({
                'success': False,
                'error': 'Status is required'
            }), 400
        
        status = data['status']
        valid_statuses = ['finished', 'currently_reading', 'want_to_read', 'library_only']
        
        if status not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }), 400
        
        book_service = BookService(db.session)
        book = book_service.update_book_status(uid, current_user.id, status)
        
        return jsonify({
            'success': True,
            'data': book.to_dict(),
            'message': f'Book status updated to {status}'
        }), 200
        
    except BookNotFoundError:
        return jsonify({
            'success': False,
            'error': 'Book not found'
        }), 404
        
    except Exception as e:
        current_app.logger.error(f"Error updating book status: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/books/<uid>', methods=['DELETE'])
@login_required
def delete_book(uid: str):
    """
    Delete a book
    
    DELETE /api/books/<uid>
    
    Returns:
        200: Book deleted successfully
        404: Book not found
    """
    try:
        book_service = BookService(db.session)
        deleted = book_service.delete_book(uid, current_user.id)
        
        if not deleted:
            return jsonify({
                'success': False,
                'error': 'Book not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'Book deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting book: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# Custom Book Cover Upload
@api.route('/books/<uid>/cover', methods=['POST'])
@login_required
def upload_book_cover(uid: str):
    """Upload a custom cover image for a book owned by the current user"""
    try:
        # Gate behind pro feature
        if not getattr(current_user, 'is_pro', False):
            return jsonify({ 'success': False, 'error': 'Pro feature required to upload custom covers' }), 403
        # Find the book
        book_service = BookService(db.session)
        book = book_service.get_book_by_uid(uid, current_user.id)
        if not book:
            return jsonify({ 'success': False, 'error': 'Book not found' }), 404

        if 'cover_image' not in request.files:
            return jsonify({ 'success': False, 'error': 'No file provided' }), 400

        file = request.files['cover_image']
        if file.filename == '':
            return jsonify({ 'success': False, 'error': 'No file selected' }), 400

        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({ 'success': False, 'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP' }), 400

        # Validate size (max 5MB)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > 5 * 1024 * 1024:
            return jsonify({ 'success': False, 'error': 'File too large. Maximum size is 5MB' }), 400

        # Save file (and post-process optimize)
        import os, uuid
        from werkzeug.utils import secure_filename

        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"cover_{book.id}_{uuid.uuid4().hex[:8]}.{ext}"

        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'covers')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)

        # Optimize: downscale and convert to webp or jpeg
        try:
            from PIL import Image, ImageOps
            with Image.open(file_path) as im:
                im = ImageOps.exif_transpose(im)
                im = im.convert('RGB')
                max_side = 1200
                w, h = im.size
                scale = min(1.0, max_side / max(w, h))
                if scale < 1.0:
                    im = im.resize((int(w*scale), int(h*scale)))
                # Re-encode
                optimized_path = file_path
                im.save(optimized_path, format='JPEG', quality=75, optimize=True)
        except Exception as e:
            current_app.logger.warning(f"Cover optimize failed: {e}")

        # If previous cover was a local uploaded file, try to remove it
        try:
            if book.cover_url and book.cover_url.startswith('/static/uploads/covers/'):
                old_path = os.path.join(current_app.root_path, book.cover_url.lstrip('/'))
                if os.path.exists(old_path):
                    os.remove(old_path)
        except Exception:
            # Best-effort cleanup; ignore failures
            pass

        # Update book
        cover_url = f"/static/uploads/covers/{unique_filename}"
        book.cover_url = cover_url
        db.session.commit()

        return jsonify({ 'success': True, 'data': { 'cover_url': cover_url } }), 200
    except Exception as e:
        current_app.logger.error(f"Error uploading book cover: {e}")
        return jsonify({ 'success': False, 'error': 'Failed to upload cover' }), 500


@api.route('/books/<uid>/cover', methods=['DELETE'])
@login_required
def delete_book_cover(uid: str):
    """Delete the custom cover image for the book (and clear cover_url)"""
    try:
        # Find the book
        book_service = BookService(db.session)
        book = book_service.get_book_by_uid(uid, current_user.id)
        if not book:
            return jsonify({ 'success': False, 'error': 'Book not found' }), 404

        # Remove file if it's a locally uploaded cover
        import os
        if book.cover_url and book.cover_url.startswith('/static/uploads/covers/'):
            file_path = os.path.join(current_app.root_path, book.cover_url.lstrip('/'))
            if os.path.exists(file_path):
                os.remove(file_path)

        book.cover_url = None
        db.session.commit()

        return jsonify({ 'success': True, 'message': 'Cover removed', 'data': { 'cover_url': None } }), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting book cover: {e}")
        return jsonify({ 'success': False, 'error': 'Failed to delete cover' }), 500


@api.route('/books/<uid>/reading-log', methods=['POST'])
@login_required
def log_reading(uid: str):
    """
    Log reading progress
    
    POST /api/books/<uid>/reading-log
    Body: {
        "pages_read": 50,
        "date": "2024-01-15"  // Optional, defaults to today
    }
    
    Returns:
        200: Reading logged successfully
        404: Book not found
    """
    try:
        data = request.get_json()
        if not data or 'pages_read' not in data:
            return jsonify({
                'success': False,
                'error': 'pages_read is required'
            }), 400
        
        pages_read = data['pages_read']
        if not isinstance(pages_read, int) or pages_read < 0:
            return jsonify({
                'success': False,
                'error': 'pages_read must be a non-negative integer'
            }), 400
        
        log_date = None
        if 'date' in data:
            try:
                log_date = date.fromisoformat(data['date'])
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }), 400
        
        book_service = BookService(db.session)
        reading_log = book_service.log_reading(uid, current_user.id, pages_read, log_date)
        
        return jsonify({
            'success': True,
            'data': reading_log.to_dict(),
            'message': 'Reading progress logged successfully'
        }), 200
        
    except BookNotFoundError:
        return jsonify({
            'success': False,
            'error': 'Book not found'
        }), 404
        
    except Exception as e:
        current_app.logger.error(f"Error logging reading: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# User-related endpoints
@api.route('/user/profile', methods=['GET'])
@login_required
def get_user_profile():
    """
    Get current user's profile
    
    GET /api/user/profile
    
    Returns:
        200: User profile data
    """
    try:
        return jsonify({
            'success': True,
            'data': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'is_admin': current_user.is_admin,
                'is_pro': getattr(current_user, 'is_pro', False),
                'created_at': current_user.created_at.isoformat() if current_user.created_at else None,
                'share_current_reading': current_user.share_current_reading,
                'share_reading_activity': current_user.share_reading_activity,
                'share_library': current_user.share_library,
                'debug_enabled': current_user.debug_enabled,
                'profile_picture': current_user.profile_picture
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting user profile: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/user/profile', methods=['PUT'])
@login_required
def update_user_profile():
    """
    Update current user's profile
    
    PUT /api/user/profile
    Body: {
        "username": "new_username",
        "email": "new_email@example.com",
        "share_current_reading": true,
        ...
    }
    
    Returns:
        200: Profile updated successfully
        400: Invalid data
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        user_service = UserService(db.session)
        user = user_service.update_user_profile(current_user.id, data)
        
        return jsonify({
            'success': True,
            'data': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'share_current_reading': user.share_current_reading,
                'share_reading_activity': user.share_reading_activity,
                'share_library': user.share_library,
                'debug_enabled': user.debug_enabled
            },
            'message': 'Profile updated successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
        
    except Exception as e:
        current_app.logger.error(f"Error updating user profile: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/auth/change-password', methods=['POST'])
@login_required
def change_password():
    """
    Change current user's password

    POST /api/auth/change-password
    Body: {
        "current_password": "...",
        "new_password": "..."
    }

    Returns:
        200: Password changed successfully
        400: Invalid data or incorrect current password
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'error': 'Both current_password and new_password are required'
            }), 400

        user_service = UserService(db.session)

        # Attempt password change; False indicates incorrect current password
        try:
            changed = user_service.change_password(current_user.id, current_password, new_password)
        except ValueError as ve:
            # Password strength or validation error
            return jsonify({
                'success': False,
                'error': str(ve)
            }), 400

        if not changed:
            return jsonify({
                'success': False,
                'error': 'Current password is incorrect'
            }), 400

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error changing password: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@api.route('/user/statistics', methods=['GET'])
@login_required
def get_user_statistics():
    """
    Get current user's reading statistics
    
    GET /api/user/statistics
    
    Returns:
        200: User statistics
    """
    try:
        user_service = UserService(db.session)
        stats = user_service.get_user_statistics(current_user.id)
        
        return jsonify({
            'success': True,
            'data': stats
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting user statistics: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/user/reading-history', methods=['GET'])
@login_required
def get_reading_history():
    """
    Get current user's reading history
    
    GET /api/user/reading-history
    
    Returns:
        200: Reading history
    """
    try:
        user_service = UserService(db.session)
        history = user_service.get_user_reading_history(current_user.id)
        
        return jsonify({
            'success': True,
            'data': history
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting reading history: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# Community endpoints
@api.route('/community/activity', methods=['GET'])
@login_required
def get_community_activity():
    """
    Get community-wide activity statistics
    
    GET /api/community/activity
    
    Returns:
        200: Community activity data
    """
    try:
        user_service = UserService(db.session)
        activity = user_service.get_community_activity()
        
        return jsonify({
            'success': True,
            'data': activity
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting community activity: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/community/active-readers', methods=['GET'])
@login_required
def get_active_readers():
    """
    Get active readers with their statistics
    
    GET /api/community/active-readers
    
    Returns:
        200: List of active readers with stats
    """
    try:
        user_service = UserService(db.session)
        active_readers = user_service.get_active_readers()
        
        return jsonify({
            'success': True,
            'data': active_readers
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting active readers: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/community/books-this-month', methods=['GET'])
@login_required
def get_books_this_month():
    """
    Get books finished this month by community members
    
    GET /api/community/books-this-month
    
    Returns:
        200: List of books finished this month
    """
    try:
        user_service = UserService(db.session)
        books = user_service.get_books_this_month()
        
        return jsonify({
            'success': True,
            'data': books
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting books this month: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/community/currently-reading', methods=['GET'])
@login_required
def get_currently_reading():
    """
    Get books currently being read by community members
    
    GET /api/community/currently-reading
    
    Returns:
        200: List of books currently being read
    """
    try:
        user_service = UserService(db.session)
        books = user_service.get_currently_reading()
        
        return jsonify({
            'success': True,
            'data': books
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting currently reading: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/community/recent-activity', methods=['GET'])
@login_required
def get_recent_activity():
    """
    Get recent reading activity from community members
    
    GET /api/community/recent-activity
    
    Returns:
        200: List of recent reading logs
    """
    try:
        user_service = UserService(db.session)
        activity = user_service.get_recent_activity()
        
        return jsonify({
            'success': True,
            'data': activity
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting recent activity: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/user/<int:user_id>/profile', methods=['GET'])
@login_required
def get_public_user_profile(user_id):
    """
    Get public profile for a user
    
    GET /api/user/<user_id>/profile
    
    Returns:
        200: User profile data
        404: User not found or not sharing
    """
    try:
        user_service = UserService(db.session)
        profile = user_service.get_user_profile(user_id)
        
        if not profile:
            return jsonify({
                'success': False,
                'error': 'User not found or not sharing profile'
            }), 404
        
        return jsonify({
            'success': True,
            'data': profile
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting user profile: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# OpenAPI Documentation
@api.route('/openapi.json', methods=['GET'])
def get_openapi_spec():
    """
    Get OpenAPI specification for the API
    
    GET /api/openapi.json
    
    Returns:
        200: OpenAPI specification
    """
    openapi_spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "BookOracle API",
            "description": "RESTful API for BookOracle - A personal book tracking application",
            "version": "1.0.0",
            "contact": {
                "name": "BookOracle Support"
            }
        },
        "servers": [
            {
                "url": "/api",
                "description": "API server"
            }
        ],
        "components": {
            "securitySchemes": {
                "sessionAuth": {
                    "type": "apiKey",
                    "in": "cookie",
                    "name": "session"
                }
            },
            "schemas": {
                "Book": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "uid": {"type": "string"},
                        "title": {"type": "string"},
                        "author": {"type": "string"},
                        "isbn": {"type": "string"},
                        "cover_url": {"type": "string"},
                        "description": {"type": "string"},
                        "published_date": {"type": "string"},
                        "page_count": {"type": "integer"},
                        "categories": {"type": "string"},
                        "publisher": {"type": "string"},
                        "language": {"type": "string"},
                        "average_rating": {"type": "number"},
                        "rating_count": {"type": "integer"},
                        "start_date": {"type": "string", "format": "date"},
                        "finish_date": {"type": "string", "format": "date"},
                        "want_to_read": {"type": "boolean"},
                        "library_only": {"type": "boolean"},
                        "created_at": {"type": "string", "format": "date-time"}
                    }
                },
                "ReadingLog": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "book_id": {"type": "integer"},
                        "user_id": {"type": "integer"},
                        "date": {"type": "string", "format": "date"},
                        "pages_read": {"type": "integer"},
                        "created_at": {"type": "string", "format": "date-time"}
                    }
                },
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "username": {"type": "string"},
                        "email": {"type": "string"},
                        "is_admin": {"type": "boolean"},
                        "share_current_reading": {"type": "boolean"},
                        "share_reading_activity": {"type": "boolean"},
                        "share_library": {"type": "boolean"},
                        "debug_enabled": {"type": "boolean"}
                    }
                },
                "Error": {
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "error": {"type": "string"}
                    }
                }
            }
        },
        "security": [
            {"sessionAuth": []}
        ],
        "paths": {
            "/books/lookup/{isbn}": {
                "get": {
                    "summary": "Lookup book data by ISBN",
                    "description": "Fetch book information from external APIs using ISBN",
                    "parameters": [
                        {
                            "name": "isbn",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "ISBN of the book to lookup"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Book data found",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "title": {"type": "string"},
                                                    "author": {"type": "string"},
                                                    "isbn": {"type": "string"},
                                                    "cover": {"type": "string"},
                                                    "description": {"type": "string"},
                                                    "published_date": {"type": "string"},
                                                    "page_count": {"type": "integer"},
                                                    "categories": {"type": "string"},
                                                    "publisher": {"type": "string"},
                                                    "language": {"type": "string"},
                                                    "average_rating": {"type": "number"},
                                                    "rating_count": {"type": "integer"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "Book not found",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/books": {
                "get": {
                    "summary": "Get user's books",
                    "description": "Retrieve books for the current user with optional filtering",
                    "parameters": [
                        {
                            "name": "status",
                            "in": "query",
                            "schema": {
                                "type": "string",
                                "enum": ["currently_reading", "finished", "want_to_read", "library_only"]
                            },
                            "description": "Filter by book status"
                        },
                        {
                            "name": "search",
                            "in": "query",
                            "schema": {"type": "string"},
                            "description": "Search term for title, author, or ISBN"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "List of books",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/Book"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "post": {
                    "summary": "Add a new book",
                    "description": "Add a new book to the user's library",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["title", "author"],
                                    "properties": {
                                        "title": {"type": "string"},
                                        "author": {"type": "string"},
                                        "isbn": {"type": "string"},
                                        "cover": {"type": "string"},
                                        "description": {"type": "string"},
                                        "published_date": {"type": "string"},
                                        "page_count": {"type": "integer"},
                                        "categories": {"type": "string"},
                                        "publisher": {"type": "string"},
                                        "language": {"type": "string"},
                                        "average_rating": {"type": "number"},
                                        "rating_count": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "description": "Book added successfully",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {"$ref": "#/components/schemas/Book"},
                                            "message": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            "description": "Invalid data or book already exists",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/books/{uid}": {
                "get": {
                    "summary": "Get a specific book",
                    "description": "Retrieve a specific book by UID",
                    "parameters": [
                        {
                            "name": "uid",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Book UID"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Book data",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {"$ref": "#/components/schemas/Book"}
                                        }
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "Book not found",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                },
                "delete": {
                    "summary": "Delete a book",
                    "description": "Remove a book from the user's library",
                    "parameters": [
                        {
                            "name": "uid",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Book UID"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Book deleted successfully",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "message": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "Book not found",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/books/{uid}/status": {
                "put": {
                    "summary": "Update book status",
                    "description": "Change the status of a book (finished, currently_reading, etc.)",
                    "parameters": [
                        {
                            "name": "uid",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Book UID"
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["status"],
                                    "properties": {
                                        "status": {
                                            "type": "string",
                                            "enum": ["finished", "currently_reading", "want_to_read", "library_only"]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Status updated successfully",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {"$ref": "#/components/schemas/Book"},
                                            "message": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "Book not found",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/books/{uid}/reading-log": {
                "post": {
                    "summary": "Log reading progress",
                    "description": "Record reading progress for a book",
                    "parameters": [
                        {
                            "name": "uid",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Book UID"
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["pages_read"],
                                    "properties": {
                                        "pages_read": {"type": "integer", "minimum": 0},
                                        "date": {"type": "string", "format": "date"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Reading logged successfully",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {"$ref": "#/components/schemas/ReadingLog"},
                                            "message": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "Book not found",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/user/profile": {
                "get": {
                    "summary": "Get user profile",
                    "description": "Retrieve current user's profile information",
                    "responses": {
                        "200": {
                            "description": "User profile data",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {"$ref": "#/components/schemas/User"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "put": {
                    "summary": "Update user profile",
                    "description": "Update current user's profile information",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "username": {"type": "string"},
                                        "email": {"type": "string"},
                                        "share_current_reading": {"type": "boolean"},
                                        "share_reading_activity": {"type": "boolean"},
                                        "share_library": {"type": "boolean"},
                                        "debug_enabled": {"type": "boolean"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Profile updated successfully",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {"$ref": "#/components/schemas/User"},
                                            "message": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            "description": "Invalid data",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/user/statistics": {
                "get": {
                    "summary": "Get user statistics",
                    "description": "Retrieve current user's reading statistics",
                    "responses": {
                        "200": {
                            "description": "User statistics",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "total_books": {"type": "integer"},
                                                    "finished_books": {"type": "integer"},
                                                    "currently_reading": {"type": "integer"},
                                                    "want_to_read": {"type": "integer"},
                                                    "reading_streak": {"type": "integer"},
                                                    "monthly_pages": {"type": "integer"},
                                                    "recent_activity": {
                                                        "type": "array",
                                                        "items": {"$ref": "#/components/schemas/ReadingLog"}
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/user/reading-history": {
                "get": {
                    "summary": "Get reading history",
                    "description": "Retrieve current user's reading history",
                    "responses": {
                        "200": {
                            "description": "Reading history",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/ReadingLog"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/community/activity": {
                "get": {
                    "summary": "Get community activity",
                    "description": "Retrieve community-wide activity statistics",
                    "responses": {
                        "200": {
                            "description": "Community activity data",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "active_readers": {"type": "integer"},
                                                    "books_this_month": {"type": "integer"},
                                                    "currently_reading": {"type": "integer"},
                                                    "recent_activity": {
                                                        "type": "array",
                                                        "items": {"$ref": "#/components/schemas/ReadingLog"}
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/system/settings": {
                "get": {
                    "summary": "Get system settings",
                    "description": "Retrieve system-wide settings (admin only)",
                    "responses": {
                        "200": {
                            "description": "System settings",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "additionalProperties": {"type": "string"}
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                },
                "put": {
                    "summary": "Update system settings",
                    "description": "Update system-wide settings (admin only)",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["key", "value"],
                                    "properties": {
                                        "key": {"type": "string"},
                                        "value": {"type": "string"},
                                        "description": {"type": "string"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Setting updated successfully",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "message": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/books/public": {
                "get": {
                    "summary": "Get public books",
                    "description": "Retrieve books from users who have enabled public library sharing",
                    "parameters": [
                        {
                            "name": "filter",
                            "in": "query",
                            "schema": {
                                "type": "string",
                                "enum": ["currently_reading", "want_to_read", "all"]
                            },
                            "description": "Filter by status (currently_reading, want_to_read, or all)"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "List of public books",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/Book"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/books/search": {
                "get": {
                    "summary": "Search books using Google Books API",
                    "description": "Search for books using the Google Books API",
                    "parameters": [
                        {
                            "name": "q",
                            "in": "query",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Search query (e.g., 'Harry Potter')"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "List of search results",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "properties": {
                                                        "title": {"type": "string"},
                                                        "author": {"type": "string"},
                                                        "cover_url": {"type": "string"},
                                                        "isbn": {"type": "string"},
                                                        "description": {"type": "string"},
                                                        "published_date": {"type": "string"},
                                                        "page_count": {"type": "integer"},
                                                        "publisher": {"type": "string"},
                                                        "language": {"type": "string"},
                                                        "categories": {"type": "array", "items": {"type": "string"}},
                                                        "average_rating": {"type": "number"},
                                                        "rating_count": {"type": "integer"}
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            "description": "Query parameter is required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/reports/month-wrapup/{year}/{month}": {
                "get": {
                    "summary": "Get month wrapup report",
                    "description": "Retrieve a report for a specific month showing finished books and reading logs",
                    "parameters": [
                        {
                            "name": "year",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "Year of the month"
                        },
                        {
                            "name": "month",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "Month of the year"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Month wrapup report",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "year": {"type": "integer"},
                                                    "month": {"type": "integer"},
                                                    "month_name": {"type": "string"},
                                                    "finished_books": {
                                                        "type": "array",
                                                        "items": {"$ref": "#/components/schemas/Book"}
                                                    },
                                                    "reading_logs": {
                                                        "type": "array",
                                                        "items": {"$ref": "#/components/schemas/ReadingLog"}
                                                    },
                                                    "statistics": {
                                                        "type": "object",
                                                        "properties": {
                                                            "total_pages_read": {"type": "integer"},
                                                            "total_books_finished": {"type": "integer"},
                                                            "total_reading_days": {"type": "integer"},
                                                            "reading_streak": {"type": "integer"},
                                                            "average_pages_per_day": {"type": "number"}
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/admin/users": {
                "get": {
                    "summary": "Get all users (admin only)",
                    "description": "Retrieve a paginated list of all users (admin only)",
                    "parameters": [
                        {
                            "name": "page",
                            "in": "query",
                            "schema": {"type": "integer"},
                            "description": "Page number (default: 1)"
                        },
                        {
                            "name": "search",
                            "in": "query",
                            "schema": {"type": "string"},
                            "description": "Search term for username or email"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "List of users",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "users": {
                                                        "type": "array",
                                                        "items": {"$ref": "#/components/schemas/User"}
                                                    },
                                                    "pagination": {
                                                        "type": "object",
                                                        "properties": {
                                                            "page": {"type": "integer"},
                                                            "per_page": {"type": "integer"},
                                                            "total": {"type": "integer"},
                                                            "pages": {"type": "integer"},
                                                            "has_next": {"type": "boolean"},
                                                            "has_prev": {"type": "boolean"}
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/users/{user_id}": {
                "get": {
                    "summary": "Get specific user details (admin only)",
                    "description": "Retrieve detailed information for a specific user (admin only)",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "ID of the user to get"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "User details",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {"$ref": "#/components/schemas/User"}
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/users/{user_id}/toggle-admin": {
                "post": {
                    "summary": "Toggle admin status for a user (admin only)",
                    "description": "Toggle the admin status of a specific user (admin only)",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "ID of the user to toggle"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Admin status toggled",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "user_id": {"type": "integer"},
                                                    "is_admin": {"type": "boolean"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/users/{user_id}/toggle-active": {
                "post": {
                    "summary": "Toggle active status for a user (admin only)",
                    "description": "Toggle the active status of a specific user (admin only)",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "ID of the user to toggle"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Active status toggled",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "user_id": {"type": "integer"},
                                                    "is_active": {"type": "boolean"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/users/{user_id}/delete": {
                "post": {
                    "summary": "Delete a user (admin only)",
                    "description": "Delete a specific user (admin only)",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "ID of the user to delete"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "User deleted",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "user_id": {"type": "integer"},
                                                    "message": {"type": "string"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/users/{user_id}/reset-password": {
                "post": {
                    "summary": "Reset password for a user (admin only)",
                    "description": "Reset the password for a specific user (admin only)",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "ID of the user to reset password for"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Password reset",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "user_id": {"type": "integer"},
                                                    "new_password": {"type": "string"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/users/{user_id}/unlock": {
                "post": {
                    "summary": "Unlock a user account (admin only)",
                    "description": "Unlock a specific user account (admin only)",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"},
                            "description": "ID of the user to unlock"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Account unlocked",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "user_id": {"type": "integer"},
                                                    "message": {"type": "string"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/backup": {
                "post": {
                    "summary": "Create database backup (admin only)",
                    "description": "Create a database backup (admin only)",
                    "responses": {
                        "200": {
                            "description": "Backup created",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "message": {"type": "string"},
                                                    "timestamp": {"type": "string", "format": "date-time"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            "description": "Backup failed",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/admin/backup/status": {
                "get": {
                    "summary": "Get backup status (admin only)",
                    "description": "Retrieve the status of the last database backup (admin only)",
                    "responses": {
                        "200": {
                            "description": "Backup status",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "success": {"type": "boolean"},
                                            "data": {
                                                "type": "object",
                                                "properties": {
                                                    "last_backup": {"type": "string", "format": "date-time"},
                                                    "backup_size": {"type": "integer"},
                                                    "status": {"type": "string"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "403": {
                            "description": "Admin access required",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return jsonify(openapi_spec)


# System endpoints
@api.route('/system/settings', methods=['GET'])
@login_required
def get_system_settings():
    """
    Get system-wide settings
    
    GET /api/system/settings
    
    Returns:
        200: System settings
    """
    try:
        if not current_user.is_admin:
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        user_service = UserService(db.session)
        settings = user_service.get_system_settings()
        
        return jsonify({
            'success': True,
            'data': settings
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting system settings: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/system/settings', methods=['PUT'])
@login_required
def update_system_settings():
    """
    Update system-wide settings
    
    PUT /api/system/settings
    Body: {
        "key": "setting_key",
        "value": "setting_value",
        "description": "Setting description"
    }
    
    Returns:
        200: Setting updated successfully
        403: Admin access required
    """
    try:
        if not current_user.is_admin:
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        data = request.get_json()
        if not data or 'key' not in data or 'value' not in data:
            return jsonify({
                'success': False,
                'error': 'key and value are required'
            }), 400
        
        user_service = UserService(db.session)
        user_service.set_system_setting(
            data['key'],
            data['value'],
            data.get('description'),
            current_user.id
        )
        
        return jsonify({
            'success': True,
            'message': 'System setting updated successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating system settings: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# Admin endpoints
@api.route('/admin/stats', methods=['GET'])
@login_required
def get_admin_stats():
    """
    Get admin dashboard statistics
    
    GET /api/admin/stats
    
    Returns:
        200: Admin statistics
        403: Admin access required
    """
    try:
        if not current_user.is_admin:
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import func
        
        # Get system statistics
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        admin_users = User.query.filter_by(is_admin=True).count()
        total_books = Book.query.count()
        
        # Users registered in last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()
        
        # Books added in last 30 days
        new_books_30d = Book.query.filter(Book.created_at >= thirty_days_ago).count()
        
        # Most active users (by book count)
        top_users = db.session.query(
            User.username,
            func.count(Book.id).label('book_count')
        ).join(Book).group_by(User.id).order_by(func.count(Book.id).desc()).limit(5).all()
        
        stats = {
            'total_users': total_users,
            'active_users': active_users,
            'admin_users': admin_users,
            'total_books': total_books,
            'new_users_30d': new_users_30d,
            'new_books_30d': new_books_30d,
            'top_users': [{'username': user.username, 'book_count': user.book_count} for user in top_users]
        }
        
        return jsonify({
            'success': True,
            'data': stats
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting admin stats: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@api.route('/admin/users/recent', methods=['GET'])
@login_required
def get_recent_users():
    """
    Get recent user registrations
    
    GET /api/admin/users/recent
    
    Returns:
        200: Recent users list
        403: Admin access required
    """
    try:
        if not current_user.is_admin:
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        from datetime import datetime, timedelta, timezone
        
        # Get recent user registrations (last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_users = User.query.filter(User.created_at >= thirty_days_ago).order_by(User.created_at.desc()).limit(10).all()
        
        users_data = []
        for user in recent_users:
            # Get user's book count
            book_count = Book.query.filter_by(user_id=user.id).count()
            
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'book_count': book_count
            })
        
        return jsonify({
            'success': True,
            'data': users_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting recent users: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500 

@api.route('/books/public', methods=['GET'])
@login_required
def get_public_books():
    """Get public books from all users who have enabled sharing"""
    filter_status = request.args.get('filter', 'all')
    
    # Query books from users who have enabled public library sharing
    books_query = db.session.query(Book).join(User).filter(
        User.share_library == True,
        Book.library_only.isnot(True)
    )
    
    if filter_status == 'currently_reading':
        books_query = books_query.filter(
            Book.finish_date.is_(None),
            Book.want_to_read.isnot(True),
            Book.library_only.isnot(True)
        )
    elif filter_status == 'want_to_read':
        books_query = books_query.filter(Book.want_to_read.is_(True))
    else:  # Default "Show All" case
        books_query = books_query.order_by(Book.finish_date.desc().nullslast(), Book.id.desc())
    
    books = books_query.all()
    
    return jsonify({
        'success': True,
        'data': [book.to_dict() for book in books]
    })

@api.route('/books/search', methods=['GET'])
@login_required
def search_books():
    """Search books using Google Books API with pagination"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'success': False, 'error': 'Query parameter is required'}), 400

    # Pagination params
    try:
        page = int(request.args.get('page', 1))
    except ValueError:
        page = 1
    try:
        page_size = int(request.args.get('pageSize', 20))
    except ValueError:
        page_size = 20
    # Google Books maxResults between 1 and 40
    page_size = max(1, min(page_size, 40))
    page = max(1, page)
    start_index = (page - 1) * page_size

    try:
        # Google Books API search
        resp = requests.get(
            'https://www.googleapis.com/books/v1/volumes',
            params={'q': query, 'maxResults': page_size, 'startIndex': start_index}
        )
        data = resp.json()

        results = []
        for item in data.get('items', []):
            volume_info = item.get('volumeInfo', {})
            image = volume_info.get('imageLinks', {}).get('thumbnail')
            isbn = None
            for iden in volume_info.get('industryIdentifiers', []):
                if iden['type'] in ('ISBN_13', 'ISBN_10'):
                    isbn = iden['identifier']
                    break

            results.append({
                'title': volume_info.get('title'),
                'author': ', '.join(volume_info.get('authors', [])),
                'cover_url': image,
                'isbn': isbn,
                'description': volume_info.get('description'),
                'published_date': volume_info.get('publishedDate'),
                'page_count': volume_info.get('pageCount'),
                'publisher': volume_info.get('publisher'),
                'language': volume_info.get('language'),
                'categories': volume_info.get('categories', []),
                'average_rating': volume_info.get('averageRating'),
                'rating_count': volume_info.get('ratingsCount')
            })

        total_items = data.get('totalItems', len(results))
        total_pages = (total_items + page_size - 1) // page_size if total_items else 1

        return jsonify({
            'success': True,
            'data': {
                'items': results,
                'total': total_items,
                'page': page,
                'page_size': page_size,
                'pages': total_pages
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'Search failed: {str(e)}'}), 500

@api.route('/reports/month-wrapup/<int:year>/<int:month>', methods=['GET'])
@login_required
def get_month_wrapup(year, month):
    """Get month wrapup report for a specific month"""
    try:
        # Get the first and last day of the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        
        # Get books finished in this month
        finished_books = Book.query.filter(
            Book.user_id == current_user.id,
            Book.finish_date >= start_date,
            Book.finish_date <= end_date
        ).all()
        
        # Get reading logs for this month
        reading_logs = ReadingLog.query.filter(
            ReadingLog.user_id == current_user.id,
            ReadingLog.date >= start_date,
            ReadingLog.date <= end_date
        ).all()
        
        # Calculate statistics
        total_pages_read = sum(log.pages_read for log in reading_logs)
        total_books_finished = len(finished_books)
        total_reading_days = len(set(log.date for log in reading_logs))
        
        # Get reading streak
        reading_streak = current_user.get_reading_streak()
        
        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'month': month,
                'month_name': start_date.strftime('%B'),
                'finished_books': [book.to_dict() for book in finished_books],
                'reading_logs': [log.to_dict() for log in reading_logs],
                'statistics': {
                    'total_pages_read': total_pages_read,
                    'total_books_finished': total_books_finished,
                    'total_reading_days': total_reading_days,
                    'reading_streak': reading_streak,
                    'average_pages_per_day': total_pages_read / total_reading_days if total_reading_days > 0 else 0
                }
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate month wrapup: {str(e)}'
        }), 500

@api.route('/admin/users', methods=['GET'])
@login_required
def get_users():
    """Get all users (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '', type=str)
    per_page = 20
    
    # Build query with optional search
    query = User.query
    if search:
        query = query.filter(
            db.or_(
                User.username.contains(search),
                User.email.contains(search)
            )
        )
    
    # Paginate results
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    users = pagination.items
    
    return jsonify({
        'success': True,
        'data': {
            'users': [user.to_dict() for user in users],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }
    })

@api.route('/admin/users/<int:user_id>', methods=['GET'])
@login_required
def get_user(user_id):
    """Get specific user details (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    user = User.query.get_or_404(user_id)
    return jsonify({
        'success': True,
        'data': user.to_dict()
    })

@api.route('/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
@login_required
def toggle_user_admin(user_id):
    """Toggle admin status for a user (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    user = User.query.get_or_404(user_id)
    user.is_admin = not user.is_admin
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'user_id': user_id,
            'is_admin': user.is_admin
        }
    })

@api.route('/admin/users/<int:user_id>/toggle-active', methods=['POST'])
@login_required
def toggle_user_active(user_id):
    """Toggle active status for a user (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'user_id': user_id,
            'is_active': user.is_active
        }
    })

@api.route('/admin/users/<int:user_id>/toggle-pro', methods=['POST'])
@login_required
def toggle_user_pro(user_id):
    """Toggle pro status for a user (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    user = User.query.get_or_404(user_id)
    # SQLite stores as int; but bool works in SQLAlchemy
    user.is_pro = not bool(getattr(user, 'is_pro', False))
    db.session.commit()
    return jsonify({
        'success': True,
        'data': {
            'user_id': user_id,
            'is_pro': bool(user.is_pro)
        }
    })

@api.route('/admin/users/<int:user_id>/delete', methods=['POST'])
@login_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    user = User.query.get_or_404(user_id)
    
    # Don't allow admin to delete themselves
    if user.id == current_user.id:
        return jsonify({
            'success': False,
            'error': 'Cannot delete your own account'
        }), 400
    
    # Delete user's books and reading logs
    Book.query.filter_by(user_id=user_id).delete()
    ReadingLog.query.filter_by(user_id=user_id).delete()
    
    # Delete the user
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'user_id': user_id,
            'message': 'User deleted successfully'
        }
    })

@api.route('/admin/users/<int:user_id>/reset-password', methods=['POST'])
@login_required
def reset_user_password(user_id):
    """Reset password for a user (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    user = User.query.get_or_404(user_id)
    
    # Generate a new password
    new_password = secrets.token_urlsafe(8)
    user.set_password(new_password)
    user.force_password_change = True
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'user_id': user_id,
            'new_password': new_password
        }
    })

@api.route('/admin/users/<int:user_id>/unlock', methods=['POST'])
@login_required
def unlock_user_account(user_id):
    """Unlock a user account (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    user = User.query.get_or_404(user_id)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'user_id': user_id,
            'message': 'Account unlocked successfully'
        }
    })

@api.route('/admin/backup', methods=['POST'])
@login_required
def create_backup():
    """Create database backup (admin only)"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'error': 'Admin access required'}), 403

    try:
        import os
        from shutil import copy2
        
        data_dir = os.path.join(os.getcwd(), 'data')
        os.makedirs(data_dir, exist_ok=True)
        db_path = os.path.join(data_dir, 'bookoracle.db')
        if not os.path.exists(db_path):
            return jsonify({'success': False, 'error': 'Database file not found'}), 404

        backups_dir = os.path.join(data_dir, 'backups')
        os.makedirs(backups_dir, exist_ok=True)

        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'bookoracle_backup_{ts}.db'
        backup_path = os.path.join(backups_dir, backup_filename)
        copy2(db_path, backup_path)

        size_bytes = os.path.getsize(backup_path)

        # Persist last backup info in a simple marker file
        marker_path = os.path.join(backups_dir, 'last_backup.txt')
        with open(marker_path, 'w', encoding='utf-8') as f:
            f.write(f'{backup_filename}\n{size_bytes}\n{datetime.now(timezone.utc).isoformat()}')

        return jsonify({
            'success': True,
            'data': {
                'message': 'Backup created successfully',
                'filename': backup_filename,
                'size_bytes': size_bytes,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'Backup failed: {str(e)}'}), 500

@api.route('/admin/users', methods=['POST'])
@login_required
def create_user():
    """Create a new user (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({
            'success': False,
            'error': 'Username, email, and password are required'
        }), 400
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({
            'success': False,
            'error': 'Username already exists'
        }), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({
            'success': False,
            'error': 'Email already exists'
        }), 400
    
    try:
        user = User(username=username, email=email)
        user.set_password(password)
        user.password_must_change = True  # Require password change on first login
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'user': user.to_dict(),
                'message': 'User created successfully'
            }
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to create user: {str(e)}'
        }), 500

@api.route('/admin/backup/download', methods=['GET'])
@login_required
def download_backup():
    """Download database backup (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    try:
        import os
        from flask import send_file
        
        data_dir = os.path.join(os.getcwd(), 'data')
        db_path = os.path.join(data_dir, 'bookoracle.db')
        backups_dir = os.path.join(data_dir, 'backups')
        os.makedirs(data_dir, exist_ok=True)

        if not os.path.exists(db_path):
            return jsonify({'success': False, 'error': 'Database file not found'}), 404

        # Prefer the most recent backup file if it exists
        latest_file_path = None
        latest_mtime = -1
        if os.path.exists(backups_dir):
            for fname in os.listdir(backups_dir):
                if fname.endswith('.db'):
                    fpath = os.path.join(backups_dir, fname)
                    try:
                        mtime = os.path.getmtime(fpath)
                        if mtime > latest_mtime:
                            latest_mtime = mtime
                            latest_file_path = fpath
                    except Exception:
                        pass

        file_path = latest_file_path if latest_file_path else db_path
        download_name = os.path.basename(file_path) if latest_file_path else f"bookoracle_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

        return send_file(
            file_path,
            as_attachment=True,
            download_name=download_name,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Download failed: {str(e)}'
        }), 500

@api.route('/admin/backup/status', methods=['GET'])
@login_required
def get_backup_status():
    """Get backup status (admin only)"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'error': 'Admin access required'}), 403

    import os
    backups_dir = os.path.join(os.getcwd(), 'data', 'backups')
    marker_path = os.path.join(backups_dir, 'last_backup.txt')
    last_backup = None
    backup_size = 0
    status = 'no_backups'

    if os.path.exists(marker_path):
        try:
            with open(marker_path, 'r', encoding='utf-8') as f:
                lines = [l.strip() for l in f.readlines()]
            if len(lines) >= 3:
                last_backup = lines[2]
                backup_size = int(lines[1])
                status = 'ok'
        except Exception:
            status = 'error'

    return jsonify({'success': True, 'data': {'last_backup': last_backup, 'backup_size': backup_size, 'status': status}})


# Invite Token Management (Admin only)
@api.route('/admin/invites', methods=['GET'])
@login_required
def get_invites():
    """Get all invite tokens (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    try:
        invites = InviteToken.query.order_by(InviteToken.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': invite.id,
                'token': invite.token,
                'email': invite.email,
                'created_by': invite.created_by,
                'created_at': invite.created_at.isoformat(),
                'expires_at': invite.expires_at.isoformat() if invite.expires_at else None,
                'is_used': invite.is_used,
                'used_by': invite.used_by,
                'used_at': invite.used_at.isoformat() if invite.used_at else None,
                'is_valid': invite.is_valid()
            } for invite in invites]
        })
    except Exception as e:
        current_app.logger.error(f"Error getting invites: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get invites'
        }), 500


@api.route('/admin/invites', methods=['POST'])
@login_required
def create_invite():
    """Create a new invite token (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    try:
        data = request.get_json()
        email = data.get('email')  # Optional
        expires_in_days = data.get('expires_in_days', 30)
        
        invite = InviteToken(
            created_by=current_user.id,
            email=email,
            expires_in_days=expires_in_days
        )
        
        db.session.add(invite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': invite.id,
                'token': invite.token,
                'email': invite.email,
                'created_at': invite.created_at.isoformat(),
                'expires_at': invite.expires_at.isoformat() if invite.expires_at else None
            }
        })
    except Exception as e:
        current_app.logger.error(f"Error creating invite: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to create invite'
        }), 500


@api.route('/admin/invites/<int:invite_id>', methods=['DELETE'])
@login_required
def delete_invite(invite_id):
    """Delete an invite token (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    try:
        invite = InviteToken.query.get_or_404(invite_id)
        db.session.delete(invite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Invite deleted successfully'
        })
    except Exception as e:
        current_app.logger.error(f"Error deleting invite: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete invite'
        }), 500


# User Invite Token Management
@api.route('/user/invites', methods=['GET'])
@login_required
def get_user_invites():
    """Get current user's invite tokens"""
    try:
        # Get user's invite token stats
        user_stats = {
            'remaining': current_user.invite_tokens_remaining,
            'granted': current_user.invite_tokens_granted,
            'used': current_user.invite_tokens_used,
            'can_create': current_user.can_create_invite()
        }
        
        # Get user's created invites
        user_invites = InviteToken.query.filter_by(created_by=current_user.id).order_by(InviteToken.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': {
                'stats': user_stats,
                'invites': [{
                    'id': invite.id,
                    'token': invite.token,
                    'email': invite.email,
                    'created_at': invite.created_at.isoformat(),
                    'expires_at': invite.expires_at.isoformat() if invite.expires_at else None,
                    'is_used': invite.is_used,
                    'used_by': invite.used_by,
                    'used_at': invite.used_at.isoformat() if invite.used_at else None,
                    'is_valid': invite.is_valid()
                } for invite in user_invites]
            }
        })
    except Exception as e:
        current_app.logger.error(f"Error getting user invites: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get user invites'
        }), 500


@api.route('/user/invites', methods=['POST'])
@login_required
def create_user_invite():
    """Create a new invite token (user)"""
    try:
        # Check if user has tokens remaining
        if not current_user.can_create_invite():
            return jsonify({
                'success': False,
                'error': 'No invite tokens remaining. Contact an administrator to get more tokens.'
            }), 400
        
        data = request.get_json()
        email = data.get('email')  # Optional
        expires_in_days = data.get('expires_in_days', 30)
        
        # Use one of the user's tokens
        if not current_user.use_invite_token():
            return jsonify({
                'success': False,
                'error': 'Failed to use invite token'
            }), 500
        
        invite = InviteToken(
            created_by=current_user.id,
            email=email,
            expires_in_days=expires_in_days
        )
        
        db.session.add(invite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': invite.id,
                'token': invite.token,
                'email': invite.email,
                'created_at': invite.created_at.isoformat(),
                'expires_at': invite.expires_at.isoformat() if invite.expires_at else None,
                'remaining_tokens': current_user.invite_tokens_remaining
            }
        })
    except Exception as e:
        current_app.logger.error(f"Error creating user invite: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to create invite'
        }), 500


@api.route('/user/invites/<int:invite_id>', methods=['DELETE'])
@login_required
def delete_user_invite(invite_id):
    """Delete user's own invite token"""
    try:
        invite = InviteToken.query.filter_by(id=invite_id, created_by=current_user.id).first()
        if not invite:
            return jsonify({
                'success': False,
                'error': 'Invite not found or access denied'
            }), 404
        
        db.session.delete(invite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Invite deleted successfully'
        })
    except Exception as e:
        current_app.logger.error(f"Error deleting user invite: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete invite'
        }), 500


# Admin User Invite Token Management
@api.route('/admin/users/<int:user_id>/grant-tokens', methods=['POST'])
@login_required
def grant_user_tokens(user_id):
    """Grant invite tokens to a user (admin only)"""
    if not current_user.is_admin:
        return jsonify({
            'success': False,
            'error': 'Admin access required'
        }), 403
    
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        count = data.get('count', 1)
        
        if count <= 0:
            return jsonify({
                'success': False,
                'error': 'Token count must be positive'
            }), 400
        
        user.grant_invite_tokens(count)
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': user.id,
                'username': user.username,
                'tokens_granted': count,
                'remaining_tokens': user.invite_tokens_remaining,
                'total_granted': user.invite_tokens_granted
            }
        })
    except Exception as e:
        current_app.logger.error(f"Error granting tokens: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to grant tokens'
        }), 500


# Profile Picture Upload
@api.route('/user/profile-picture', methods=['POST'])
@login_required
def upload_profile_picture():
    """Upload a profile picture for the current user"""
    try:
        if 'profile_picture' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['profile_picture']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP'
            }), 400
        
        # Validate file size (max 5MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            return jsonify({
                'success': False,
                'error': 'File too large. Maximum size is 5MB'
            }), 400
        
        # Generate unique filename
        import os
        import uuid
        from werkzeug.utils import secure_filename
        
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"profile_{current_user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'profiles')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Remove previous uploaded profile if present
        try:
            if current_user.profile_picture and current_user.profile_picture.startswith('/static/uploads/profiles/'):
                old_path = os.path.join(current_app.root_path, current_user.profile_picture.lstrip('/'))
                if os.path.exists(old_path):
                    os.remove(old_path)
        except Exception:
            pass

        # Save file
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # Update user's profile picture
        profile_url = f'/static/uploads/profiles/{unique_filename}'
        current_user.profile_picture = profile_url
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'profile_picture': profile_url
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error uploading profile picture: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to upload profile picture'
        }), 500


@api.route('/user/profile-picture', methods=['DELETE'])
@login_required
def delete_profile_picture():
    """Delete the current user's profile picture"""
    try:
        if current_user.profile_picture:
            # Remove the file
            import os
            file_path = os.path.join(current_app.root_path, current_user.profile_picture.lstrip('/'))
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Clear the database field
            current_user.profile_picture = None
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile picture deleted successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"Error deleting profile picture: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete profile picture'
        }), 500


# Book Rating System
@api.route('/books/<int:book_id>/rate', methods=['POST'])
@login_required
def rate_book(book_id):
    """Rate a book (1-5 stars)"""
    try:
        book = Book.query.get_or_404(book_id)
        
        # Check if user owns the book or if it's a shared book
        if book.user_id != current_user.id and not book.shared_book_id:
            return jsonify({
                'success': False,
                'error': 'You can only rate books in your library'
            }), 403
        
        data = request.get_json()
        rating = data.get('rating')
        review = data.get('review')
        
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({
                'success': False,
                'error': 'Rating must be an integer between 1 and 5'
            }), 400
        
        # Check if user already rated this book
        existing_rating = UserRating.query.filter_by(
            user_id=current_user.id, 
            book_id=book_id
        ).first()
        
        if existing_rating:
            # Update existing rating
            existing_rating.rating = rating
            existing_rating.review = review
            existing_rating.updated_at = datetime.now(timezone.utc)
            db.session.commit()
        else:
            # Create new rating
            new_rating = UserRating(
                user_id=current_user.id,
                book_id=book_id,
                rating=rating,
                review=review
            )
            db.session.add(new_rating)
            db.session.commit()
        
        # Update book's average rating
        book.update_average_rating()
        
        return jsonify({
            'success': True,
            'data': {
                'rating': rating,
                'review': review,
                'average_rating': book.average_rating,
                'rating_count': book.rating_count
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error rating book: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to rate book'
        }), 500


@api.route('/books/<int:book_id>/rate', methods=['GET'])
@login_required
def get_book_rating(book_id):
    """Get the current user's rating for a book"""
    try:
        book = Book.query.get_or_404(book_id)
        user_rating = book.get_user_rating(current_user.id)
        
        return jsonify({
            'success': True,
            'data': {
                'user_rating': user_rating.to_dict() if user_rating else None,
                'average_rating': book.average_rating,
                'rating_count': book.rating_count
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting book rating: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get book rating'
        }), 500


@api.route('/books/<int:book_id>/rate', methods=['DELETE'])
@login_required
def delete_book_rating(book_id):
    """Delete the current user's rating for a book"""
    try:
        book = Book.query.get_or_404(book_id)
        user_rating = book.get_user_rating(current_user.id)
        
        if user_rating:
            db.session.delete(user_rating)
            db.session.commit()
            
            # Update book's average rating
            book.update_average_rating()
        
        return jsonify({
            'success': True,
            'message': 'Rating deleted successfully',
            'data': {
                'average_rating': book.average_rating,
                'rating_count': book.rating_count
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error deleting book rating: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete rating'
        }), 500


@api.route('/books/<int:book_id>/ratings', methods=['GET'])
def get_book_ratings(book_id):
    """Get all ratings for a book (public endpoint)"""
    try:
        book = Book.query.get_or_404(book_id)
        ratings = UserRating.query.filter_by(book_id=book_id).order_by(UserRating.created_at.desc()).all()
        
        # Get user info for each rating
        rating_data = []
        for rating in ratings:
            user = User.query.get(rating.user_id)
            rating_data.append({
                'id': rating.id,
                'rating': rating.rating,
                'review': rating.review,
                'created_at': rating.created_at.isoformat() if rating.created_at else None,
                'user': {
                    'id': user.id,
                    'username': user.username
                } if user else None
            })
        
        return jsonify({
            'success': True,
            'data': {
                'ratings': rating_data,
                'average_rating': book.average_rating,
                'rating_count': book.rating_count
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting book ratings: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get book ratings'
        }), 500