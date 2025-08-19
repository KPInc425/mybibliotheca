import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { Book } from '@/types';
import { 
  BookOpenIcon,
  ClockIcon,
  HeartIcon,
  CheckCircleIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';

interface PublicLibraryPageProps {}

const PublicLibraryPage: React.FC<PublicLibraryPageProps> = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'currently_reading' | 'want_to_read'>(
    (searchParams.get('filter') as any) || 'all'
  );

  useEffect(() => {
    const fetchPublicBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch public books with filter
        const response = await api.get<Book[]>('/books/public', { filter });
        
        if (response.success) {
          setBooks(response.data || []);
        } else {
          setError('Failed to load public library');
        }
      } catch (err) {
        setError('Failed to load public library');
        console.error('Public library fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicBooks();
  }, [filter]);

  const handleFilterChange = (newFilter: 'all' | 'currently_reading' | 'want_to_read') => {
    setFilter(newFilter);
    setSearchParams({ filter: newFilter });
  };

  const getStatusBadge = (book: Book) => {
    if (book.want_to_read) return { text: 'Want to Read', color: 'badge-info' };
    if (!book.finish_date && !book.want_to_read && !book.library_only) return { text: 'Currently Reading', color: 'badge-warning' };
    if (book.finish_date) return { text: 'Finished', color: 'badge-success' };
    return { text: 'Library Only', color: 'badge-neutral' };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">📚 Public Library</h1>
          <p className="text-base-content/70 mt-1">Loading public books...</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="w-full h-48 bg-base-300 rounded-lg mb-4"></div>
                <div className="h-4 bg-base-300 rounded mb-2"></div>
                <div className="h-3 bg-base-300 rounded mb-2"></div>
                <div className="h-3 bg-base-300 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">📚 Public Library</h1>
          <p className="text-base-content/70 mt-1">Browse all public books</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load Public Library</h2>
          <p className="text-base-content/70 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-error"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-base-content">📚 Public Library</h1>
        <p className="text-base-content/70 mt-1">Browse all public books from the community</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => handleFilterChange('all')}
          className={`btn btn-outline btn-sm ${filter === 'all' ? 'btn-active btn-primary' : ''}`}
        >
          Show All
        </button>
        <button
          onClick={() => handleFilterChange('currently_reading')}
          className={`btn btn-outline btn-sm ${filter === 'currently_reading' ? 'btn-active btn-warning' : ''}`}
        >
          Currently Reading
        </button>
        <button
          onClick={() => handleFilterChange('want_to_read')}
          className={`btn btn-outline btn-sm ${filter === 'want_to_read' ? 'btn-active btn-info' : ''}`}
        >
          Want to Read
        </button>
      </div>

      {/* Books Grid */}
      {books.length > 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-base-200 to-base-300 py-8 px-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-center">
            {books.map((book) => {
              const statusBadge = getStatusBadge(book);
              return (
                <div key={book.uid} className="card bg-base-100 border-2 border-secondary shadow-md flex flex-col items-center p-4">
                  <div className="w-full h-48 bg-base-300 rounded-lg overflow-hidden flex items-center justify-center mb-3">
                    <img
                      src={book.cover_url || '/bookshelf.png'}
                      alt={`${book.title} cover`}
                      className="h-full w-auto object-contain rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/bookshelf.png';
                      }}
                    />
                  </div>
                  
                  <div className="text-center w-full">
                    <div className="font-bold text-base mb-1 truncate w-full">{book.title}</div>
                    <div className="text-sm text-base-content/70 text-center mb-2 truncate w-full">{book.author}</div>
                    
                    <div className="flex flex-wrap gap-1 justify-center mb-2">
                      <span className={`badge badge-xs ${statusBadge.color}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    
                    {book.isbn && (
                      <div className="text-xs text-base-content/50 mb-1">ISBN: {book.isbn}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="mb-6">
              <BuildingLibraryIcon className="w-16 h-16 text-base-content/30 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No Public Books Found</h2>
            <p className="text-base-content/70 mb-6">
              {filter === 'all' 
                ? "No books are currently shared publicly."
                : `No books found for the "${filter.replace('_', ' ')}" filter.`
              }
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleFilterChange('all')}
                className="btn btn-outline"
              >
                Show All Books
              </button>
              <Link to="/library" className="btn btn-primary">
                <BookOpenIcon className="w-5 h-5 mr-2" />
                View Your Library
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {books.length > 0 && (
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-primary">
              <BookOpenIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Total Books</div>
            <div className="stat-value text-primary">{books.length}</div>
            <div className="stat-desc">Shared by the community</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-warning">
              <ClockIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Currently Reading</div>
            <div className="stat-value text-warning">
              {books.filter(b => !b.finish_date && !b.want_to_read && !b.library_only).length}
            </div>
            <div className="stat-desc">Active readers</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-info">
              <HeartIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Want to Read</div>
            <div className="stat-value text-info">
              {books.filter(b => b.want_to_read).length}
            </div>
            <div className="stat-desc">Wishlist items</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-success">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Finished</div>
            <div className="stat-value text-success">
              {books.filter(b => b.finish_date).length}
            </div>
            <div className="stat-desc">Completed books</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLibraryPage;
