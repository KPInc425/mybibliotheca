import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { 
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface FilterState {
  search: string;
  category: string;
  publisher: string;
  language: string;
}

const LibraryPage: React.FC = () => {
  const { books, fetchBooks, isLoading, error } = useBooksStore();
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    publisher: '',
    language: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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

  // Filter books based on current filters
  const filteredBooks = books.filter(book => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch = !filters.search || 
      book.title.toLowerCase().includes(searchLower) ||
      book.author.toLowerCase().includes(searchLower) ||
      (book.description && book.description.toLowerCase().includes(searchLower)) ||
      (book.categories && book.categories.toLowerCase().includes(searchLower)) ||
      (book.publisher && book.publisher.toLowerCase().includes(searchLower));

    const matchesCategory = !filters.category || 
      (book.categories && book.categories.toLowerCase().includes(filters.category.toLowerCase()));

    const matchesPublisher = !filters.publisher || 
      (book.publisher && book.publisher.toLowerCase() === filters.publisher.toLowerCase());

    const matchesLanguage = !filters.language || 
      (book.language && book.language.toLowerCase() === filters.language.toLowerCase());

    return matchesSearch && matchesCategory && matchesPublisher && matchesLanguage;
  });

  // Sort books by reading status priority
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    const getPriority = (book: any) => {
      if (!book.finish_date && !book.want_to_read && !book.library_only) return 1; // Currently Reading
      if (book.want_to_read) return 2; // Want to Read
      if (book.finish_date) return 3; // Finished
      return 4; // Library Only
    };
    
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      publisher: '',
      language: ''
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
      {/* Library Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">📚 Library</h1>
        <p className="text-xl opacity-90 mt-2">Browse and manage your book collection</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-2 mb-6 justify-center">
        <Link to="/library" className="tab tab-lg tab-active">
          📖 Browse Library
        </Link>
        <Link to="/library/mass-edit" className="tab tab-lg">
          ✏️ Mass Edit
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="text-center mb-8">
        <Link to="/add-book" className="btn btn-primary btn-lg btn-wide text-lg">
          ➕ Add New Book
        </Link>
        <p className="text-base-content/70 mt-2 text-sm">Scan a barcode or search for books to add to your library</p>
      </div>

      {/* Filter Section */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h5 className="text-xl font-semibold text-primary">Filters</h5>
          
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden">
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="btn btn-outline btn-sm"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="mt-4 hidden lg:block">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Search</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full" 
                placeholder="Title, author, description..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="form-control w-full">
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

            <div className="form-control w-full">
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

            <div className="form-control w-full">
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
          </div>

          <div className="mt-4 text-center">
            <button onClick={clearFilters} className="btn btn-secondary btn-sm mr-4">
              Clear All Filters
            </button>
            <span className="text-base-content/70 font-semibold">
              Showing {sortedBooks.length} book(s)
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilters && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Filter Books</h3>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Search</span>
                </label>
                <input 
                  type="text" 
                  className="input input-bordered w-full" 
                  placeholder="Title, author, description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
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
            </div>
            <div className="modal-action">
              <button onClick={clearFilters} className="btn btn-secondary">Clear All</button>
              <button onClick={() => setShowMobileFilters(false)} className="btn btn-primary">Apply Filters</button>
              <button onClick={() => setShowMobileFilters(false)} className="btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode('grid')}
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Squares2X2Icon className="w-4 h-4" />
            Grid
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
          >
            <ListBulletIcon className="w-4 h-4" />
            List
          </button>
        </div>
      </div>

      {/* Books Display */}
      <div className="bookshelf-container bg-gradient-to-br from-base-200 to-base-300 rounded-3xl p-6 shadow-inner relative">
        {sortedBooks.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {sortedBooks.map((book) => {
                const statusBadge = getStatusBadge(book);
                return (
                  <div key={book.uid} className="book-card bg-base-100 border-2 border-secondary rounded-lg p-3 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col mx-auto h-80 w-full max-w-[200px] relative pb-6">
                    <div className="book-cover-wrapper relative mb-3 rounded-lg overflow-hidden shadow-lg aspect-[3/4] w-full h-40 bg-base-200 flex items-center justify-center">
                      <Link to={`/book/${book.uid}`}>
                        <img 
                          src={book.cover_url || '/bookshelf.png'}
                          className="book-cover-shelf w-full h-full object-contain rounded"
                          alt={`${book.title} cover`}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/bookshelf.png';
                          }}
                        />
                      </Link>
                    </div>

                    <div className="book-info flex-grow flex flex-col p-1">
                      <div className="book-title text-sm font-bold mb-1 line-clamp-2">
                        <Link to={`/book/${book.uid}`} className="text-primary hover:text-accent transition-colors">
                          {book.title}
                        </Link>
                      </div>

                      <div className="book-author text-xs text-base-content/70 mb-3 italic line-clamp-1">
                        {book.author}
                      </div>

                      <div className="book-meta mb-3 flex-grow">
                        {book.categories && (
                          <div className="category-badges mb-2 flex flex-wrap gap-1">
                            {book.categories.split(',').slice(0, 2).map((category, index) => (
                              <span key={index} className="badge badge-sm bg-secondary text-secondary-content border border-primary text-xs px-2 py-1 truncate max-w-full">
                                {category.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                                                 {book.average_rating && (
                           <div className="rating-display text-accent text-xs font-medium mb-2">
                             {[...Array(5)].map((_, i) => (
                               <span key={i}>{i < (book.average_rating || 0) ? '⭐' : '☆'}</span>
                             ))}
                             {(book.average_rating || 0).toFixed(1)}
                             {book.rating_count && (
                               <small className="text-base-content/60">({book.rating_count})</small>
                             )}
                           </div>
                         )}
                      </div>
                    </div>

                    {/* Status badge positioned at bottom */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-10 text-center">
                      <span className={`badge badge-sm ${statusBadge.color} whitespace-nowrap h-fit`}>
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedBooks.map((book) => {
                const statusBadge = getStatusBadge(book);
                return (
                  <div key={book.uid} className="bg-base-100 border-2 border-secondary rounded-lg p-4 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-20 bg-base-200 rounded-lg overflow-hidden flex-shrink-0">
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
                        <h3 className="font-semibold text-lg">
                          <Link to={`/book/${book.uid}`} className="hover:text-primary">
                            {book.title}
                          </Link>
                        </h3>
                        <p className="text-base-content/70">{book.author}</p>
                        {book.categories && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {book.categories.split(',').slice(0, 3).map((category, index) => (
                              <span key={index} className="badge badge-sm bg-secondary text-secondary-content">
                                {category.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`badge ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                                                 {book.average_rating && (
                           <div className="text-accent text-sm">
                             {[...Array(5)].map((_, i) => (
                               <span key={i}>{i < (book.average_rating || 0) ? '⭐' : '☆'}</span>
                             ))}
                             {(book.average_rating || 0).toFixed(1)}
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-primary mb-2">No books found</h3>
            <p className="text-base-content/70">
              Try adjusting your filters or <Link to="/add-book" className="link link-primary">add some books</Link> to your library!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPage; 