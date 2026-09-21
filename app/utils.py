from datetime import date, timedelta, datetime
import pytz
from .models import ReadingLog
from sqlalchemy import func
import calendar
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import requests
import os
from flask import current_app

def fetch_book_data(isbn):
    """Fetch book data with timeout and error handling"""
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    try:
        response = requests.get(url, timeout=10)  # 10 second timeout
        response.raise_for_status()
        data = response.json()
        
        book_key = f"ISBN:{isbn}"
        if book_key in data:
            book = data[book_key]
            title = book.get('title', '')
            authors = ', '.join([a['name'] for a in book.get('authors', [])])
            cover_url = book.get('cover', {}).get('large') or book.get('cover', {}).get('medium') or book.get('cover', {}).get('small')
            
            # Ensure HTTPS for native app compatibility
            if cover_url:
                cover_url = ensure_https_url(cover_url)
            
            # Extract additional metadata
            description = book.get('notes', {}).get('value') if isinstance(book.get('notes'), dict) else book.get('notes')
            published_date = book.get('publish_date', '')
            page_count = book.get('number_of_pages')
            subjects = book.get('subjects', [])
            categories = ', '.join([s['name'] if isinstance(s, dict) else str(s) for s in subjects[:5]])  # Limit to 5 categories
            publishers = book.get('publishers', [])
            publisher = publishers[0]['name'] if publishers and isinstance(publishers[0], dict) else (publishers[0] if publishers else '')
            languages = book.get('languages', [])
            language = languages[0]['key'].split('/')[-1] if languages and isinstance(languages[0], dict) else (languages[0] if languages else '')
            
            return {
                'title': title,
                'author': authors,
                'cover': cover_url,
                'description': description,
                'published_date': published_date,
                'page_count': page_count,
                'categories': categories,
                'publisher': publisher,
                'language': language
            }
        return None
    
    except (requests.exceptions.RequestException, requests.exceptions.Timeout, ValueError) as e:
        # Log the error for debugging but don't crash the bulk import
        current_app.logger.warning(f"Failed to fetch book data for ISBN {isbn}: {e}")
        return None

def get_google_books_cover(isbn, fetch_title_author=False):
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
    try:
        resp = requests.get(url, timeout=5)
        data = resp.json()
        items = data.get("items")
        if items:
            volume_info = items[0]["volumeInfo"]
            image_links = volume_info.get("imageLinks", {})
            cover_url = image_links.get("thumbnail") or image_links.get("smallThumbnail")
            
            # Ensure HTTPS for native app compatibility
            if cover_url:
                cover_url = ensure_https_url(cover_url)
            
            if fetch_title_author:
                title = volume_info.get('title')
                authors = ", ".join(volume_info.get('authors', []))
                description = volume_info.get('description', '')
                published_date = volume_info.get('publishedDate', '')
                page_count = volume_info.get('pageCount')
                categories = ', '.join(volume_info.get('categories', []))
                publisher = volume_info.get('publisher', '')
                language = volume_info.get('language', '')
                average_rating = volume_info.get('averageRating')
                rating_count = volume_info.get('ratingsCount')
                
                return {
                    'cover': cover_url,
                    'title': title,
                    'author': authors,
                    'description': description,
                    'published_date': published_date,
                    'page_count': page_count,
                    'categories': categories,
                    'publisher': publisher,
                    'language': language,
                    'average_rating': average_rating,
                    'rating_count': rating_count
                }
            return cover_url
    except Exception:
        pass
    if fetch_title_author:
        return None # Or return a dict with None values if preferred
    return None

def format_date(date):
    return date.strftime("%Y-%m-%d") if date else None

