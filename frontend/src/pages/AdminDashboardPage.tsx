import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { useBooksStore } from "@/store/books";
import { api } from "@/api/client";
import {
  Cog6ToothIcon,
  UsersIcon,
  BookOpenIcon,
  PlusIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  TrophyIcon,
  BoltIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import Icon from "@/components/Icon";

// DebugToolsPanel: Visual debugging for Capacitor/BarcodeScanner environment
const DebugToolsPanel: React.FC = () => {
  const [show, setShow] = useState(false);
  const [envInfo, setEnvInfo] = useState<any>({});

  const collectEnvInfo = () => {
    let info: any = {};
    if (typeof window !== "undefined") {
      const cap = (window as any).Capacitor;
      info.Capacitor = cap || null;
      info.Capacitor_Platform =
        cap && typeof cap.getPlatform === "function"
          ? cap.getPlatform()
          : "N/A";
      info.BarcodeScanner = cap?.Plugins?.BarcodeScanner || null;
      info.isNative = !!(
        cap &&
        typeof cap.getPlatform === "function" &&
        cap.getPlatform() !== "web"
      );
      info.hasBarcodeScanner = !!cap?.Plugins?.BarcodeScanner;
      info.navigatorUserAgent = window.navigator.userAgent;
    }
    setEnvInfo(info);
  };

  useEffect(() => {
    if (show) {
      collectEnvInfo();
    }
    // eslint-disable-next-line
  }, [show]);

  return (
    <div className="mt-8">
      <button
        className="btn btn-outline btn-warning mb-2"
        onClick={() => setShow((v) => !v)}
        type="button"
      >
        {show ? "Hide Debug Tools" : "Show Debug Tools"}
      </button>
      {show && (
        <div className="bg-base-200 rounded-lg p-4 mt-2">
          <h3 className="font-bold mb-2 text-warning">Debug Tools</h3>
          <div className="mb-2">
            <strong>Capacitor Platform:</strong>{" "}
            <span className="badge badge-info">
              {envInfo.Capacitor_Platform}
            </span>
          </div>
          <div className="mb-2">
            <strong>isNative:</strong>{" "}
            <span className="badge badge-info">{String(envInfo.isNative)}</span>
          </div>
          <div className="mb-2">
            <strong>hasBarcodeScanner:</strong>{" "}
            <span className="badge badge-info">
              {String(envInfo.hasBarcodeScanner)}
            </span>
          </div>
          <div className="mb-2">
            <strong>navigator.userAgent:</strong>
            <div className="text-xs break-all">
              {envInfo.navigatorUserAgent}
            </div>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer">
              Show Raw Capacitor/BarcodeScanner Objects
            </summary>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(
                {
                  Capacitor: envInfo.Capacitor,
                  BarcodeScanner: envInfo.BarcodeScanner,
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

interface SystemStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_books: number;
  new_users_30d: number;
  new_books_30d: number;
  top_users: Array<{ username: string; book_count: number }>;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  book_count: number;
}

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { books } = useBooksStore();
  const [stats, setStats] = useState<SystemStats>({
    total_users: 0,
    active_users: 0,
    admin_users: 0,
    total_books: 0,
    new_users_30d: 0,
    new_books_30d: 0,
    top_users: [],
  });
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch admin statistics
        const statsResponse = await api.admin.getStats();
        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }

        // Fetch recent users
        const usersResponse = await api.admin.getRecentUsers();
        if (usersResponse.success && usersResponse.data) {
          setRecentUsers(usersResponse.data);
        }
      } catch (err) {
        setError("Failed to load admin data");
        console.error("Admin data fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  // Check if user is admin
  if (!user?.is_admin) {
    return (
      <div className="space-y-8">
        <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-error to-error/80 text-white text-center py-8 mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">
            🚫 Access Denied
          </h1>
          <p className="text-xl opacity-90 mt-2">Admin privileges required</p>
        </div>

        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-error mb-4">Access Denied</h2>
          <p className="text-base-content/70 mb-6">
            You do not have administrator privileges to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn btn-outline btn-error"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">
            ⚙️ Admin Dashboard
          </h1>
          <p className="text-xl opacity-90 mt-2">Loading system overview...</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat bg-base-100 rounded-box animate-pulse">
              <div className="stat-title bg-base-300 h-4 rounded mb-2"></div>
              <div className="stat-value bg-base-300 h-8 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-error to-error/80 text-white text-center py-8 mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">
            ❌ Error
          </h1>
          <p className="text-xl opacity-90 mt-2">{error}</p>
        </div>

        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">
            Failed to Load Admin Dashboard
          </h2>
          <p className="text-base-content/70 mb-6">
            There was an error loading the admin data. Please try refreshing the
            page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-error"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">
          ⚙️ Admin Dashboard
        </h1>
        <p className="text-xl opacity-90 mt-2">
          System overview and management
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">System Overview</h2>
        <div className="flex gap-2">
          <Link to="/admin/users" className="btn btn-outline btn-primary">
            <Icon hero={<UsersIcon className="w-4 h-4" />} emoji="👥" />
            <span className="ml-2">Manage Users</span>
          </Link>
          <Link to="/admin/settings" className="btn btn-outline btn-secondary">
            <Icon hero={<Cog6ToothIcon className="w-4 h-4" />} emoji="⚙️" />
            <span className="ml-2">Settings</span>
          </Link>
          <Link to="/library" className="btn btn-outline btn-accent">
            <Icon hero={<BookOpenIcon className="w-4 h-4" />} emoji="📚" />
            <span className="ml-2">Back to Library</span>
          </Link>
        </div>
      </div>

      {/* System Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat bg-primary text-primary-content rounded-box">
          <div className="stat-title text-primary-content/80">Total Users</div>
          <div className="stat-value text-3xl">{stats.total_users}</div>
          {stats.new_users_30d > 0 && (
            <div className="stat-desc text-primary-content/80">
              +{stats.new_users_30d} this month
            </div>
          )}
        </div>

        <div className="stat bg-success text-success-content rounded-box">
          <div className="stat-title text-success-content/80">Active Users</div>
          <div className="stat-value text-3xl">{stats.active_users}</div>
          <div className="stat-desc text-success-content/80">
            {stats.admin_users} admin(s)
          </div>
        </div>

        <div className="stat bg-info text-info-content rounded-box">
          <div className="stat-title text-info-content/80">Total Books</div>
          <div className="stat-value text-3xl">{stats.total_books}</div>
          {stats.new_books_30d > 0 && (
            <div className="stat-desc text-info-content/80">
              +{stats.new_books_30d} this month
            </div>
          )}
        </div>

        <div className="stat bg-warning text-warning-content rounded-box">
          <div className="stat-title text-warning-content/80">
            Avg Books/User
          </div>
          <div className="stat-value text-3xl">
            {stats.total_users > 0
              ? Math.round(stats.total_books / stats.total_users)
              : 0}
          </div>
          <div className="stat-desc text-warning-content/80">
            System average
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title text-primary mb-4 flex items-center gap-2">
            <Icon hero={<ChartBarIcon className="w-6 h-6" />} emoji="📊" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentUsers.length > 0 ? (
              recentUsers.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      hero={<UserPlusIcon className="w-5 h-5" />}
                      emoji="➕"
                    />
                    <div>
                      <span className="font-semibold">
                        New User Registration
                      </span>
                      <p className="text-sm text-base-content/70">
                        User "{user.username}" registered
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-base-content/60">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-base-content/70">No recent user activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User and Book Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Users */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-4 flex items-center gap-2">
              <Icon hero={<TrophyIcon className="w-6 h-6" />} emoji="🏆" />
              Most Active Users
            </h2>
            {stats.top_users.length > 0 ? (
              <div className="space-y-3">
                {stats.top_users.map((user, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-base-200 rounded-lg"
                  >
                    <span className="font-semibold">{user.username}</span>
                    <span className="badge badge-primary">
                      {user.book_count} books
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base-content/60">
                No user activity data available.
              </p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title text-primary flex items-center gap-2">
                <Icon hero={<UsersIcon className="w-6 h-6" />} emoji="👥" />
                Recent Users
              </h2>
              <span className="text-sm text-base-content/60">Last 30 days</span>
            </div>
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex justify-between items-start p-3 bg-base-200 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{user.username}</span>
                        {user.is_admin && (
                          <span className="badge badge-error">Admin</span>
                        )}
                      </div>
                      <p className="text-sm text-base-content/60">
                        {user.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-base-content/60 mb-1">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      <Link
                        to={`/admin/users/${user.id}`}
                        className="btn btn-sm btn-outline btn-primary"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base-content/60">No recent users</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Books */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title text-primary flex items-center gap-2">
              <Icon hero={<BookOpenIcon className="w-6 h-6" />} emoji="📚" />
              Recent Books
            </h2>
            <span className="text-sm text-base-content/60">Last 30 days</span>
          </div>

          {books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.slice(0, 6).map((book) => (
                <div
                  key={book.uid}
                  className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
                >
                  <div className="w-12 h-16 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={book.cover_url ?? "/bookshelf.png"}
                      className="w-full h-full object-cover"
                      alt={`${book.title} cover`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Prevent infinite loop by checking if we're already using the fallback
                        if (
                          target.src !==
                          window.location.origin + "/bookshelf.png"
                        ) {
                          target.src = "/bookshelf.png";
                        } else {
                          // If fallback also fails, hide the image and show a placeholder
                          target.style.display = "none";
                          const placeholder = document.createElement("div");
                          placeholder.className =
                            "w-full h-full bg-base-200 rounded flex items-center justify-center text-lg";
                          placeholder.innerHTML = "📚";
                          target.parentNode?.appendChild(placeholder);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold truncate">{book.title}</h3>
                    <p className="text-sm text-base-content/70 truncate">
                      {book.author}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {book.finish_date && (
                        <span className="badge badge-success badge-xs">
                          Finished
                        </span>
                      )}
                      {book.start_date && !book.finish_date && (
                        <span className="badge badge-info badge-xs">
                          Reading
                        </span>
                      )}
                      {book.want_to_read && (
                        <span className="badge badge-warning badge-xs">
                          Want to Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Icon
                hero={
                  <BookOpenIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                }
                emoji="📚"
              />
              <p className="text-base-content/70">No books in the system yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6 flex items-center gap-2">
            <Icon hero={<BoltIcon className="w-6 h-6" />} emoji="⚡" />
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/users" className="btn btn-outline btn-primary">
              <Icon hero={<UsersIcon className="w-4 h-4" />} emoji="👥" />
              <span className="ml-2">Manage Users</span>
            </Link>
            <Link
              to="/admin/users/create"
              className="btn btn-outline btn-success"
            >
              <Icon hero={<UserPlusIcon className="w-4 h-4" />} emoji="➕" />
              <span className="ml-2">Create New User</span>
            </Link>
            <Link to="/import" className="btn btn-outline btn-info">
              <Icon hero={<PlusIcon className="w-4 h-4" />} emoji="📥" />
              <span className="ml-2">Bulk Import Books</span>
            </Link>
            <Link to="/admin/backup" className="btn btn-outline btn-warning">
              <Icon
                hero={<ArrowDownTrayIcon className="w-4 h-4" />}
                emoji="💾"
              />
              <span className="ml-2">Backup Database</span>
            </Link>
            <Link to="/admin/invites" className="btn btn-outline btn-secondary">
              <Icon hero={<EnvelopeIcon className="w-4 h-4" />} emoji="✉️" />
              <span className="ml-2">Manage Invites</span>
            </Link>
          </div>
        </div>
      </div>
      {/* Debug Tools Panel */}
      <DebugToolsPanel />
    </div>
  );
};

export default AdminDashboardPage;
