import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useBooksStore } from '@/store/books';
import { api } from '@/api/client';
import { UserStatistics } from '@/types';
import { 
  BookOpenIcon,
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { books, fetchBooks, isLoading: booksLoading } = useBooksStore();
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch books and statistics in parallel
        await Promise.all([
          fetchBooks(),
          api.user.getStatistics().then(response => {
            if (response.success && response.data) {
              setStats(response.data);
            }
          })
        ]);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [fetchBooks]);

  // Get currently reading books
  const currentlyReading = books.filter(book => 
    book.start_date && !book.finish_date && !book.want_to_read && !book.library_only
  );

  // Get recently added books (last 5)
  const recentlyAdded = books
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">📊 Dashboard</h1>
          <p className="text-xl opacity-90 mt-2">Loading your reading statistics...</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat bg-base-100 rounded-box animate-pulse">
              <div className="stat-title bg-base-300 h-4 rounded mb-2"></div>
              <div className="stat-value bg-base-300 h-8 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-error to-error/80 text-white text-center py-8 mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">❌ Error</h1>
          <p className="text-xl opacity-90 mt-2">{error}</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load Dashboard</h2>
          <p className="text-base-content/70 mb-6">
            There was an error loading your dashboard data. Please try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-error"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">📊 Dashboard</h1>
        <p className="text-xl opacity-90 mt-2">Welcome back, {user?.username}!</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat bg-base-100 rounded-box shadow-lg">
          <div className="stat-title text-base-content/70">Total Books</div>
          <div className="stat-value text-3xl stat-number">{stats?.total_books || books.length}</div>
          <div className="stat-desc text-base-content/60">In your library</div>
        </div>
        
        <div className="stat bg-base-100 rounded-box shadow-lg">
          <div className="stat-title text-base-content/70">Finished</div>
          <div className="stat-value text-3xl stat-number">{stats?.finished_books || books.filter(b => b.finish_date).length}</div>
          <div className="stat-desc text-base-content/60">Books completed</div>
        </div>
        
        <div className="stat bg-base-100 rounded-box shadow-lg">
          <div className="stat-title text-base-content/70">Currently Reading</div>
          <div className="stat-value text-3xl stat-number">{stats?.currently_reading || currentlyReading.length}</div>
          <div className="stat-desc text-base-content/60">Active books</div>
        </div>
        
        <div className="stat bg-base-100 rounded-box shadow-lg">
          <div className="stat-title text-base-content/70">Reading Streak</div>
          <div className="stat-value text-3xl stat-number">{stats?.reading_streak || 0}</div>
          <div className="stat-desc text-base-content/60">Consecutive days</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link 
          to="/add-book" 
          className="btn btn-primary btn-lg flex items-center gap-3"
        >
          <Icon hero={<PlusIcon className="w-6 h-6" />} emoji="➕" />
          Add Book
        </Link>
        
        <Link 
          to="/library" 
          className="btn btn-outline btn-lg flex items-center gap-3"
        >
          <Icon hero={<BookOpenIcon className="w-6 h-6" />} emoji="📚" />
          Browse Library
        </Link>
        
        <Link 
          to="/search" 
          className="btn btn-outline btn-lg flex items-center gap-3"
        >
          <Icon hero={<MagnifyingGlassIcon className="w-6 h-6" />} emoji="🔍" />
          Search Books
        </Link>
        
        <Link 
          to="/reports/month-wrapup" 
          className="btn btn-outline btn-lg flex items-center gap-3"
        >
          <Icon hero={<ChartBarIcon className="w-6 h-6" />} emoji="📊" />
          Month Wrap-up
        </Link>
      </div>

      {/* Currently Reading Section */}
      {currentlyReading.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <Icon hero={<ClockIcon className="w-6 h-6" />} emoji="⏱️" />
              Currently Reading
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentlyReading.slice(0, 6).map((book) => (
                <div key={book.uid} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                  <div className="w-12 h-16 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={book.cover_url || '/bookshelf.png'}
                      className="w-full h-full object-cover"
                      alt={`${book.title} cover`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/bookshelf.png';
                      }}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold truncate">{book.title}</h3>
                    <p className="text-sm text-base-content/70 truncate">{book.author}</p>
                    <Link 
                      to={`/book/${book.uid}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {currentlyReading.length > 6 && (
              <div className="text-center mt-4">
                <Link to="/library" className="btn btn-outline btn-sm">
                  View All ({currentlyReading.length} books)
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recently Added Books */}
      {recentlyAdded.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <Icon hero={<PlusIcon className="w-6 h-6" />} emoji="➕" />
              Recently Added
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentlyAdded.map((book) => (
                <div key={book.uid} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                  <div className="w-12 h-16 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={book.cover_url || '/bookshelf.png'}
                      className="w-full h-full object-cover"
                      alt={`${book.title} cover`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/bookshelf.png';
                      }}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold truncate">{book.title}</h3>
                    <p className="text-sm text-base-content/70 truncate">{book.author}</p>
                    <div className="flex gap-1 mt-1">
                      {book.finish_date && (
                        <span className="badge badge-success badge-xs">Finished</span>
                      )}
                      {book.start_date && !book.finish_date && (
                        <span className="badge badge-info badge-xs">Reading</span>
                      )}
                      {book.want_to_read && (
                        <span className="badge badge-warning badge-xs">Want to Read</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <Link to="/library" className="btn btn-outline btn-sm">
                View All Books
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {books.length === 0 && !booksLoading && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="mb-6">
              <span className="text-6xl">📚</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">Welcome to BookOracle!</h2>
            <p className="text-base-content/70 mb-6">
              Your library is empty. Start by adding your first book to begin tracking your reading journey.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/add-book" className="btn btn-primary">
                <Icon hero={<PlusIcon className="w-5 h-5 mr-2" />} emoji="➕" />
                Add Your First Book
              </Link>
              <Link to="/search" className="btn btn-outline">
                <Icon hero={<MagnifyingGlassIcon className="w-5 h-5 mr-2" />} emoji="🔍" />
                Search for Books
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 