def calculate_reading_streak(user_id, streak_offset=0):
    """
    Calculate reading streak for a specific user with foolproof logic
    """
    # Get all unique dates with reading logs for this user, sorted descending
    dates = (
        ReadingLog.query
        .filter_by(user_id=user_id)
        .with_entities(ReadingLog.date)
        .distinct()
        .order_by(ReadingLog.date.desc())
        .all()
    )
    
    if not dates:
        return streak_offset
    
    # Convert to list of date objects
    log_dates = [d[0] for d in dates if d[0] is not None]
    
    if not log_dates:
        return streak_offset
    
    # Sort in descending order (most recent first)
    log_dates.sort(reverse=True)
    
    # Use configured timezone to get "today"
    from flask import current_app
    import pytz
    timezone = pytz.timezone(current_app.config.get('TIMEZONE', 'UTC'))
    today = datetime.now(timezone).date()
    
    streak = 0
    
    # Check if there's a log for today or yesterday
    # (allow for timezone differences and late logging)
    most_recent = log_dates[0]
    days_since_recent = (today - most_recent).days
    
    # If the most recent log is more than 1 day old, streak is broken
    if days_since_recent > 1:
        return streak_offset
    
    # Start counting the streak
    current_date = most_recent
    
    for log_date in log_dates:
        # If this date continues the streak (same day or previous day)
        if log_date == current_date:
            streak += 1
            current_date = current_date - timedelta(days=1)
        else:
            # Check if there's a gap
            days_gap = (current_date - log_date).days
            if days_gap == 0:
                # Same date, skip (already counted)
                continue
            elif days_gap == 1:
                # Previous day, continue streak
                streak += 1
                current_date = log_date - timedelta(days=1)
            else:
                # Gap found, streak ends
                break
    
    return streak + streak_offset

def get_reading_streak(timezone=None):
    """
    Legacy function for backward compatibility
    Uses current user's streak calculation
    """
    from flask_login import current_user
    if not current_user.is_authenticated:
        return 0
    return current_user.get_reading_streak()

def generate_month_review_image(books, month, year):
    import calendar
    from PIL import Image, ImageDraw, ImageFont
    from io import BytesIO
    import requests
    import os

    img_size = 1080
    cols = 4
    cover_w, cover_h = 200, 300
    padding = 30
    # Increase title_height to give more space for the text
    title_height = 220
    grid_w = cols * cover_w + (cols - 1) * padding
    rows = ((len(books) - 1) // cols) + 1 if books else 1
    grid_h = rows * cover_h + (rows - 1) * padding
    # Start below the title band, with a small gap. (The grid used to start at
    # title_height + 40 while the over-sized title ran past the band, which is how
    # covers ended up drawn over the text.)
    grid_top = title_height + 24
    grid_left = (img_size - grid_w) // 2
    if grid_top + grid_h > img_size - 10:
        print(f"WARN  month review image: {len(books)} covers do not fit the {img_size}px "
              f"canvas; the bottom rows will be cropped")

    # Try bookshelf background
    bg_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static', 'bookshelf.png'))
    print("Looking for bookshelf background at:", bg_path)
    try:
        bg = Image.open(bg_path).convert('RGBA').resize((img_size, img_size))
        print("Bookshelf background loaded!")
    except Exception as e:
        print("Failed to load bookshelf background:", e)
        bg = Image.new('RGBA', (img_size, img_size), (255, 230, 200, 255))

    draw = ImageDraw.Draw(bg)

    # Draw the month title.
    #
    # Two bugs lived here:
    #   * the starting font size (220px) was measured once at that size and never
    #     re-measured after the loop shrank it, so the centred position used the
    #     wrong width and the title drifted off-centre;
    #   * the band is only title_height (220px), but a 220px font needs roughly
    #     1.2x that to render, so the text overran the band and the first row of
    #     covers drew straight over it (visible as covers over the title).
    # Size the text to the band, and centre on the final fitted font.
    month_name = f"{calendar.month_name[month].upper()} {year}"
    max_width = img_size - 80  # 40px margin on each side
    max_text_height = title_height - 80  # leave breathing room above and below

    # Font resolution. The image ships fonts-dejavu-core (see Dockerfile); a
    # deployment without it silently fell back to Pillow's ~11px bitmap default,
    # so the month title rendered as a speck on a 1080px canvas. Search real
    # candidates and say so when none work, rather than failing quietly.
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    font_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        os.path.join(static_dir, "Arial.ttf"),
        os.path.join(static_dir, "DejaVuSans-Bold.ttf"),
    ]
    font_path = next((f for f in font_candidates if os.path.exists(f)), None)
    if font_path is None:
        print("WARN  month review image: no TrueType font found; the title will render "
              "at the tiny default size. Install fonts-dejavu-core.")

    def fit_font(text, max_w, max_h, start):
        size = start
        while size > 10:
            try:
                if font_path is None:
                    raise OSError("no font available")
                f = ImageFont.truetype(font_path, size)
            except Exception as exc:
                print("Font load failed:", exc)
                f = ImageFont.load_default()
            box = draw.textbbox((0, 0), text, font=f)
            if (box[2] - box[0]) <= max_w and (box[3] - box[1]) <= max_h:
                return f, box
            size -= 4
        f = ImageFont.load_default()
        return f, draw.textbbox((0, 0), text, font=f)

    font, bbox = fit_font(month_name, max_width, max_text_height, 140)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (img_size - text_w) // 2 - bbox[0]
    y = (title_height - text_h) // 2 - bbox[1]

    # Darken the title band so white text stays readable on any background.
    band = Image.new("RGBA", (img_size, title_height), (0, 0, 0, 110))
    bg.alpha_composite(band, (0, 0))

    shadow_offset = 4
    draw.text((x + shadow_offset, y + shadow_offset), month_name, fill=(0, 0, 0, 160), font=font)
    draw.text((x, y), month_name, fill=(255, 255, 255), font=font)

    # Place covers
    for idx, book in enumerate(books):
        row = idx // cols
        col = idx % cols
        x = grid_left + col * (cover_w + padding)
        y = grid_top + row * (cover_h + padding)
        cover_url = getattr(book, 'cover_url', None)
        try:
            if cover_url:
                r = requests.get(cover_url, timeout=10)
                cover = Image.open(BytesIO(r.content)).convert("RGBA")
                cover = cover.resize((cover_w, cover_h))
            else:
                raise Exception("No cover")
        except Exception:
            cover = Image.new('RGBA', (cover_w, cover_h), (220, 220, 220, 255))
        bg.paste(cover, (x, y), cover if cover.mode == 'RGBA' else None)

    return bg.convert('RGB')

