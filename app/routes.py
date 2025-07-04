from flask import Blueprint, current_app, render_template, request, redirect, url_for, jsonify, flash, send_file
from flask_login import login_required, current_user
from .models import Book, db, ReadingLog, User, SystemSettings, SharedBookData
from .utils import fetch_book_data, get_reading_streak, get_google_books_cover, generate_month_review_image, ensure_https_url, standardize_categories
from datetime import datetime, date, timedelta
import pytz
import secrets
import calendar
from sqlalchemy import or_
import requests
from io import BytesIO
import csv
import json
import re
from .forms import AddBookForm

bp = Blueprint('main', __name__)

@bp.route('/log_book', methods=['POST'])
@login_required
def log_book():
    data = request.json
    title = data.get('title')
    author = data.get('author')
    isbn = data.get('isbn')
    start_date = datetime.now().strftime('%Y-%m-%d')
    
    book = Book(title=title, author=author, isbn=isbn, user_id=current_user.id, start_date=start_date)
    book.save()  # Assuming save method is defined in the Book model
    
    return jsonify({'message': 'Book logged successfully', 'book': book.to_dict()}), 201

@bp.route('/reading_history', methods=['GET'])
@login_required
def reading_history():
    books = Book.query.filter_by(user_id=current_user.id).all()  # Filter by current user
    for book in books:
        if not book.uid:
            # Generate a uid if missing
            book.uid = secrets.token_urlsafe(6)
            db.session.commit()
    return jsonify([book.to_dict() for book in books]), 200

@bp.route('/fetch_book/<isbn>', methods=['GET'])
def fetch_book(isbn):
    current_app.logger.info(f'[fetch_book] Request received for ISBN: {isbn}')
    
    # Try Google Books API first for comprehensive metadata
    current_app.logger.info(f'[fetch_book] Trying Google Books API for ISBN: {isbn}')
    google_data = get_google_books_cover(isbn, fetch_title_author=True)
    current_app.logger.info(f'[fetch_book] Google Books response: {google_data}')
    
    if google_data and (google_data.get('title') or google_data.get('author')):
        # Use Google Books data if it has any useful information
        book_data = google_data
        current_app.logger.info(f'[fetch_book] Using Google Books data for ISBN {isbn}')
    else:
        # Fallback to OpenLibrary data
        current_app.logger.info(f'[fetch_book] Trying OpenLibrary API for ISBN: {isbn}')
        book_data = fetch_book_data(isbn) or {}
        current_app.logger.info(f'[fetch_book] OpenLibrary response: {book_data}')
        current_app.logger.info(f'[fetch_book] Using OpenLibrary data for ISBN {isbn}')
    
    # Ensure we have a cover URL
    if not book_data.get('cover'):
        current_app.logger.info(f'[fetch_book] No cover in book_data, trying Google Books cover for ISBN: {isbn}')
        google_cover = get_google_books_cover(isbn)
        if google_cover:
            book_data['cover'] = google_cover
            current_app.logger.info(f'[fetch_book] Added Google Books cover: {google_cover}')
    
    # If neither source provides a cover, set a default (absolute URL for native support)
    if not book_data.get('cover'):
        book_data['cover'] = url_for('static', filename='bookshelf.png', _external=True)
        current_app.logger.info(f'[fetch_book] Using default cover for ISBN: {isbn}')
    
    # Ensure cover URL is HTTPS for native app compatibility
    if book_data.get('cover'):
        book_data['cover'] = ensure_https_url(book_data['cover'])
        current_app.logger.info(f'[fetch_book] Ensured HTTPS cover URL: {book_data["cover"]}')
    
    current_app.logger.info(f'[fetch_book] Final book data for ISBN {isbn}: {book_data}')
    current_app.logger.info(f'[fetch_book] Has title: {bool(book_data.get("title"))}')
    current_app.logger.info(f'[fetch_book] Has author: {bool(book_data.get("author"))}')
    current_app.logger.info(f'[fetch_book] Response status: {200 if book_data else 404}')
    
    return jsonify(book_data), 200 if book_data else 404

@bp.route('/')
@login_required
def index():
    # This now serves the library functionality as the homepage
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    publisher = request.args.get('publisher', '').strip()
    language = request.args.get('language', '').strip()
    
    # Start with all user's books
    query = Book.query.filter_by(user_id=current_user.id)
    
    # Apply search filter
    if search:
        search_filter = or_(
            Book.title.ilike(f'%{search}%'),
            Book.author.ilike(f'%{search}%'),
            Book.description.ilike(f'%{search}%'),
            Book.categories.ilike(f'%{search}%'),
            Book.publisher.ilike(f'%{search}%')
        )
        query = query.filter(search_filter)
    
    # Apply category filter
    if category:
        query = query.filter(Book.categories.ilike(f'%{category}%'))
    
    # Apply publisher filter
    if publisher:
        query = query.filter(Book.publisher == publisher)
    
    # Apply language filter
    if language:
        query = query.filter(Book.language == language)
    
    # Get filtered books
    all_filtered_books = query.all()
    
    # Sort books by reading status priority
    def get_sort_priority(book):
        # Currently Reading = 1 (highest priority)
        if not book.finish_date and not book.want_to_read and not book.library_only:
            return 1
        # Want to Read = 2
        elif book.want_to_read:
            return 2
        # Finished = 3
        elif book.finish_date:
            return 3
        # Library Only = 4 (lowest priority)
        else:
            return 4
    
    # Sort by priority first, then by title
    books = sorted(all_filtered_books, key=lambda book: (get_sort_priority(book), book.title.lower()))
    
    # Get all books for filter options (unfiltered)
    all_books = Book.query.filter_by(user_id=current_user.id).all()
    
    # Extract unique values for filters
    categories = sorted(set([
        cat.strip() for book in all_books 
        if book.categories 
        for cat in book.categories.split(',')
    ]))
    
    publishers = sorted(set([
        book.publisher for book in all_books 
        if book.publisher and book.publisher.strip()
    ]))
    
    languages = sorted(set([
        book.language for book in all_books 
        if book.language and book.language.strip()
    ]))
    
    return render_template('library.html',
                         books=books,
                         categories=categories,
                         publishers=publishers,
                         languages=languages,
                         current_search=search,
                         current_category=category,
                         current_publisher=publisher,
                         current_language=language)

@bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_book():
    form = AddBookForm()
    book_data = None
    shared_book_data = None
    
    # Get debug setting from current user
    debug_enabled = current_user.is_debug_enabled()
    
    if request.method == 'POST':
        if 'fetch' in request.form:
            # Fetch book data using the provided ISBN
            isbn = request.form['isbn'].strip()
            if not isbn:
                flash('Error: ISBN is required to fetch book data.', 'danger')
                return render_template('add_book.html', form=form, book_data=None, shared_book_data=None, debug_enabled=debug_enabled)

            # First check if we have shared book data for this ISBN
            shared_book_data = SharedBookData.find_by_isbn(isbn)
            
            book_data = fetch_book_data(isbn)
            if not book_data:
                flash('No book data found for the provided ISBN.', 'warning')
            else:
                # Overwrite cover with Google Books if available
                google_cover = get_google_books_cover(isbn)
                if google_cover:
                    book_data['cover'] = google_cover

            # Re-render the form with fetched data
            return render_template('add_book.html', form=form, book_data=book_data, shared_book_data=shared_book_data, debug_enabled=debug_enabled)

        elif 'add' in request.form:
            # Validate required fields
            title = request.form['title'].strip()
            author = request.form['author'].strip()
            
            if not title:
                flash('Error: Title is required to add a book.', 'danger')
                return render_template('add_book.html', form=form, book_data=None, shared_book_data=None, debug_enabled=debug_enabled)
            
            if not author:
                flash('Error: Author is required to add a book.', 'danger')
                return render_template('add_book.html', form=form, book_data=None, shared_book_data=None, debug_enabled=debug_enabled)

            isbn = request.form['isbn'].strip() if request.form['isbn'] else None
            
            # Check for duplicate ISBN (only if ISBN is provided)
            if isbn and Book.query.filter_by(isbn=isbn, user_id=current_user.id).first():
                flash('A book with this ISBN already exists in your library.', 'danger')
                return render_template('add_book.html', form=form, book_data=None, shared_book_data=None, debug_enabled=debug_enabled)

            # Check for existing shared book data
            shared_book_data = None
            if isbn:
                shared_book_data = SharedBookData.find_by_isbn(isbn)
            else:
                # For manual books, check by title and author
                shared_book_data = SharedBookData.find_by_title_author(title, author)

            # If no shared data exists, create it
            if not shared_book_data:
                shared_book_data = SharedBookData(
                    title=title,
                    author=author,
                    isbn=isbn,
                    created_by=current_user.id,
                    cover_url=request.form.get('cover_url', '').strip() or None,
                    description=request.form.get('description', '').strip() or None,
                    published_date=request.form.get('publication_date', '').strip() or None,
                    page_count=int(request.form.get('pages')) if request.form.get('pages', '').strip() else None,
                    publisher=request.form.get('publisher', '').strip() or None,
                    language=request.form.get('language', '').strip() or None,
                    categories=request.form.get('categories', '').strip() or None
                )
                shared_book_data.save()
                flash(f'Created new shared book data for "{title}" by {author}.', 'info')

            # Get additional metadata if ISBN is provided
            cover_url = None
            description = None
            published_date = None
            page_count = None
            categories = None
            publisher = None
            language = None
            average_rating = None
            rating_count = None

            if isbn:
                # Try to get metadata from APIs
                google_data = get_google_books_cover(isbn, fetch_title_author=True)
                if google_data:
                    cover_url = google_data.get('cover')
                    description = google_data.get('description')
                    published_date = google_data.get('published_date')
                    page_count = google_data.get('page_count')
                    categories = google_data.get('categories')
                    publisher = google_data.get('publisher')
                    language = google_data.get('language')
                    average_rating = google_data.get('average_rating')
                    rating_count = google_data.get('rating_count')
                else:
                    # Fallback to OpenLibrary data
                    ol_data = fetch_book_data(isbn)
                    if ol_data:
                        cover_url = ol_data.get('cover')
                        description = ol_data.get('description')
                        published_date = ol_data.get('published_date')
                        page_count = ol_data.get('page_count')
                        categories = ol_data.get('categories')
                        publisher = ol_data.get('publisher')
                        language = ol_data.get('language')

            # Use form data to override API data or fill in manual data
            cover_url = cover_url or request.form.get('cover_url', '').strip() or None
            description = description or request.form.get('description', '').strip() or None
            published_date = published_date or request.form.get('publication_date', '').strip() or None
            page_count = page_count or (int(request.form.get('pages')) if request.form.get('pages', '').strip() else None)
            categories = categories or request.form.get('categories', '').strip() or None
            publisher = publisher or request.form.get('publisher', '').strip() or None
            language = language or request.form.get('language', '').strip() or None
            
            # Standardize categories
            if categories:
                categories = standardize_categories(categories)

            # Get reading options
            start_date_str = request.form.get('start_date') or None
            finish_date_str = request.form.get('finish_date') or None
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
            finish_date = datetime.strptime(finish_date_str, '%Y-%m-%d').date() if finish_date_str else None
            want_to_read = 'want_to_read' in request.form
            library_only = 'library_only' in request.form

            # Create the book
            book = Book(
                title=title,
                author=author,
                user_id=current_user.id,
                isbn=isbn,
                shared_book_id=shared_book_data.id,
                start_date=start_date,
                finish_date=finish_date,
                cover_url=cover_url,
                want_to_read=want_to_read,
                library_only=library_only,
                description=description,
                published_date=published_date,
                page_count=page_count,
                categories=categories,
                publisher=publisher,
                language=language,
                average_rating=average_rating,
                rating_count=rating_count
            )
            book.save()
            
            # Update shared book data with any new information
            if not shared_book_data.cover_url and cover_url:
                shared_book_data.cover_url = cover_url
            if not shared_book_data.description and description:
                shared_book_data.description = description
            if not shared_book_data.published_date and published_date:
                shared_book_data.published_date = published_date
            if not shared_book_data.page_count and page_count:
                shared_book_data.page_count = page_count
            if not shared_book_data.categories and categories:
                shared_book_data.categories = categories
            if not shared_book_data.publisher and publisher:
                shared_book_data.publisher = publisher
            if not shared_book_data.language and language:
                shared_book_data.language = language
            db.session.commit()
            
            flash(f'Book "{title}" added successfully.', 'success')
            return redirect(url_for('main.index'))

    return render_template('add_book.html', form=form, book_data=book_data, shared_book_data=shared_book_data, debug_enabled=debug_enabled)

