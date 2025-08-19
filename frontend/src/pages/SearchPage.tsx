import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

interface SearchFilters {
  query: string;
  category: string;
  publisher: string;
  language: string;
  status: string;
  rating: string;
  dateAdded: string;
}

const SearchPage: React.FC = () => {
  const { books, fetchBooks, isLoading, error } = useBooksStore();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    publisher: '',
    language: '',
    status: '',
    rating: '',
    dateAdded: ''
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    performSearch();
  }, [filters, books]);

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

  const performSearch = () => {
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
        case 'want-to-read':
          results = results.filter(book => book.want_to_read);
          break;
        case 'library-only':
          results = results.filter(book => book.library_only);
          break;
      }
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseInt(filters.rating);
      results = results.filter(book => 
        book.average_rating && book.average_rating >= minRating
      );
    }

    // Date added filter
    if (filters.dateAdded) {
      const filterDate = new Date(filters.dateAdded);
      results = results.filter(book => {
        if (!book.created_at) return false;
        const bookDate = new Date(book.created_at);
        return bookDate >= filterDate;
      });
    }

    setSearchResults(results);
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

  const getStatusBadge = (book: any) => {
    if (book.want_to_read) return { text: 'Want to Read', color: 'badge-info' };
    if (!book.finish_date && !book.want_to_read && !book.library_only) return { text: 'Currently Reading', color: 'badge-warning' };
    if (book.finish_date) return { text: 'Finished', color: 'badge-success' };
    return { text: 'Library Only', color: 'badge-neutral' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <XMarkIcon className="w-6 h-6" />
        <span>Error loading books: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">🔍 Search Books</h1>
        <p className="text-xl opacity-90 mt-2">Find books in your library with advanced search</p>
      </div>

      {/* Search Form */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
        <div className="space-y-6">
          {/* Main Search */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold text-lg">Search Query</span>
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input 
                type="text" 
                className="input input-bordered w-full pl-10" 
                placeholder="Search by title, author, description, categories, publisher, or ISBN..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              />
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="btn btn-outline btn-sm"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            </button>
            <button onClick={clearFilters} className="btn btn-ghost btn-sm">
              Clear All Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-base-300">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Category</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Publisher</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={filters.publisher}
                  onChange={(e) => setFilters(prev => ({ ...prev, publisher: e.target.value }))}
                >
                  <option value="">All Publishers</option>
                  {publishers.map(publisher => (
                    <option key={publisher} value={publisher}>{publisher}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Language</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={filters.language}
                  onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                >
                  <option value="">All Languages</option>
                  {languages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Reading Status</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Status</option>
                  <option value="reading">Currently Reading</option>
                  <option value="finished">Finished</option>
                  <option value="want-to-read">Want to Read</option>
                  <option value="library-only">Library Only</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Minimum Rating</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={filters.rating}
                  onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Added After</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered w-full" 
                  value={filters.dateAdded}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateAdded: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <MagnifyingGlassIcon className="w-6 h-6" />
            Search Results
          </h2>
          <span className="text-base-content/70 font-semibold">
            {searchResults.length} book{searchResults.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {searchResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResults.map((book) => {
              const statusBadge = getStatusBadge(book);
              return (
                <div key={book.uid} className="bg-base-200 border-2 border-secondary rounded-lg p-4 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-20 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={book.cover_url || '/bookshelf.png'}
                        className="w-full h-full object-cover"
                        alt={`${book.title} cover`}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/bookshelf.png';
                        }}
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-base mb-1">
                        <Link to={`/book/${book.uid}`} className="hover:text-primary line-clamp-2">
                          {book.title}
                        </Link>
                      </h3>
                      <p className="text-sm text-base-content/70 mb-2">{book.author}</p>
                      
                      {book.categories && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {book.categories.split(',').slice(0, 2).map((category: string, index: number) => (
                            <span key={index} className="badge badge-xs bg-secondary text-secondary-content">
                              {category.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`badge badge-sm ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                        {book.average_rating && (
                          <div className="text-accent text-xs">
                            {[...Array(5)].map((_, i) => (
                              <span key={i}>{i < (book.average_rating || 0) ? '⭐' : '☆'}</span>
                            ))}
                            {(book.average_rating || 0).toFixed(1)}
                          </div>
                        )}
                      </div>

                      {book.page_count && (
                        <p className="text-xs text-base-content/60 mt-1">
                          {book.page_count} pages
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpenIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">No books found</h3>
            <p className="text-base-content/70 mb-4">
              {filters.query || filters.category || filters.publisher || filters.language || filters.status || filters.rating || filters.dateAdded
                ? 'Try adjusting your search criteria'
                : 'Start searching to find books in your library'
              }
            </p>
            {!filters.query && !filters.category && !filters.publisher && !filters.language && !filters.status && !filters.rating && !filters.dateAdded && (
              <Link to="/add-book" className="btn btn-primary">
                Add Your First Book
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
