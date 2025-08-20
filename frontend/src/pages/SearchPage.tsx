import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { api } from '@/api/client';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BookOpenIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

interface SearchFilters {
  query: string;
  category: string;
  publisher: string;
  language: string;
  status: string;
  rating: string;
  dateAdded: string;
}

interface SearchResult {
  title: string;
  author: string;
  cover_url?: string;
  isbn?: string;
  description?: string;
  published_date?: string;
  page_count?: number;
  publisher?: string;
  language?: string;
  categories?: string[];
  average_rating?: number;
  rating_count?: number;
}

const SearchPage: React.FC = () => {
  const { books, fetchBooks, isLoading } = useBooksStore();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    publisher: '',
    language: '',
    status: '',
    rating: '',
    dateAdded: ''
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'local' | 'external'>('external');

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    if (searchMode === 'local') {
      performLocalSearch();
    }
  }, [filters, books, searchMode]);

  // Extract unique values for filter options
  const categories = Array.from(new Set(
    books.flatMap(book => 
      book.categories ? book.categories.split(',').map(cat => cat.trim()) : []
    )
  )).sort();

  const publishers = Array.from(new Set(
    books.map(book => book.publisher).filter(Boolean)
  )).sort();

  const languages = Array.from(new Set(
    books.map(book => book.language).filter(Boolean)
  )).sort();

  const performLocalSearch = () => {
    let results = [...books];

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        (book.description && book.description.toLowerCase().includes(query)) ||
        (book.categories && book.categories.toLowerCase().includes(query)) ||
        (book.publisher && book.publisher.toLowerCase().includes(query)) ||
        (book.isbn && book.isbn.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category) {
      results = results.filter(book => 
        book.categories && book.categories.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    // Publisher filter
    if (filters.publisher) {
      results = results.filter(book => 
        book.publisher && book.publisher.toLowerCase() === filters.publisher.toLowerCase()
      );
    }

    // Language filter
    if (filters.language) {
      results = results.filter(book => 
        book.language && book.language.toLowerCase() === filters.language.toLowerCase()
      );
    }

    // Status filter
    if (filters.status) {
      switch (filters.status) {
        case 'reading':
          results = results.filter(book => book.start_date && !book.finish_date);
          break;
        case 'finished':
          results = results.filter(book => book.finish_date);
          break;
        case 'want_to_read':
          results = results.filter(book => book.want_to_read);
          break;
      }
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      results = results.filter(book => book.average_rating && book.average_rating >= minRating);
    }

    // Date added filter
    if (filters.dateAdded) {
      const cutoffDate = new Date();
      switch (filters.dateAdded) {
        case 'week':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
          break;
      }
      results = results.filter(book => 
        book.created_at && new Date(book.created_at) >= cutoffDate
      );
    }

    setSearchResults(results as any);
  };

  const performExternalSearch = async () => {
    if (!filters.query.trim()) {
      setSearchResults([]);
      setTotal(0);
      setPage(1);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await api.books.search(filters.query, page, pageSize);
      if (response.success && response.data) {
        // response.data: { items, total, page, page_size, pages }
        setSearchResults(response.data.items || []);
        setTotal(response.data.total || 0);
      } else {
        setSearchError('No results found');
        setSearchResults([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Search failed. Please try again.');
      setSearchResults([]);
      setTotal(0);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    if (searchMode === 'external') {
      setPage(1);
      performExternalSearch();
    }
  };

  const handleAddBook = async (book: SearchResult) => {
    try {
      const bookData = {
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        cover_url: book.cover_url,
        description: book.description,
        published_date: book.published_date,
        page_count: book.page_count,
        publisher: book.publisher,
        language: book.language,
        categories: book.categories ? book.categories.join(', ') : undefined,
        average_rating: book.average_rating,
        rating_count: book.rating_count
      };

      await api.books.create(bookData);
      // Refresh the books list
      fetchBooks();
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      publisher: '',
      language: '',
      status: '',
      rating: '',
      dateAdded: ''
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-base-content mb-4">Search Books</h1>
        
        {/* Search Mode Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text mr-2">Search Mode:</span>
              <input
                type="radio"
                name="searchMode"
                className="radio radio-primary"
                checked={searchMode === 'external'}
                onChange={() => setSearchMode('external')}
              />
              <span className="label-text ml-2">External Books</span>
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <input
                type="radio"
                name="searchMode"
                className="radio radio-primary"
                checked={searchMode === 'local'}
                onChange={() => setSearchMode('local')}
              />
              <span className="label-text ml-2">My Library</span>
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="flex">
              <input
                type="text"
                placeholder={searchMode === 'external' ? "Search for books (e.g., 'Harry Potter')" : "Search your library..."}
                className="input input-bordered flex-1"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="btn btn-primary"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <div className="loading loading-spinner loading-sm"></div>
                ) : (
                  <Icon hero={<MagnifyingGlassIcon className="w-5 h-5" />} emoji="🔍" />
                )}
                Search
              </button>
            </div>
          </div>
          
          {searchMode === 'local' && (
            <button
              className="btn btn-outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Icon hero={<FunnelIcon className="w-5 h-5" />} emoji="⚙️" />
              Filters
            </button>
          )}
        </div>

        {/* Advanced Filters (Local Search Only) */}
        {showAdvancedFilters && searchMode === 'local' && (
          <div className="card bg-base-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Category</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Publisher</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.publisher}
                  onChange={(e) => setFilters({ ...filters, publisher: e.target.value })}
                >
                  <option value="">All Publishers</option>
                  {publishers.map(publisher => (
                    <option key={publisher} value={publisher}>{publisher}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Language</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                >
                  <option value="">All Languages</option>
                  {languages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="reading">Currently Reading</option>
                  <option value="finished">Finished</option>
                  <option value="want_to_read">Want to Read</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Rating</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.rating}
                  onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                >
                  <option value="">All Ratings</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Date Added</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.dateAdded}
                  onChange={(e) => setFilters({ ...filters, dateAdded: e.target.value })}
                >
                  <option value="">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button
                className="btn btn-outline btn-sm"
                onClick={clearFilters}
              >
                <XMarkIcon className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {searchError && (
          <div className="alert alert-error mb-6">
            <XMarkIcon className="w-5 h-5" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Results */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-base-content">
            {searchMode === 'external' ? 'Search Results' : 'Library Results'}
            {searchResults.length > 0 && (
              <span className="text-base-content/70 ml-2">({searchResults.length})</span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-8">
            <Icon hero={<BookOpenIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />} emoji="📖" />
            <p className="text-base-content/70">
              {searchMode === 'external' 
                ? 'Search for books to find new titles to add to your library'
                : 'No books match your search criteria'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.map((book, index) => (
                <div key={index} className="card bg-base-100 shadow-xl">
                  <figure className="px-4 pt-4">
                    <img
                      src={book.cover_url || '/static/bookshelf.png'}
                      alt={book.title}
                      className="rounded-xl h-64 w-full object-cover"
                    />
                  </figure>
                  <div className="card-body">
                    <h3 className="card-title text-lg">{book.title}</h3>
                    <p className="text-base-content/70">{book.author}</p>
                    
                    {book.description && (
                      <p className="text-sm text-base-content/60 line-clamp-3">
                        {book.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {book.categories && book.categories.slice(0, 2).map((category, idx) => (
                        <span key={idx} className="badge badge-outline badge-sm">
                          {category}
                        </span>
                      ))}
                    </div>
                    
                    <div className="card-actions justify-end mt-4">
                      {searchMode === 'external' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddBook(book)}
                        >
                          <Icon hero={<PlusIcon className="w-4 h-4" />} emoji="➕" />
                          Add to Library
                        </button>
                      ) : (
                        <Link
                          to={`/book/${book.isbn || index}`}
                          className="btn btn-primary btn-sm"
                        >
                          <Icon hero={<BookOpenIcon className="w-4 h-4" />} emoji="📖" />
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination (External) */}
            {searchMode === 'external' && total > pageSize && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  className="btn btn-outline"
                  disabled={page <= 1 || isSearching}
                  onClick={() => { setPage(page - 1); setTimeout(performExternalSearch, 0); }}
                >
                  Previous
                </button>
                <span className="text-sm text-base-content/70">
                  Page {page} of {Math.ceil(total / pageSize)}
                </span>
                <button
                  className="btn btn-outline"
                  disabled={page >= Math.ceil(total / pageSize) || isSearching}
                  onClick={() => { setPage(page + 1); setTimeout(performExternalSearch, 0); }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