@bp.route('/book/<uid>', methods=['GET', 'POST'])
@login_required
def view_book(uid):
    book = Book.query.filter_by(uid=uid, user_id=current_user.id).first_or_404()
    
    # Get today's date in configured timezone
    timezone = pytz.timezone(current_app.config.get('TIMEZONE', 'UTC'))
    today = datetime.now(timezone).date()
    
    # Get reading logs for this book
    reading_logs = ReadingLog.query.filter_by(book_id=book.id, user_id=current_user.id).order_by(ReadingLog.date.desc()).all()
    
    if request.method == 'POST':
        # Handle different form submissions
        if 'add_log' in request.form:
            # Add reading log entry
            log_date_str = request.form.get('log_date')
            pages_read = request.form.get('pages_read')
            
            if log_date_str and pages_read:
                try:
                    log_date = datetime.strptime(log_date_str, '%Y-%m-%d').date()
                    pages_read = int(pages_read)
                    
                    # Check if log already exists for this date
                    existing_log = ReadingLog.query.filter_by(book_id=book.id, date=log_date, user_id=current_user.id).first()
                    if existing_log:
                        flash('You have already logged reading for this day.', 'warning')
                    else:
                        log = ReadingLog(book_id=book.id, date=log_date, user_id=current_user.id, pages_read=pages_read)
                        db.session.add(log)
                        db.session.commit()
                        flash('Reading day logged successfully.', 'success')
                        return redirect(url_for('main.view_book', uid=book.uid))
                except (ValueError, TypeError):
                    flash('Invalid date or pages format.', 'error')
        
        elif 'delete_log' in request.form:
            # Delete reading log entry
            log_id = request.form.get('log_id')
            if log_id:
                try:
                    log = ReadingLog.query.filter_by(id=log_id, book_id=book.id, user_id=current_user.id).first()
                    if log:
                        db.session.delete(log)
                        db.session.commit()
                        flash('Reading log entry deleted.', 'success')
                        return redirect(url_for('main.view_book', uid=book.uid))
                except (ValueError, TypeError):
                    flash('Invalid log entry.', 'error')
        
        elif 'delete_book' in request.form:
            # Delete the book
            ReadingLog.query.filter_by(book_id=book.id).delete()
            db.session.delete(book)
            db.session.commit()
            flash('Book deleted successfully.', 'success')
            return redirect(url_for('main.index'))
        
        else:
            # Update book status and dates
            start_date_str = request.form.get('start_date')
            finish_date_str = request.form.get('finish_date')
            
            # Update status based on checkboxes
            book.want_to_read = 'want_to_read' in request.form
            book.library_only = 'library_only' in request.form
            currently_reading = 'currently_reading' in request.form
            
            # Handle status logic
            if currently_reading:
                book.finish_date = None
                book.want_to_read = False
                book.library_only = False
                if not book.start_date:
                    book.start_date = today
            elif book.want_to_read:
                book.finish_date = None
                book.library_only = False
            elif book.library_only:
                book.finish_date = None
                book.want_to_read = False
            
            # Update dates
            try:
                book.start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
                book.finish_date = datetime.strptime(finish_date_str, '%Y-%m-%d').date() if finish_date_str else None
            except (ValueError, TypeError):
                flash('Invalid date format.', 'error')
                return redirect(url_for('main.view_book', uid=book.uid))
            
            db.session.commit()
            flash('Book status updated successfully.', 'success')
            return redirect(url_for('main.view_book', uid=book.uid))
    
    return render_template('view_book.html', book=book, today=today, reading_logs=reading_logs)

@bp.route('/book/<uid>/log', methods=['POST'])
@login_required
def log_reading(uid):
    book = Book.query.filter_by(uid=uid, user_id=current_user.id).first_or_404()
    log_date_str = request.form.get('log_date')
    
    # Use configured timezone instead of naive date.today()
    timezone = pytz.timezone(current_app.config.get('TIMEZONE', 'UTC'))
    
    if log_date_str:
        log_date = datetime.strptime(log_date_str, '%Y-%m-%d').date()
    else:
        # Get today's date in the configured timezone
        now_tz = datetime.now(timezone)
        log_date = now_tz.date()
    
    existing_log = ReadingLog.query.filter_by(book_id=book.id, date=log_date).first()
    if existing_log:
        flash('You have already logged reading for this day.')
    else:
        log = ReadingLog(book_id=book.id, date=log_date, user_id=current_user.id)
        db.session.add(log)
        db.session.commit()
        flash('Reading day logged.')
    return redirect(url_for('main.view_book', uid=book.uid))

@bp.route('/book/<uid>/delete', methods=['POST'])
@login_required
def delete_book(uid):
    book = Book.query.filter_by(uid=uid, user_id=current_user.id).first_or_404()
    ReadingLog.query.filter_by(book_id=book.id).delete()
    db.session.delete(book)
    db.session.commit()
    flash('Book deleted successfully.')
    return redirect(url_for('main.index'))

@bp.route('/book/<uid>/toggle_finished', methods=['POST'])
@login_required
def toggle_finished(uid):
    book = Book.query.filter_by(uid=uid, user_id=current_user.id).first_or_404()
    
    # Use configured timezone for consistent date handling
    timezone = pytz.timezone(current_app.config.get('TIMEZONE', 'UTC'))
    
    if book.finish_date:
        book.finish_date = None
        flash('Book marked as currently reading.')
    else:
        # Get today's date in the configured timezone
        now_tz = datetime.now(timezone)
        book.finish_date = now_tz.date()
        flash('Book marked as finished.')
    db.session.commit()
    return redirect(url_for('main.view_book', uid=book.uid))

