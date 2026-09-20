import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const REMEMBER_ME_KEY = 'bookoracle.keycloak.remember-me';
const RETURN_TO_KEY = 'bookoracle.keycloak.return-to';

const getRedirectUri = () => new URL('/auth/keycloak/callback', window.location.origin).toString();

const getKeycloakSettings = () => {
  const issuer = import.meta.env.VITE_KEYCLOAK_ISSUER_URL?.replace(/\/$/, '');
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;

  if (!issuer || !clientId) {
    return null;
  }

  return {
    authority: issuer,
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    monitorSession: false,
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  };
};

let userManager: UserManager | null = null;

const getUserManager = () => {
  const settings = getKeycloakSettings();

  if (!settings) {
    throw new Error('Keycloak login is not configured for this app');
  }

  if (!userManager) {
    userManager = new UserManager(settings);
  }

  return userManager;
};

export const isKeycloakConfigured = () => Boolean(getKeycloakSettings());

export const beginKeycloakLogin = async ({ rememberMe = false, returnTo = '/' } = {}) => {
  window.sessionStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  window.sessionStorage.setItem(RETURN_TO_KEY, returnTo);

  const manager = getUserManager();
  await manager.clearStaleState();
  await manager.signinRedirect();
};

export const completeKeycloakLogin = async () => getUserManager().signinCallback();

export const consumeKeycloakLoginState = () => {
  const rememberMe = window.sessionStorage.getItem(REMEMBER_ME_KEY) === 'true';
  const returnTo = window.sessionStorage.getItem(RETURN_TO_KEY) || '/';

  window.sessionStorage.removeItem(REMEMBER_ME_KEY);
  window.sessionStorage.removeItem(RETURN_TO_KEY);

  return { rememberMe, returnTo };
};

export const clearKeycloakLoginState = async () => {
  window.sessionStorage.removeItem(REMEMBER_ME_KEY);
  window.sessionStorage.removeItem(RETURN_TO_KEY);

  if (!userManager) {
    return;
  }

  try {
    await userManager.removeUser();
  } catch {
    // Ignore stale browser session cleanup failures.
  }
};