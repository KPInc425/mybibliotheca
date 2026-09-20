import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/auth';
import {
  clearKeycloakLoginState,
  completeKeycloakLogin,
  consumeKeycloakLoginState,
} from '@/auth/keycloak';

const KeycloakCallbackPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const finishLogin = async () => {
      try {
        const oidcUser = await completeKeycloakLogin();
        const { rememberMe, returnTo } = consumeKeycloakLoginState();

        if (!oidcUser?.id_token) {
          throw new Error('Keycloak did not return an ID token');
        }

        const response = await fetch('/api/auth/keycloak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            idToken: oidcUser.id_token,
            remember_me: rememberMe,
          }),
        });

        const responseData = await response.json();

        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error || 'Keycloak login failed');
        }

        const profileResponse = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (!profileResponse.ok) {
          throw new Error('Unable to load your BookOracle profile');
        }

        const profileData = await profileResponse.json();

        if (!profileData.success || !profileData.data) {
          throw new Error(profileData.error || 'Unable to load your BookOracle profile');
        }

        if (cancelled) {
          return;
        }

        setUser(profileData.data);
        navigate(returnTo, { replace: true });
      } catch (err) {
        await clearKeycloakLoginState();

        if (cancelled) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Keycloak login failed');
      }
    };

    finishLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 dark:from-primary/20 dark:via-secondary/20 dark:to-accent/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-base-100 border-2 border-secondary rounded-2xl p-8 shadow-xl text-center space-y-4">
        <h1 className="text-2xl font-bold text-primary">Connecting to BookOracle</h1>
        {error ? (
          <>
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
            <Link to="/login" className="btn btn-primary w-full">
              Back to login
            </Link>
          </>
        ) : (
          <>
            <span className="loading loading-spinner loading-lg"></span>
            <p className="text-base-content/70">Finishing your Keycloak sign-in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default KeycloakCallbackPage;