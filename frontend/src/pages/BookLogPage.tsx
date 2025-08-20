import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { api } from '@/api/client';
import { 
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const BookLogPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { books } = useBooksStore();
  const [book, setBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [readingLogs, setReadingLogs] = useState<any[]>([]);
  const [showAddLog, setShowAddLog] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    pages_read: '',
    notes: ''
  });

  useEffect(() => {
    const loadBook = async () => {
      if (!uid) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Find book in store first
        const foundBook = books.find(b => b.uid === uid);
        if (foundBook) {
          setBook(foundBook);
        } else {
          // Fetch from API if not in store
          const bookData = await api.books.getById(uid);
          setBook(bookData.data);
        }

        // Load reading logs
        try {
          const logsResponse = await api.books.getReadingLogs(uid);
          setReadingLogs(logsResponse.data || []);
        } catch (err) {
          console.error('Error loading reading logs:', err);
          setReadingLogs([]);
        }
      } catch (err) {
        setError('Failed to load book details');
        console.error('Error loading book:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [uid, books]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || isSaving) return;

    try {
      setIsSaving(true);
      
      const logData = {
        book_id: book.id,
        date: newLog.date,
        pages_read: parseInt(newLog.pages_read),
        notes: newLog.notes || null
      };

      await api.books.addReadingLog(book.uid, logData);
      
      // Refresh reading logs
      const logsResponse = await api.books.getReadingLogs(book.uid);
      setReadingLogs(logsResponse.data || []);
      
      // Reset form
      setNewLog({
        date: new Date().toISOString().split('T')[0],
        pages_read: '',
        notes: ''
      });
      setShowAddLog(false);
    } catch (err) {
      console.error('Error adding reading log:', err);
      setError('Failed to add reading log');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    if (!book.page_count) return 0;
    
    const totalPagesRead = readingLogs.reduce((sum, log) => sum + (log.pages_read || 0), 0);
    return Math.min((totalPagesRead / book.page_count) * 100, 100);
  };

  const getTotalPagesRead = () => {
    return readingLogs.reduce((sum, log) => sum + (log.pages_read || 0), 0);
  };

  const getReadingStreak = () => {
    if (readingLogs.length === 0) return 0;
    
    const sortedLogs = [...readingLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    let currentDate = new Date();
    
    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      const daysDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        streak++;
        currentDate = logDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="alert alert-error">
        <XMarkIcon className="w-6 h-6" />
        <span>{error || 'Book not found'}</span>
      </div>
    );
  }

  const progress = calculateProgress();
  const totalPagesRead = getTotalPagesRead();
  const readingStreak = getReadingStreak();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/book/${book.uid}`} className="btn btn-ghost btn-sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Book
          </Link>
          <h1 className="text-3xl font-bold text-primary">Reading Log</h1>
        </div>
      </div>

      {/* Book Info */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-20 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
            <img 
              src={book.cover_url ?? '/bookshelf.png'}
              className="w-full h-full object-cover"
              alt={`${book.title} cover`}
              loading="lazy"
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
          <div className="flex-grow">
            <h2 className="text-2xl font-bold text-primary">{book.title}</h2>
            <p className="text-base-content/70">{book.author}</p>
            {book.page_count && (
              <p className="text-sm text-base-content/60">
                {totalPagesRead} of {book.page_count} pages read
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {book.page_count && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Reading Progress</span>
              <span className="text-sm text-base-content/70">{progress.toFixed(1)}%</span>
            </div>
            <div className="progress progress-primary w-full">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {/* Reading Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat bg-base-200 rounded-lg p-4 text-center">
            <div className="stat-title text-xs">Total Pages Read</div>
            <div className="stat-value text-2xl">{totalPagesRead}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4 text-center">
            <div className="stat-title text-xs">Reading Sessions</div>
            <div className="stat-value text-2xl">{readingLogs.length}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4 text-center">
            <div className="stat-title text-xs">Current Streak</div>
            <div className="stat-value text-2xl">{readingStreak} days</div>
          </div>
        </div>
      </div>

      {/* Add Reading Log */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add Reading Session
          </h3>
          <button 
            onClick={() => setShowAddLog(!showAddLog)}
            className="btn btn-primary btn-sm"
          >
            {showAddLog ? 'Cancel' : 'Add Log'}
          </button>
        </div>

        {showAddLog && (
          <form onSubmit={handleAddLog} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">📅 Date</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered w-full" 
                  value={newLog.date}
                  onChange={(e) => setNewLog(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">📄 Pages Read</span>
                </label>
                <input 
                  type="number" 
                  className="input input-bordered w-full" 
                  value={newLog.pages_read}
                  onChange={(e) => setNewLog(prev => ({ ...prev, pages_read: e.target.value }))}
                  placeholder="Number of pages"
                  min="1"
                  max={book.page_count ? book.page_count - totalPagesRead : undefined}
                  required
                />
                {book.page_count && (
                  <label className="label">
                    <span className="label-text-alt">
                      {book.page_count - totalPagesRead} pages remaining
                    </span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">📝 Notes (Optional)</span>
                </label>
                <input 
                  type="text" 
                  className="input input-bordered w-full" 
                  value={newLog.notes}
                  onChange={(e) => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Reading notes..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSaving || !newLog.pages_read}
              >
                {isSaving ? (
                  <div className="loading loading-spinner loading-sm"></div>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Add Reading Session
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reading Logs */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <BookOpenIcon className="w-5 h-5" />
          Reading History
        </h3>

        {readingLogs.length > 0 ? (
          <div className="space-y-4">
            {readingLogs
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((log, index) => (
                <div key={log.id || index} className="bg-base-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span className="font-semibold">
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-accent" />
                        <span className="text-accent font-medium">
                          {log.pages_read} pages
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-base-content/70">
                      {new Date(log.date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  {log.notes && (
                    <div className="mt-2 p-3 bg-base-300 rounded-lg">
                      <p className="text-sm text-base-content/80">{log.notes}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpenIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <p className="text-base-content/70">No reading sessions logged yet</p>
            <p className="text-sm text-base-content/50 mt-2">Start reading to log your progress</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookLogPage;