@bp.route('/book/<uid>/start_reading', methods=['POST'])
@login_required
def start_reading(uid):
    book = Book.query.filter_by(uid=uid, user_id=current_user.id).first_or_404()
    book.want_to_read = False
    if not book.start_date:
        # Use configured timezone
        timezone = pytz.timezone(current_app.config.get('TIMEZONE', 'UTC'))
        now_tz = datetime.now(timezone)
        book.start_date = now_tz.date()
    db.session.commit()
    flash(f'Started reading "{book.title}".')
    return redirect(url_for('main.index'))

@bp.route('/book/<uid>/update_status', methods=['POST'])
@login_required
def update_status(uid):
    book = Book.query.filter_by(uid=uid, user_id=current_user.id).first_or_404()
    # Set status based on checkboxes
    book.want_to_read = 'want_to_read' in request.form
    book.library_only = 'library_only' in request.form
    finished = 'finished' in request.form
    currently_reading = 'currently_reading' in request.form

    # Use configured timezone
    timezone = pytz.timezone(current_app.config.get('TIMEZONE', 'UTC'))
    now_tz = datetime.now(timezone)

    if finished:
        book.finish_date = now_tz.date()
        book.want_to_read = False
        book.library_only = False
    elif currently_reading:
        book.finish_date = None
        book.want_to_read = False
        book.library_only = False
        if not book.start_date:
            book.start_date = now_tz.date()
    elif book.want_to_read:
        book.finish_date = None
        book.library_only = False
    elif book.library_only:
        book.finish_date = None
        book.want_to_read = False

    db.session.commit()
    flash('Book status updated.')
    return redirect(url_for('main.view_book', uid=book.uid))

@bp.route('/search', methods=['GET', 'POST'])
@login_required
def search_books():
    results = []
    query = ""
    if request.method == 'POST':
        query = request.form.get('query', '')
        if query:
            # Google Books API search
            resp = requests.get(
                'https://www.googleapis.com/books/v1/volumes',
                params={'q': query, 'maxResults': 10}
            )
            data = resp.json()
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
                    'authors': ', '.join(volume_info.get('authors', [])),
                    'image': image,
                    'isbn': isbn
                })
    return render_template('search_books.html', results=results, query=query)

@bp.route('/library')
@login_required
def library():
    # Get filter parameters from URL
    category_filter = request.args.get('category', '')
    publisher_filter = request.args.get('publisher', '')
    language_filter = request.args.get('language', '')
    search_query = request.args.get('search', '')

    # Start with books belonging to current user
    books_query = Book.query.filter_by(user_id=current_user.id)

    # Apply additional filters
    if category_filter:
        books_query = books_query.filter(Book.categories.contains(category_filter))
    if publisher_filter:
        books_query = books_query.filter(Book.publisher.ilike(f'%{publisher_filter}%'))
    if language_filter:
        books_query = books_query.filter(Book.language == language_filter)
    if search_query:
        books_query = books_query.filter(
            (Book.title.ilike(f'%{search_query}%')) |
            (Book.author.ilike(f'%{search_query}%')) |
            (Book.description.ilike(f'%{search_query}%'))
        )

    books = books_query.all()

    # Get distinct values for filter dropdowns
    all_books = Book.query.filter_by(user_id=current_user.id).all()
    categories = set()
    publishers = set()
    languages = set()

    for book in all_books:
        if book.categories:
            categories.update([cat.strip() for cat in book.categories.split(',')])
        if book.publisher:
            publishers.add(book.publisher)
        if book.language:
            languages.add(book.language)

    # Fetch all users for assignment
    users = User.query.all()

    return render_template(
        'library.html',
        books=books,
        categories=sorted(categories),
        publishers=sorted(publishers),
        languages=sorted(languages),
        current_category=category_filter,
        current_publisher=publisher_filter,
        current_language=language_filter,
        current_search=search_query,
        users=users  # Pass users to the template
    )

@bp.route('/public-library')
def public_library():
    filter_status = request.args.get('filter', 'all')
    books_query = Book.query
    
    if filter_status == 'currently_reading':
        books_query = books_query.filter(
            Book.finish_date.is_(None),
            Book.want_to_read.isnot(True),  # Handle NULL and False
            Book.library_only.isnot(True)  # Handle NULL and False
        )
    elif filter_status == 'want_to_read':
        books_query = books_query.filter(Book.want_to_read.is_(True))
    else:  # Default "Show All" case
        books_query = books_query.order_by(Book.finish_date.desc().nullslast(), Book.id.desc())
    
    books = books_query.all()
    return render_template('public_library.html', books=books, filter_status=filter_status)

