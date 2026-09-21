# 🔐 Capacitor Authentication Persistence Guide

This guide explains the authentication persistence solution implemented for BookOracle's Capacitor hybrid app to ensure users stay logged in when reopening the app.

## Problem

In Capacitor hybrid apps, HTTP cookies used for session management don't always persist when the app is closed and reopened, causing users to be logged out even when "Remember Me" is checked.

## Solution Overview

The solution implements a **dual-layer authentication persistence system** with **granular user control**:

1. **Server-side Session Management**: Flask sessions with optimized cookie settings for Capacitor
2. **Client-side Storage**: Capacitor Preferences plugin for persistent credential storage
3. **Smart Detection**: Automatic detection of Capacitor environment and appropriate handling
4. **User Control**: Separate options for remembering username and password

## User Interface

### Two-Tier Remember Me System

The login form now provides users with clear control over what gets stored:

- **"Remember Me"** (Primary): Stores username and session preferences
- **"Remember Password"** (Optional): Additional checkbox for password storage

This gives users the flexibility to choose their preferred balance of convenience and security.

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

#### Enhanced AuthStorage Class
```javascript
// app/static/auth-storage.js
class AuthStorage {
    async storeCredentials(username, rememberMe = false, password = null) {
        const credentials = {
            username: username,
            rememberMe: rememberMe,
            rememberPassword: password !== null,
            lastLogin: new Date().toISOString()
        };

        if (this.isCapacitor && Capacitor.Plugins.Preferences) {
            // Store credentials
            await Capacitor.Plugins.Preferences.set({
                key: this.storageKeys.USERNAME,
                value: JSON.stringify(credentials)
            });
            
            // Store password separately if requested
            if (password !== null) {
                await Capacitor.Plugins.Preferences.set({
                    key: this.storageKeys.PASSWORD,
                    value: password
                });
            } else {
                // Remove stored password if not remembering
                await Capacitor.Plugins.Preferences.remove({
                    key: this.storageKeys.PASSWORD
                });
            }
        }
    }

    async autoFillLoginForm() {
        const credentials = await this.getStoredCredentials();
        if (credentials) {
            // Auto-fill username
            const usernameField = document.querySelector('input[name="username"]');
            if (usernameField && credentials.username) {
                usernameField.value = credentials.username;
            }

            // Auto-fill password if stored
            const passwordField = document.querySelector('input[name="password"]');
            if (passwordField && credentials.password) {
                passwordField.value = credentials.password;
            }

            // Auto-check remember me
            const rememberMeField = document.querySelector('input[name="remember_me"]');
            if (rememberMeField && credentials.rememberMe) {
                rememberMeField.checked = true;
            }

            // Auto-check remember password
            const rememberPasswordField = document.querySelector('input[name="remember_password"]');
            if (rememberPasswordField && credentials.rememberPassword) {
                rememberPasswordField.checked = true;
            }
        }
    }
}
```

### 3. Enhanced Login Flow

#### Login Form with Two-Tier Options
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
    
    <!-- Remember Me Options -->
    <div class="space-y-3">
        <div class="flex items-center gap-2">
            {{ form.remember_me(class="checkbox checkbox-primary") }}
            {{ form.remember_me.label(class="label-text") }}
        </div>
        
        <div class="flex items-start gap-2">
            {{ form.remember_password(class="checkbox checkbox-secondary mt-1") }}
            <div class="flex-1">
                {{ form.remember_password.label(class="label-text font-medium") }}
                <div class="text-xs text-base-content/60 mt-1">
                    Stores your password locally for faster login. Only enable on your personal device.
                </div>
            </div>
        </div>
    </div>
    
    <div>
        {{ form.submit(class="btn btn-primary w-full") }}
    </div>
</form>

<!-- Storage Debug Link -->
<div class="text-center mt-4">
    <a href="{{ url_for('auth.storage_debug') }}" class="link link-primary text-sm">
        🔍 View Stored Data
    </a>
