import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

const AdminCreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 12) {
      setError('Password must be at least 12 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.admin.createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      if (response.success) {
        setSuccess('User created successfully!');
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        // Redirect to users list after a short delay
        setTimeout(() => {
          navigate('/admin/users');
        }, 2000);
      } else {
        setError(response.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-base-content">Create New User</h1>
          <button
            onClick={() => navigate('/admin/users')}
            className="btn btn-outline"
          >
            <Icon hero={<XMarkIcon className="w-4 h-4 mr-2" />} emoji="✖️" />
            Cancel
          </button>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {error && (
              <div className="alert alert-error mb-6">
                <XMarkIcon className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success mb-6">
                <CheckIcon className="w-5 h-5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    <Icon hero={<UserIcon className="w-4 h-4 inline mr-2" />} emoji="👤" />
                    Username
                  </span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="Enter username"
                  disabled={isSubmitting}
                />
              </div>

              {/* Email */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    <Icon hero={<EnvelopeIcon className="w-4 h-4 inline mr-2" />} emoji="✉️" />
                    Email
                  </span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="Enter email address"
                  disabled={isSubmitting}
                />
              </div>

              {/* Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    <Icon hero={<LockClosedIcon className="w-4 h-4 inline mr-2" />} emoji="🔒" />
                    Password
                  </span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="Enter password (min 12 characters)"
                  disabled={isSubmitting}
                />
                <div className="mt-2 text-xs text-base-content/70 whitespace-normal break-words">
                  Password must be at least 12 characters long and include uppercase, lowercase, number, and special character
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    <Icon hero={<LockClosedIcon className="w-4 h-4 inline mr-2" />} emoji="🔒" />
                    Confirm Password
                  </span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="Confirm password"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <div className="form-control pt-4">
                <button
                  type="submit"
                  className={`btn btn-primary w-full ${isSubmitting ? 'loading' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Creating User...'
                  ) : (
                    <>
                      <Icon hero={<CheckIcon className="w-4 h-4 mr-2" />} emoji="✅" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateUserPage;
