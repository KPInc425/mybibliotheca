/**
 * BookOracle Authentication Storage Module
 * Handles persistent authentication storage for Capacitor hybrid apps
 */

class AuthStorage {
    constructor() {
        this.isCapacitor = typeof Capacitor !== 'undefined';
        this.storageKeys = {
            USERNAME: 'auth_username',
            REMEMBER_ME: 'auth_remember_me',
            LAST_LOGIN: 'auth_last_login',
            SESSION_TOKEN: 'auth_session_token'
        };
        this.init();
    }

    async init() {
        if (this.isCapacitor) {
            console.log('[AuthStorage] Capacitor detected, using Preferences plugin');
            try {
                // Check if Preferences plugin is available
                if (Capacitor.Plugins.Preferences) {
                    console.log('[AuthStorage] Preferences plugin available');
                } else {
                    console.warn('[AuthStorage] Preferences plugin not available, falling back to localStorage');
                    this.isCapacitor = false;
                }
            } catch (error) {
                console.warn('[AuthStorage] Error checking Preferences plugin:', error);
                this.isCapacitor = false;
            }
        } else {
            console.log('[AuthStorage] Running in browser, using localStorage');
        }
    }

    /**
     * Store authentication credentials
     */
    async storeCredentials(username, rememberMe = false) {
        try {
            const credentials = {
                username: username,
                rememberMe: rememberMe,
                lastLogin: new Date().toISOString()
            };

            if (this.isCapacitor && Capacitor.Plugins.Preferences) {
                // Use Capacitor Preferences plugin
                await Capacitor.Plugins.Preferences.set({
                    key: this.storageKeys.USERNAME,
                    value: JSON.stringify(credentials)
                });
                console.log('[AuthStorage] Credentials stored using Preferences plugin');
            } else {
                // Fallback to localStorage
                localStorage.setItem(this.storageKeys.USERNAME, JSON.stringify(credentials));
                console.log('[AuthStorage] Credentials stored using localStorage');
            }
            return true;
        } catch (error) {
            console.error('[AuthStorage] Error storing credentials:', error);
            return false;
        }
    }

    /**
     * Retrieve stored authentication credentials
     */
    async getStoredCredentials() {
        try {
            let credentials = null;

            if (this.isCapacitor && Capacitor.Plugins.Preferences) {
                // Use Capacitor Preferences plugin
                const result = await Capacitor.Plugins.Preferences.get({
                    key: this.storageKeys.USERNAME
                });
                if (result.value) {
                    credentials = JSON.parse(result.value);
                }
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(this.storageKeys.USERNAME);
                if (stored) {
                    credentials = JSON.parse(stored);
                }
            }

            if (credentials) {
                console.log('[AuthStorage] Retrieved stored credentials for:', credentials.username);
                return credentials;
            }

            return null;
        } catch (error) {
            console.error('[AuthStorage] Error retrieving credentials:', error);
            return null;
        }
    }

    /**
     * Clear stored authentication credentials
     */
    async clearCredentials() {
        try {
            if (this.isCapacitor && Capacitor.Plugins.Preferences) {
                // Use Capacitor Preferences plugin
                await Capacitor.Plugins.Preferences.remove({
                    key: this.storageKeys.USERNAME
                });
                await Capacitor.Plugins.Preferences.remove({
                    key: this.storageKeys.SESSION_TOKEN
                });
            } else {
                // Fallback to localStorage
                localStorage.removeItem(this.storageKeys.USERNAME);
                localStorage.removeItem(this.storageKeys.SESSION_TOKEN);
            }
            console.log('[AuthStorage] Credentials cleared');
            return true;
        } catch (error) {
            console.error('[AuthStorage] Error clearing credentials:', error);
            return false;
        }
    }

    /**
     * Check if user has "Remember Me" enabled
     */
    async hasRememberMe() {
        try {
            const credentials = await this.getStoredCredentials();
            return credentials && credentials.rememberMe === true;
        } catch (error) {
            console.error('[AuthStorage] Error checking remember me:', error);
            return false;
        }
    }

    /**
     * Get stored username
     */
    async getStoredUsername() {
        try {
            const credentials = await this.getStoredCredentials();
            return credentials ? credentials.username : null;
        } catch (error) {
            console.error('[AuthStorage] Error getting stored username:', error);
            return null;
        }
    }

    /**
     * Auto-fill login form with stored credentials
     */
    async autoFillLoginForm() {
        try {
            const credentials = await this.getStoredCredentials();
            if (!credentials) {
                return false;
            }

            // Find username field
            const usernameField = document.querySelector('input[name="username"], input[type="text"][placeholder*="username"], input[type="text"][placeholder*="email"]');
            if (usernameField && credentials.username) {
                usernameField.value = credentials.username;
                console.log('[AuthStorage] Auto-filled username:', credentials.username);
            }

            // Find remember me checkbox
            const rememberMeField = document.querySelector('input[name="remember_me"], input[type="checkbox"]');
            if (rememberMeField && credentials.rememberMe) {
                rememberMeField.checked = true;
                console.log('[AuthStorage] Auto-checked remember me');
            }

            return true;
        } catch (error) {
            console.error('[AuthStorage] Error auto-filling form:', error);
            return false;
        }
    }

    /**
     * Handle successful login
     */
    async onLoginSuccess(username, rememberMe) {
        try {
            if (rememberMe) {
                await this.storeCredentials(username, true);
                console.log('[AuthStorage] Login successful, credentials stored');
            } else {
                // Clear any previously stored credentials
                await this.clearCredentials();
                console.log('[AuthStorage] Login successful, credentials cleared');
            }
        } catch (error) {
            console.error('[AuthStorage] Error handling login success:', error);
        }
    }

    /**
     * Handle logout
     */
    async onLogout() {
        try {
            await this.clearCredentials();
            console.log('[AuthStorage] Logout completed, credentials cleared');
        } catch (error) {
            console.error('[AuthStorage] Error handling logout:', error);
        }
    }
}

// Create global instance
window.AuthStorage = new AuthStorage();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Auto-fill login form if we're on the login page
    if (window.location.pathname.includes('/login') || window.location.pathname.includes('/auth/login')) {
        setTimeout(() => {
            window.AuthStorage.autoFillLoginForm();
        }, 100);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthStorage;
} 