</div>
```

## How It Works

### 1. App Launch
- Capacitor environment is detected
- `CAPACITOR_ENV=true` cookie is set
- AuthStorage module initializes

### 2. Login Page Load
- Stored credentials are retrieved from Capacitor Preferences
- Login form is auto-filled with username (and password if stored)
- "Remember Me" and "Remember Password" checkboxes are auto-checked if previously enabled

### 3. Login Submission
- Credentials are stored based on user preferences:
  - **Remember Me**: Stores username and session preferences
  - **Remember Password**: Additionally stores password for faster login
- Server receives request with Capacitor cookie
- Server configures less restrictive cookie settings for Capacitor
- Session is created with extended lifetime (30 days)

### 4. App Reopening
- Stored credentials are available immediately
- Form auto-fill provides seamless experience
- Server session may still be valid
- If session expired, auto-filled credentials speed up re-login

## User Experience Options

### Option 1: Username Only (Default)
- User checks "Remember Me" only
- Username is auto-filled on next login
- Password must be entered manually
- **Best for**: Security-conscious users

### Option 2: Username + Password
- User checks both "Remember Me" and "Remember Password"
- Both username and password are auto-filled
- One-click login experience
- **Best for**: Personal devices, convenience-focused users

### Option 3: No Storage
- User doesn't check either option
- No credentials are stored locally
- Full manual login each time
- **Best for**: Shared devices, maximum security

## Benefits

### For Users
- **Granular Control**: Choose exactly what to remember
- **Seamless Experience**: No need to re-enter credentials when reopening app
- **Faster Login**: Auto-filled forms reduce typing
- **Reliable Persistence**: Works even when app is force-closed
- **Secure Storage**: Credentials stored securely using native APIs
- **Transparency**: View and manage stored data anytime

### For Developers
- **Automatic Detection**: No manual configuration needed
- **Fallback Support**: Works in both Capacitor and browser environments
- **Maintainable Code**: Clean separation of concerns
- **Extensible Design**: Easy to add additional storage features
- **Security Best Practices**: Follows modern authentication patterns

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

## Storage Debug Page

A new debug page (`/auth/storage-debug`) allows users to:
- View what authentication data is stored locally
- See storage type (Capacitor Preferences vs localStorage)
- Check which options are enabled
- Clear all stored data
- Understand security implications

This provides complete transparency about data storage.

## Troubleshooting

### Common Issues

#### Credentials Not Persisting
- **Check**: Ensure Capacitor Preferences plugin is installed
- **Solution**: Run `npm install @capacitor/preferences@7.0.1` and `npx cap sync android`

#### Auto-fill Not Working
- **Check**: Verify AuthStorage module is loaded
- **Solution**: Check browser console for errors in `auth-storage.js`

#### Password Not Being Stored
- **Check**: Ensure "Remember Password" checkbox is checked
- **Solution**: Check the storage debug page to verify settings

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
- Passwords are stored separately from other credentials
- No sensitive data is stored in plain text

### Session Management
- Sessions have a 30-day lifetime when "Remember Me" is enabled
- Secure cookie settings are used for web browsers
- CSRF protection remains active

### Privacy
- Users have complete control over what gets stored
- Passwords are only stored when explicitly requested
- Users can clear stored data at any time
- Storage debug page provides full transparency

### Best Practices
- **Personal Devices Only**: Password storage should only be enabled on trusted devices
- **Regular Review**: Users should periodically check stored data via debug page
- **Clear on Logout**: Stored data is automatically cleared on logout
- **Device Security**: Relies on device-level security for encryption

## Future Enhancements

### Planned Features
- **Biometric Authentication**: Integration with device biometrics
- **Multi-Account Support**: Store multiple user accounts
- **Offline Mode**: Enhanced offline functionality
- **Sync Across Devices**: Cloud-based credential sync (with user consent)

### Performance Optimizations
- **Lazy Loading**: Load credentials only when needed
- **Caching**: Implement intelligent caching strategies
- **Background Sync**: Automatic session refresh

## Support

For issues related to authentication persistence:
1. Check this documentation first
2. Use the storage debug page to verify settings
3. Enable debug mode for detailed logging
4. Check browser console for JavaScript errors
5. Verify Capacitor plugin installation
6. Test with a fresh app installation

---

*This authentication persistence system provides a seamless user experience while maintaining security and privacy standards, with granular user control over what gets stored locally.* 