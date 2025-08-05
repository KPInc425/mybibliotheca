import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooksStore } from '@/store/books';

const AddBookPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    cover_url: '',
    description: '',
    published_date: '',
    page_count: '',
    publisher: '',
    language: '',
    categories: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { addBook } = useBooksStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const bookData = {
        ...formData,
        page_count: formData.page_count ? parseInt(formData.page_count) : undefined,
      };

      await addBook(bookData);
      navigate('/library');
    } catch (error) {
      setError('Failed to add book');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Book</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Add a new book to your library.
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="Enter book title"
              />
            </div>

            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Author *
              </label>
              <input
                id="author"
                name="author"
                type="text"
                required
                value={formData.author}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="Enter author name"
              />
            </div>

            <div>
              <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                ISBN
              </label>
              <input
                id="isbn"
                name="isbn"
                type="text"
                value={formData.isbn}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="Enter ISBN (optional)"
              />
            </div>

            <div>
              <label htmlFor="cover_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cover URL
              </label>
              <input
                id="cover_url"
                name="cover_url"
                type="url"
                value={formData.cover_url}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="Enter cover image URL"
              />
            </div>

            <div>
              <label htmlFor="published_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Published Date
              </label>
              <input
                id="published_date"
                name="published_date"
                type="text"
                value={formData.published_date}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div>
              <label htmlFor="page_count" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Page Count
              </label>
              <input
                id="page_count"
                name="page_count"
                type="number"
                value={formData.page_count}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="Enter page count"
              />
            </div>

            <div>
              <label htmlFor="publisher" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Publisher
              </label>
              <input
                id="publisher"
                name="publisher"
                type="text"
                value={formData.publisher}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="Enter publisher"
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Language
              </label>
              <input
                id="language"
                name="language"
                type="text"
                value={formData.language}
                onChange={handleChange}
                className="mt-1 input"
                placeholder="Enter language"
              />
            </div>
          </div>

          <div>
            <label htmlFor="categories" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Categories
            </label>
            <input
              id="categories"
              name="categories"
              type="text"
              value={formData.categories}
              onChange={handleChange}
              className="mt-1 input"
              placeholder="Enter categories (comma-separated)"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 input"
              placeholder="Enter book description"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Adding...' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookPage; 