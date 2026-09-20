"""External book metadata providers.

Why this module exists
----------------------
The search endpoint returned HTTP 200 with `"items": []` for every query, which
looks like "no matches" but is actually a hard failure: the Google Books project
this app uses has a daily quota of **0**, so every call comes back 429
RESOURCE_EXHAUSTED and the handler swallowed it into an empty list. Nothing in
the UI could tell a user apart from a broken provider.

Two lessons are baked into this code:

1. A provider failure must never be reported as "no results". Each provider
   returns a result object that says whether it actually ran (`ok`), and the
   caller turns a total failure into an error response instead of an empty page.
2. Google Books needs an API key (or a quota increase). When `GOOGLE_BOOKS_API_KEY`
   is absent we do NOT call it at all, because the anonymous quota is exhausted
   and the call would only add a guaranteed failure and latency. OpenLibrary
   needs no key and is tried first when Google is unusable.
"""

import os

import requests
from flask import current_app

GOOGLE_BOOKS_SEARCH = 'https://www.googleapis.com/books/v1/volumes'
OPENLIBRARY_SEARCH = 'https://openlibrary.org/search.json'
OPENLIBRARY_COVERS = 'https://covers.openlibrary.org/b/id/{cover_id}-M.jpg'

REQUEST_TIMEOUT = 10


def _google_books_api_key():
    """The configured Google Books key, or None.

    An empty/placeholder value means "not configured".
    """
    key = os.environ.get('GOOGLE_BOOKS_API_KEY') or current_app.config.get('GOOGLE_BOOKS_API_KEY')
    if not key or key.strip() in ('', 'your_api_key', 'your_isbn_api_key'):
        return None
    return key.strip()


def _normalise_isbn(identifiers):
    """Prefer an ISBN-13 from a provider's identifier list."""
    if not identifiers:
        return None
    if isinstance(identifiers, str):
        return identifiers
    thirteen = [i for i in identifiers if isinstance(i, str) and len(i) == 13]
    ten = [i for i in identifiers if isinstance(i, str) and len(i) == 10]
    return (thirteen or ten or identifiers or [None])[0]


def search_openlibrary(query, page=1, page_size=20):
    """Search OpenLibrary. Keyless, so this is the default provider."""
    page_size = max(1, min(page_size, 40))
    offset = (max(1, page) - 1) * page_size

    try:
        resp = requests.get(
            OPENLIBRARY_SEARCH,
            params={
                'q': query,
                'limit': page_size,
                'offset': offset,
                'fields': ('title,author_name,first_publish_year,isbn,cover_i,'
                           'number_of_pages_median,publisher,language,subject'),
            },
            timeout=REQUEST_TIMEOUT,
        )
    except (requests.exceptions.RequestException, requests.exceptions.Timeout) as exc:
        return {'ok': False, 'provider': 'openlibrary', 'items': [], 'total': 0,
                'error': f'OpenLibrary is unreachable: {exc}'}

    if resp.status_code != 200:
        return {'ok': False, 'provider': 'openlibrary', 'items': [], 'total': 0,
                'error': f'OpenLibrary returned HTTP {resp.status_code}'}

    try:
        data = resp.json()
    except ValueError as exc:
        return {'ok': False, 'provider': 'openlibrary', 'items': [], 'total': 0,
                'error': f'OpenLibrary returned a non-JSON body: {exc}'}

    items = []
    for doc in data.get('docs', []):
        cover_id = doc.get('cover_i')
        subjects = doc.get('subject') or []
        items.append({
            'title': doc.get('title'),
            'author': ', '.join(doc.get('author_name') or []),
            'cover_url': OPENLIBRARY_COVERS.format(cover_id=cover_id) if cover_id else None,
            'isbn': _normalise_isbn(doc.get('isbn')),
            'description': None,
            'published_date': str(doc.get('first_publish_year')) if doc.get('first_publish_year') else None,
            'page_count': doc.get('number_of_pages_median'),
            'publisher': (doc.get('publisher') or [None])[0],
            'language': (doc.get('language') or [None])[0],
            'categories': subjects[:5],
            'average_rating': None,
            'rating_count': None,
        })

    return {'ok': True, 'provider': 'openlibrary', 'items': items,
            'total': data.get('numFound', len(items)), 'error': None}


def search_google_books(query, page=1, page_size=20):
    """Search Google Books. Requires GOOGLE_BOOKS_API_KEY to be usable here."""
    api_key = _google_books_api_key()
    if not api_key:
        return {'ok': False, 'provider': 'google', 'items': [], 'total': 0,
                'error': ('Google Books is not configured (GOOGLE_BOOKS_API_KEY is unset). '
                          'The anonymous quota for this project is exhausted.')}

    page_size = max(1, min(page_size, 40))
    start_index = (max(1, page) - 1) * page_size

    try:
        resp = requests.get(
            GOOGLE_BOOKS_SEARCH,
            params={'q': query, 'maxResults': page_size, 'startIndex': start_index, 'key': api_key},
            timeout=REQUEST_TIMEOUT,
        )
    except (requests.exceptions.RequestException, requests.exceptions.Timeout) as exc:
        return {'ok': False, 'provider': 'google', 'items': [], 'total': 0,
                'error': f'Google Books is unreachable: {exc}'}

    if resp.status_code != 200:
        detail = ''
        try:
            body = resp.json()
            detail = ((body.get('error') or {}).get('message') or '')[:200]
        except ValueError:
            pass
        return {'ok': False, 'provider': 'google', 'items': [], 'total': 0,
                'error': f'Google Books returned HTTP {resp.status_code}. {detail}'.strip()}

    data = resp.json()
    items = []
    for item in data.get('items', []):
        info = item.get('volumeInfo', {})
        image = (info.get('imageLinks') or {}).get('thumbnail')
        items.append({
            'title': info.get('title'),
            'author': ', '.join(info.get('authors') or []),
            'cover_url': image,
            'isbn': _normalise_isbn([i.get('identifier') for i in info.get('industryIdentifiers', [])]),
            'description': info.get('description'),
            'published_date': info.get('publishedDate'),
            'page_count': info.get('pageCount'),
            'publisher': info.get('publisher'),
            'language': info.get('language'),
            'categories': info.get('categories', []),
            'average_rating': info.get('averageRating'),
            'rating_count': info.get('ratingsCount'),
        })

    total = data.get('totalItems', len(items))
    return {'ok': True, 'provider': 'google', 'items': items, 'total': total, 'error': None}


def search_books(query, page=1, page_size=20):
    """Search using the best available provider.

    OpenLibrary is tried first because it needs no key; Google Books is used only
    when a key is configured. If every provider fails, `ok` is False and the
    caller must surface `error` rather than an empty result set.
    """
    attempts = [search_openlibrary]
    if _google_books_api_key():
        attempts.append(search_google_books)

    errors = []
    for provider in attempts:
        result = provider(query, page=page, page_size=page_size)
        if result['ok']:
            if errors:
                result['warnings'] = errors
            return result
        errors.append(f"{result['provider']}: {result['error']}")

    return {
        'ok': False,
        'provider': None,
        'items': [],
        'total': 0,
        'error': 'No book search provider is available. ' + '; '.join(errors),
    }
