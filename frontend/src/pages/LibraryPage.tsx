import { useEffect } from 'react';
import { useBooksStore } from '@/store/books';

const LibraryPage = () => {
  const { books, fetchBooks } = useBooksStore();

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Library</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your book collection and track your reading progress.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Your Books ({books.length})
        </h2>
        {books.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            You haven't added any books yet. Start by adding your first book!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <div key={book.uid} className="card p-4">
                <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <div className="text-4xl mb-2">📚</div>
                      <div className="text-sm">No Cover</div>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {book.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {book.author}
                </p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    book.finish_date 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : book.want_to_read
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {book.finish_date ? 'Finished' : book.want_to_read ? 'Want to Read' : 'Currently Reading'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPage; 