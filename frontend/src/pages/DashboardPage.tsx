import { useEffect } from 'react';
import { useBooksStore } from '@/store/books';
import { useAuthStore } from '@/store/auth';

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { books, fetchBooks } = useBooksStore();

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your reading progress and discover new books.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Books</h3>
          <p className="text-3xl font-bold text-primary-600">{books.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Currently Reading</h3>
          <p className="text-3xl font-bold text-green-600">
            {books.filter(book => !book.finish_date && !book.want_to_read && !book.library_only).length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Finished</h3>
          <p className="text-3xl font-bold text-blue-600">
            {books.filter(book => book.finish_date).length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Want to Read</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {books.filter(book => book.want_to_read).length}
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your reading activity will appear here.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage; 