@bp.route('/book/<uid>/edit', methods=['GET', 'POST'])
@login_required
def edit_book(uid):
    book = Book.query.filter_by(uid=uid, user_id=current_user.id).first_or_404()
    if request.method == 'POST':
        new_isbn = request.form['isbn'].strip() if request.form['isbn'] else None
        
        # Check for duplicate ISBN (only if ISBN is provided and excluding the current book)
        if new_isbn and Book.query.filter(Book.isbn == new_isbn, Book.uid != book.uid, Book.user_id == current_user.id).first():
            flash('A book with this ISBN already exists in your library.', 'danger')
            return render_template('edit_book.html', book=book)
        
        # Update book fields
        book.title = request.form['title']
        book.author = request.form['author']
        book.isbn = new_isbn
        cover_url = request.form.get('cover_url', '').strip()
        book.cover_url = cover_url if cover_url else None
        
        # Update metadata fields
        book.description = request.form.get('description', '').strip() or None
        book.published_date = request.form.get('published_date', '').strip() or None
        book.page_count = int(request.form.get('page_count')) if request.form.get('page_count', '').strip() else None
        book.publisher = request.form.get('publisher', '').strip() or None
        book.language = request.form.get('language', '').strip() or None
        book.categories = standardize_categories(request.form.get('categories', '').strip()) or None
        book.average_rating = float(request.form.get('average_rating')) if request.form.get('average_rating', '').strip() else None
        book.rating_count = int(request.form.get('rating_count')) if request.form.get('rating_count', '').strip() else None
        
        # Update shared book data if it exists
        if book.shared_book:
            shared_book = book.shared_book
            # Only update shared data if it's missing information
            if not shared_book.cover_url and cover_url:
                shared_book.cover_url = cover_url
            if not shared_book.description and book.description:
                shared_book.description = book.description
            if not shared_book.published_date and book.published_date:
                shared_book.published_date = book.published_date
            if not shared_book.page_count and book.page_count:
                shared_book.page_count = book.page_count
            if not shared_book.categories and book.categories:
                shared_book.categories = book.categories
            if not shared_book.publisher and book.publisher:
                shared_book.publisher = book.publisher
            if not shared_book.language and book.language:
                shared_book.language = book.language
            if not shared_book.isbn and new_isbn:
                shared_book.isbn = new_isbn
        
        db.session.commit()
        flash('Book updated successfully.', 'success')
        return redirect(url_for('main.view_book', uid=book.uid))
    return render_template('edit_book.html', book=book)

@bp.route('/month_review/<int:year>/<int:month>.jpg')
@login_required  
def month_review(year, month):
    # Query books finished in the given month/year by current user
    books = Book.query.filter(
        Book.user_id == current_user.id,
        Book.finish_date.isnot(None),
        Book.finish_date >= datetime(year, month, 1),
        Book.finish_date < (
            datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
        )
    ).all()
    
    if not books:
        # This should only be accessed if there are books (from month_wrapup)
        return "No books found", 404

    img = generate_month_review_image(books, month, year)
    buf = BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return send_file(buf, mimetype='image/jpeg', as_attachment=True, download_name=f"month_review_{year}_{month}.jpg")

@bp.route('/month_wrapup')
@login_required
def month_wrapup():
    # Get current month and year using Central America time
    tz = pytz.timezone(current_app.config.get('TIMEZONE', 'UTC'))
    now_ca = datetime.now(tz)
    year = now_ca.year
    month = now_ca.month
    
    # Check if there are books finished this month
    books = Book.query.filter(
        Book.user_id == current_user.id,
        Book.finish_date.isnot(None),
        Book.finish_date >= datetime(year, month, 1),
        Book.finish_date < (
            datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
        )
    ).all()
    
    if not books:
        # Show empty month template instead of redirecting to image route
        month_name = calendar.month_name[month]
        return render_template('month_wrapup_empty.html', 
                             month_name=month_name, 
                             year=year, 
                             month=month)
    else:
        # Redirect to the month review image endpoint
        return redirect(url_for('main.month_review', year=year, month=month))

@bp.route('/add_book_from_search', methods=['POST'])
@login_required
def add_book_from_search():
    title = request.form.get('title')
    author = request.form.get('author')
    isbn = request.form.get('isbn')
    cover_url = request.form.get('cover_url')

    # Prevent duplicate ISBNs
    if isbn and Book.query.filter_by(isbn=isbn, user_id=current_user.id).first():
        flash('A book with this ISBN already exists in your library.', 'danger')
        return redirect(url_for('main.search_books'))

    # Check for existing shared book data
    shared_book_data = None
    if isbn:
        shared_book_data = SharedBookData.find_by_isbn(isbn)
    else:
        shared_book_data = SharedBookData.find_by_title_author(title, author)

    # If no shared data exists, create it
    if not shared_book_data:
        shared_book_data = SharedBookData(
            title=title,
            author=author,
            isbn=isbn,
            created_by=current_user.id,
            cover_url=cover_url
        )
        shared_book_data.save()

    # Get additional metadata if available
    if isbn:
        google_data = get_google_books_cover(isbn, fetch_title_author=True)
        if google_data:
            description = google_data.get('description')
            published_date = google_data.get('published_date')
            page_count = google_data.get('page_count')
            categories = google_data.get('categories')
            publisher = google_data.get('publisher')
            language = google_data.get('language')
            average_rating = google_data.get('average_rating')
            rating_count = google_data.get('rating_count')
        else:
            description = published_date = page_count = categories = publisher = language = average_rating = rating_count = None
    else:
        description = published_date = page_count = categories = publisher = language = average_rating = rating_count = None

    # Standardize categories
    if categories:
        categories = standardize_categories(categories)
    
    book = Book(
        title=title,
        author=author,
        user_id=current_user.id,
        isbn=isbn,
        shared_book_id=shared_book_data.id,
        cover_url=cover_url,
        description=description,
        published_date=published_date,
        page_count=page_count,
        categories=categories,
        publisher=publisher,
        language=language,
        average_rating=average_rating,
        rating_count=rating_count
    )
    book.save()
    flash(f'Added "{title}" to your library.', 'success')
    return redirect(url_for('main.library'))

