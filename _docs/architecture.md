# BookOracle Architecture Overview

## 🏗️ System Architecture

BookOracle follows a **Flask-based monolithic architecture** with **Capacitor mobile integration**. The application is designed as a web-first application that can be wrapped as a native mobile app.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │  Mobile App     │    │   Admin Tools   │
│   (Chrome, etc) │    │  (Capacitor)    │    │   (CLI)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Flask App     │
                    │   (Python)      │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   SQLite DB     │
                    │   (Local)       │
                    └─────────────────┘
```

## 🧱 Technology Stack

### Backend Stack
- **Framework**: Flask 2.2.2 (Python web framework)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: Flask-Login with custom security features
- **Forms**: Flask-WTF with CSRF protection
- **Server**: Gunicorn (Linux/macOS) or Waitress (Windows)
- **Image Processing**: Pillow for monthly wrap-up generation

### Frontend Stack
- **Templating**: Jinja2 templates with server-side rendering
- **CSS Framework**: Tailwind CSS + DaisyUI
- **JavaScript**: Vanilla JS with some jQuery for AJAX
- **Mobile**: Capacitor for native mobile app wrapper
- **Barcode Scanning**: MLKit (Android) + ZXing (Web fallback)

### Development & Deployment
- **Containerization**: Docker with docker-compose
- **Testing**: pytest with Flask testing utilities
- **Mobile Build**: Capacitor CLI for Android APK generation

## 📁 Project Structure

```
BookOracle/
├── app/                          # Main Flask application
│   ├── __init__.py              # App factory and initialization
│   ├── models.py                # Database models (User, Book, ReadingLog)
│   ├── routes.py                # Main application routes
│   ├── auth.py                  # Authentication routes
│   ├── admin.py                 # Admin panel routes
│   ├── forms.py                 # WTForms definitions
│   ├── utils.py                 # Utility functions
│   ├── debug_utils.py           # Debug and logging utilities
│   ├── static/                  # Static assets (CSS, JS, images)
│   └── templates/               # Jinja2 templates
├── android/                     # Android-specific Capacitor files
├── assets/                      # App icons and splash screens
├── data/                        # SQLite database and backups
├── tests/                       # Test suite
├── _docs/                       # Official documentation
├── __buildDocs/                 # Build guides
└── Configuration files
```

## 🔄 Data Flow

### 1. User Authentication Flow
```
User Login → Flask-Login → Session Management → Route Protection
```

### 2. Book Management Flow
```
Add Book → ISBN Lookup → Google Books API → Save to Database → Display
```

### 3. Reading Log Flow
```
Log Reading → Update Progress → Calculate Streaks → Generate Reports
```

### 4. Mobile Integration Flow
```
Mobile App → Capacitor Bridge → Flask API → Native Features (Camera, Scanner)
```

## 🗄️ Database Design

### Core Entities

#### User Model
- **Authentication**: username, email, password_hash
- **Security**: failed_login_attempts, locked_until, last_login
- **Privacy**: share_current_reading, share_reading_activity, share_library
- **Features**: reading_streak_offset, debug_enabled

#### Book Model
- **Basic Info**: title, author, isbn, cover_url
- **Metadata**: description, published_date, page_count, categories
- **Progress**: start_date, finish_date, want_to_read, library_only
- **Relationships**: user_id, shared_book_id

#### ReadingLog Model
- **Tracking**: book_id, user_id, date, pages_read
- **Analytics**: created_at for streak calculations

#### SharedBookData Model
- **Shared Metadata**: Common book data shared across users
- **Deduplication**: Prevents duplicate book metadata storage

## 🔐 Security Architecture

### Authentication & Authorization
- **Multi-factor Security**: Strong password requirements, account lockout
- **Session Management**: Secure cookie handling for web and mobile
- **CSRF Protection**: Flask-WTF CSRF tokens on all forms
- **User Isolation**: Complete data separation between users

### Data Protection
- **Password Hashing**: Werkzeug security with scrypt
- **Input Validation**: Comprehensive form validation
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **XSS Prevention**: Jinja2 auto-escaping

## 📱 Mobile Architecture

### Capacitor Integration
- **Hybrid Approach**: Web app wrapped in native container
- **Native Features**: Camera, barcode scanning, file system access
- **Cross-platform**: Single codebase for web and mobile
- **Offline Capability**: Service worker for basic offline functionality

### Native Features
- **Barcode Scanning**: MLKit for Android, ZXing fallback
- **Camera Integration**: Native camera access for book covers
- **File System**: Local storage for offline data
- **Push Notifications**: (Planned) Reading reminders

## 🔧 Configuration Management

### Environment Variables
- **SECRET_KEY**: Flask session encryption
- **SECURITY_PASSWORD_SALT**: Password hashing salt
- **TIMEZONE**: Application timezone
- **WORKERS**: Gunicorn worker processes

### Database Configuration
- **SQLite**: Default local database
- **Migrations**: Automatic schema migration system
- **Backups**: Automatic backup before migrations

## 🚀 Deployment Architecture

### Docker Deployment
```
Docker Container → Gunicorn → Flask App → SQLite Database
```

### Production Considerations
- **Reverse Proxy**: Nginx/Traefik for SSL termination
- **Database**: SQLite for simplicity, PostgreSQL for scale
- **Caching**: Redis for session storage (planned)
- **Monitoring**: Health checks and logging

## 🔄 Migration System

### Automatic Migrations
- **Schema Detection**: Inspects existing database structure
- **Backup Creation**: Automatic backup before migrations
- **Incremental Updates**: Adds missing columns and tables
- **Data Preservation**: Maintains existing data during migration

### Migration Types
1. **Fresh Installation**: Creates complete schema
2. **User Table Migration**: Adds authentication system
3. **Book Schema Migration**: Adds metadata fields
4. **Security Migration**: Adds security and privacy fields

## 📊 Performance Considerations

### Current Optimizations
- **Database Indexing**: Proper indexes on frequently queried fields
- **Static Asset Caching**: Browser caching for CSS/JS
- **Image Optimization**: Compressed book covers
- **Lazy Loading**: Progressive image loading

### Scalability Considerations
- **Database**: SQLite limits concurrent users (~100-1000)
- **Caching**: No current caching layer
- **CDN**: Static assets served directly
- **Load Balancing**: Single server deployment

## 🔮 Future Architecture Considerations

### Potential Improvements
1. **API-First Design**: Separate frontend and backend
2. **Microservices**: Split into auth, books, analytics services
3. **Modern Frontend**: React/Vue.js with SPA architecture
4. **Real-time Features**: WebSocket integration
5. **Advanced Caching**: Redis for session and data caching

### Migration Paths
- **Gradual Migration**: API endpoints alongside current templates
- **Hybrid Approach**: Keep current system, add modern frontend
- **Complete Rewrite**: New tech stack with data migration 