import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useBooksStore } from '@/store/books';
import { 
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  BookOpenIcon,
  ClockIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const { books } = useBooksStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update API call
    console.log('Updating profile:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  // Calculate user statistics
  const totalBooks = books.length;
  const finishedBooks = books.filter(book => book.finish_date).length;
  const currentlyReading = books.filter(book => book.start_date && !book.finish_date).length;
  const wantToRead = books.filter(book => book.want_to_read).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">👤 User Profile</h1>
        <p className="text-xl opacity-90 mt-2">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                <UserIcon className="w-6 h-6" />
                Profile Information
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-outline btn-primary btn-sm"
                >
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Username</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Email</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary">
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn btn-outline"
                  >
                    <XMarkIcon className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
                  <UserIcon className="w-5 h-5 text-primary" />
                  <div>
                    <span className="font-semibold">Username:</span>
                    <p className="text-base-content/70">{user?.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
                  <EnvelopeIcon className="w-5 h-5 text-primary" />
                  <div>
                    <span className="font-semibold">Email:</span>
                    <p className="text-base-content/70">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <div>
                    <span className="font-semibold">Member Since:</span>
                    <p className="text-base-content/70">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-primary" />
                  <div>
                    <span className="font-semibold">Account Type:</span>
                    <div className="mt-1">
                      {user?.is_admin ? (
                        <span className="badge badge-error">Administrator</span>
                      ) : (
                        <span className="badge badge-primary">User</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reading Statistics */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <BookOpenIcon className="w-6 h-6" />
              Reading Statistics
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat bg-primary text-primary-content rounded-box">
                <div className="stat-title text-primary-content/80">Total Books</div>
                <div className="stat-value text-2xl">{totalBooks}</div>
              </div>

              <div className="stat bg-success text-success-content rounded-box">
                <div className="stat-title text-success-content/80">Finished</div>
                <div className="stat-value text-2xl">{finishedBooks}</div>
              </div>

              <div className="stat bg-info text-info-content rounded-box">
                <div className="stat-title text-info-content/80">Currently Reading</div>
                <div className="stat-value text-2xl">{currentlyReading}</div>
              </div>

              <div className="stat bg-warning text-warning-content rounded-box">
                <div className="stat-title text-warning-content/80">Want to Read</div>
                <div className="stat-value text-2xl">{wantToRead}</div>
              </div>
            </div>

            {totalBooks > 0 && (
              <div className="mt-6 p-4 bg-base-200 rounded-lg">
                <h3 className="font-semibold mb-2">Reading Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion Rate:</span>
                    <span className="font-semibold">
                      {Math.round((finishedBooks / totalBooks) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(finishedBooks / totalBooks) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <ClockIcon className="w-6 h-6" />
              Recent Activity
            </h2>

            <div className="space-y-4">
              {books.slice(0, 5).map((book) => (
                <div key={book.uid} className="flex items-center gap-4 p-3 bg-base-200 rounded-lg">
                  <div className="w-12 h-16 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={book.cover_url || '/bookshelf.png'}
                      className="w-full h-full object-cover"
                      alt={`${book.title} cover`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/bookshelf.png';
                      }}
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold">{book.title}</h3>
                    <p className="text-sm text-base-content/70">{book.author}</p>
                    <div className="flex gap-2 mt-1">
                      {book.finish_date && (
                        <span className="badge badge-success badge-xs">Finished</span>
                      )}
                      {book.start_date && !book.finish_date && (
                        <span className="badge badge-info badge-xs">Reading</span>
                      )}
                      {book.want_to_read && (
                        <span className="badge badge-warning badge-xs">Want to Read</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {books.length === 0 && (
                <div className="text-center py-8">
                  <BookOpenIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                  <p className="text-base-content/70">No books in your library yet</p>
                  <p className="text-sm text-base-content/50 mt-2">Start by adding your first book!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Info */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Account Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Member since:</span>
                <p className="text-base-content/70">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div>
                <span className="font-semibold">Status:</span>
                <div className="mt-1">
                  {user?.is_admin ? (
                    <span className="badge badge-error">Administrator</span>
                  ) : (
                    <span className="badge badge-primary">User</span>
                  )}
                </div>
              </div>
              <div>
                <span className="font-semibold">Books in library:</span>
                <p className="text-base-content/70">{totalBooks}</p>
              </div>
              <div>
                <span className="font-semibold">Reading logs:</span>
                <p className="text-base-content/70">0</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4">⚡ Quick Actions</h3>
            <div className="space-y-3">
              <button className="btn btn-outline btn-primary w-full">
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button className="btn btn-outline btn-secondary w-full">
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                Change Password
              </button>
              <button className="btn btn-outline btn-info w-full">
                <BookOpenIcon className="w-4 h-4 mr-2" />
                My Activity
              </button>
            </div>
          </div>

          {/* Admin Debug Settings */}
          {user?.is_admin && (
            <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" />
                🔧 Debug Settings
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  id="debug_mode"
                />
                <div>
                  <label className="font-semibold" htmlFor="debug_mode">
                    🔍 Enable Debug Mode
                  </label>
                  <p className="text-sm text-base-content/60">
                    Show debug information and enable the test scanner button on the library page for troubleshooting
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 