# Bibliotheca Documentation

A personal library management system built with Flask for tracking your reading journey.

## Table of Contents

- Overview
- Features
- Installation
- Configuration
- User Guide
- Admin Guide
- API Reference
- Database Schema
- Security Features
- Troubleshooting

## Overview

Bibliotheca is a web-based personal library management system that helps you:
- Track your book collection
- Monitor reading progress
- Organize books by categories and status
- Generate monthly reading summaries
- Share your reading activity with others
- Import books via ISBN scanning or bulk CSV import

## Features

### Core Features
- **Book Management**: Add, edit, and organize your personal library
- **Reading Tracking**: Log reading sessions and track progress
- **Status Management**: Mark books as "Want to Read", "Currently Reading", "Finished", or "Library Only"
- **Search & Filter**: Advanced filtering by category, publisher, language, and reading status
- **ISBN Integration**: Fetch book data automatically using ISBN lookup
- **Barcode Scanning**: Use your device camera to scan book barcodes
- **Cover Images**: Automatic cover image fetching or manual URL input

### Advanced Features
- **Monthly Wrap-ups**: Beautiful visual summaries of books completed each month
- **Reading Streaks**: Track consecutive days of reading activity
- **Community Features**: Share reading activity and view other users' libraries
- **Bulk Import**: Import multiple books via CSV file upload
- **Export Options**: Download your library data and database backups
- **Privacy Controls**: Granular privacy settings for sharing preferences

### Administrative Features
- **User Management**: Admin dashboard for managing users and permissions
- **Security Features**: Account lockout protection, password policies, forced password changes
- **System Monitoring**: View system statistics and user activity
- **Database Management**: Automatic migrations and data integrity checks

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)
- SQLite (included with Python)

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pickles4evaaaa/bibliotheca.git
   cd bibliotheca
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables** (optional):
   ```bash
   export ADMIN_USERNAME=admin
   export ADMIN_PASSWORD=your_secure_password
   export ADMIN_EMAIL=admin@yourdomain.com
   ```

5. **Run the application**:
   ```bash
   gunicorn -w 1 -b 0.0.0.0:5054 --timeout 300 run:app
   ```

6. **Access the application**:
   Open your browser to `http://localhost:5054`

### Default Admin Account
If no users exist, Bibliotheca will automatically create a default admin account:
- **Username**: `admin`
- **Email**: `admin@bibliotheca.local`
- **Password**: `G7#xP@9zL!qR2` (must be changed on first login)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_PASSWORD` | Default admin password | `G7#xP@9zL!qR2` |
| `ADMIN_EMAIL` | Default admin email | `admin@bibliotheca.local` |
| `SECRET_KEY` | Flask secret key for sessions | Auto-generated |
| `DATABASE_URL` | Database connection string | `sqlite:///app.db` |

### Password Requirements
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character
- Cannot be a commonly used password

## User Guide

### Getting Started

1. **Create an Account**: If you're not an admin, ask an administrator to create an account for you
2. **Change Default Password**: If using a default account, you'll be forced to change your password on first login
3. **Add Your First Book**: Use the "Add Book" button to start building your library

### Adding Books

#### Method 1: ISBN Lookup
1. Click "Add Book" in the navigation
2. Enter or scan the ISBN
3. Click "Fetch Book Data" to automatically populate book information
4. Review and adjust the details
5. Set reading status and dates
6. Click "Add Book"

#### Method 2: Manual Entry
1. Click "Add Book"
2. Manually enter all book details
3. Set reading status and dates
4. Click "Add Book"

#### Method 3: Barcode Scanning
1. Click "Add Book"
2. Click "Scan Barcode"
3. Allow camera access
4. Point camera at the book's barcode
5. The ISBN will be automatically filled when detected

### Managing Your Library

#### Viewing Books
- **Library View**: Grid view of all your books with filtering options
- **List View**: Detailed list view from the home page
- **Book Details**: Click any book to view full details and reading logs

#### Filtering and Search
- **Search**: Find books by title, author, or description
- **Category Filter**: Filter by book categories
- **Publisher Filter**: Filter by publisher
- **Language Filter**: Filter by language
- **Status Filters**: Filter by reading status