@bp.route('/import_goodreads', methods=['POST'])
@login_required
def import_goodreads():
    file = request.files.get('goodreads_csv')
    if not file or not file.filename.endswith('.csv'):
        flash('Please upload a valid Goodreads CSV file.', 'danger')
        return redirect(url_for('main.add_book'))

    stream = file.stream.read().decode('utf-8').splitlines()
    reader = csv.DictReader(stream)
    imported = 0
    for row in reader:
        title = row.get('Title')
        author = row.get('Author')
        # Goodreads CSV sometimes has ISBN/ISBN13 as ='978...'
        def clean_isbn(val):
            if not val:
                return ""
            val = val.strip()
            if val.startswith('="') and val.endswith('"'):
                val = val[2:-1]
            return val.strip()
        isbn = clean_isbn(row.get('ISBN13')) or clean_isbn(row.get('ISBN'))
        date_read = row.get('Date Read')
        want_to_read = 'to-read' in (row.get('Bookshelves') or '')
        finish_date = None
        if date_read:
            try:
                finish_date = datetime.strptime(date_read, "%Y/%m/%d").date()
            except Exception:
                pass
        # Skip books with missing or blank ISBN
        if not title or not author or not isbn or isbn == "":
            continue
        if not Book.query.filter_by(isbn=isbn, user_id=current_user.id).first():
            # Try Google Books first for comprehensive metadata
            google_data = get_google_books_cover(isbn, fetch_title_author=True)
            if google_data:
                cover_url = google_data.get('cover')
                description = google_data.get('description')
                published_date = google_data.get('published_date')
                page_count = google_data.get('page_count')
                categories = google_data.get('categories')
                publisher = google_data.get('publisher')
                language = google_data.get('language')
                average_rating = google_data.get('average_rating')
                rating_count = google_data.get('rating_count')
            else:
                # Fallback to OpenLibrary if Google Books fails
                book_data = fetch_book_data(isbn)
                if book_data:
                    cover_url = book_data.get('cover')
                    description = book_data.get('description')
                    published_date = book_data.get('published_date')
                    page_count = book_data.get('page_count')
                    categories = book_data.get('categories')
                    publisher = book_data.get('publisher')
                    language = book_data.get('language')
                    average_rating = rating_count = None
                else:
                    cover_url = url_for('static', filename='bookshelf.png')
                    description = published_date = page_count = categories = publisher = language = average_rating = rating_count = None
            
            book = Book(
                title=title,
                author=author,
                isbn=isbn,
                user_id=current_user.id,  # Add user_id for multi-user support
                finish_date=finish_date,
                want_to_read=want_to_read,
                cover_url=cover_url,
                description=description,
                published_date=published_date,
                page_count=page_count,
                categories=categories,
                publisher=publisher,
                language=language,
                average_rating=average_rating,
                rating_count=rating_count
            )
            db.session.add(book)
            imported += 1
    db.session.commit()
    flash(f'Imported {imported} books from Goodreads.', 'success')
    return redirect(url_for('main.add_book'))

@bp.route('/download_db', methods=['GET'])
@login_required
def download_db():
    db_path = current_app.config.get('SQLALCHEMY_DATABASE_URI').replace('sqlite:///', '')
    return send_file(
        db_path,
        as_attachment=True,
        download_name='books.db',
        mimetype='application/octet-stream'
    )

@bp.route('/bulk_import', methods=['GET', 'POST'])
@login_required
def bulk_import():
    if request.method == 'POST':
        if 'csv_file' not in request.files:
            flash('No file part', 'danger')
            return redirect(request.url)
        file = request.files['csv_file']
        if file.filename == '':
            flash('No selected file', 'danger')
            return redirect(request.url)
        if file and file.filename.endswith('.csv'):
            try:
                # Read CSV file
                csv_file = csv.reader(file.stream.read().decode("utf-8").splitlines())
                default_status = request.form.get('default_status', 'library_only')
                imported_count = 0
                failed_count = 0
                failed_isbns = []

                for row in csv_file:
                    if not row:  # Skip empty rows
                        continue
                    isbn = row[0].strip()
                    if not isbn: # Skip rows with empty ISBN
                        continue

                    # Check if book already exists
                    if Book.get_book_by_isbn(isbn):
                        failed_count += 1
                        failed_isbns.append(f"{isbn} (already exists)")
                        continue

                    book_data = fetch_book_data(isbn)
                    if not book_data:
                        google_book_data = get_google_books_cover(isbn, fetch_title_author=True)
                        if google_book_data and google_book_data.get('title') and google_book_data.get('author'):
                            book_data = google_book_data
                        else:
                            failed_count += 1
                            failed_isbns.append(f"{isbn} (data not found)")
                            continue
                    else:
                        # Enhance OpenLibrary data with Google Books data
                        google_data = get_google_books_cover(isbn, fetch_title_author=True)
                        if google_data:
                            for key, value in google_data.items():
                                if value and not book_data.get(key):
                                    book_data[key] = value
                    
                    title = book_data.get('title')
                    author = book_data.get('author')
                    cover_url = book_data.get('cover') or get_google_books_cover(isbn)
                    description = book_data.get('description')
                    published_date = book_data.get('published_date')
                    page_count = book_data.get('page_count')
                    categories = book_data.get('categories')
                    publisher = book_data.get('publisher')
                    language = book_data.get('language')
                    average_rating = book_data.get('average_rating')
                    rating_count = book_data.get('rating_count')


                    if not title or not author:
                        failed_count += 1
                        failed_isbns.append(f"{isbn} (missing title/author)")
                        continue

                    want_to_read = default_status == 'want_to_read'
                    library_only = default_status == 'library_only'
                    start_date = date.today() if default_status == 'reading' else None

                    new_book = Book(
                        title=title,
                        author=author,
                        isbn=isbn,
                        user_id=current_user.id,  # Add user_id for multi-user support
                        cover_url=cover_url,
                        want_to_read=want_to_read,
                        library_only=library_only,
                        start_date=start_date,
                        description=description,
                        published_date=published_date,
                        page_count=page_count,
                        categories=categories,
                        publisher=publisher,
                        language=language,
                        average_rating=average_rating,
                        rating_count=rating_count
                    )
                    new_book.save()
                    imported_count += 1

                if imported_count > 0:
                    flash(f'Successfully imported {imported_count} books.', 'success')
                if failed_count > 0:
                    flash(f'Failed to import {failed_count} books: {", ".join(failed_isbns)}', 'danger')
                return redirect(url_for('main.index'))

            except Exception as e:
                current_app.logger.error(f"Error during bulk import: {e}")
                flash('An error occurred during the bulk import process. Please try again later.', 'danger')
                return redirect(request.url)
        else:
            flash('Invalid file type. Please upload a CSV file.', 'danger')
            return redirect(request.url)

    return render_template('bulk_import.html')

