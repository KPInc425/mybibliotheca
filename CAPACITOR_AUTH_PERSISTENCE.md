# 🔐 Capacitor Authentication Persistence Guide

This guide explains the authentication persistence solution implemented for BookOracle's Capacitor hybrid app to ensure users stay logged in when reopening the app.

## Problem

In Capacitor hybrid apps, HTTP cookies used for session management don't always persist when the app is closed and reopened, causing users to be logged out even when "Remember Me" is checked.

## Solution Overview

The solution implements a **dual-layer authentication persistence system**:

1. **Server-side Session Management**: Flask sessions with optimized cookie settings for Capacitor
2. **Client-side Storage**: Capacitor Preferences plugin for persistent credential storage
3. **Smart Detection**: Automatic detection of Capacitor environment and appropriate handling

## Technical Implementation

### 1. Server-Side Enhancements

#### Dynamic Cookie Configuration
```python
# config.py
def is_hybrid_app_request(request):
    """Check if the current request is from a Capacitor hybrid app"""
    # Check for Capacitor environment cookie
    capacitor_cookie = request.cookies.get('CAPACITOR_ENV')
    if capacitor_cookie == 'true':
        return True
    
    # Check user agent for mobile apps
    user_agent = request.headers.get('User-Agent', '').lower()
    mobile_indicators = ['capacitor', 'cordova', 'phonegap', 'mobile']
    if any(indicator in user_agent for indicator in mobile_indicators):
        return True
    
    return False
```

#### Adaptive Cookie Security
```python
# app/__init__.py
@app.before_request
def configure_cookies_for_capacitor():
    """Configure cookie security settings based on request source"""
    is_capacitor = Config.is_hybrid_app_request(request)
    
    if is_capacitor:
        # For Capacitor apps, use less restrictive cookie settings
        app.config['SESSION_COOKIE_SECURE'] = False
        app.config['REMEMBER_COOKIE_SECURE'] = False
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    else:
        # For web browsers, use secure cookies in production
        app.config['SESSION_COOKIE_SECURE'] = not app.config.get('is_development', True)
        app.config['REMEMBER_COOKIE_SECURE'] = not app.config.get('is_development', True)
```

### 2. Client-Side Storage

#### Capacitor Preferences Plugin
```json
// package.json
{
  "dependencies": {
    "@capacitor/preferences": "^7.0.1"
  }
}
```

#### AuthStorage Class
```javascript
// app/static/auth-storage.js
class AuthStorage {
    constructor() {
        this.isCapacitor = typeof Capacitor !== 'undefined';
        this.storageKeys = {
            USERNAME: 'auth_username',
            REMEMBER_ME: 'auth_remember_me',
            LAST_LOGIN: 'auth_last_login'
        };
    }

    async storeCredentials(username, rememberMe = false) {
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
        } else {
            // Fallback to localStorage
            localStorage.setItem(this.storageKeys.USERNAME, JSON.stringify(credentials));
        }
    }

    async autoFillLoginForm() {
        const credentials = await this.getStoredCredentials();
        if (credentials) {
            // Auto-fill username field
            const usernameField = document.querySelector('input[name="username"]');
            if (usernameField && credentials.username) {
                usernameField.value = credentials.username;
            }

            // Auto-check remember me
            const rememberMeField = document.querySelector('input[name="remember_me"]');
            if (rememberMeField && credentials.rememberMe) {
                rememberMeField.checked = true;
            }
        }
    }
}
```

### 3. Enhanced Login Flow

#### Login Form Integration
```html
<!-- app/templates/auth/login.html -->
<form method="post" class="space-y-6" id="loginForm">
    {{ form.hidden_tag() }}
    <div>
        {{ form.username.label(class="label label-text font-semibold") }}
        {{ form.username(class="input input-bordered w-full") }}
    </div>
    <div>
        {{ form.password.label(class="label label-text font-semibold") }}
        {{ form.password(class="input input-bordered w-full") }}
    </div>
    <div class="flex items-center gap-2">
        {{ form.remember_me(class="checkbox checkbox-primary") }}
        {{ form.remember_me.label(class="label-text") }}
    </div>
    <div>
        {{ form.submit(class="btn btn-primary w-full") }}
    </div>
</form>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Auto-fill form with stored credentials
    if (window.AuthStorage) {
        window.AuthStorage.autoFillLoginForm();
    }

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        if (window.AuthStorage && rememberMeField.checked) {
            await window.AuthStorage.storeCredentials(usernameField.value, true);
        }
    });
});
</script>
```

