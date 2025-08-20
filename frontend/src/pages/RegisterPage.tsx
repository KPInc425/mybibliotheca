import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { 
  BookOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    invite_token: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!formData.invite_token.trim()) {
      setError('Invite token is required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate('/login?registered=true');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Registration failed');
      }
    } catch (error) {
      setError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 dark:from-primary/20 dark:via-secondary/20 dark:to-accent/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header Card */}
        <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 shadow-xl mb-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-4">
              <Icon hero={<BookOpenIcon className="w-8 h-8 text-white" />} emoji="📚" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Join BookOracle</h1>
            <p className="text-base-content/70">Start your reading journey today</p>
          </div>
        </div>

        {/* Register Form Card */}
        <div className="bg-base-100 border-2 border-secondary rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="alert alert-error">
                <Icon hero={<BookOpenIcon className="w-5 h-5" />} emoji="⚠️" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Invite Token Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Icon hero={<KeyIcon className="w-4 h-4" />} emoji="🔑" />
                    Invite Token *
                  </span>
                </label>
                <input
                  name="invite_token"
                  type="text"
                  required
                  value={formData.invite_token}
                  onChange={handleChange}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder="Enter your invite token"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Contact an administrator to get an invite token
                  </span>
                </label>
              </div>

              {/* Username Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Icon hero={<UserIcon className="w-4 h-4" />} emoji="👤" />
                    Username
                  </span>
                </label>
                <input
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder="Choose a username"
                />
              </div>

              {/* Email Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Icon hero={<EnvelopeIcon className="w-4 h-4" />} emoji="📧" />
                    Email
                  </span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Icon hero={<LockClosedIcon className="w-4 h-4" />} emoji="🔒" />
                    Password
                  </span>
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input input-bordered w-full pr-12 focus:input-primary"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                  >
                    <Icon 
                      hero={showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />} 
                      emoji={showPassword ? "🙈" : "👁️"} 
                    />
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Icon hero={<LockClosedIcon className="w-4 h-4" />} emoji="🔒" />
                    Confirm Password
                  </span>
                </label>
                <div className="relative">
                  <input
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="input input-bordered w-full pr-12 focus:input-primary"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                  >
                    <Icon 
                      hero={showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />} 
                      emoji={showConfirmPassword ? "🙈" : "👁️"} 
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full btn-lg"
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating account...
                </>
              ) : (
                <>
                  <Icon hero={<BookOpenIcon className="w-5 h-5" />} emoji="📚" />
                  Create Account
                </>
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-base-content/70">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="link link-primary font-semibold hover:link-primary-focus"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 