import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { User } from '@/types';
import { 
  UserIcon
} from '@heroicons/react/24/outline';

interface UserStats {
  user: User;
  books_this_month: number;
  total_books: number;
  currently_reading: number;
}

const ActiveReadersPage: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveReaders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.community.getActiveReaders();
        
        if (response.success && response.data) {
          setUserStats(response.data);
        } else {
          setError('Failed to load active readers');
        }
      } catch (err) {
        setError('Failed to load active readers');
        console.error('Active readers fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveReaders();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">🔥 Active Readers</h1>
          <p className="text-base-content/70 mt-1">Loading active readers...</p>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="bg-base-200">Reader</th>
                    <th className="bg-base-200">Books This Month</th>
                    <th className="bg-base-200">Total Books</th>
                    <th className="bg-base-200">Currently Reading</th>
                    <th className="bg-base-200">Member Since</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-base-300 text-base-content rounded-full w-10 h-10 animate-pulse"></div>
                          </div>
                          <div className="h-4 bg-base-300 rounded w-24 animate-pulse"></div>
                        </div>
                      </td>
                      <td><div className="h-6 bg-base-300 rounded w-16 animate-pulse"></div></td>
                      <td><div className="h-6 bg-base-300 rounded w-16 animate-pulse"></div></td>
                      <td><div className="h-6 bg-base-300 rounded w-16 animate-pulse"></div></td>
                      <td><div className="h-4 bg-base-300 rounded w-20 animate-pulse"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">🔥 Active Readers</h1>
          <p className="text-base-content/70 mt-1">Community members sharing their reading activity</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load Active Readers</h2>
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
        <h1 className="text-3xl font-bold text-base-content">🔥 Active Readers</h1>
        <p className="text-base-content/70 mt-1">Community members sharing their reading activity</p>
      </div>

      {userStats.length > 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="bg-base-200">Reader</th>
                    <th className="bg-base-200">Books This Month</th>
                    <th className="bg-base-200">Total Books</th>
                    <th className="bg-base-200">Currently Reading</th>
                    <th className="bg-base-200">Member Since</th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map((stat) => (
                    <tr key={stat.user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-primary text-primary-content rounded-full w-10 h-10">
                              <span className="text-lg font-bold">
                                {stat.user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <Link 
                              to={`/user/${stat.user.id}`}
                              className="font-bold text-primary hover:text-primary-focus transition-colors"
                            >
                              {stat.user.username}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-success badge-lg">
                          {stat.books_this_month}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-primary badge-lg">
                          {stat.total_books}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info badge-lg">
                          {stat.currently_reading}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-base-content/70">
                          {new Date(stat.user.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-base-content mb-2">No Active Readers Yet</h3>
            <p className="text-base-content/70 mb-6">
              No users have enabled activity sharing yet. Be the first to share your reading journey!
            </p>
            <Link to="/settings" className="btn btn-primary">
              <UserIcon className="w-4 h-4 mr-2" />
              Enable Activity Sharing
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveReadersPage;