#### Reading Status Options
- **Currently Reading**: Books you're actively reading
- **Want to Read**: Books on your reading list
- **Finished**: Completed books
- **Library Only**: Books you own but don't plan to read

### Tracking Reading Progress

#### Reading Logs
1. Go to any book's detail page
2. Use the "Log Reading" form to record reading sessions
3. Select the date you read
4. Click "Log Today" to add the entry

#### Reading Streaks
- View your current reading streak on the home page
- Streaks are calculated based on consecutive days with reading log entries

### Monthly Wrap-ups

Generate beautiful summaries of your monthly reading:
1. Click "Month Wrap Up" in the navigation
2. Select the month and year
3. View your reading statistics and book covers
4. Share your achievements with others

### Privacy Settings

Control what information you share:
1. Go to your profile menu
2. Select "Privacy Settings"
3. Configure:
   - **Share Current Reading**: Allow others to see what you're currently reading
   - **Share Reading Activity**: Share your reading statistics and timeline
   - **Share Library**: Make your book library visible to other users

### Community Features

#### Community Activity
- View recent activity from all users
- See what others are reading
- Browse popular books and categories

#### User Profiles
- View other users' reading profiles (if they've enabled sharing)
- See their reading statistics and recent books
- Get book recommendations from the community

## Admin Guide

### Accessing Admin Features

Admin users have access to additional management features:
1. Click your username in the navigation
2. Select "Admin Dashboard"
3. Access user management, system settings, and analytics

### User Management

#### Creating Users
1. Go to Admin Dashboard → "Manage Users"
2. Click "Create New User"
3. Fill in user details including secure password
4. Set admin privileges if needed
5. Click "Create User"

#### Managing Existing Users
- **View User Details**: Click on any user to see detailed information
- **Reset Passwords**: Force password resets for users
- **Lock/Unlock Accounts**: Manage account security
- **Toggle Admin Status**: Grant or revoke admin privileges
- **Activate/Deactivate**: Enable or disable user accounts
- **Delete Users**: Remove users and all their data

#### Security Management
- **Account Lockouts**: Accounts automatically lock after 5 failed login attempts
- **Failed Login Monitoring**: Track and review failed login attempts
- **Password Policy Enforcement**: Ensure all users meet password requirements
- **Forced Password Changes**: Require users to change default or compromised passwords

### System Settings

#### Configuration Options
- **User Registration**: Enable/disable new user registrations
- **Public Library**: Allow public access to book library
- **Community Features**: Enable/disable community activity sharing

#### Database Management
- **Automatic Migrations**: Database schema updates happen automatically
- **Data Integrity Checks**: Regular validation of data consistency
- **Backup Recommendations**: Download database backups regularly

### Monitoring and Analytics

#### User Activity
- View total users, active users, and recent registrations
- Monitor reading activity and popular books
- Track system usage patterns

#### Security Monitoring
- Review failed login attempts
- Monitor locked accounts
- Track admin actions and changes

## API Reference

### Book Management Endpoints

#### Add Book
```http
POST /add_book
Content-Type: application/x-www-form-urlencoded

isbn=9781234567890&title=Book+Title&author=Author+Name
```

#### Update Book Status
```http
POST /book/<uid>/update_status
Content-Type: application/x-www-form-urlencoded

currently_reading=on&finished=off
```

#### Log Reading Session
```http
POST /book/<uid>/log_reading
Content-Type: application/x-www-form-urlencoded

log_date=2023-12-01
```

### User Management Endpoints (Admin Only)

#### Create User
```http
POST /admin/users/create
Content-Type: application/x-www-form-urlencoded

username=newuser&email=user@example.com&password=SecurePass123!
```

#### Toggle User Status
```http
POST /admin/users/<user_id>/toggle_active
```

### Data Export Endpoints

#### Download Database
```http
GET /download_db
```

