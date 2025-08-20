import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Book } from '@/types';
import { 
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

interface MonthWrapupData {
  month: string;
  year: number;
  books_finished: Book[];
  total_pages_read: number;
  reading_sessions: number;
  average_pages_per_day: number;
  reading_streak: number;
  top_genres: Array<{ genre: string; count: number }>;
  monthly_stats: {
    total_books: number;
    finished_books: number;
    currently_reading: number;
    want_to_read: number;
  };
}

const MonthWrapupPage: React.FC = () => {
  const [wrapupData, setWrapupData] = useState<MonthWrapupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    const fetchMonthWrapup = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
        const currentYear = now.getFullYear();
        
        // Try to fetch month wrapup data
        const response = await api.get<any>(`/reports/month-wrapup/${currentYear}/${currentMonth}`);
        
        if (response.success && response.data) {
          const data = response.data;
          // Map backend shape to UI shape
          const mapped: MonthWrapupData = {
            month: data.month_name || new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' }),
            year: data.year,
            books_finished: data.finished_books || [],
            total_pages_read: data.statistics?.total_pages_read || 0,
            reading_sessions: data.statistics?.total_reading_days || 0,
            average_pages_per_day: data.statistics?.average_pages_per_day || 0,
            reading_streak: data.statistics?.reading_streak || 0,
            top_genres: data.top_genres || [],
            monthly_stats: {
              total_books: (data.finished_books || []).length + (data.currently_reading || 0),
              finished_books: (data.finished_books || []).length,
              currently_reading: data.currently_reading || 0,
              want_to_read: data.want_to_read || 0,
            },
          };
          setWrapupData(mapped);
          setIsEmpty(false);
        } else {
          // If no data, show empty state
          setIsEmpty(true);
          setWrapupData({
            month: new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' }),
            year: currentYear,
            books_finished: [],
            total_pages_read: 0,
            reading_sessions: 0,
            average_pages_per_day: 0,
            reading_streak: 0,
            top_genres: [],
            monthly_stats: {
              total_books: 0,
              finished_books: 0,
              currently_reading: 0,
              want_to_read: 0
            }
          });
        }
      } catch (err) {
        setError('Failed to load month wrap-up data');
        console.error('Month wrapup fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthWrapup();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">📊 Month Wrap-up</h1>
          <p className="text-base-content/70 mt-1">Loading your monthly reading statistics...</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">📊 Month Wrap-up</h1>
          <p className="text-base-content/70 mt-1">Your monthly reading statistics</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load Month Wrap-up</h2>
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
        <h1 className="text-3xl font-bold text-base-content">📊 Month Wrap-up</h1>
        <p className="text-base-content/70 mt-1">
          {wrapupData?.month} {wrapupData?.year} Reading Summary
        </p>
      </div>

      {isEmpty ? (
        // Empty State - No books finished this month
        <div className="hero bg-gradient-to-br from-primary to-secondary text-primary-content py-12 rounded-box mb-8">
          <div className="hero-content text-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">
                📅 Month Wrap Up - {wrapupData?.month} {wrapupData?.year}
              </h1>
              <p className="text-xl opacity-90">See your monthly reading summary</p>
            </div>
          </div>
        </div>
      ) : (
        // Month Wrap-up Content
        <>
          {/* Monthly Statistics */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-primary">
                <Icon hero={<BookOpenIcon className="w-8 h-8" />} emoji="📚" />
              </div>
              <div className="stat-title">Books Finished</div>
              <div className="stat-value text-primary">{wrapupData?.books_finished?.length || 0}</div>
              <div className="stat-desc">This month</div>
            </div>
            
            <div className="stat">
              <div className="stat-figure text-success">
                <Icon hero={<ArrowTrendingUpIcon className="w-8 h-8" />} emoji="📈" />
              </div>
              <div className="stat-title">Pages Read</div>
              <div className="stat-value text-success">{wrapupData?.total_pages_read || 0}</div>
              <div className="stat-desc">Total pages</div>
            </div>
            
            <div className="stat">
              <div className="stat-figure text-warning">
                <Icon hero={<ClockIcon className="w-8 h-8" />} emoji="⏱️" />
              </div>
              <div className="stat-title">Reading Sessions</div>
              <div className="stat-value text-warning">{wrapupData?.reading_sessions || 0}</div>
              <div className="stat-desc">This month</div>
            </div>
            
            <div className="stat">
              <div className="stat-figure text-info">
                <Icon hero={<FireIcon className="w-8 h-8" />} emoji="🔥" />
              </div>
              <div className="stat-title">Reading Streak</div>
              <div className="stat-value text-info">{wrapupData?.reading_streak || 0}</div>
              <div className="stat-desc">Consecutive days</div>
            </div>
          </div>

          {/* Average Pages Per Day */}
          {wrapupData && wrapupData.average_pages_per_day > 0 && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary mb-4">
                  <Icon hero={<ChartBarIcon className="w-6 h-6" />} emoji="📊" />
                  Daily Reading Average
                </h2>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {wrapupData.average_pages_per_day.toFixed(1)}
                  </div>
                  <p className="text-base-content/70">pages per day</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="flex justify-center mb-8">
          <div className="card bg-base-100 shadow-xl w-full max-w-2xl">
            <div className="card-body items-center text-center py-12">
              <div className="mb-6">
                <span className="text-6xl">📚</span>
              </div>
              <h2 className="text-2xl font-bold mb-3">No Books Finished This Month</h2>
              <p className="text-base-content/70 mb-6">
                You haven't finished any books in {wrapupData?.month} {wrapupData?.year} yet. <br />
                Keep reading to see your amazing monthly wrap-up!
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/add-book" className="btn btn-primary">
                  ➕ Add a Book
                </Link>
                <Link to="/library" className="btn btn-outline">
                  📚 View Library
                </Link>
                <Link to="/" className="btn btn-outline btn-primary">
                  🏠 Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finished Books List */}
      {wrapupData && wrapupData.books_finished && wrapupData.books_finished.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <Icon hero={<CheckCircleIcon className="w-6 h-6" />} emoji="✅" />
              Books Finished This Month
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wrapupData.books_finished.map((book) => (
                <div key={book.uid} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                  <div className="w-12 h-16 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={book.cover_url ?? '/bookshelf.png'}
                      className="w-full h-full object-cover"
                      alt={`${book.title} cover`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Prevent infinite loop by checking if we're already using the fallback
                        if (target.src !== window.location.origin + '/bookshelf.png') {
                          target.src = '/bookshelf.png';
                        } else {
                          // If fallback also fails, hide the image and show a placeholder
                          target.style.display = 'none';
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-full bg-base-200 rounded flex items-center justify-center text-lg';
                          placeholder.innerHTML = '📚';
                          target.parentNode?.appendChild(placeholder);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold truncate">{book.title}</h3>
                    <p className="text-sm text-base-content/70 truncate">{book.author}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge badge-success badge-xs">Finished</span>
                      {book.finish_date && (
                        <span className="text-xs text-base-content/60">
                          {new Date(book.finish_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Genres */}
      {wrapupData && wrapupData.top_genres?.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <Icon hero={<ChartBarIcon className="w-6 h-6" />} emoji="📊" />
              Top Genres This Month
            </h2>
            
            <div className="space-y-3">
              {wrapupData.top_genres.map((genre, index) => (
                <div key={genre.genre} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">#{index + 1}</span>
                    <span className="font-semibold">{genre.genre}</span>
                  </div>
                  <span className="badge badge-primary">{genre.count} books</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthWrapupPage;
