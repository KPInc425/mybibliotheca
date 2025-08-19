import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { 
  Bars3Icon,
  BookOpenIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { settings } = useSettingsStore();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getIcon = (heroIcon: React.ReactNode, emoji: string) => {
    return settings.useHeroIcons ? heroIcon : <span className="text-lg">{emoji}</span>;
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="navbar bg-base-100 border-b border-base-300">
      {/* Mobile Menu Button */}
      <div className="navbar-start">
        <label htmlFor="my-drawer" className="btn btn-ghost btn-circle lg:hidden">
          <Bars3Icon className="w-6 h-6" />
        </label>
      </div>

      {/* Center - Navigation for larger screens */}
      <div className="navbar-center hidden xl:flex">
        <ul className="menu menu-horizontal px-1 gap-2">
          <li>
            <Link
              to="/"
              className={`btn btn-outline btn-sm ${isActive('/') ? 'btn-active' : ''}`}
            >
              {getIcon(<BookOpenIcon className="w-4 h-4" />, '📊')}
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/library"
              className={`btn btn-outline btn-sm ${isActive('/library') ? 'btn-active' : ''}`}
            >
              {getIcon(<BookOpenIcon className="w-4 h-4" />, '📚')}
              Library
            </Link>
          </li>
          <li>
            <Link
              to="/add-book"
              className={`btn btn-outline btn-sm ${isActive('/add-book') ? 'btn-active' : ''}`}
            >
              {getIcon(<PlusIcon className="w-4 h-4" />, '➕')}
              Add Book
            </Link>
          </li>
          <li>
            <Link
              to="/search"
              className={`btn btn-outline btn-sm ${isActive('/search') ? 'btn-active' : ''}`}
            >
              {getIcon(<MagnifyingGlassIcon className="w-4 h-4" />, '🔍')}
              Search
            </Link>
          </li>
        </ul>
      </div>

      {/* Right side - User menu */}
      <div className="navbar-end">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
              <span className="text-lg font-bold">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li className="menu-title">
              <span className="text-sm font-semibold">{user?.username}</span>
            </li>
            <li>
              <Link to="/profile" className="flex items-center gap-2">
                {getIcon(<UserIcon className="w-4 h-4" />, '👤')}
                Profile
              </Link>
            </li>
            <li>
              <Link to="/settings" className="flex items-center gap-2">
                {getIcon(<Cog6ToothIcon className="w-4 h-4" />, '⚙️')}
                Settings
              </Link>
            </li>
            {user?.is_admin && (
              <li>
                <Link to="/admin" className="flex items-center gap-2">
                  {getIcon(<Cog6ToothIcon className="w-4 h-4" />, '⚙️')}
                  Admin
                </Link>
              </li>
            )}
            <li className="divider"></li>
            <li>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-error"
              >
                <span className="text-lg">🚪</span>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Header;