#### Export User Data
```http
GET /export_library
```

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    password_must_change BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    last_login DATETIME,
    created_at DATETIME
);
```

#### Books Table
```sql
CREATE TABLE book (
    id INTEGER PRIMARY KEY,
    uid VARCHAR(36) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(200),
    isbn VARCHAR(20),
    description TEXT,
    published_date VARCHAR(50),
    publisher VARCHAR(200),
    page_count INTEGER,
    language VARCHAR(50),
    categories TEXT,
    average_rating FLOAT,
    rating_count INTEGER,
    cover_url TEXT,
    start_date DATE,
    finish_date DATE,
    want_to_read BOOLEAN DEFAULT FALSE,
    library_only BOOLEAN DEFAULT FALSE,
    created_at DATETIME,
    user_id INTEGER REFERENCES user(id)
);
```

#### Reading Logs Table
```sql
CREATE TABLE reading_log (
    id INTEGER PRIMARY KEY,
    date DATE NOT NULL,
    pages_read INTEGER,
    notes TEXT,
    created_at DATETIME,
    book_id INTEGER REFERENCES book(id),
    user_id INTEGER REFERENCES user(id)
);
```

### Privacy Settings
```sql
-- Added to user table
ALTER TABLE user ADD COLUMN share_current_reading BOOLEAN DEFAULT TRUE;
ALTER TABLE user ADD COLUMN share_reading_activity BOOLEAN DEFAULT TRUE;
ALTER TABLE user ADD COLUMN share_library BOOLEAN DEFAULT FALSE;
```

## Security Features

### Authentication & Authorization
- **Secure Password Hashing**: Uses Werkzeug's PBKDF2 with salt
- **Session Management**: Flask-Login for secure session handling
- **CSRF Protection**: Built-in CSRF token validation
- **Role-Based Access**: Admin and regular user permissions

### Account Security
- **Account Lockout**: Automatic lockout after 5 failed login attempts
- **Password Policies**: Enforced strong password requirements
- **Forced Password Changes**: Require password updates for security
- **Login Monitoring**: Track and log all authentication attempts

### Data Protection
- **Input Validation**: Comprehensive form validation and sanitization
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: Template auto-escaping and validation
- **Privacy Controls**: Granular sharing preferences

### Administrative Security
- **Admin-Only Routes**: Protected administrative functions
- **Audit Logging**: Track administrative actions
- **User Management**: Secure user creation and modification
- **System Monitoring**: Security event tracking

## Troubleshooting

### Common Issues

#### Installation Problems

**Issue**: `pip install` fails with permission errors
**Solution**: Use a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Issue**: Pillow installation fails
**Solution**: Update to compatible version:
```bash
pip install Pillow>=10.4.0
```

#### Login Issues

**Issue**: Account locked after failed login attempts
**Solution**: Admin can unlock accounts via Admin Dashboard → User Management

**Issue**: Forced to change password on every login
**Solution**: Ensure `password_must_change` flag is cleared after successful password change

#### Database Issues

**Issue**: `jinja2.exceptions.UndefinedError: 'None' has no attribute 'strftime'`
**Solution**: Update templates to handle None values:
```html
{{ book.created_at.strftime('%m/%d/%Y') if book.created_at else 'Unknown' }}
```

**Issue**: Database migration errors
**Solution**: Check logs and ensure proper database permissions

#### Performance Issues

**Issue**: Slow page loading with large libraries
**Solution**: 
- Implement pagination for large book collections
- Optimize database queries
- Consider database indexing

### Debug Mode

Enable debug mode for development:
```python
# In run.py or app configuration
app.debug = True
```

### Logging

Check application logs for detailed error information:
- Database connection issues
- Authentication failures
- Template rendering errors
- API request failures

### Backup and Recovery

#### Database Backup
```bash
# Manual backup
cp app.db app_backup_$(date +%Y%m%d).db

# Using the built-in download feature
curl -O http://localhost:5054/download_db
```

#### Data Recovery
1. Stop the application
2. Replace corrupted database with backup
3. Restart the application
4. Verify data integrity

### Getting Help

1. **Check the logs**: Look for error messages in the console output
2. **Verify configuration**: Ensure environment variables are set correctly
3. **Test connectivity**: Verify database and network connectivity
4. **Review permissions**: Check file and directory permissions
5. **Update dependencies**: Ensure all packages are up to date

For additional support, check the [GitHub repository](https://github.com/pickles4evaaaa/bibliotheca) for issues and updates.

---

**Bibliotheca v0.1.0** | [GitHub Repository](https://github.com/pickles4evaaaa/bibliotheca)

*It is highly recommended to backup your database regularly.*