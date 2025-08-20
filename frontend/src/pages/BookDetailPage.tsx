import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { api } from '@/api/client';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

const BookDetailPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { books, updateBook, deleteBook } = useBooksStore();
  const [book, setBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
      } catch (err) {
        setError('Failed to load book details');
        console.error('Error loading book:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [uid, books]);

  const handleStatusChange = async (field: string, value: boolean) => {
    if (!book || isUpdating) return;

    try {
      setIsUpdating(true);
      
      const updatedBook = await updateBook(book.uid, {
        [field]: value
      });
      
      setBook(updatedBook);
    } catch (err) {
      console.error('Error updating book status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!book || isUpdating) return;

    try {
      setIsUpdating(true);
      await deleteBook(book.uid);
      navigate('/library');
    } catch (err) {
      console.error('Error deleting book:', err);
    } finally {
      setIsUpdating(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadge = (book: any) => {
    if (book.want_to_read) return { text: 'Want to Read', color: 'badge-info', icon: HeartIcon };
    if (!book.finish_date && !book.want_to_read && !book.library_only) return { text: 'Currently Reading', color: 'badge-warning', icon: ClockIcon };
    if (book.finish_date) return { text: 'Finished', color: 'badge-success', icon: CheckCircleIcon };
    return { text: 'Library Only', color: 'badge-neutral', icon: BookOpenIcon };
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

  const statusBadge = getStatusBadge(book);
  const StatusIcon = statusBadge.icon;
  const statusEmoji = StatusIcon === HeartIcon
    ? '💙'
    : StatusIcon === ClockIcon
      ? '⏱️'
      : StatusIcon === CheckCircleIcon
        ? '✅'
        : '📚';

  return (
    <div className="space-y-8">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Link to="/library" className="btn btn-ghost btn-sm">
          <Icon hero={<ArrowLeftIcon className="w-4 h-4 mr-2" />} emoji="⬅️" />
          Back to Library
        </Link>
      </div>

      {/* Book Header */}
      <div className="book-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white p-8 mb-8">
        <h1 className="text-4xl md:text-5xl font-bold m-0 text-shadow-lg relative z-10">{book.title}</h1>
      </div>

      {/* Book Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Book Cover Section */}
        <div className="lg:col-span-1 text-center">
          <img 
            src={book.cover_url || '/bookshelf.png'} 
            alt={`${book.title} cover`} 
            className="max-w-full max-h-96 rounded-2xl shadow-2xl mx-auto mb-4"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/bookshelf.png';
            }}
          />
        </div>

        {/* Book Details */}
        <div className="lg:col-span-2">
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">✍️ Author:</span>
                <span className="flex-1">{book.author || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">🏢 Publisher:</span>
                <span className="flex-1">{book.publisher || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">📅 Published:</span>
                <span className="flex-1">{book.published_date || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">📄 Pages:</span>
                <span className="flex-1">{book.page_count || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">🌐 Language:</span>
                <span className="flex-1">{book.language || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">📦 Format:</span>
                <span className="flex-1">{book.format || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">📊 Rating:</span>
                <span className="flex-1">
                  {book.average_rating ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>{i < (book.average_rating || 0) ? '⭐' : '☆'}</span>
                      ))}
                      {(book.average_rating || 0).toFixed(1)}
                      {book.rating_count && (
                        <small className="text-base-content/60">({book.rating_count})</small>
                      )}
                    </>
                  ) : (
                    'No rating'
                  )}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className="font-semibold text-primary min-w-32 mr-4">📚 ISBN:</span>
                <span className="flex-1">{book.isbn || 'No ISBN'}</span>
              </div>
              
              {book.custom_id && (
                <div className="flex items-center">
                  <span className="font-semibold text-primary min-w-32 mr-4">🆔 Custom ID:</span>
                  <span className="flex-1 font-mono text-sm">{book.custom_id}</span>
                </div>
              )}
            </div>

            {/* Categories */}
            {book.categories && (
              <div className="mt-6">
                <span className="font-semibold text-primary block mb-2">🏷️ Categories:</span>
                <div className="flex flex-wrap gap-2">
                  {book.categories.split(',').map((category: string, index: number) => (
                    <span key={index} className="badge badge-primary">{category.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description Section */}
      {book.description && (
        <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 mb-8 shadow-xl">
          <h2 className="text-2xl font-bold text-primary mb-4">📝 Description</h2>
          <p className="text-base-content leading-relaxed">{book.description}</p>
        </div>
      )}

      {/* Status Section */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 mb-8 shadow-xl">
        <h2 className="text-2xl font-bold text-primary mb-6">📊 Reading Status</h2>
        
        {/* Status Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
            <input 
              type="checkbox" 
              className="checkbox checkbox-primary" 
              checked={book.want_to_read || false}
              onChange={(e) => handleStatusChange('want_to_read', e.target.checked)}
              disabled={isUpdating}
            />
            <span>📋 Want to Read</span>
          </label>
          
          <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
            <input 
              type="checkbox" 
              className="checkbox checkbox-primary" 
              checked={book.library_only || false}
              onChange={(e) => handleStatusChange('library_only', e.target.checked)}
              disabled={isUpdating}
            />
            <span>📚 Library Only</span>
          </label>
          
          <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
            <input 
              type="checkbox" 
              className="checkbox checkbox-primary" 
              checked={!book.finish_date && !book.want_to_read && !book.library_only}
              onChange={(e) => {
                if (e.target.checked) {
                  handleStatusChange('start_date', true);
                  handleStatusChange('want_to_read', false);
                  handleStatusChange('library_only', false);
                }
              }}
              disabled={isUpdating}
            />
            <span>📖 Currently Reading</span>
          </label>
        </div>

        {/* Current Status Display */}
        <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
          <Icon hero={<StatusIcon className="w-6 h-6" />} emoji={statusEmoji} />
          <span className={`badge ${statusBadge.color} badge-lg`}>
            {statusBadge.text}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Link to={`/book/${book.uid}/edit`} className="btn btn-primary">
          <Icon hero={<PencilIcon className="w-4 h-4 mr-2" />} emoji="✏️" />
          Edit Book
        </Link>
        <Link to={`/book/${book.uid}/log`} className="btn btn-secondary">
          <Icon hero={<BookOpenIcon className="w-4 h-4 mr-2" />} emoji="📖" />
          Log Reading
        </Link>
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
          disabled={isUpdating}
        >
          <Icon hero={<TrashIcon className="w-4 h-4 mr-2" />} emoji="🗑️" />
          Delete Book
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Delete Book</h3>
            <p className="py-4">
              Are you sure you want to delete "{book.title}"? This action cannot be undone.
            </p>
            <div className="modal-action">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="btn"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="btn btn-error"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <div className="loading loading-spinner loading-sm"></div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetailPage; 