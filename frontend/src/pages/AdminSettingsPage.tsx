import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/api/client';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface SystemSettings {
  debug_mode: boolean;
  maintenance_mode: boolean;
  allow_registration: boolean;
  max_books_per_user: number;
  session_timeout: number;
}

const AdminSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings>({
    debug_mode: false,
    maintenance_mode: false,
    allow_registration: true,
    max_books_per_user: 1000,
    session_timeout: 24
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.admin.getSettings();
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await api.admin.updateSettings(settings);
      if (response.success) {
        setSuccess('Settings saved successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to save settings');
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const response = await api.admin.resetSettings();
      if (response.success) {
        await fetchSettings(); // Reload settings
        setSuccess('Settings reset to defaults!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to reset settings');
      console.error('Reset settings error:', err);
    } finally {
      setSaving(false);
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
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">⚙️ Admin Settings</h1>
          <p className="text-xl opacity-90 mt-2">Loading settings...</p>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-base-200 rounded-lg animate-pulse">
                  <div className="h-4 bg-base-300 rounded w-48"></div>
                  <div className="w-16 h-8 bg-base-300 rounded"></div>
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
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">⚙️ Admin Settings</h1>
        <p className="text-xl opacity-90 mt-2">System configuration and preferences</p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <Link to="/admin" className="btn btn-outline btn-secondary">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <div className="flex gap-2">
          <button
            onClick={handleResetSettings}
            className="btn btn-outline btn-warning"
            disabled={saving}
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircleIcon className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Settings */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <ServerIcon className="w-5 h-5" />
              System Settings
            </h2>
            
            <div className="space-y-6">
              {/* Debug Mode */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold">Debug Mode</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.debug_mode}
                    onChange={(e) => handleSettingChange('debug_mode', e.target.checked)}
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Enable detailed logging and debug information
                  </span>
                </label>
              </div>

              {/* Maintenance Mode */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold">Maintenance Mode</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-warning"
                    checked={settings.maintenance_mode}
                    onChange={(e) => handleSettingChange('maintenance_mode', e.target.checked)}
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Temporarily disable user access for maintenance
                  </span>
                </label>
              </div>

              {/* Allow Registration */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold">Allow User Registration</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-success"
                    checked={settings.allow_registration}
                    onChange={(e) => handleSettingChange('allow_registration', e.target.checked)}
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Allow new users to register accounts
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* User Settings */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <ShieldCheckIcon className="w-5 h-5" />
              User Settings
            </h2>
            
            <div className="space-y-6">
              {/* Max Books Per User */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Maximum Books Per User</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={settings.max_books_per_user}
                  onChange={(e) => handleSettingChange('max_books_per_user', parseInt(e.target.value) || 1000)}
                  min="1"
                  max="10000"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Maximum number of books a user can add to their library
                  </span>
                </label>
              </div>

              {/* Session Timeout */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Session Timeout (hours)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={settings.session_timeout}
                  onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value) || 24)}
                  min="1"
                  max="168"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    How long user sessions remain active (1-168 hours)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Information */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
                     <h2 className="card-title text-primary mb-6">
             💾 Database Information
           </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Database Type</div>
              <div className="stat-value text-lg">SQLite</div>
              <div className="stat-desc">Local file-based database</div>
            </div>
            
            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Database Location</div>
              <div className="stat-value text-lg">./data/</div>
              <div className="stat-desc">Application data directory</div>
            </div>
            
            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Backup Status</div>
              <div className="stat-value text-lg">Manual</div>
              <div className="stat-desc">Backup via admin dashboard</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6">⚡ Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/users" className="btn btn-outline btn-primary">
              👥 Manage Users
            </Link>
            <Link to="/admin/backup" className="btn btn-outline btn-warning">
              💾 Backup Database
            </Link>
            <Link to="/admin/logs" className="btn btn-outline btn-info">
              📋 View Logs
            </Link>
            <Link to="/admin/system-info" className="btn btn-outline btn-secondary">
              ℹ️ System Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;


