"""
API Blueprint - RESTful API endpoints for BookOracle
Uses service layer for business logic separation
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user, login_user, logout_user
from datetime import date, datetime, timezone
from typing import Dict, Any

from .services.book_service import BookService, BookNotFoundError
from .services.user_service import UserService, UserNotFoundError
from .models import db, User, Book

api = Blueprint('api', __name__, url_prefix='/api')


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
        
        filters = {}
        if status:
            filters['status'] = status
        if search:
            filters['search'] = search
        
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
                'created_at': current_user.created_at.isoformat() if current_user.created_at else None,
                'share_current_reading': current_user.share_current_reading,
                'share_reading_activity': current_user.share_reading_activity,
                'share_library': current_user.share_library,
                'debug_enabled': current_user.debug_enabled
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