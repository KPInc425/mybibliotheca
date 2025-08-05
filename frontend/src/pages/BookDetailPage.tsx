import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBooksStore } from '@/store/books';

const BookDetailPage = () => {
  const { uid } = useParams<{ uid: string }>();
  const { currentBook, fetchBook } = useBooksStore();

  useEffect(() => {
    if (uid) {
      fetchBook(uid);
    }
  }, [uid, fetchBook]);

  if (!currentBook) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <p className="text-gray-600 dark:text-gray-400">Loading book details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              {currentBook.cover_url ? (
                <img
                  src={currentBook.cover_url}
                  alt={currentBook.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <div className="text-lg">No Cover</div>
                </div>
              )}
            </div>
          </div>
          <div className="md:w-2/3 space-y-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentBook.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              by {currentBook.author}
            </p>
            {currentBook.description && (
              <p className="text-gray-700 dark:text-gray-300">
                {currentBook.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                currentBook.finish_date 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : currentBook.want_to_read
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {currentBook.finish_date ? 'Finished' : currentBook.want_to_read ? 'Want to Read' : 'Currently Reading'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage; 