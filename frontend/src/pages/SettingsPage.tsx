import React, { useState } from 'react';
import { useSettingsStore } from '@/store/settings';
import { useAuthStore } from '@/store/auth';
import { 
  EyeIcon,
  EyeSlashIcon,
  BellIcon,
  ShieldCheckIcon,
  CameraIcon,
  SwatchIcon,
  UserIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const SettingsPage: React.FC = () => {
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const { user } = useAuthStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetSettings = () => {
    resetSettings();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">⚙️ Settings</h1>
        <p className="text-xl opacity-90 mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Icon Preferences */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <SwatchIcon className="w-6 h-6" />
              🎨 Icon Preferences
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {settings.useHeroIcons ? (
                      <EyeIcon className="w-5 h-5 text-primary" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5 text-secondary" />
                    )}
                  </div>
                  <div>
                    <label className="font-semibold text-base-content">Use Hero Icons</label>
                    <p className="text-sm text-base-content/70">
                      Switch between playful emoji icons and modern Hero icons throughout the app
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={settings.useHeroIcons}
                  onChange={(e) => updateSetting('useHeroIcons', e.target.checked)}
                />
              </div>
              
              <div className="alert alert-info">
                <InformationCircleIcon className="w-5 h-5" />
                <div>
                  <span className="font-semibold">Icon Style Preview:</span>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm">
                      {settings.useHeroIcons ? '📚 Library' : '📚 Library'}
                    </span>
                    <span className="text-sm">
                      {settings.useHeroIcons ? '➕ Add Book' : '➕ Add Book'}
                    </span>
                    <span className="text-sm">
                      {settings.useHeroIcons ? '🔍 Search' : '🔍 Search'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scanner Settings */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <CameraIcon className="w-6 h-6" />
              📱 Scanner Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div>
                  <label className="font-semibold text-base-content">Auto-fetch Book Data</label>
                  <p className="text-sm text-base-content/70">
                    Automatically fetch book information after scanning barcodes
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={settings.autoFetchBookData}
                  onChange={(e) => updateSetting('autoFetchBookData', e.target.checked)}
                />
              </div>
              
              {user?.is_admin && (
                <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                  <div>
                    <label className="font-semibold text-base-content">Scanner Debug Mode</label>
                    <p className="text-sm text-base-content/70">
                      Show debug information in the barcode scanner interface
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-warning"
                    checked={settings.scannerDebugMode}
                    onChange={(e) => updateSetting('scannerDebugMode', e.target.checked)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6" />
              🔒 Privacy Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div>
                  <label className="font-semibold text-base-content">Share Reading Activity</label>
                  <p className="text-sm text-base-content/70">
                    Allow other users to see your reading progress and activity
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={settings.shareReadingActivity}
                  onChange={(e) => updateSetting('shareReadingActivity', e.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div>
                  <label className="font-semibold text-base-content">Show in Public Library</label>
                  <p className="text-sm text-base-content/70">
                    Include your books in the public library browsing
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={settings.showInPublicLibrary}
                  onChange={(e) => updateSetting('showInPublicLibrary', e.target.checked)}
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <BellIcon className="w-6 h-6" />
              🔔 Notification Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div>
                  <label className="font-semibold text-base-content">Email Notifications</label>
                  <p className="text-sm text-base-content/70">
                    Receive email notifications for important events
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={settings.emailNotifications}
                  onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div>
                  <label className="font-semibold text-base-content">Reading Reminders</label>
                  <p className="text-sm text-base-content/70">
                    Get reminders to continue reading your books
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={settings.readingReminders}
                  onChange={(e) => updateSetting('readingReminders', e.target.checked)}
                />
              </div>
            </div>
          </div>

          {/* Reset Settings */}
          <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-error mb-6 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-6 h-6" />
              ⚠️ Danger Zone
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-error/10 rounded-lg">
                <h3 className="font-semibold text-error mb-2">Reset All Settings</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  This will reset all your preferences to their default values. This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="btn btn-error btn-sm"
                >
                  Reset Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Info */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              👤 Account Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Username:</span>
                <p className="text-base-content/70">{user?.username}</p>
              </div>
              <div>
                <span className="font-semibold">Email:</span>
                <p className="text-base-content/70">{user?.email}</p>
              </div>
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
              <div>
                <span className="font-semibold">Member Since:</span>
                <p className="text-base-content/70">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4">⚡ Quick Actions</h3>
            <div className="space-y-3">
              <button className="btn btn-outline btn-primary w-full">
                <UserIcon className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
              <button className="btn btn-outline btn-secondary w-full">
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                Change Password
              </button>
              <button className="btn btn-outline btn-info w-full">
                <BellIcon className="w-4 h-4 mr-2" />
                Notification History
              </button>
            </div>
          </div>

          {/* Settings Summary */}
          <div className="bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4">📊 Settings Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Icon Style:</span>
                <span className="font-semibold">
                  {settings.useHeroIcons ? 'Hero Icons' : 'Emoji Icons'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Auto-fetch:</span>
                <span className="font-semibold">
                  {settings.autoFetchBookData ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Privacy:</span>
                <span className="font-semibold">
                  {settings.shareReadingActivity ? 'Public' : 'Private'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Notifications:</span>
                <span className="font-semibold">
                  {settings.emailNotifications ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error mb-4">⚠️ Reset Settings</h3>
            <p className="mb-4">
              Are you sure you want to reset all settings to their default values? 
              This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSettings}
                className="btn btn-error"
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
