import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { 
  BookOpenIcon, 
  PlusIcon, 
  MagnifyingGlassIcon, 
  UserIcon, 
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  UsersIcon,
  BuildingLibraryIcon,
  PencilIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { settings: _settings } = useSettingsStore();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getIcon = (heroIcon: React.ReactNode, emoji: string) => (
    <Icon hero={heroIcon} emoji={emoji} />
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="drawer-side z-50">
      <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
      <aside className="min-h-full w-80 bg-base-200 text-base-content border-r border-base-300 shadow-xl">
        {/* Logo and Title */}
        <div className="flex items-center gap-3 p-4 border-b border-base-300 bg-base-100">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Icon hero={<BookOpenIcon className="w-6 h-6 text-primary-content" />} emoji="📚" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">BookOracle</h1>
            <p className="text-xs text-base-content/60">Personal Library</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {/* Main Navigation */}
          <div className="collapse collapse-arrow bg-base-200 border-0">
            <input type="checkbox" defaultChecked /> 
            <div className="collapse-title text-sm font-semibold text-base-content/80 uppercase tracking-wider bg-base-200 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                {getIcon(<BuildingLibraryIcon className="w-4 h-4" />, '📚')}
                <span>Library</span>
              </div>
            </div>
            <div className="collapse-content space-y-2 pt-2">
              <Link
                to="/"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<BookOpenIcon className="w-5 h-5" />, '📊')}
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                to="/library"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/library') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<BuildingLibraryIcon className="w-5 h-5" />, '📚')}
                <span className="font-medium">Library</span>
              </Link>
              <Link
                to="/library/mass-edit"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/library/mass-edit') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<PencilIcon className="w-5 h-5" />, '✏️')}
                <span className="font-medium">Mass Edit</span>
              </Link>
              <Link
                to="/add-book"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/add-book') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<PlusIcon className="w-5 h-5" />, '➕')}
                <span className="font-medium">Add Book</span>
              </Link>
              <Link
                to="/search"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/search') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<MagnifyingGlassIcon className="w-5 h-5" />, '🔍')}
                <span className="font-medium">Search</span>
              </Link>
            </div>
          </div>

          {/* Community */}
          <div className="collapse collapse-arrow bg-base-200 border-0">
            <input type="checkbox" /> 
            <div className="collapse-title text-sm font-semibold text-base-content/80 uppercase tracking-wider bg-base-200 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                {getIcon(<FireIcon className="w-4 h-4" />, '🌐')}
                <span>Community</span>
              </div>
            </div>
            <div className="collapse-content space-y-2 pt-2">
              <Link
                to="/community/activity"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/community/activity') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<FireIcon className="w-5 h-5" />, '🔥')}
                <span className="font-medium">Activity</span>
              </Link>
              <Link
                to="/public-library"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/public-library') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<BuildingLibraryIcon className="w-5 h-5" />, '📖')}
                <span className="font-medium">Public Library</span>
              </Link>
            </div>
          </div>

          {/* Reports */}
          <div className="collapse collapse-arrow bg-base-200 border-0">
            <input type="checkbox" /> 
            <div className="collapse-title text-sm font-semibold text-base-content/80 uppercase tracking-wider bg-base-200 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                {getIcon(<ChartBarIcon className="w-4 h-4" />, '📊')}
                <span>Reports</span>
              </div>
            </div>
            <div className="collapse-content space-y-2 pt-2">
              <Link
                to="/reports/month-wrapup"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/reports/month-wrapup') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<ChartBarIcon className="w-5 h-5" />, '📈')}
                <span className="font-medium">Month Wrap-up</span>
              </Link>
            </div>
          </div>

          {/* Tools */}
          <div className="collapse collapse-arrow bg-base-200 border-0">
            <input type="checkbox" /> 
            <div className="collapse-title text-sm font-semibold text-base-content/80 uppercase tracking-wider bg-base-200 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                {getIcon(<ArrowDownTrayIcon className="w-4 h-4" />, '🛠️')}
                <span>Tools</span>
              </div>
            </div>
            <div className="collapse-content space-y-2 pt-2">
              <Link
                to="/import"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/import') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<ArrowDownTrayIcon className="w-5 h-5" />, '📥')}
                <span className="font-medium">Import/Export</span>
              </Link>
            </div>
          </div>

          {/* Account */}
          <div className="collapse collapse-arrow bg-base-200 border-0">
            <input type="checkbox" /> 
            <div className="collapse-title text-sm font-semibold text-base-content/80 uppercase tracking-wider bg-base-200 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                {getIcon(<UserIcon className="w-4 h-4" />, '👤')}
                <span>Account</span>
              </div>
            </div>
            <div className="collapse-content space-y-2 pt-2">
              <Link
                to="/profile"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/profile') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<UserIcon className="w-5 h-5" />, '👤')}
                <span className="font-medium">Profile</span>
              </Link>
              <Link
                to="/settings"
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                  isActive('/settings') ? 'bg-primary text-primary-content shadow-md' : ''
                }`}
              >
                {getIcon(<Cog6ToothIcon className="w-5 h-5" />, '⚙️')}
                <span className="font-medium">Settings</span>
              </Link>
              {user?.is_admin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 hover:translate-x-1 transition-all duration-200 ${
                    isActive('/admin') ? 'bg-primary text-primary-content shadow-md' : ''
                  }`}
                >
                  {getIcon(<UsersIcon className="w-5 h-5" />, '⚙️')}
                  <span className="font-medium">Admin</span>
                </Link>
              )}
              <div className="border-t border-base-300 my-2"></div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-error hover:text-error-content hover:translate-x-1 transition-all duration-200 w-full text-left"
              >
                {getIcon(<ArrowDownTrayIcon className="w-5 h-5 rotate-90" />, '🚪')}
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>
    </div>
  );
};

export default Sidebar;
