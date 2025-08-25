# BookOracle Migration System Documentation

## Overview

BookOracle uses an **automatic migration system** that runs during application startup to ensure the database schema is always up-to-date. This system eliminates the need for manual migration scripts and ensures consistent database state across all environments.

## Key Features

### ✅ Automatic Execution
- Migrations run automatically when the Flask application starts
- No manual intervention required
- Consistent across development, staging, and production environments

### ✅ Safety First
- **Automatic backups** created before any schema changes
- **Transaction-based** migrations with rollback capability
- **Idempotent** operations that can run multiple times safely

### ✅ Comprehensive Coverage
- Schema changes (new tables, columns)
- Data migrations (email normalization, data assignment)
- Security and privacy feature additions
- Multi-user system transitions

## Migration Flow

### 1. Application Startup
When `create_app()` is called in `app/__init__.py`:

```python
def create_app():
    app = Flask(__name__)
    # ... initialization code ...
    
    # DATABASE MIGRATION SECTION
    with app.app_context():
        # Migration logic runs here
```

### 2. Migration Detection
The system checks if migrations are needed:

```python
# Check if migrations are needed BEFORE running any queries
migrations_needed, migration_list = check_if_migrations_needed(inspector)

if migrations_needed:
    print("🔄 Creating database backup before migration...")
    backup_path = backup_database(db_path)
```

### 3. Migration Execution Order
Migrations run in this specific order:

1. **Database backup** (if needed)
2. **Schema creation** (if fresh database)
3. **Table additions** (user, invite_token, user_rating, etc.)
4. **Column additions** (security fields, privacy settings, etc.)
5. **Data migrations** (email normalization, orphaned data assignment)
6. **Verification** and completion

## Migration Functions

### Core Migration Functions

#### `check_if_migrations_needed(inspector)`
- Analyzes current database schema
- Compares against expected schema
- Returns list of required migrations
- Used to determine if backup is needed

#### `backup_database(db_path)`
- Creates timestamped backup: `books.db.backup_YYYYMMDD_HHMMSS`
- Stores in `data/backups/` directory
- Only runs when migrations are actually needed

#### `run_security_privacy_migration(inspector, db_engine)`
Adds security and privacy fields to user table:
- `failed_login_attempts` - Account lockout tracking
- `locked_until` - Temporary account lockout
- `last_login` - User activity tracking
- `share_current_reading` - Privacy setting
- `share_reading_activity` - Privacy setting
- `share_library` - Privacy setting
- `debug_enabled` - User-specific debug mode
- `invite_tokens_*` - Invite system fields
- `profile_picture` - User profile image
- `is_pro` - Pro subscription flag

#### `run_email_normalization_migration()`
- Normalizes all email addresses to lowercase
- Ensures consistent email storage
- Fixes case-sensitivity issues in authentication
- Runs after user table exists

#### `add_streak_offset_column(inspector, engine)`
- Adds `reading_streak_offset` to user table
- Used for reading streak calculations
- Allows manual streak adjustments

#### `assign_existing_books_to_admin()`
- Assigns orphaned books (without `user_id`) to admin users
- Part of multi-user system migration
- Only runs if admin users exist

### Schema Migration Functions

#### Table Creation
The system automatically creates missing tables:
- `user` - User authentication and profiles
- `invite_token` - Invitation system
- `user_rating` - Book rating system
- `shared_book_data` - Shared book information

#### Column Addition
Missing columns are added to existing tables:

**Book Table:**
- `user_id` - Multi-user support
- `description` - Book descriptions
- `published_date` - Publication date
- `page_count` - Number of pages
- `categories` - Book categories
- `publisher` - Publisher information
- `language` - Book language
- `average_rating` - Average rating
- `rating_count` - Number of ratings
- `created_at` - Creation timestamp
- `owned` - Ownership status
- `shared_book_id` - Shared book reference

**Reading Log Table:**
- `user_id` - Multi-user support
- `created_at` - Creation timestamp

## Migration Logs

