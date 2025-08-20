import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBooksStore } from '@/store/books';
import { 
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

interface FilterState {
  search: string;
  category: string;
  publisher: string;
  language: string;
}

interface MassEditState {
  selectedBooks: Set<string>;
  showMassActions: boolean;
  newCategory: string;
  categoryToRemove: string;
  newStatus: string;
}

const MassEditPage: React.FC = () => {
  const { books, fetchBooks, updateBook, deleteBook, isLoading, error } = useBooksStore();
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    publisher: '',
    language: ''
  });
  const [massEdit, setMassEdit] = useState<MassEditState>({
    selectedBooks: new Set(),
    showMassActions: false,
    newCategory: '',
    categoryToRemove: '',
    newStatus: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

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

  const toggleBookSelection = (bookUid: string) => {
    const newSelectedBooks = new Set(massEdit.selectedBooks);
    if (newSelectedBooks.has(bookUid)) {
      newSelectedBooks.delete(bookUid);
    } else {
      newSelectedBooks.add(bookUid);
    }
    
    setMassEdit(prev => ({
      ...prev,
      selectedBooks: newSelectedBooks,
      showMassActions: newSelectedBooks.size > 0
    }));
  };

  const selectAllBooks = () => {
    const allBookUids = new Set(sortedBooks.map(book => book.uid));
    setMassEdit(prev => ({
      ...prev,
      selectedBooks: allBookUids,
      showMassActions: true
    }));
  };

  const clearSelection = () => {
    setMassEdit(prev => ({
      ...prev,
      selectedBooks: new Set(),
      showMassActions: false
    }));
  };

  const invertSelection = () => {
    const currentSelected = massEdit.selectedBooks;
    const allBookUids = new Set(sortedBooks.map(book => book.uid));
    const newSelectedBooks = new Set<string>();
    
    allBookUids.forEach(uid => {
      if (!currentSelected.has(uid)) {
        newSelectedBooks.add(uid);
      }
    });
    
    setMassEdit(prev => ({
      ...prev,
      selectedBooks: newSelectedBooks,
      showMassActions: newSelectedBooks.size > 0
    }));
  };

  const handleMassAction = async (action: string) => {
    if (massEdit.selectedBooks.size === 0 || isProcessing) return;

    try {
      setIsProcessing(true);
      
      const selectedBooks = sortedBooks.filter(book => 
        massEdit.selectedBooks.has(book.uid)
      );

      for (const book of selectedBooks) {
        switch (action) {
          case 'addCategory':
            if (massEdit.newCategory.trim()) {
              const currentCategories = book.categories ? book.categories.split(',').map(c => c.trim()) : [];
              if (!currentCategories.includes(massEdit.newCategory.trim())) {
                const newCategories = [...currentCategories, massEdit.newCategory.trim()].join(', ');
                await updateBook(book.uid, { categories: newCategories });
              }
            }
            break;
            
          case 'removeCategory':
            if (massEdit.categoryToRemove.trim()) {
              const currentCategories = book.categories ? book.categories.split(',').map(c => c.trim()) : [];
              const newCategories = currentCategories.filter(c => c !== massEdit.categoryToRemove.trim());
              await updateBook(book.uid, { categories: newCategories.join(', ') });
            }
            break;
            
          case 'changeStatus':
            if (massEdit.newStatus) {
              const updates: any = {};
              switch (massEdit.newStatus) {
                case 'want_to_read':
                  updates.want_to_read = true;
                  updates.library_only = false;
                  break;
                case 'library_only':
                  updates.library_only = true;
                  updates.want_to_read = false;
                  break;
                case 'currently_reading':
                  updates.start_date = new Date().toISOString();
                  updates.want_to_read = false;
                  updates.library_only = false;
                  break;
                case 'finished':
                  updates.finish_date = new Date().toISOString();
                  updates.want_to_read = false;
                  updates.library_only = false;
                  break;
              }
              await updateBook(book.uid, updates);
            }
            break;
            
          case 'delete':
            await deleteBook(book.uid);
            break;
        }
      }
      
      // Refresh books and clear selection
      await fetchBooks();
      clearSelection();
      
    } catch (err) {
      console.error('Error performing mass action:', err);
    } finally {
      setIsProcessing(false);
    }
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
      {/* Mass Edit Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">✏️ Mass Edit</h1>
        <p className="text-xl opacity-90 mt-2">Select multiple books and perform bulk operations</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-2 mb-6 justify-center">
        <Link to="/library" className="tab tab-lg">
          📖 Browse Library
        </Link>
        <Link to="/library/mass-edit" className="tab tab-lg tab-active">
          ✏️ Mass Edit
        </Link>
      </div>

      {/* Selection Controls */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-semibold text-primary">Selection Controls</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={selectAllBooks} className="btn btn-sm btn-outline">
              Select All ({sortedBooks.length})
            </button>
            <button onClick={clearSelection} className="btn btn-sm btn-outline">
              Clear Selection
            </button>
            <button onClick={invertSelection} className="btn btn-sm btn-outline">
              Invert Selection
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <span className="text-base-content/70 font-semibold">
            {massEdit.selectedBooks.size} of {sortedBooks.length} books selected
          </span>
        </div>
      </div>

      {/* Mass Actions Panel */}
      {massEdit.showMassActions && (
        <div className="bg-base-100 border-2 border-accent rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-accent mb-4">Mass Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Add Category */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Add Category</span>
              </label>
              <div className="join w-full">
                <input 
                  type="text" 
                  className="input input-bordered join-item flex-1" 
                  placeholder="New category"
                  value={massEdit.newCategory}
                  onChange={(e) => setMassEdit(prev => ({ ...prev, newCategory: e.target.value }))}
                />
                <button 
                  onClick={() => handleMassAction('addCategory')}
                  disabled={isProcessing || !massEdit.newCategory.trim()}
                  className="btn btn-primary join-item"
                >
                  {isProcessing ? <div className="loading loading-spinner loading-sm"></div> : <PlusIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remove Category */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Remove Category</span>
              </label>
              <div className="join w-full">
                <select 
                  className="select select-bordered join-item flex-1"
                  value={massEdit.categoryToRemove}
                  onChange={(e) => setMassEdit(prev => ({ ...prev, categoryToRemove: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <button 
                  onClick={() => handleMassAction('removeCategory')}
                  disabled={isProcessing || !massEdit.categoryToRemove}
                  className="btn btn-warning join-item"
                >
                  {isProcessing ? <div className="loading loading-spinner loading-sm"></div> : <MinusIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Change Status */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Change Status</span>
              </label>
              <div className="join w-full">
                <select 
                  className="select select-bordered join-item flex-1"
                  value={massEdit.newStatus}
                  onChange={(e) => setMassEdit(prev => ({ ...prev, newStatus: e.target.value }))}
                >
                  <option value="">Select status</option>
                  <option value="want_to_read">Want to Read</option>
                  <option value="library_only">Library Only</option>
                  <option value="currently_reading">Currently Reading</option>
                  <option value="finished">Finished</option>
                </select>
                <button 
                  onClick={() => handleMassAction('changeStatus')}
                  disabled={isProcessing || !massEdit.newStatus}
                  className="btn btn-info join-item"
                >
                  {isProcessing ? <div className="loading loading-spinner loading-sm"></div> : <CheckIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Delete Books */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Delete Books</span>
              </label>
              <button 
                onClick={() => handleMassAction('delete')}
                disabled={isProcessing}
                className="btn btn-error w-full"
              >
                {isProcessing ? (
                  <div className="loading loading-spinner loading-sm"></div>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-base-100 border-2 border-secondary rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h5 className="text-xl font-semibold text-primary">Filters</h5>
        </div>

        <div className="mt-4">
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

      {/* Books Grid */}
      <div className="bookshelf-container bg-gradient-to-br from-base-200 to-base-300 rounded-3xl p-6 shadow-inner relative">
        {sortedBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {sortedBooks.map((book) => {
              const statusBadge = getStatusBadge(book);
              const isSelected = massEdit.selectedBooks.has(book.uid);
              
              return (
                <div 
                  key={book.uid} 
                  className={`book-card bg-base-100 border-2 rounded-lg p-3 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col mx-auto h-80 w-full max-w-[200px] relative pb-6 ${
                    isSelected ? 'border-accent bg-accent/10' : 'border-secondary'
                  }`}
                  onClick={() => toggleBookSelection(book.uid)}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 right-2 z-20">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={isSelected}
                      onChange={() => toggleBookSelection(book.uid)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="book-cover-wrapper relative mb-3 rounded-lg overflow-hidden shadow-lg aspect-[3/4] w-full h-40 bg-base-200 flex items-center justify-center">
                    <Link to={`/book/${book.uid}`} onClick={(e) => e.stopPropagation()}>
                      <img 
                        src={book.cover_url ?? '/bookshelf.png'}
                        className="book-cover-shelf w-full h-full object-contain rounded"
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
                    </Link>
                  </div>

                  <div className="book-info flex-grow flex flex-col p-1">
                    <div className="book-title text-sm font-bold mb-1 line-clamp-2">
                      <Link to={`/book/${book.uid}`} className="text-primary hover:text-accent transition-colors" onClick={(e) => e.stopPropagation()}>
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

export default MassEditPage;
