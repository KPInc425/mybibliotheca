import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { api } from '@/api/client';
import { 
  ArrowLeftIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const BookEditPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { books, updateBook } = useBooksStore();
  const [book, setBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    description: '',
    published_date: '',
    page_count: '',
    categories: '',
    publisher: '',
    language: '',
    format: '',
    cover_url: '',
    custom_id: '',
    want_to_read: false,
    library_only: false,
    start_date: '',
    finish_date: ''
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
          setFormData({
            title: foundBook.title || '',
            author: foundBook.author || '',
            isbn: foundBook.isbn || '',
            description: foundBook.description || '',
            published_date: foundBook.published_date || '',
            page_count: foundBook.page_count?.toString() || '',
            categories: foundBook.categories || '',
            publisher: foundBook.publisher || '',
            language: foundBook.language || '',
            format: foundBook.format || '',
            cover_url: foundBook.cover_url || '',
            custom_id: foundBook.custom_id || '',
            want_to_read: foundBook.want_to_read || false,
            library_only: foundBook.library_only || false,
            start_date: foundBook.start_date || '',
            finish_date: foundBook.finish_date || ''
          });
        } else {
          // Fetch from API if not in store
          const bookData = await api.books.getById(uid);
          const book = bookData.data;
          if (book) {
            setBook(book);
            setFormData({
              title: book.title || '',
            author: book.author || '',
            isbn: book.isbn || '',
            description: book.description || '',
            published_date: book.published_date || '',
            page_count: book.page_count?.toString() || '',
            categories: book.categories || '',
            publisher: book.publisher || '',
            language: book.language || '',
            format: book.format || '',
            cover_url: book.cover_url || '',
            custom_id: book.custom_id || '',
            want_to_read: book.want_to_read || false,
            library_only: book.library_only || false,
            start_date: book.start_date || '',
                          finish_date: book.finish_date || ''
            });
          }
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || isSaving) return;

    try {
      setIsSaving(true);
      
      // Convert string values to appropriate types
      const updateData = {
        ...formData,
        page_count: formData.page_count ? parseInt(formData.page_count) : null,
        want_to_read: formData.want_to_read,
        library_only: formData.library_only,
        start_date: formData.start_date || null,
        finish_date: formData.finish_date || null
      };

      await updateBook(book.uid, updateData);
      navigate(`/book/${book.uid}`);
    } catch (err) {
      console.error('Error updating book:', err);
      setError('Failed to update book');
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/book/${book.uid}`} className="btn btn-ghost btn-sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Book
          </Link>
          <h1 className="text-3xl font-bold text-primary">Edit Book</h1>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📖 Title *</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full" 
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
                placeholder="Book title"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">✍️ Author *</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full" 
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                required
                placeholder="Author name"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📚 ISBN</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full" 
                value={formData.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
                placeholder="ISBN number"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">🏢 Publisher</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full" 
                value={formData.publisher}
                onChange={(e) => handleInputChange('publisher', e.target.value)}
                placeholder="Publisher name"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📅 Published Date</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full" 
                value={formData.published_date}
                onChange={(e) => handleInputChange('published_date', e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📄 Page Count</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered w-full" 
                value={formData.page_count}
                onChange={(e) => handleInputChange('page_count', e.target.value)}
                placeholder="Number of pages"
                min="0"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">🌐 Language</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full" 
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                placeholder="Language (e.g., English, Spanish)"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📦 Format</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={formData.format}
                onChange={(e) => handleInputChange('format', e.target.value)}
              >
                <option value="">Select format</option>
                <option value="Hardcover">Hardcover</option>
                <option value="Paperback">Paperback</option>
                <option value="E-book">E-book</option>
                <option value="Audiobook">Audiobook</option>
                <option value="Digital">Digital</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">🆔 Custom ID</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full" 
                value={formData.custom_id}
                onChange={(e) => handleInputChange('custom_id', e.target.value)}
                placeholder="Custom identifier"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">🏷️ Categories</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered w-full" 
              value={formData.categories}
              onChange={(e) => handleInputChange('categories', e.target.value)}
              placeholder="Categories (comma-separated, e.g., Fiction, Science Fiction, Fantasy)"
            />
            <label className="label">
              <span className="label-text-alt">Separate multiple categories with commas</span>
            </label>
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">📝 Description</span>
            </label>
            <textarea 
              className="textarea textarea-bordered w-full h-32" 
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Book description or synopsis"
            />
          </div>

          {/* Cover URL */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">🖼️ Cover Image URL</span>
            </label>
            <input 
              type="url" 
              className="input input-bordered w-full" 
              value={formData.cover_url}
              onChange={(e) => handleInputChange('cover_url', e.target.value)}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          {/* Reading Status */}
          <div className="bg-base-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">📊 Reading Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={formData.want_to_read}
                  onChange={(e) => handleInputChange('want_to_read', e.target.checked)}
                />
                <span>📋 Want to Read</span>
              </label>
              
              <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={formData.library_only}
                  onChange={(e) => handleInputChange('library_only', e.target.checked)}
                />
                <span>📚 Library Only</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">📖 Started Reading</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered w-full" 
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">✅ Finished Reading</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered w-full" 
                  value={formData.finish_date}
                  onChange={(e) => handleInputChange('finish_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-6">
            <Link to={`/book/${book.uid}`} className="btn btn-outline">
              Cancel
            </Link>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookEditPage;