@bp.route('/community_activity')
@login_required
def community_activity():
    """Show activity from users who have enabled activity sharing"""
    
    # Get users who share their reading activity
    sharing_users = User.query.filter_by(share_reading_activity=True, is_active=True).all()
    
    # Recent books (books finished in the last 30 days)
    recent_finished_books = Book.query.join(User).filter(
        User.share_reading_activity == True,
        User.is_active == True,
        Book.finish_date.isnot(None),
        Book.finish_date >= (datetime.now().date() - timedelta(days=30))
    ).order_by(Book.finish_date.desc()).limit(20).all()
    
    # Recent reading logs (from last 7 days)
    recent_logs = ReadingLog.query.join(User).filter(
        User.share_reading_activity == True,
        User.is_active == True,
        ReadingLog.date >= (datetime.now().date() - timedelta(days=7))
    ).order_by(ReadingLog.date.desc()).limit(50).all()
    
    # Currently reading books from sharing users
    currently_reading = Book.query.join(User).filter(
        User.share_current_reading == True,
        User.is_active == True,
        Book.start_date.isnot(None),
        Book.finish_date.is_(None)
    ).order_by(Book.start_date.desc()).limit(20).all()
    
    # Get some statistics
    total_books_this_month = Book.query.join(User).filter(
        User.share_reading_activity == True,
        User.is_active == True,
        Book.finish_date.isnot(None),
        Book.finish_date >= datetime.now().date().replace(day=1)
    ).count()
    
    total_active_readers = len(sharing_users)
    
    return render_template('community_activity.html',
                         recent_finished_books=recent_finished_books,
                         recent_logs=recent_logs,
                         currently_reading=currently_reading,
                         total_books_this_month=total_books_this_month,
                         total_active_readers=total_active_readers,
                         sharing_users=sharing_users)

@bp.route('/community_activity/active_readers')
@login_required
def community_active_readers():
    """Show list of active readers"""
    sharing_users = User.query.filter_by(share_reading_activity=True, is_active=True).all()
    
    # Get stats for each user
    user_stats = []
    for user in sharing_users:
        books_this_month = Book.query.filter(
            Book.user_id == user.id,
            Book.finish_date.isnot(None),
            Book.finish_date >= datetime.now().date().replace(day=1)
        ).count()
        
        total_books = Book.query.filter(
            Book.user_id == user.id,
            Book.finish_date.isnot(None)
        ).count()
        
        currently_reading_count = Book.query.filter(
            Book.user_id == user.id,
            Book.start_date.isnot(None),
            Book.finish_date.is_(None)
        ).count()
        
        user_stats.append({
            'user': user,
            'books_this_month': books_this_month,
            'total_books': total_books,
            'currently_reading': currently_reading_count
        })
    
    # Sort by activity (books this month + currently reading)
    user_stats.sort(key=lambda x: x['books_this_month'] + x['currently_reading'], reverse=True)
    
    return render_template('community_stats/active_readers.html', user_stats=user_stats)

@bp.route('/community_activity/books_this_month')
@login_required
def community_books_this_month():
    """Show books finished this month"""
    books = Book.query.join(User).filter(
        User.share_reading_activity == True,
        User.is_active == True,
        Book.finish_date.isnot(None),
        Book.finish_date >= datetime.now().date().replace(day=1)
    ).order_by(Book.finish_date.desc()).all()
    
    month_name = calendar.month_name[datetime.now().month]
    return render_template('community_stats/books_this_month.html', 
                         books=books, 
                         month_name=month_name,
                         year=datetime.now().year)

@bp.route('/community_activity/currently_reading')
@login_required
def community_currently_reading():
    """Show books currently being read"""
    books = Book.query.join(User).filter(
        User.share_current_reading == True,
        User.is_active == True,
        Book.start_date.isnot(None),
        Book.finish_date.is_(None)
    ).order_by(Book.start_date.desc()).all()
    
    return render_template('community_stats/currently_reading.html', books=books)

@bp.route('/community_activity/recent_activity')
@login_required
def community_recent_activity():
    """Show recent reading activity"""
    recent_logs = ReadingLog.query.join(User).filter(
        User.share_reading_activity == True,
        User.is_active == True,
        ReadingLog.date >= (datetime.now().date() - timedelta(days=7))
    ).order_by(ReadingLog.date.desc()).limit(50).all()
    
    return render_template('community_stats/recent_activity.html', recent_logs=recent_logs)

@bp.route('/user/<int:user_id>/profile')
@login_required
def user_profile(user_id):
    """Show public profile for a user if they're sharing"""
    user = User.query.get_or_404(user_id)
    
    # Check if user allows profile viewing
    if not user.share_reading_activity:
        flash('This user has not enabled profile sharing.', 'warning')
        return redirect(url_for('main.community_activity'))
    
    # Get user's reading statistics
    total_books = Book.query.filter(
        Book.user_id == user.id,
        Book.finish_date.isnot(None)
    ).count()
    
    books_this_year = Book.query.filter(
        Book.user_id == user.id,
        Book.finish_date.isnot(None),
        Book.finish_date >= date(datetime.now().year, 1, 1)
    ).count()
    
    books_this_month = Book.query.filter(
        Book.user_id == user.id,
        Book.finish_date.isnot(None),
        Book.finish_date >= datetime.now().date().replace(day=1)
    ).count()
    
    currently_reading = Book.query.filter(
        Book.user_id == user.id,
        Book.start_date.isnot(None),
        Book.finish_date.is_(None)
    ).all() if user.share_current_reading else []
    
    recent_finished = Book.query.filter(
        Book.user_id == user.id,
        Book.finish_date.isnot(None)
    ).order_by(Book.finish_date.desc()).limit(10).all()
    
    reading_logs_count = ReadingLog.query.filter_by(user_id=user.id).count()
    
    return render_template('user_profile.html',
                         profile_user=user,
                         total_books=total_books,
                         books_this_year=books_this_year,
                         books_this_month=books_this_month,
                         currently_reading=currently_reading,
                         recent_finished=recent_finished,
                         reading_logs_count=reading_logs_count)