### Successful Migration Example
```
🔄 Migrations needed: ['user_security_privacy: ['failed_login_attempts', 'locked_until']']
🔄 Creating database backup before migration...
✅ Database backup created: data/backups/books.db.backup_20250617_143022
📁 Backup saved to: data/backups/books.db.backup_20250617_143022
📚 Database already exists...
✅ Tables present, checking for migrations...
🔄 Adding security/privacy fields: ['failed_login_attempts', 'locked_until']
✅ Added failed_login_attempts to user table
✅ Added locked_until to user table
✅ Security/privacy migration completed.
🔄 Normalizing 1 email addresses...
  Normalizing user KPInc425: 'KPInc425@gmail.com' -> 'kpinc425@gmail.com'
✅ Successfully normalized 1 email addresses
🎉 Database migration completed successfully!
```

### No Migration Needed Example
```
✅ Database schema is up-to-date, no migrations needed
📚 Database already exists...
✅ Tables present, checking for migrations...
✅ Security/privacy fields already present.
✅ All email addresses are already normalized
🎉 Database migration completed successfully!
```

## Adding New Migrations

### Step 1: Create Migration Function
Add your migration function to `app/__init__.py`:

```python
def run_your_migration():
    """Description of what this migration does"""
    try:
        # Import required models
        from .models import YourModel
        
        # Check if migration is needed
        # Perform migration logic
        # Update database
        
        print("✅ Your migration completed successfully")
        
    except Exception as e:
        print(f"⚠️  Your migration failed: {e}")
        db.session.rollback()
```

### Step 2: Add to Migration Flow
Add your migration call in the main migration section:

```python
# Run your migration
if 'your_table' in inspector.get_table_names():
    try:
        run_your_migration()
    except Exception as e:
        print(f"⚠️  Error during your migration: {e}")
```

### Step 3: Update Documentation
- Add your migration to this documentation
- Update `MIGRATION.md` if needed
- Document any new fields or tables

## Best Practices

### ✅ Do's
- **Make migrations idempotent** - Can run multiple times safely
- **Use transactions** - Wrap changes in try/catch with rollback
- **Provide clear logging** - Use emojis and descriptive messages
- **Check prerequisites** - Ensure required tables/columns exist
- **Handle errors gracefully** - Don't crash the application

### ❌ Don'ts
- **Don't assume data exists** - Always check before operations
- **Don't skip error handling** - Always catch and log exceptions
- **Don't make irreversible changes** - Always provide rollback capability
- **Don't block startup** - Keep migrations fast and non-blocking

## Troubleshooting

### Common Issues

#### Migration Fails to Start
- Check database file permissions
- Ensure `data/` directory exists
- Verify SQLite is available

#### Backup Creation Fails
- Check disk space
- Verify write permissions to data directory
- Database may be locked by another process

#### Migration Errors
- Check application logs for specific error messages
- Verify database backup exists before debugging
- Ensure all required models are imported correctly

### Recovery Procedures

#### Restore from Backup
```bash
# Stop the application
# Navigate to backups directory
cd data/backups/

# Find the most recent backup
ls -la books.db.backup_*

# Restore the backup
cp books.db.backup_YYYYMMDD_HHMMSS ../books.db

# Restart the application
```

#### Manual Migration Check
```bash
# Run the application in debug mode
# Check the migration logs
# Look for specific error messages
```

## Environment-Specific Considerations

### Development
- Migrations run on every application start
- Debug logging provides detailed information
- Fast iteration and testing

### Production
- Migrations run on container startup
- Automatic backups ensure data safety
- Minimal downtime during updates

### Docker
- Migrations run inside container
- Database file mounted as volume
- Consistent across deployments

## Migration History

### v2.0 - Multi-User System
- Added user authentication tables
- Migrated existing data to admin users
- Added security and privacy fields

### v2.1 - Email Normalization
- Normalized all email addresses to lowercase
- Fixed case-sensitivity issues in authentication
- Improved forgot password flow reliability

### Future Migrations
- Document planned migrations here
- Include rationale and impact
- Plan for backward compatibility

## Validation

### Migration Validation Script
Run `python validate_migration.py` to check:
- ✅ Migration functions are present
- ✅ Configuration is correct
- ✅ Documentation exists
- ✅ Manual scripts are deprecated

### Testing Migrations
1. **Create test database** with old schema
2. **Run application** and observe migration logs
3. **Verify data integrity** after migration
4. **Test application functionality** with new schema

## Conclusion

The automatic migration system ensures that BookOracle databases remain consistent and up-to-date across all environments. By following the established patterns and best practices, new migrations can be added safely and reliably.

For questions or issues with the migration system, refer to:
- Application logs for detailed error messages
- This documentation for implementation details
- `MIGRATION.md` for user-facing migration information
