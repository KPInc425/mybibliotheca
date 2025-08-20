import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/api/client';
import { 
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

const AdminBackupPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupSize, setBackupSize] = useState<number>(0);
  const [status, setStatus] = useState<string>('unknown');

  const fetchStatus = async () => {
    try {
      const resp = await api.admin.getBackupStatus();
      if (resp.success && resp.data) {
        setLastBackup(resp.data.last_backup || null);
        setBackupSize(resp.data.backup_size || 0);
        setStatus(resp.data.status || 'unknown');
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);
      
      const response = await api.admin.createBackup();
      if (response.success) {
        setSuccess('Database backup created successfully!');
        setTimeout(() => setSuccess(null), 5000);
        fetchStatus();
      }
    } catch (err) {
      setError('Failed to create backup');
      console.error('Backup error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setDownloading(true);
      setError(null);
      
      const response = await api.admin.downloadBackup();
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'bookoracle_backup.db';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Database backup downloaded successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to download backup');
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">💾 Database Backup</h1>
        <p className="text-xl opacity-90 mt-2">Create and manage system backups</p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <Link to="/admin" className="btn btn-outline btn-secondary">
          <Icon hero={<ArrowLeftIcon className="w-4 h-4 mr-2" />} emoji="⬅️" />
          Back to Dashboard
        </Link>
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

      {/* Backup Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Backup Status */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
                         <h2 className="card-title text-primary mb-6">
               💾 Backup Status
             </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon hero={<CheckCircleIcon className="w-5 h-5 text-success" />} emoji="✅" />
                  <span className="font-semibold">Database Status</span>
                </div>
                <span className="badge badge-success">Healthy</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon hero={<ClockIcon className="w-5 h-5 text-info" />} emoji="⏱️" />
                  <span className="font-semibold">Last Backup</span>
                </div>
                <span className="text-sm text-base-content/60">
                  {lastBackup ? new Date(lastBackup).toLocaleString() : 'Not available'}
                </span>
              </div>
              {lastBackup && (
                <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <span className="font-semibold">Backup Size</span>
                  <span className="text-sm text-base-content/60">{(backupSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <ArrowDownTrayIcon className="w-5 h-5" />
              Backup Actions
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={handleCreateBackup}
                className="btn btn-primary w-full"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Icon hero={<ArrowDownTrayIcon className="w-4 h-4 mr-2" />} emoji="⬇️" />
                    Create Backup
                  </>
                )}
              </button>
              
              <button
                onClick={handleDownloadBackup}
                className="btn btn-secondary w-full"
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Icon hero={<ArrowDownTrayIcon className="w-4 h-4 mr-2" />} emoji="⬇️" />
                    Download Backup
                  </>
                )}
              </button>
              
              <div className="text-sm text-base-content/60">
                <p>• Creates a complete backup of the database</p>
                <p>• Backup files are stored in the data directory</p>
                <p>• Recommended before major updates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Information */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6">📋 Backup Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Database Type</div>
              <div className="stat-value text-lg">SQLite</div>
              <div className="stat-desc">Local file-based database</div>
            </div>
            
            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Backup Location</div>
              <div className="stat-value text-lg">./data/</div>
              <div className="stat-desc">Application data directory</div>
            </div>
            
            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Backup Format</div>
              <div className="stat-value text-lg">.db</div>
              <div className="stat-desc">SQLite database file</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6">⚡ Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin" className="btn btn-outline btn-primary">
              📊 Admin Dashboard
            </Link>
            <Link to="/admin/settings" className="btn btn-outline btn-secondary">
              ⚙️ Settings
            </Link>
            <Link to="/admin/users" className="btn btn-outline btn-info">
              👥 Manage Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBackupPage;