def ensure_https_url(url):
    """Convert HTTP URLs to HTTPS for better security and compatibility."""
    if url and url.startswith('http://'):
        return url.replace('http://', 'https://')
    return url

def standardize_categories(categories_string):
    """Standardize and clean category strings"""
    if not categories_string:
        return None
    
    # Split by comma and clean each category
    categories = [cat.strip() for cat in categories_string.split(',')]
    
    # Remove empty categories and standardize common variations
    cleaned_categories = []
    for category in categories:
        if not category:
            continue
            
        # Standardize common variations
        category_lower = category.lower()
        if category_lower in ['sci-fi', 'scifi', 'science fiction']:
            category = 'Science Fiction'
        elif category_lower in ['fantasy', 'fantasy fiction']:
            category = 'Fantasy'
        elif category_lower in ['mystery', 'mystery fiction']:
            category = 'Mystery'
        elif category_lower in ['romance', 'romance fiction']:
            category = 'Romance'
        elif category_lower in ['thriller', 'thriller fiction']:
            category = 'Thriller'
        elif category_lower in ['horror', 'horror fiction']:
            category = 'Horror'
        elif category_lower in ['historical fiction', 'historical']:
            category = 'Historical Fiction'
        elif category_lower in ['non-fiction', 'nonfiction', 'non fiction']:
            category = 'Non-Fiction'
        elif category_lower in ['biography', 'biographies']:
            category = 'Biography'
        elif category_lower in ['autobiography', 'autobiographies']:
            category = 'Autobiography'
        elif category_lower in ['self-help', 'self help', 'selfhelp']:
            category = 'Self-Help'
        elif category_lower in ['business', 'business & economics']:
            category = 'Business'
        elif category_lower in ['philosophy', 'philosophical']:
            category = 'Philosophy'
        elif category_lower in ['religion', 'religious']:
            category = 'Religion'
        elif category_lower in ['poetry', 'poems']:
            category = 'Poetry'
        elif category_lower in ['drama', 'plays', 'theater', 'theatre']:
            category = 'Drama'
        elif category_lower in ['children', "children's", 'kids', 'juvenile']:
            category = "Children's"
        elif category_lower in ['young adult', 'ya', 'teen']:
            category = 'Young Adult'
        elif category_lower in ['classic', 'classics', 'classical']:
            category = 'Classic'
        elif category_lower in ['contemporary', 'modern']:
            category = 'Contemporary'
        else:
            # Capitalize first letter of each word for unknown categories
            category = ' '.join(word.capitalize() for word in category.split())
        
        cleaned_categories.append(category)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_categories = []
    for category in cleaned_categories:
        if category not in seen:
            seen.add(category)
            unique_categories.append(category)
    
    return ', '.join(unique_categories) if unique_categories else None

def process_book_data(book_data):
    """Process book data to ensure HTTPS URLs and clean data."""
    if 'cover_url' in book_data and book_data['cover_url']:
        book_data['cover_url'] = ensure_https_url(book_data['cover_url'])
    
    # Also fix thumbnail URLs if they exist
    if 'thumbnail_url' in book_data and book_data['thumbnail_url']:
        book_data['thumbnail_url'] = ensure_https_url(book_data['thumbnail_url'])
    
    return book_data