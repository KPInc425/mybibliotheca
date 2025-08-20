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
  Cog6ToothIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';
import { resolveMediaUrl, debugResolvedMedia } from '@/utils/media';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { settings, updateSetting } = useSettingsStore();

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

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSetting('theme', newTheme);
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
              className={`btn btn-outline btn-sm ${isActive('/') ? 'btn-active btn-primary' : ''}`}
            >
              {getIcon(<BookOpenIcon className="w-4 h-4" />, '📊')}
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/library"
              className={`btn btn-outline btn-sm ${isActive('/library') ? 'btn-active btn-primary' : ''}`}
            >
              {getIcon(<BookOpenIcon className="w-4 h-4" />, '📚')}
              Library
            </Link>
          </li>
          <li>
            <Link
              to="/add-book"
              className={`btn btn-outline btn-sm ${isActive('/add-book') ? 'btn-active btn-primary' : ''}`}
            >
              {getIcon(<PlusIcon className="w-4 h-4" />, '➕')}
              Add Book
            </Link>
          </li>
          <li>
            <Link
              to="/search"
              className={`btn btn-outline btn-sm ${isActive('/search') ? 'btn-active btn-primary' : ''}`}
            >
              {getIcon(<MagnifyingGlassIcon className="w-4 h-4" />, '🔍')}
              Search
            </Link>
          </li>
        </ul>
      </div>

      {/* Right side - Theme toggle and User menu */}
      <div className="navbar-end gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-circle"
          title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon 
            hero={settings.theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />} 
            emoji={settings.theme === 'dark' ? "☀️" : "🌙"} 
          />
        </button>

        {/* User Menu */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-10 h-10 ring-primary ring-offset-base-100 rounded-full ring-2 ring-offset-2">
              {user?.profile_picture ? (
                <img
                  src={(debugResolvedMedia('header.avatar', user?.profile_picture, resolveMediaUrl(user?.profile_picture)), resolveMediaUrl(user?.profile_picture))}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full bg-primary text-primary-content rounded-full flex items-center justify-center pt-1 ${user?.profile_picture ? 'hidden' : ''}`}>
                <span className="text-lg font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
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
                {getIcon(<Bars3Icon className="w-4 h-4 rotate-90" />, '🚪')}
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