@bp.route('/api/categories', methods=['GET'])
@login_required
def get_category_suggestions():
    """Get category suggestions for auto-complete"""
    query = request.args.get('q', '').lower()
    
    # Get all categories from user's books
    all_books = Book.query.filter_by(user_id=current_user.id).all()
    user_categories = set()
    
    for book in all_books:
        if book.categories:
            categories = [cat.strip() for cat in book.categories.split(',')]
            user_categories.update(categories)
    
    # Get categories from shared book data
    shared_books = SharedBookData.query.all()
    shared_categories = set()
    
    for book in shared_books:
        if book.categories:
            categories = [cat.strip() for cat in book.categories.split(',')]
            shared_categories.update(categories)
    
    # Combine and filter categories
    all_categories = list(user_categories | shared_categories)
    
    # Filter by query if provided
    if query:
        all_categories = [cat for cat in all_categories if query in cat.lower()]
    
    # Sort and limit results
    all_categories.sort()
    all_categories = all_categories[:20]  # Limit to 20 suggestions
    
    return jsonify(all_categories)

@bp.route('/book/<uid>/assign', methods=['POST'])
@login_required
def assign_book(uid):
    book = Book.query.filter_by(uid=uid).first_or_404()
    if not current_user.is_admin:
        flash('Only admins can assign books.', 'danger')
        return redirect(url_for('main.library'))

    user_id = request.form.get('user_id')
    user = User.query.get(user_id)
    if not user:
        flash('Invalid user selected.', 'danger')
        return redirect(url_for('main.library'))

    book.user_id = user.id
    db.session.commit()
    flash(f'Book "{book.title}" assigned to {user.username}.', 'success')
    return redirect(url_for('main.library'))

@bp.route('/library/mass-edit')
@login_required
def library_mass_edit():
    """Mass edit library view with selection capabilities"""
    # Get filter parameters from URL
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    publisher = request.args.get('publisher', '').strip()
    language = request.args.get('language', '').strip()
    
    # Start with all user's books
    query = Book.query.filter_by(user_id=current_user.id)
    
    # Apply search filter
    if search:
        search_filter = or_(
            Book.title.ilike(f'%{search}%'),
            Book.author.ilike(f'%{search}%'),
            Book.description.ilike(f'%{search}%'),
            Book.categories.ilike(f'%{search}%'),
            Book.publisher.ilike(f'%{search}%')
        )
        query = query.filter(search_filter)
    
    # Apply category filter
    if category:
        query = query.filter(Book.categories.ilike(f'%{category}%'))
    
    # Apply publisher filter
    if publisher:
        query = query.filter(Book.publisher == publisher)
    
    # Apply language filter
    if language:
        query = query.filter(Book.language == language)
    
    # Get filtered books
    all_filtered_books = query.all()
    
    # Sort books by reading status priority
    def get_sort_priority(book):
        # Currently Reading = 1 (highest priority)
        if not book.finish_date and not book.want_to_read and not book.library_only:
            return 1
        # Want to Read = 2
        elif book.want_to_read:
            return 2
        # Finished = 3
        elif book.finish_date:
            return 3
        # Library Only = 4 (lowest priority)
        else:
            return 4
    
    # Sort by priority first, then by title
    books = sorted(all_filtered_books, key=lambda book: (get_sort_priority(book), book.title.lower()))
    
    # Get all books for filter options (unfiltered)
    all_books = Book.query.filter_by(user_id=current_user.id).all()
    
    # Extract unique values for filters
    categories = sorted(set([
        cat.strip() for book in all_books 
        if book.categories 
        for cat in book.categories.split(',')
    ]))
    
    publishers = sorted(set([
        book.publisher for book in all_books 
        if book.publisher and book.publisher.strip()
    ]))
    
    languages = sorted(set([
        book.language for book in all_books 
        if book.language and book.language.strip()
    ]))
    
    return render_template('library_mass_edit.html',
                         books=books,
                         categories=categories,
                         publishers=publishers,
                         languages=languages,
                         current_search=search,
                         current_category=category,
                         current_publisher=publisher,
                         current_language=language)

@bp.route('/api/mass-edit-books', methods=['POST'])
@login_required
def mass_edit_books():
    """API endpoint for mass editing books"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        book_uids = data.get('book_uids', [])
        add_categories = data.get('add_categories', [])
        remove_categories = data.get('remove_categories', [])
        change_status = data.get('change_status')
        
        if not book_uids:
            return jsonify({'success': False, 'error': 'No books selected'}), 400
        
        if not add_categories and not remove_categories and not change_status:
            return jsonify({'success': False, 'error': 'No changes specified'}), 400
        
        # Get books that belong to the current user
        books = Book.query.filter(
            Book.uid.in_(book_uids),
            Book.user_id == current_user.id
        ).all()
        
        if not books:
            return jsonify({'success': False, 'error': 'No valid books found'}), 404
        
        updated_count = 0
        
        for book in books:
            updated = False
            
            # Handle category changes
            if add_categories or remove_categories:
                current_categories = set()
                if book.categories:
                    current_categories = set(cat.strip() for cat in book.categories.split(','))
                
                # Add new categories
                for category in add_categories:
                    if category.strip():
                        current_categories.add(category.strip())
                
                # Remove specified categories
                for category in remove_categories:
                    if category.strip():
                        current_categories.discard(category.strip())
                
                # Update book categories
                book.categories = ', '.join(sorted(current_categories)) if current_categories else None
                updated = True
            
            # Handle status changes
            if change_status:
                if change_status == 'library_only':
                    book.library_only = True
                    book.want_to_read = False
                    book.start_date = None
                    book.finish_date = None
                elif change_status == 'want_to_read':
                    book.library_only = False
                    book.want_to_read = True
                    book.start_date = None
                    book.finish_date = None
                elif change_status == 'reading':
                    book.library_only = False
                    book.want_to_read = False
                    book.start_date = date.today()
                    book.finish_date = None
                elif change_status == 'finished':
                    book.library_only = False
                    book.want_to_read = False
                    if not book.start_date:
                        book.start_date = date.today()
                    book.finish_date = date.today()
                
                updated = True
            
            if updated:
                updated_count += 1
        
        # Commit changes
        db.session.commit()
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'message': f'Successfully updated {updated_count} book(s)'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in mass_edit_books: {e}")
        return jsonify({'success': False, 'error': 'An error occurred while updating books'}), 500