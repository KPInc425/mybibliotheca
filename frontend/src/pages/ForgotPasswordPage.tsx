import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email) {
      setError('Email is required');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.auth.forgotPassword(email);
      if (res.success) {
        setSuccess('If that email exists, a reset link was sent.');
      } else {
        setSuccess('If that email exists, a reset link was sent.');
      }
    } catch (err) {
      setSuccess('If that email exists, a reset link was sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-base-100 border-2 border-secondary rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-primary mb-4">Forgot Password</h1>
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-4">
            <span>{success}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Email</span>
            </label>
            <input
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? <span className="loading loading-spinner loading-sm"></span> : 'Send Reset Link'}
          </button>
        </form>
        <div className="text-center mt-4">
          <Link to="/login" className="link link-primary">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;


