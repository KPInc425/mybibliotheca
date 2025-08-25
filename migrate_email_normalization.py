#!/usr/bin/env python3
"""
Email Normalization Migration Script

This script normalizes all existing email addresses in the database to lowercase
to ensure consistent email handling throughout the application.

Usage:
    python migrate_email_normalization.py
"""

import os
import sys
from datetime import datetime, timezone

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from app.models import db, User, normalize_email
except ImportError as e:
    print(f"❌ Error importing application modules: {e}")
    print("🔧 Make sure you're running this from the BookOracle directory")
    sys.exit(1)

def migrate_email_normalization():
    """Migrate all existing email addresses to normalized format"""
    app = create_app()
    
    with app.app_context():
        print("🔄 Starting email normalization migration...")
        
        # Get all users
        users = User.query.all()
        print(f"📊 Found {len(users)} users in database")
        
        if not users:
            print("ℹ️  No users found in database. Migration complete.")
            return True
        
        # Track changes
        updated_count = 0
        unchanged_count = 0
        
        for user in users:
            original_email = user.email
            normalized_email = normalize_email(original_email)
            
            if original_email != normalized_email:
                print(f"🔄 Normalizing email for user '{user.username}':")
                print(f"   From: '{original_email}'")
                print(f"   To:   '{normalized_email}'")
                
                user.email = normalized_email
                updated_count += 1
            else:
                print(f"✅ Email already normalized for user '{user.username}': '{original_email}'")
                unchanged_count += 1
        
        # Commit changes if any were made
        if updated_count > 0:
            try:
                db.session.commit()
                print(f"\n✅ Migration completed successfully!")
                print(f"📊 Summary:")
                print(f"   • Updated emails: {updated_count}")
                print(f"   • Unchanged emails: {unchanged_count}")
                print(f"   • Total users: {len(users)}")
            except Exception as e:
                db.session.rollback()
                print(f"❌ Error committing changes: {e}")
                return False
        else:
            print(f"\n✅ No changes needed - all emails are already normalized!")
            print(f"📊 Summary:")
            print(f"   • Updated emails: 0")
            print(f"   • Unchanged emails: {unchanged_count}")
            print(f"   • Total users: {len(users)}")
        
        return True

def verify_migration():
    """Verify that all emails are properly normalized"""
    app = create_app()
    
    with app.app_context():
        print("\n🔍 Verifying email normalization...")
        
        users = User.query.all()
        non_normalized = []
        
        for user in users:
            if user.email != normalize_email(user.email):
                non_normalized.append(user)
        
        if non_normalized:
            print(f"❌ Found {len(non_normalized)} users with non-normalized emails:")
            for user in non_normalized:
                print(f"   • {user.username}: '{user.email}'")
            return False
        else:
            print(f"✅ All {len(users)} users have properly normalized emails!")
            return True

if __name__ == "__main__":
    print("📧 BookOracle Email Normalization Migration")
    print("=" * 50)
    
    # Run migration
    success = migrate_email_normalization()
    
    if success:
        # Verify migration
        verify_migration()
        print("\n🎉 Email normalization migration completed successfully!")
    else:
        print("\n❌ Email normalization migration failed!")
        sys.exit(1)
