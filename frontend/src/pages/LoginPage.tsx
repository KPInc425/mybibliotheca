import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import Icon from '@/components/Icon';
import { 
  BookOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    remember_me: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        // Fetch complete user profile after successful login
        try {
          const profileResponse = await fetch('/api/user/profile', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.success) {
              setUser(profileData.data);
            } else {
              // Fallback to login response data if profile fetch fails
              setUser(responseData.data);
            }
          } else {
            // Fallback to login response data if profile fetch fails
            setUser(responseData.data);
          }
        } catch (_error) {
          // Fallback to login response data if profile fetch fails
          setUser(responseData.data);
        }
        navigate('/');
      } else {
        setError(responseData.error || 'Login failed');
      }
    } catch (_error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full">
        {/* Brand: flat lavender logomark, no gradient, no glow */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-field bg-primary flex items-center justify-center mb-4">
            <Icon hero={<BookOpenIcon className="w-6 h-6 text-primary-content" />} emoji="📚" />
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-1">BookOracle</h1>
          <p className="text-sm text-base-content/60">Sign in to continue your reading journey</p>
        </div>

        {/* Form card: one quiet surface step, no border, no shadow */}
        <div className="bg-base-300 rounded-box p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="alert alert-error">
                <Icon hero={<BookOpenIcon className="w-5 h-5" />} emoji="⚠️" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Username Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2 text-base-content/70">
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
                  placeholder="Enter your username"
                />
              </div>

              {/* Password Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2 text-base-content/70">
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
                    placeholder="Enter your password"
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

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="label cursor-pointer">
                  <input
                    name="remember_me"
                    type="checkbox"
                    checked={formData.remember_me}
                    onChange={handleChange}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span className="label-text ml-2">Remember me</span>
                </label>
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
                  Signing in...
                </>
              ) : (
                <>
                  <Icon hero={<BookOpenIcon className="w-5 h-5" />} emoji="📚" />
                  Sign In
                </>
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4 space-y-2">
              <p className="text-base-content/70">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="link link-primary font-semibold hover:link-primary-focus"
                >
                  Sign up here
                </Link>
              </p>
              <p>
                <Link to="/forgot-password" className="link link-primary">Forgot your password?</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 