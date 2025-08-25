#!/usr/bin/env python3
"""
Test script to check email normalization migration
"""

import os
import sys

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from app.models import db, User, normalize_email
    from config import Config
except ImportError as e:
    print(f"❌ Error importing application modules: {e}")
    sys.exit(1)

def test_email_migration():
    """Test the email normalization migration"""
    app = create_app()
    
    with app.app_context():
        print("🔍 Testing Email Normalization Migration")
        print("=" * 50)
        
        # Get all users
        users = User.query.all()
        print(f"📊 Found {len(users)} users in database")
        
        if not users:
            print("❌ No users found in database")
            return
        
        # Show current email states
        print("\n📋 Current email addresses:")
        print("-" * 30)
        for user in users:
            print(f"  ID: {user.id}, Username: '{user.username}', Email: '{user.email}'")
        
        # Check which emails need normalization
        emails_to_normalize = []
        for user in users:
            normalized = normalize_email(user.email)
            if user.email != normalized:
                emails_to_normalize.append((user, normalized))
        
        print(f"\n🔄 Emails that need normalization: {len(emails_to_normalize)}")
        if emails_to_normalize:
            for user, normalized in emails_to_normalize:
                print(f"  User {user.username}: '{user.email}' -> '{normalized}'")
        else:
            print("  ✅ All emails are already normalized")
        
        # Test the migration function
        print(f"\n🧪 Testing run_email_normalization_migration() function...")
        try:
            # Import the migration function
            from app import run_email_normalization_migration
            run_email_normalization_migration()
            print("✅ Migration function completed successfully")
        except Exception as e:
            print(f"❌ Migration function failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Check results after migration
        print(f"\n📋 Email addresses after migration:")
        print("-" * 35)
        users_after = User.query.all()
        for user in users_after:
            print(f"  ID: {user.id}, Username: '{user.username}', Email: '{user.email}'")
        
        # Test find_by_email method
        print(f"\n🧪 Testing find_by_email method...")
        test_email = "KPInc425@gmail.com"
        user_found = User.find_by_email(test_email)
        if user_found:
            print(f"✅ find_by_email('{test_email}') found user: {user_found.username}")
        else:
            print(f"❌ find_by_email('{test_email}') did not find user")

if __name__ == "__main__":
    test_email_migration()
