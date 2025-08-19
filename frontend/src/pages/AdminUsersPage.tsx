import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/api/client';
import { 
  UsersIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  book_count: number;
}



const AdminUsersPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.admin.getUsers({
        page: currentPage,
        search: searchTerm || undefined
      });
      
      if (response.success && response.data) {
        setUsers(response.data.items || []);
        setTotalPages(response.data.pages || 1);
        setTotalUsers(response.data.total || 0);
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: number) => {
    try {
      const response = await api.admin.toggleUserAdmin(userId);
      if (response.success) {
        // Refresh the users list
        fetchUsers();
      }
    } catch (err) {
      console.error('Toggle admin error:', err);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const response = await api.admin.toggleUserActive(userId);
      if (response.success) {
        // Refresh the users list
        fetchUsers();
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.admin.deleteUser(userId);
      if (response.success) {
        // Refresh the users list
        fetchUsers();
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  // Check if user is admin
  if (!user?.is_admin) {
    return (
      <div className="space-y-8">
        <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-error to-error/80 text-white text-center py-8 mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">🚫 Access Denied</h1>
          <p className="text-xl opacity-90 mt-2">Admin privileges required</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-error mb-4">Access Denied</h2>
          <p className="text-base-content/70 mb-6">
            You do not have administrator privileges to access this page.
          </p>
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-outline btn-error"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">👥 User Management</h1>
          <p className="text-xl opacity-90 mt-2">Loading users...</p>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-base-200 rounded-lg animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-base-300 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-base-300 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-base-300 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-16 h-8 bg-base-300 rounded"></div>
                    <div className="w-16 h-8 bg-base-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">👥 User Management</h1>
        <p className="text-xl opacity-90 mt-2">Manage system users and permissions</p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="form-control w-full max-w-md">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search users..."
              className="input input-bordered w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-square btn-primary">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link to="/admin/users/create" className="btn btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add User
          </Link>
          <Link to="/admin" className="btn btn-outline btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Users List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title text-primary">System Users</h2>
            <span className="text-sm text-base-content/60">
              {totalUsers} total users
            </span>
          </div>

          {error && (
            <div className="alert alert-error mb-6">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {users.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
              <p className="text-base-content/70">
                {searchTerm ? 'No users found matching your search.' : 'No users in the system yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-12">
                        <span className="text-lg font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{user.username}</span>
                        {user.is_admin && (
                          <span className="badge badge-error">
                            <ShieldCheckIcon className="w-3 h-3 mr-1" />
                            Admin
                          </span>
                        )}
                        {!user.is_active && (
                          <span className="badge badge-neutral">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-base-content/60">{user.email}</p>
                      <p className="text-xs text-base-content/50">
                        Joined {new Date(user.created_at).toLocaleDateString()} • {user.book_count} books
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link 
                      to={`/admin/users/${user.id}`}
                      className="btn btn-sm btn-outline btn-primary"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Manage
                    </Link>
                    <button
                      onClick={() => handleToggleAdmin(user.id)}
                      className={`btn btn-sm ${user.is_admin ? 'btn-error' : 'btn-success'}`}
                      disabled={user.id === user?.id} // Can't demote yourself
                    >
                      {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      className={`btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`}
                      disabled={user.id === user?.id} // Can't deactivate yourself
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      className="btn btn-sm btn-error"
                      disabled={user.id === user?.id} // Can't delete yourself
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="join">
                <button
                  className="join-item btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  «
                </button>
                <button className="join-item btn">
                  Page {currentPage} of {totalPages}
                </button>
                <button
                  className="join-item btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;


