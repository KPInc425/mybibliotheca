import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/api/client';
import { 
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

interface InviteToken {
  id: number;
  token: string;
  email?: string;
  created_by: number;
  created_at: string;
  expires_at?: string;
  is_used: boolean;
  used_by?: number;
  used_at?: string;
  is_valid: boolean;
}

const AdminInvitesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Create invite form state
  const [formData, setFormData] = useState({
    email: '',
    expires_in_days: 30
  });

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getInvites();
      if (response.success) {
        setInvites(response.data || []);
      } else {
        setError('Failed to fetch invites');
      }
    } catch (err) {
      setError('Failed to fetch invites');
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      setCreating(true);
      const response = await api.admin.createInvite({
        email: formData.email || undefined,
        expires_in_days: formData.expires_in_days
      });
      
      if (response.success) {
        setShowCreateModal(false);
        setFormData({ email: '', expires_in_days: 30 });
        fetchInvites();
      } else {
        setError('Failed to create invite');
      }
    } catch (err) {
      setError('Failed to create invite');
      console.error('Error creating invite:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: number) => {
    if (!confirm('Are you sure you want to delete this invite?')) {
      return;
    }

    try {
      setDeleting(inviteId);
      const response = await api.admin.deleteInvite(inviteId);
      
      if (response.success) {
        fetchInvites();
      } else {
        setError('Failed to delete invite');
      }
    } catch (err) {
      setError('Failed to delete invite');
      console.error('Error deleting invite:', err);
    } finally {
      setDeleting(null);
    }
  };

  const copyToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getInviteStatus = (invite: InviteToken) => {
    if (invite.is_used) {
      return { status: 'used', text: 'Used', color: 'text-success' };
    }
    if (!invite.is_valid) {
      return { status: 'expired', text: 'Expired', color: 'text-error' };
    }
    return { status: 'active', text: 'Active', color: 'text-info' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getExpiryStatus = (expiresAt?: string) => {
    if (!expiresAt) return { text: 'Never expires', color: 'text-base-content' };
    
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) {
      return { text: 'Expired', color: 'text-error' };
    } else if (daysLeft <= 7) {
      return { text: `Expires in ${daysLeft} days`, color: 'text-warning' };
    } else {
      return { text: `Expires in ${daysLeft} days`, color: 'text-success' };
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
          <Link to="/admin" className="btn btn-outline btn-error">
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10">🎫 Invite Management</h1>
        <p className="text-xl opacity-90 mt-2">Create and manage user registration invites</p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <Link to="/admin" className="btn btn-outline btn-secondary">
          <Icon hero={<ArrowLeftIcon className="w-4 h-4 mr-2" />} emoji="⬅️" />
          Back to Dashboard
        </Link>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Icon hero={<PlusIcon className="w-4 h-4 mr-2" />} emoji="➕" />
          Create Invite
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Invites List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6">
            <Icon hero={<EnvelopeIcon className="w-5 h-5" />} emoji="✉️" />
            Invite Tokens
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8">
              <EnvelopeIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <p className="text-base-content/70">No invite tokens found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary mt-4"
              >
                <Icon hero={<PlusIcon className="w-4 h-4 mr-2" />} emoji="➕" />
                Create First Invite
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Used By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => {
                    const status = getInviteStatus(invite);
                    const expiryStatus = getExpiryStatus(invite.expires_at);
                    
                    return (
                      <tr key={invite.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-base-200 px-2 py-1 rounded">
                              {invite.token.substring(0, 12)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(invite.token)}
                              className="btn btn-ghost btn-xs"
                              title="Copy full token"
                            >
                              <Icon 
                                hero={<ClipboardDocumentIcon className="w-4 h-4" />} 
                                emoji="📋" 
                              />
                            </button>
                            {copiedToken === invite.token && (
                              <span className="text-success text-xs">Copied!</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {invite.email ? (
                            <span className="flex items-center gap-1">
                              <Icon hero={<EnvelopeIcon className="w-3 h-3" />} emoji="✉️" />
                              {invite.email}
                            </span>
                          ) : (
                            <span className="text-base-content/50">Any email</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td>
                          <div className="text-sm">
                            {formatDate(invite.created_at)}
                          </div>
                        </td>
                        <td>
                          <div className={`text-sm ${expiryStatus.color}`}>
                            {expiryStatus.text}
                          </div>
                        </td>
                        <td>
                          {invite.used_by ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Icon hero={<UserIcon className="w-3 h-3" />} emoji="👤" />
                              User #{invite.used_by}
                              {invite.used_at && (
                                <span className="text-xs text-base-content/50">
                                  ({formatDate(invite.used_at)})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-base-content/50 text-sm">Not used</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteInvite(invite.id)}
                            disabled={deleting === invite.id}
                            className="btn btn-error btn-xs"
                          >
                            {deleting === invite.id ? (
                              <div className="loading loading-spinner loading-xs"></div>
                            ) : (
                              <Icon hero={<TrashIcon className="w-4 h-4" />} emoji="🗑️" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Invite Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              <Icon hero={<PlusIcon className="w-5 h-5 mr-2" />} emoji="➕" />
              Create New Invite
            </h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email (Optional)</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt">Leave empty to allow any email</span>
                </label>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Expires In (Days)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  min="1"
                  max="365"
                  value={formData.expires_in_days}
                  onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) || 30 })}
                />
                <label className="label">
                  <span className="label-text-alt">How many days until the invite expires</span>
                </label>
              </div>
            </div>
            
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateInvite}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <div className="loading loading-spinner loading-sm"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Icon hero={<PlusIcon className="w-4 h-4 mr-2" />} emoji="➕" />
                    Create Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvitesPage;