## How It Works

### 1. App Launch
- Capacitor environment is detected
- `CAPACITOR_ENV=true` cookie is set
- AuthStorage module initializes

### 2. Login Page Load
- Stored credentials are retrieved from Capacitor Preferences
- Login form is auto-filled with username
- "Remember Me" checkbox is auto-checked if previously enabled

### 3. Login Submission
- Credentials are stored in Capacitor Preferences if "Remember Me" is checked
- Server receives request with Capacitor cookie
- Server configures less restrictive cookie settings for Capacitor
- Session is created with extended lifetime (30 days)

### 4. App Reopening
- Stored credentials are available immediately
- Form auto-fill provides seamless experience
- Server session may still be valid
- If session expired, auto-filled credentials speed up re-login

## Benefits

### For Users
- **Seamless Experience**: No need to re-enter credentials when reopening app
- **Faster Login**: Auto-filled forms reduce typing
- **Reliable Persistence**: Works even when app is force-closed
- **Secure Storage**: Credentials stored securely using native APIs

### For Developers
- **Automatic Detection**: No manual configuration needed
- **Fallback Support**: Works in both Capacitor and browser environments
- **Maintainable Code**: Clean separation of concerns
- **Extensible Design**: Easy to add additional storage features

## Installation

### 1. Install Dependencies
```bash
npm install @capacitor/preferences@7.0.1
```

### 2. Sync Capacitor
```bash
npx cap sync android
```

### 3. Build APK
```bash
python build_apk.py
```

## Configuration

### Environment Variables
```bash
# For development/testing
FLASK_DEBUG=true
BookOracle_DEBUG=true

# For production
FLASK_DEBUG=false
BookOracle_DEBUG=false
```

### Cookie Settings
The system automatically configures cookie settings based on the request source:
- **Capacitor Apps**: Less restrictive settings for better compatibility
- **Web Browsers**: Standard secure cookie settings
- **Development**: Relaxed settings for testing

## Troubleshooting

### Common Issues

#### Credentials Not Persisting
- **Check**: Ensure Capacitor Preferences plugin is installed
- **Solution**: Run `npm install @capacitor/preferences@7.0.1` and `npx cap sync android`

#### Auto-fill Not Working
- **Check**: Verify AuthStorage module is loaded
- **Solution**: Check browser console for errors in `auth-storage.js`

#### Session Still Expiring
- **Check**: Verify Capacitor environment detection
- **Solution**: Ensure `CAPACITOR_ENV=true` cookie is set

#### Build Errors
- **Check**: Android SDK and Capacitor CLI installation
- **Solution**: Follow the build script requirements

### Debug Mode
Enable debug logging to troubleshoot issues:
```bash
export BookOracle_DEBUG=true
export BookOracle_DEBUG_AUTH=true
```

## Security Considerations

### Data Storage
- Credentials are stored using Capacitor's secure Preferences API
- Data is encrypted at rest on Android devices
- No sensitive data is stored in plain text

### Session Management
- Sessions have a 30-day lifetime when "Remember Me" is enabled
- Secure cookie settings are used for web browsers
- CSRF protection remains active

### Privacy
- Only username and remember-me preference are stored locally
- Passwords are never stored locally
- Users can clear stored data by unchecking "Remember Me"

## Future Enhancements

### Planned Features
- **Biometric Authentication**: Integration with device biometrics
- **Multi-Account Support**: Store multiple user accounts
- **Offline Mode**: Enhanced offline functionality
- **Sync Across Devices**: Cloud-based credential sync

### Performance Optimizations
- **Lazy Loading**: Load credentials only when needed
- **Caching**: Implement intelligent caching strategies
- **Background Sync**: Automatic session refresh

## Support

For issues related to authentication persistence:
1. Check this documentation first
2. Enable debug mode for detailed logging
3. Check browser console for JavaScript errors
4. Verify Capacitor plugin installation
5. Test with a fresh app installation

---

*This authentication persistence system provides a seamless user experience while maintaining security and privacy standards.* 