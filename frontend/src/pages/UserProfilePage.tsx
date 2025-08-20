import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Book, User } from '@/types';
import { 
  UserIcon,
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  HeartIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';

interface UserProfile extends User {
  total_books: number;
  currently_reading: number;
  finished_books: number;
  want_to_read: number;
  reading_streak: number;
  books: Book[];
}

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.user.getPublicProfile(userId);
        
        if (response.success && response.data) {
          setUserProfile(response.data);
        } else {
          setError('Failed to load user profile');
        }
      } catch (err) {
        setError('Failed to load user profile');
        console.error('User profile fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">👤 User Profile</h1>
          <p className="text-base-content/70 mt-1">Loading user profile...</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-base-300 rounded-full"></div>
                  <div>
                    <div className="h-6 bg-base-300 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-base-300 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-4 bg-base-300 rounded mb-2"></div>
                <div className="h-4 bg-base-300 rounded w-3/4"></div>
              </div>
            </div>
            
            <div className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded w-32 mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-48 bg-base-300 rounded-lg"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded w-24 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-base-300 rounded"></div>
                  ))}
                </div>
              </div>
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
          <h1 className="text-3xl font-bold text-base-content">👤 User Profile</h1>
          <p className="text-base-content/70 mt-1">User profile information</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load User Profile</h2>
          <p className="text-base-content/70 mb-6">{error}</p>
          <Link to="/community" className="btn btn-outline btn-error">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">👤 User Profile</h1>
          <p className="text-base-content/70 mt-1">User profile information</p>
        </div>
        
        <div className="bg-base-100 border-2 border-warning/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-warning mb-4">User Not Found</h2>
          <p className="text-base-content/70 mb-6">The requested user profile could not be found.</p>
          <Link to="/community" className="btn btn-outline btn-warning">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-base-content">👤 {userProfile.username}</h1>
        <p className="text-base-content/70 mt-1">Member since {new Date(userProfile.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-16 h-16">
                    <span className="text-2xl font-bold">
                      {userProfile.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-base-content">{userProfile.username}</h2>
                  <p className="text-base-content/70">
                    Member since {new Date(userProfile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{userProfile.total_books}</div>
                  <div className="text-sm text-base-content/70">Total Books</div>
                </div>
                <div className="text-center p-4 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-warning">{userProfile.currently_reading}</div>
                  <div className="text-sm text-base-content/70">Currently Reading</div>
                </div>
                <div className="text-center p-4 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-success">{userProfile.finished_books}</div>
                  <div className="text-sm text-base-content/70">Finished</div>
                </div>
                <div className="text-center p-4 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-info">{userProfile.want_to_read}</div>
                  <div className="text-sm text-base-content/70">Want to Read</div>
                </div>
              </div>
            </div>
          </div>

          {/* Books Grid */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">📚 Library</h3>
              
              {userProfile.books.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userProfile.books.map((book) => (
                    <div key={book.id} className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                      <figure className="px-4 pt-4">
                        {book.cover_url ? (
                          <img 
                            src={book.cover_url} 
                            alt={`Cover of ${book.title}`}
                            className="rounded-lg h-32 w-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-32 bg-base-300 rounded-lg flex items-center justify-center">
                            <BookOpenIcon className="w-8 h-8 text-base-content/40" />
                          </div>
                        )}
                      </figure>
                      <div className="card-body p-4">
                        <h4 className="card-title text-sm">
                          <Link 
                            to={`/book/${book.uid}`}
                            className="hover:text-primary transition-colors line-clamp-2"
                          >
                            {book.title}
                          </Link>
                        </h4>
                        <p className="text-xs text-base-content/70 line-clamp-1">{book.author}</p>
                        
                        <div className="mt-2">
                          {book.finish_date ? (
                            <span className="badge badge-success badge-sm">
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              Finished
                            </span>
                          ) : book.want_to_read ? (
                            <span className="badge badge-info badge-sm">
                              <HeartIcon className="w-3 h-3 mr-1" />
                              Want to Read
                            </span>
                          ) : book.library_only ? (
                            <span className="badge badge-neutral badge-sm">
                              <BuildingLibraryIcon className="w-3 h-3 mr-1" />
                              Library Only
                            </span>
                          ) : (
                            <span className="badge badge-warning badge-sm">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              Reading
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📚</div>
                  <h4 className="text-lg font-semibold mb-2">No Books Yet</h4>
                  <p className="text-base-content/70">This user hasn't added any books to their library yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reading Stats */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">📊 Reading Stats</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Reading Streak</span>
                  <span className="font-bold text-primary">{userProfile.reading_streak} days</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Total Books</span>
                  <span className="font-bold">{userProfile.total_books}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Currently Reading</span>
                  <span className="font-bold text-warning">{userProfile.currently_reading}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Finished</span>
                  <span className="font-bold text-success">{userProfile.finished_books}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Want to Read</span>
                  <span className="font-bold text-info">{userProfile.want_to_read}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Back to Community */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <Link to="/community" className="btn btn-outline btn-primary w-full">
                <UserIcon className="w-4 h-4 mr-2" />
                Back to Community
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
