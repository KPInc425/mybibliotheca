import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { useSettingsStore } from '@/store/settings';
import BarcodeScanner from '@/components/BarcodeScanner';
import { fetchBookData, validateISBN } from '@/services/bookDataService';
import { extractISBNFromBarcode, handleSuccessfulScan } from '@/services/scannerService';
import { 
  CameraIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BookOpenIcon,
  LightBulbIcon,
  PencilIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  TagIcon,
  DocumentIcon,
  PhotoIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

const AddBookPage: React.FC = () => {
  const navigate = useNavigate();
  const { addBook } = useBooksStore();
  const { settings } = useSettingsStore();
  const [showScanner, setShowScanner] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);
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
    library_only: false
  });



  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    console.log('[AddBookPage] Barcode scanned:', barcode);
    
    // Check for duplicate scans
    if (!handleSuccessfulScan(barcode)) {
      console.log('[AddBookPage] Duplicate scan ignored');
      return;
    }
    
    // Extract ISBN from barcode
    const isbn = extractISBNFromBarcode(barcode);
    console.log('[AddBookPage] Extracted ISBN:', isbn);
    
    // Update ISBN field
    setFormData(prev => ({ ...prev, isbn }));
    
    // Auto-fetch book data
    await fetchBookDataFromISBN(isbn);
    
    // Close scanner
    setShowScanner(false);
  };

  // Handle scanner error
  const handleScannerError = (error: string) => {
    console.error('[AddBookPage] Scanner error:', error);
    setFetchError(`Scanner error: ${error}`);
    setShowScanner(false);
  };

  // Fetch book data from ISBN
  const fetchBookDataFromISBN = async (isbn: string) => {
    if (!isbn.trim()) {
      setFetchError('Please enter an ISBN number first');
      return;
    }

    if (!validateISBN(isbn)) {
      setFetchError('Please enter a valid ISBN number');
      return;
    }

    try {
      setIsFetching(true);
      setFetchError(null);
      setFetchSuccess(false);

      console.log('[AddBookPage] Fetching book data for ISBN:', isbn);
      
      const response = await fetchBookData(isbn);
      
      if (response.success && response.data) {
        // Fill form with fetched data
        setFormData(prev => ({
          ...prev,
          title: response.data!.title || '',
          author: response.data!.author || '',
          isbn: response.data!.isbn || isbn,
          description: response.data!.description || '',
          published_date: response.data!.published_date || '',
          page_count: response.data!.page_count?.toString() || '',
          categories: response.data!.categories || '',
          publisher: response.data!.publisher || '',
          language: response.data!.language || '',
          format: response.data!.format || '',
          cover_url: response.data!.cover_url || ''
        }));
        
        setFetchSuccess(true);
        console.log('[AddBookPage] Book data fetched and form filled successfully');
      } else {
        setFetchError(response.error || 'Failed to fetch book data');
      }
    } catch (error) {
      console.error('[AddBookPage] Error fetching book data:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch book data');
    } finally {
      setIsFetching(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setFetchError('Title is required');
      return;
    }

    if (!formData.author.trim()) {
      setFetchError('Author is required');
      return;
    }

    try {
      // Convert string values to appropriate types
      const bookData = {
        ...formData,
        page_count: formData.page_count ? parseInt(formData.page_count) : null,
        want_to_read: formData.want_to_read,
        library_only: formData.library_only
      };

      await addBook(bookData);
      navigate('/library');
    } catch (error) {
      console.error('Error adding book:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to add book');
    }
  };

  // Clear fetch status when ISBN changes
  useEffect(() => {
    setFetchError(null);
    setFetchSuccess(false);
  }, [formData.isbn]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10 flex items-center justify-center gap-4">
          <Icon hero={<BookOpenIcon className="w-16 h-16" />} emoji="📚" />
          Add New Book
        </h1>
        <p className="text-xl opacity-90 mt-2">Scan or search for books to add to your library</p>
      </div>

      {/* Scanner Section */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Icon hero={<CameraIcon className="w-6 h-6" />} emoji="📱" />
            Barcode Scanner
            <div className="tooltip tooltip-right" data-tip="Scanner Tips: Native App - Best experience with automatic scanning. Browser - Works but may be slower on mobile devices.">
              <button type="button" className="btn btn-circle btn-ghost btn-sm">
                <Icon hero={<InformationCircleIcon className="w-5 h-5" />} emoji="ℹ️" />
              </button>
            </div>
          </h2>
        </div>
        
        {/* Scanner Controls */}
        <div className="flex flex-wrap gap-2 justify-center items-center mb-4">
          <button 
            onClick={() => setShowScanner(true)}
            className="btn btn-primary btn-lg"
          >
            <Icon hero={<CameraIcon className="w-5 h-5" />} emoji="📷" />
            <span className="ml-2">Scan Barcode</span>
          </button>
          
          {/* Scanner Tips Tooltip */}
          <div className="tooltip tooltip-right" data-tip="Scanner Tips: Native App - Best experience with automatic scanning. Browser - Works but may be slower on mobile devices.">
            <button type="button" className="btn btn-circle btn-ghost btn-sm">
              <Icon hero={<InformationCircleIcon className="w-5 h-5" />} emoji="ℹ️" />
            </button>
          </div>
        </div>

        {/* ISBN and Fetch Section */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-lg font-semibold flex items-center gap-2">
              <Icon hero={<BookOpenIcon className="w-5 h-5" />} emoji="📖" />
              ISBN Number (Optional)
            </span>
          </label>
          <div className="join w-full">
            <input 
              type="text" 
              className="input input-bordered join-item flex-1" 
              value={formData.isbn}
              onChange={(e) => handleInputChange('isbn', e.target.value)}
              placeholder="Enter ISBN or scan barcode above (optional for manual books)"
              pattern="[0-9\-X]+"
              title="Enter a valid ISBN (digits, hyphens, and X only)"
            />
            <button 
              type="button"
              onClick={() => fetchBookDataFromISBN(formData.isbn)}
              disabled={isFetching || !formData.isbn.trim()}
              className="btn btn-secondary join-item"
            >
              {isFetching ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
                <>
                  <Icon hero={<MagnifyingGlassIcon className="w-4 h-4" />} emoji="🔍" />
                  <span className="ml-2">Fetch Book</span>
                </>
              )}
            </button>
          </div>
          <label className="label">
            <span className="label-text-alt text-base-content/70 flex items-center gap-1">
              <Icon hero={<LightBulbIcon className="w-4 h-4" />} emoji="💡" />
              Leave empty to add a book manually without ISBN
            </span>
          </label>
        </div>

        {/* Fetch Status */}
        {fetchError && (
          <div className="alert alert-error">
            <Icon hero={<ExclamationTriangleIcon className="w-6 h-6" />} emoji="⚠️" />
            <span>{fetchError}</span>
          </div>
        )}

        {fetchSuccess && (
          <div className="alert alert-success">
            <Icon hero={<CheckIcon className="w-6 h-6" />} emoji="✅" />
            <span>Book data fetched successfully!</span>
          </div>
        )}
      </div>

      {/* Book Form */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<BookOpenIcon className="w-5 h-5" />} emoji="📖" />
                  Title *
                </span>
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
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<PencilIcon className="w-5 h-5" />} emoji="✍️" />
                  Author *
                </span>
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
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<BuildingOfficeIcon className="w-5 h-5" />} emoji="🏢" />
                  Publisher
                </span>
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
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<CalendarIcon className="w-5 h-5" />} emoji="📅" />
                  Published Date
                </span>
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
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<DocumentTextIcon className="w-5 h-5" />} emoji="📄" />
                  Page Count
                </span>
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
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<GlobeAltIcon className="w-5 h-5" />} emoji="🌐" />
                  Language
                </span>
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
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<TagIcon className="w-5 h-5" />} emoji="📦" />
                  Format
                </span>
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
                <span className="label-text font-semibold flex items-center gap-2">
                  <Icon hero={<DocumentIcon className="w-5 h-5" />} emoji="🆔" />
                  Custom ID
                </span>
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
              <span className="label-text font-semibold flex items-center gap-2">
                <Icon hero={<TagIcon className="w-5 h-5" />} emoji="🏷️" />
                Categories
              </span>
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
              <span className="label-text font-semibold flex items-center gap-2">
                <Icon hero={<DocumentTextIcon className="w-5 h-5" />} emoji="📝" />
                Description
              </span>
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
              <span className="label-text font-semibold flex items-center gap-2">
                <Icon hero={<PhotoIcon className="w-5 h-5" />} emoji="🖼️" />
                Cover Image URL
              </span>
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
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Icon hero={<ChartBarIcon className="w-6 h-6" />} emoji="📊" />
              Reading Status
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={formData.want_to_read}
                  onChange={(e) => handleInputChange('want_to_read', e.target.checked)}
                />
                <span className="flex items-center gap-2">
                  <Icon hero={<ClipboardDocumentListIcon className="w-4 h-4" />} emoji="📋" />
                  Want to Read
                </span>
              </label>
              
              <label className="flex items-center gap-3 text-base-content font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={formData.library_only}
                  onChange={(e) => handleInputChange('library_only', e.target.checked)}
                />
                <span className="flex items-center gap-2">
                  <Icon hero={<BuildingLibraryIcon className="w-4 h-4" />} emoji="📚" />
                  Library Only
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-6">
            <button 
              type="button"
              onClick={() => navigate('/library')}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              <Icon hero={<CheckIcon className="w-4 h-4" />} emoji="✅" />
              <span className="ml-2">Add Book</span>
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScan}
        onError={handleScannerError}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
};

export default AddBookPage; 