#!/usr/bin/env python3
"""
Production Debug Script - Run this on your production server
"""

import os
import sys
import traceback
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from app.models import db, User, normalize_email
    from config import Config
except ImportError as e:
    print(f"❌ Error importing application modules: {e}")
    print("🔧 Make sure you're running this from the BookOracle directory")
    sys.exit(1)

def production_debug():
    """Comprehensive production debugging"""
    print("🔍 PRODUCTION SERVER DEBUG")
    print("=" * 50)
    print(f"Timestamp: {datetime.now()}")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    
    try:
        app = create_app()
        print("✅ Flask app created successfully")
        
        with app.app_context():
            print("\n📊 DATABASE CONNECTION TEST")
            print("-" * 30)
            
            # Test database connection
            try:
                db.engine.execute("SELECT 1")
                print("✅ Database connection successful")
            except Exception as e:
                print(f"❌ Database connection failed: {e}")
                return
            
            # Check database path
            db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')
            print(f"Database URI: {db_uri}")
            
            if 'sqlite' in str(db_uri):
                db_file = db_uri.replace('sqlite:///', '')
                if os.path.exists(db_file):
                    print(f"✅ Database file exists: {db_file}")
                    print(f"   Size: {os.path.getsize(db_file)} bytes")
                    print(f"   Modified: {datetime.fromtimestamp(os.path.getmtime(db_file))}")
                else:
                    print(f"❌ Database file missing: {db_file}")
                    return
            
            print("\n👥 USER DATABASE ANALYSIS")
            print("-" * 30)
            
            # Count total users
            total_users = User.query.count()
            print(f"Total users in database: {total_users}")
            
            if total_users == 0:
                print("❌ No users found in database!")
                return
            
            # List all users
            print("\nAll users in database:")
            all_users = User.query.all()
            for user in all_users:
                print(f"  ID: {user.id}, Username: '{user.username}', Email: '{user.email}'")
            
            print("\n🔍 EMAIL LOOKUP TESTING")
            print("-" * 30)
            
            # Test specific email
            test_email = "KPInc425@gmail.com"
            print(f"Testing email: '{test_email}'")
            
            # Test normalization function
            try:
                normalized = normalize_email(test_email)
                print(f"Normalized email: '{normalized}'")
            except Exception as e:
                print(f"❌ Normalization failed: {e}")
                traceback.print_exc()
            
            # Test all lookup methods
            print("\nTesting lookup methods:")
            
            # Method 1: Direct query with original email
            try:
                user1 = User.query.filter_by(email=test_email).first()
                print(f"1. Direct query '{test_email}': {'✅ Found' if user1 else '❌ Not found'}")
                if user1:
                    print(f"   User: {user1.username} (ID: {user1.id})")
            except Exception as e:
                print(f"1. Direct query failed: {e}")
            
            # Method 2: Direct query with normalized email
            try:
                user2 = User.query.filter_by(email=normalized).first()
                print(f"2. Direct query '{normalized}': {'✅ Found' if user2 else '❌ Not found'}")
                if user2:
                    print(f"   User: {user2.username} (ID: {user2.id})")
            except Exception as e:
                print(f"2. Direct query failed: {e}")
            
            # Method 3: ILIKE query
            try:
                user3 = User.query.filter(User.email.ilike(test_email)).first()
                print(f"3. ILIKE query '{test_email}': {'✅ Found' if user3 else '❌ Not found'}")
                if user3:
                    print(f"   User: {user3.username} (ID: {user3.id})")
            except Exception as e:
                print(f"3. ILIKE query failed: {e}")
            
            # Method 4: Our find_by_email method
            try:
                user4 = User.find_by_email(test_email)
                print(f"4. find_by_email method: {'✅ Found' if user4 else '❌ Not found'}")
                if user4:
                    print(f"   User: {user4.username} (ID: {user4.id})")
            except Exception as e:
                print(f"4. find_by_email method failed: {e}")
                traceback.print_exc()
            
            # Method 5: find_by_email_or_username method
            try:
                user5 = User.find_by_email_or_username(test_email)
                print(f"5. find_by_email_or_username method: {'✅ Found' if user5 else '❌ Not found'}")
                if user5:
                    print(f"   User: {user5.username} (ID: {user5.id})")
            except Exception as e:
                print(f"5. find_by_email_or_username method failed: {e}")
                traceback.print_exc()
            
            print("\n🔧 CODE VERSION CHECK")
            print("-" * 25)
            
            # Check if normalize_email function exists
            try:
                from app.models import normalize_email
                print("✅ normalize_email function imported successfully")
                
                # Test the function
                test_result = normalize_email("TEST@EXAMPLE.COM")
                print(f"Test normalization: 'TEST@EXAMPLE.COM' -> '{test_result}'")
            except Exception as e:
                print(f"❌ normalize_email function issue: {e}")
                traceback.print_exc()
            
            # Check if User.find_by_email method exists
            try:
                method = getattr(User, 'find_by_email', None)
                if method:
                    print("✅ User.find_by_email method exists")
                else:
                    print("❌ User.find_by_email method NOT found!")
            except Exception as e:
                print(f"❌ Error checking User.find_by_email: {e}")
            
            # Check if User.find_by_email_or_username method exists
            try:
                method = getattr(User, 'find_by_email_or_username', None)
                if method:
                    print("✅ User.find_by_email_or_username method exists")
                else:
                    print("❌ User.find_by_email_or_username method NOT found!")
            except Exception as e:
                print(f"❌ Error checking User.find_by_email_or_username: {e}")
            
            print("\n📁 FILE SYSTEM CHECK")
            print("-" * 20)
            
            # Check if key files exist
            key_files = [
                'app/models.py',
                'app/api.py',
                'app/auth.py',
                'app/forms.py',
                'app/services/user_service.py'
            ]
            
            for file_path in key_files:
                if os.path.exists(file_path):
                    print(f"✅ {file_path} exists")
                else:
                    print(f"❌ {file_path} missing!")
            
            print("\n🎯 RECOMMENDATIONS")
            print("-" * 20)
            
            if user4:  # find_by_email worked
                print("✅ Email lookup is working correctly")
                print("💡 The issue might be in the API endpoint or request handling")
            else:
                print("❌ Email lookup is not working")
                print("💡 Check if the code changes were properly deployed")
                print("💡 Verify the database contains the expected data")
                print("💡 Check for any import or module loading issues")
    
    except Exception as e:
        print(f"❌ Critical error during debugging: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    production_debug()
