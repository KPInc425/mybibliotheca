"""
BookService - Core business logic for book operations
Extracted from Flask routes to enable API-first architecture
"""

from typing import Optional, Dict, List, Any
from datetime import datetime, date
import secrets
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from ..models import Book, User, SharedBookData, ReadingLog, db
from ..utils import fetch_book_data, get_google_books_cover, ensure_https_url, standardize_categories


class BookNotFoundError(Exception):
    """Raised when a book is not found"""
    pass


class BookService:
    """Service class for book-related operations"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    def lookup_isbn(self, isbn: str) -> Dict[str, Any]:
        """
        Lookup book data by ISBN from external APIs
        
        Args:
            isbn: The ISBN to lookup
            
        Returns:
            Dict containing book data
            
        Raises:
            BookNotFoundError: If book is not found in any API
        """
        # Clean ISBN
        isbn = self._clean_isbn(isbn)
        
        # Check existing book in database
        existing = self._get_existing_book(isbn)
        if existing:
            return existing
        
        # Try Google Books API first for comprehensive metadata
        google_data = get_google_books_cover(isbn, fetch_title_author=True)
        
        if google_data and (google_data.get('title') or google_data.get('author')):
            # Use Google Books data if it has any useful information
            book_data = google_data
        else:
            # Fallback to OpenLibrary data
            book_data = fetch_book_data(isbn) or {}
        
        # Ensure we have a cover URL
        if not book_data.get('cover'):
            google_cover = get_google_books_cover(isbn)
            if google_cover:
                book_data['cover'] = google_cover
        
        # If neither source provides a cover, set a default
        if not book_data.get('cover'):
            book_data['cover'] = '/static/bookshelf.png'
        
        # Ensure cover URL is HTTPS for native app compatibility
        if book_data.get('cover'):
            book_data['cover'] = ensure_https_url(book_data['cover'])
        
        if not book_data.get('title') and not book_data.get('author'):
            raise BookNotFoundError(f"Book with ISBN {isbn} not found")
        
        return book_data
    
    def add_book(self, user_id: int, book_data: Dict[str, Any]) -> Book:
        """
        Add a new book to user's library
        
        Args:
            user_id: ID of the user adding the book
            book_data: Book data from API lookup
            
        Returns:
            The created Book object
        """
        # Check if book already exists for this user
        existing_book = self._get_user_book_by_isbn(user_id, book_data.get('isbn'))
        if existing_book:
            raise ValueError(f"Book with ISBN {book_data.get('isbn')} already exists in your library")
        
        # Create or get shared book data
        shared_book = self._get_or_create_shared_book(book_data, user_id)
        
        # Create the book
        book = Book(
            title=book_data['title'],
            author=book_data['author'],
            user_id=user_id,
            isbn=book_data.get('isbn'),
            shared_book_id=shared_book.id if shared_book else None,
            cover_url=book_data.get('cover'),
            description=book_data.get('description'),
            published_date=book_data.get('published_date'),
            page_count=book_data.get('page_count'),
            categories=standardize_categories(book_data.get('categories')),
            publisher=book_data.get('publisher'),
            language=book_data.get('language'),
            average_rating=book_data.get('average_rating'),
            rating_count=book_data.get('rating_count')
        )
        
        self.db.add(book)
        self.db.commit()
        
        return book
    
    def get_user_books(self, user_id: int, filters: Optional[Dict[str, Any]] = None) -> List[Book]:
        """
        Get all books for a user with optional filtering
        
        Args:
            user_id: ID of the user
            filters: Optional filters (status, search, etc.)
            
        Returns:
            List of Book objects
        """
        query = Book.query.filter_by(user_id=user_id)
        
        if filters:
            if filters.get('status'):
                status = filters['status']
                if status == 'currently_reading':
                    query = query.filter(and_(Book.finish_date.is_(None), 
                                           Book.want_to_read == False,
                                           Book.library_only == False))
                elif status == 'finished':
                    query = query.filter(Book.finish_date.isnot(None))
                elif status == 'want_to_read':
                    query = query.filter(Book.want_to_read == True)
                elif status == 'library_only':
                    query = query.filter(Book.library_only == True)

            # Owned filter (ownedOnly)
            owned_val = filters.get('owned') or filters.get('ownedOnly')
            if isinstance(owned_val, str):
                owned_val = owned_val.lower() in ('1', 'true', 'yes')
            if owned_val is True:
                query = query.filter(Book.owned == True)
            
            if filters.get('search'):
                search_term = f"%{filters['search']}%"
                query = query.filter(or_(Book.title.ilike(search_term),
                                       Book.author.ilike(search_term),
                                       Book.isbn.ilike(search_term)))
        
        return query.order_by(Book.created_at.desc()).all()
    
    def get_book_by_uid(self, uid: str, user_id: int) -> Optional[Book]:
        """
        Get a specific book by UID for a user
        
        Args:
            uid: Book UID
            user_id: ID of the user
            
        Returns:
            Book object or None if not found
        """
        return Book.query.filter_by(uid=uid, user_id=user_id).first()

    def update_book_fields(self, uid: str, user_id: int, fields: Dict[str, Any]) -> Book:
        """Generic update for simple boolean/string fields like owned, want_to_read, library_only, etc."""
        book = self.get_book_by_uid(uid, user_id)
        if not book:
            raise BookNotFoundError(f"Book with UID {uid} not found")

        allowed_fields = {'owned', 'want_to_read', 'library_only', 'cover_url', 'description', 'publisher', 'language', 'categories', 'published_date', 'format'}
        for key, value in fields.items():
            if key in allowed_fields:
                setattr(book, key, value)

        self.db.commit()
        return book
    
    def update_book_status(self, uid: str, user_id: int, status: str) -> Book:
        """
        Update book status (finished, want_to_read, etc.)
        
        Args:
            uid: Book UID
            user_id: ID of the user
            status: New status
            
        Returns:
            Updated Book object
        """
        book = self.get_book_by_uid(uid, user_id)
        if not book:
            raise BookNotFoundError(f"Book with UID {uid} not found")
        
        if status == 'finished':
            book.finish_date = date.today()
            book.want_to_read = False
        elif status == 'currently_reading':
            book.finish_date = None
            book.want_to_read = False
            book.library_only = False
        elif status == 'want_to_read':
            book.want_to_read = True
            book.library_only = False
        elif status == 'library_only':
            book.library_only = True
            book.want_to_read = False
        
        self.db.commit()
        return book
    
    def delete_book(self, uid: str, user_id: int) -> bool:
        """
        Delete a book from user's library
        
        Args:
            uid: Book UID
            user_id: ID of the user
            
        Returns:
            True if deleted, False if not found
        """
        book = self.get_book_by_uid(uid, user_id)
        if not book:
            return False
        
        self.db.delete(book)
        self.db.commit()
        return True
    
    def log_reading(self, uid: str, user_id: int, pages_read: int, log_date: Optional[date] = None) -> ReadingLog:
        """
        Log reading progress for a book
        
        Args:
            uid: Book UID
            user_id: ID of the user
            pages_read: Number of pages read
            log_date: Date of reading (defaults to today)
            
        Returns:
            Created ReadingLog object
        """
        book = self.get_book_by_uid(uid, user_id)
        if not book:
            raise BookNotFoundError(f"Book with UID {uid} not found")
        
        if log_date is None:
            log_date = date.today()
        
        # Check if log already exists for this date
        existing_log = ReadingLog.query.filter_by(
            book_id=book.id,
            user_id=user_id,
            date=log_date
        ).first()
        
        if existing_log:
            existing_log.pages_read = pages_read
            self.db.commit()
            return existing_log
        
        # Create new log
        reading_log = ReadingLog(
            book_id=book.id,
            user_id=user_id,
            date=log_date,
            pages_read=pages_read
        )
        
        self.db.add(reading_log)
        self.db.commit()
        
        return reading_log
    
    def _clean_isbn(self, isbn: str) -> str:
        """Clean ISBN by removing non-alphanumeric characters"""
        return ''.join(c for c in isbn if c.isalnum())
    
    def _get_existing_book(self, isbn: str) -> Optional[Dict[str, Any]]:
        """Get existing book data from database"""
        book = Book.query.filter_by(isbn=isbn).first()
        if book:
            return {
                'title': book.title,
                'author': book.author,
                'cover': book.cover_url,
                'description': book.description,
                'published_date': book.published_date,
                'page_count': book.page_count,
                'categories': book.categories,
                'publisher': book.publisher,
                'language': book.language,
                'average_rating': book.average_rating,
                'rating_count': book.rating_count
            }
        return None
    
    def _get_user_book_by_isbn(self, user_id: int, isbn: str) -> Optional[Book]:
        """Get user's book by ISBN"""
        if not isbn:
            return None
        return Book.query.filter_by(user_id=user_id, isbn=isbn).first()
    
    def _get_or_create_shared_book(self, book_data: Dict[str, Any], user_id: int) -> Optional[SharedBookData]:
        """Get or create shared book data"""
        if not book_data.get('isbn'):
            # For books without ISBN, create shared data
            shared_book = SharedBookData(
                title=book_data['title'],
                author=book_data['author'],
                created_by=user_id,
                cover_url=book_data.get('cover'),
                description=book_data.get('description'),
                published_date=book_data.get('published_date'),
                page_count=book_data.get('page_count'),
                categories=standardize_categories(book_data.get('categories')),
                publisher=book_data.get('publisher'),
                language=book_data.get('language'),
                average_rating=book_data.get('average_rating'),
                rating_count=book_data.get('rating_count')
            )
            self.db.add(shared_book)
            self.db.commit()
            return shared_book
        else:
            # For books with ISBN, try to find existing shared data
            return SharedBookData.find_by_isbn(book_data['isbn']) 