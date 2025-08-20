import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Book, User } from '@/types';
import { 
  BookOpenIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface BookWithUser extends Book {
  user: User;
}

const BooksThisMonthPage: React.FC = () => {
  const [books, setBooks] = useState<BookWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooksThisMonth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.community.getBooksThisMonth();
        
        if (response.success && response.data) {
          setBooks(response.data);
        } else {
          setError('Failed to load books this month');
        }
      } catch (err) {
        setError('Failed to load books this month');
        console.error('Books this month fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooksThisMonth();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">📚 Books This Month</h1>
          <p className="text-base-content/70 mt-1">Loading books finished this month...</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="w-full h-48 bg-base-300 rounded-lg mb-4"></div>
                <div className="h-4 bg-base-300 rounded mb-2"></div>
                <div className="h-3 bg-base-300 rounded mb-2"></div>
                <div className="h-3 bg-base-300 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">📚 Books This Month</h1>
          <p className="text-base-content/70 mt-1">Books finished by community members this month</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load Books This Month</h2>
          <p className="text-base-content/70 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-error"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-base-content">📚 Books This Month</h1>
        <p className="text-base-content/70 mt-1">Books finished by community members this month</p>
      </div>

      {books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <div key={book.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <figure className="px-6 pt-6">
                {book.cover_url ? (
                  <img 
                    src={book.cover_url} 
                    alt={`Cover of ${book.title}`}
                    className="rounded-xl h-48 w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-base-300 rounded-xl flex items-center justify-center">
                    <BookOpenIcon className="w-16 h-16 text-base-content/40" />
                  </div>
                )}
              </figure>
              <div className="card-body">
                <h2 className="card-title text-lg">
                  <Link 
                    to={`/book/${book.uid}`}
                    className="hover:text-primary transition-colors"
                  >
                    {book.title}
                  </Link>
                </h2>
                <p className="text-base-content/70 text-sm">{book.author}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <UserIcon className="w-4 h-4 text-base-content/60" />
                  <Link 
                    to={`/user/${book.user.id}`}
                    className="text-sm text-primary hover:text-primary-focus transition-colors"
                  >
                    {book.user.username}
                  </Link>
                </div>
                
                {book.finish_date && (
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircleIcon className="w-4 h-4 text-success" />
                    <span className="text-sm text-base-content/60">
                      Finished {new Date(book.finish_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="card-actions justify-end mt-4">
                  <Link 
                    to={`/book/${book.uid}`}
                    className="btn btn-primary btn-sm"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-base-content mb-2">No Books Finished This Month</h3>
            <p className="text-base-content/70 mb-6">
              No community members have finished books this month yet. Be the first!
            </p>
            <Link to="/add-book" className="btn btn-primary">
              <BookOpenIcon className="w-4 h-4 mr-2" />
              Add Your First Book
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default BooksThisMonthPage;
