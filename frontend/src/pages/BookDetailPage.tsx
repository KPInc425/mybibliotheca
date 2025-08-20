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
  XMarkIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';
import { UserRating } from '@/types';

const BookDetailPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { books, updateBook, deleteBook } = useBooksStore();
  const [book, setBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Rating state
  const [userRating, setUserRating] = useState<UserRating | null>(null);
  const [allRatings, setAllRatings] = useState<UserRating[]>([]);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    const loadBook = async () => {
      if (!uid) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Always fetch from API to ensure we have complete book data including ID
        const bookData = await api.books.getById(uid);
        if (bookData.success && bookData.data) {
          setBook(bookData.data);
        } else {
          setError('Failed to load book details');
        }
      } catch (err) {
        setError('Failed to load book details');
        console.error('Error loading book:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [uid]);

  // Load rating data when book is loaded
  useEffect(() => {
    if (book) {
      loadRatingData();
    }
  }, [book]);

  // Reset rating state when modal opens/closes
  useEffect(() => {
    if (showRatingModal && userRating) {
      setRatingValue(userRating.rating);
      setReviewText(userRating.review || '');
    }
  }, [showRatingModal, userRating]);

  const loadRatingData = async () => {
    if (!book) return;

    try {
      setRatingLoading(true);
      
      // Load user's rating
      const userRatingResponse = await api.ratings.getBookRating(book.id);
      if (userRatingResponse.data.success && userRatingResponse.data.data.user_rating) {
        setUserRating(userRatingResponse.data.data.user_rating);
        setRatingValue(userRatingResponse.data.data.user_rating.rating);
        setReviewText(userRatingResponse.data.data.user_rating.review || '');
      }
      
      // Load all ratings
      const allRatingsResponse = await api.ratings.getBookRatings(book.id);
      if (allRatingsResponse.data.success) {
        setAllRatings(allRatingsResponse.data.data.ratings);
      }
    } catch (err) {
      console.error('Error loading rating data:', err);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (!book || ratingValue === 0) return;

    try {
      setRatingLoading(true);
      
      const response = await api.ratings.rateBook(book.id, {
        rating: ratingValue,
        review: reviewText.trim() || undefined
      });
      
      if (response.data.success) {
        // Update book's average rating
        setBook((prev: any) => ({
          ...prev,
          average_rating: response.data.data.average_rating,
          rating_count: response.data.data.rating_count
        }));
        
        // Close modal first
        setShowRatingModal(false);
        
        // Then reload rating data
        setTimeout(() => {
          loadRatingData();
        }, 100);
      } else {
        console.error('Rating failed:', response.data.error);
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!book) return;

    try {
      setRatingLoading(true);
      
      const response = await api.ratings.deleteBookRating(book.id);
      if (response.data.success) {
        // Update book's average rating
        setBook((prev: any) => ({
          ...prev,
          average_rating: response.data.data.average_rating,
          rating_count: response.data.data.rating_count
        }));
        
        // Clear user rating
        setUserRating(null);
        setRatingValue(0);
        setReviewText('');
        
        // Reload all ratings
        await loadRatingData();
      }
    } catch (err) {
      console.error('Error deleting rating:', err);
    } finally {
      setRatingLoading(false);
    }
  };

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

  const renderStars = (rating: number, interactive = false, size = 'w-5 h-5') => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => setRatingValue(star) : undefined}
            onMouseEnter={interactive ? () => setHoveredStar(star) : undefined}
            onMouseLeave={interactive ? () => setHoveredStar(0) : undefined}
            className={`${interactive ? 'cursor-pointer' : ''}`}
            disabled={!interactive}
          >
            <Icon 
              hero={
                <StarIcon 
                  className={`${size} ${
                    star <= (interactive ? hoveredStar : rating) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`} 
                />
              } 
              emoji={star <= (interactive ? hoveredStar : rating) ? '⭐' : '☆'} 
            />
          </button>
        ))}
      </div>
    );
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
              // Prevent infinite loop by checking if we're already using the fallback
              if (target.src !== window.location.origin + '/bookshelf.png') {
                target.src = '/bookshelf.png';
              } else {
                // If fallback also fails, hide the image and show a placeholder
                target.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-96 bg-base-200 rounded-2xl flex items-center justify-center text-4xl';
                placeholder.innerHTML = '📚';
                target.parentNode?.appendChild(placeholder);
              }
            }}
          />
          <div className="flex justify-center gap-2">
            <label className="btn btn-sm btn-primary">
              Upload Cover
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !book) return;
                  try {
                    setIsUpdating(true);
                    // Client-side compress
                    const compressed = await (async () => {
                      const bitmap = await createImageBitmap(file);
                      const maxSide = 1200;
                      const { width, height } = bitmap;
                      const scale = Math.min(1, maxSide / Math.max(width, height));
                      const targetW = Math.max(1, Math.round(width * scale));
                      const targetH = Math.max(1, Math.round(height * scale));
                      const canvas = document.createElement('canvas');
                      canvas.width = targetW;
                      canvas.height = targetH;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return file;
                      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
                      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.75));
                      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
                    })();

                    const res = await api.books.uploadCover(book.uid, compressed);
                    if (res.data?.success) {
                      const newUrl = res.data.data.cover_url;
                      // Update global store and local state so lists update immediately
                      const updated = await updateBook(book.uid, { cover_url: newUrl });
                      setBook(updated);
                    }
                  } catch (err) {
                    console.error('Cover upload failed:', err);
                  } finally {
                    setIsUpdating(false);
                  }
                }}
              />
            </label>
            {book.cover_url && (
              <button
                className="btn btn-sm btn-outline"
                disabled={isUpdating}
                onClick={async () => {
                  if (!book) return;
                  try {
                    setIsUpdating(true);
                    const res = await api.books.deleteCover(book.uid);
                    if (res.data?.success) {
                      const updated = await updateBook(book.uid, { cover_url: null });
                      setBook(updated);
                    }
                  } catch (err) {
                    console.error('Cover delete failed:', err);
                  } finally {
                    setIsUpdating(false);
                  }
                }}
              >
                Remove Cover
              </button>
            )}
          </div>
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
                    <div className="flex items-center gap-2">
                      {renderStars(book.average_rating)}
                      <span className="font-semibold">{(book.average_rating || 0).toFixed(1)}</span>
                      {book.rating_count && (
                        <small className="text-base-content/60">({book.rating_count} ratings)</small>
                      )}
                    </div>
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

      {/* Rating Section */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">⭐ Rate This Book</h2>
          {userRating && (
            <button
              onClick={handleDeleteRating}
              className="btn btn-error btn-sm"
              disabled={ratingLoading}
            >
              {ratingLoading ? (
                <div className="loading loading-spinner loading-xs"></div>
              ) : (
                'Remove Rating'
              )}
            </button>
          )}
        </div>

        {/* User Rating Display/Edit */}
        {userRating ? (
          <div className="bg-base-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Your Rating</h3>
              <button
                onClick={() => {
                  setRatingValue(userRating.rating);
                  setReviewText(userRating.review || '');
                  setShowRatingModal(true);
                }}
                className="btn btn-primary btn-sm"
                disabled={ratingLoading}
              >
                Edit Rating
              </button>
            </div>
            <div className="flex items-center gap-4">
              {renderStars(userRating.rating, false, 'w-6 h-6')}
              <span className="font-semibold text-lg">{userRating.rating}/5</span>
            </div>
            {userRating.review && (
              <div className="mt-3">
                <p className="text-base-content italic">"{userRating.review}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center mb-6">
            <p className="text-base-content/70 mb-4">Share your thoughts on this book!</p>
            <button
              onClick={() => {
                setRatingValue(0);
                setReviewText('');
                setShowRatingModal(true);
              }}
              className="btn btn-primary"
              disabled={ratingLoading}
            >
              Rate This Book
            </button>
          </div>
        )}

        {/* All Ratings */}
        {allRatings.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4">All Ratings ({allRatings.length})</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {allRatings.map((rating) => (
                <div key={rating.id} className="bg-base-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{rating.user?.username || 'Unknown User'}</span>
                      <span className="text-base-content/60 text-sm">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(rating.rating, false, 'w-4 h-4')}
                      <span className="font-semibold">{rating.rating}/5</span>
                    </div>
                  </div>
                  {rating.review && (
                    <p className="text-base-content italic">"{rating.review}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

          <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
            <input 
              type="checkbox" 
              className="checkbox checkbox-primary" 
              checked={book.owned || false}
              onChange={async (e) => {
                if (!book || isUpdating) return;
                try {
                  setIsUpdating(true);
                  const updated = await updateBook(book.uid, { owned: e.target.checked });
                  setBook(updated);
                } catch (err) {
                  console.error('Error updating owned status:', err);
                } finally {
                  setIsUpdating(false);
                }
              }}
              disabled={isUpdating}
            />
            <span>🛒 Owned</span>
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

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Rate "{book.title}"</h3>
            
            <div className="space-y-6">
              {/* Star Rating */}
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Your Rating</span>
                </label>
                <div className="flex items-center gap-4">
                  {renderStars(ratingValue, true, 'w-8 h-8')}
                  <span className="font-semibold text-xl">{ratingValue}/5</span>
                </div>
                {ratingValue === 0 && (
                  <p className="text-error text-sm mt-2">Please select a rating</p>
                )}
              </div>

              {/* Review Text */}
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Review (Optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  placeholder="Share your thoughts about this book..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  maxLength={1000}
                />
                <label className="label">
                  <span className="label-text-alt">{reviewText.length}/1000 characters</span>
                </label>
              </div>
            </div>
            
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setShowRatingModal(false);
                  // Reset to current user rating if it exists, otherwise clear
                  if (userRating) {
                    setRatingValue(userRating.rating);
                    setReviewText(userRating.review || '');
                  } else {
                    setRatingValue(0);
                    setReviewText('');
                  }
                }}
                disabled={ratingLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRatingSubmit}
                disabled={ratingLoading || ratingValue === 0}
              >
                {ratingLoading ? (
                  <>
                    <div className="loading loading-spinner loading-sm"></div>
                    Saving...
                  </>
                ) : (
                  'Save Rating'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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