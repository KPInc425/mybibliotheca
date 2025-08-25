#!/usr/bin/env python3
"""
Test Forgot Password Functionality

This script tests the forgot password functionality to ensure it works
correctly with normalized email addresses.
"""

import os
import sys
import requests
import json

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from app.models import db, User, normalize_email
except ImportError as e:
    print(f"❌ Error importing application modules: {e}")
    print("🔧 Make sure you're running this from the BookOracle directory")
    sys.exit(1)

def test_email_normalization():
    """Test email normalization function"""
    print("🧪 Testing email normalization...")
    
    test_cases = [
        ("KPInc425@gmail.com", "kpinc425@gmail.com"),
        ("TEST@EXAMPLE.COM", "test@example.com"),
        ("  user@domain.com  ", "user@domain.com"),
        ("MixedCase@Email.com", "mixedcase@email.com"),
        ("", ""),
        (None, None)
    ]
    
    for input_email, expected_output in test_cases:
        result = normalize_email(input_email)
        if result == expected_output:
            print(f"✅ '{input_email}' -> '{result}'")
        else:
            print(f"❌ '{input_email}' -> '{result}' (expected: '{expected_output}')")
            return False
    
    return True

def test_user_lookup():
    """Test user lookup with different email cases"""
    print("\n🧪 Testing user lookup with different email cases...")
    
    app = create_app()
    
    with app.app_context():
        # Test with the actual user email in different cases
        test_emails = [
            "kpinc425@gmail.com",  # Normalized
            "KPInc425@gmail.com",  # Original mixed case
            "KPINC425@GMAIL.COM",  # All uppercase
            "kpinc425@GMAIL.COM",  # Mixed case domain
            "  kpinc425@gmail.com  ",  # With whitespace
        ]
        
        for email in test_emails:
            user = User.find_by_email(email)
            if user:
                print(f"✅ Found user '{user.username}' with email '{email}'")
            else:
                print(f"❌ No user found with email '{email}'")
                return False
        
        # Test with non-existent email
        non_existent = User.find_by_email("nonexistent@example.com")
        if non_existent is None:
            print(f"✅ Correctly found no user for non-existent email")
        else:
            print(f"❌ Unexpectedly found user for non-existent email")
            return False
    
    return True

def test_forgot_password_api():
    """Test the forgot password API endpoint"""
    print("\n🧪 Testing forgot password API endpoint...")
    
    # Test with different email cases
    test_emails = [
        "kpinc425@gmail.com",  # Normalized
        "KPInc425@gmail.com",  # Original mixed case
        "KPINC425@GMAIL.COM",  # All uppercase
    ]
    
    base_url = "http://localhost:5000"
    
    for email in test_emails:
        try:
            response = requests.post(
                f"{base_url}/api/auth/forgot-password",
                json={"email": email},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print(f"✅ Forgot password request successful for '{email}'")
                else:
                    print(f"❌ Forgot password request failed for '{email}': {data.get('error')}")
                    return False
            else:
                print(f"❌ HTTP error {response.status_code} for '{email}'")
                return False
                
        except requests.exceptions.ConnectionError:
            print(f"⚠️  Could not connect to server. Make sure the application is running on {base_url}")
            print(f"   Skipping API test for '{email}'")
        except Exception as e:
            print(f"❌ Error testing forgot password for '{email}': {e}")
            return False
    
    return True

def main():
    """Run all tests"""
    print("🔐 BookOracle Forgot Password Test Suite")
    print("=" * 50)
    
    # Test 1: Email normalization
    if not test_email_normalization():
        print("\n❌ Email normalization test failed!")
        return False
    
    # Test 2: User lookup
    if not test_user_lookup():
        print("\n❌ User lookup test failed!")
        return False
    
    # Test 3: Forgot password API
    if not test_forgot_password_api():
        print("\n❌ Forgot password API test failed!")
        return False
    
    print("\n🎉 All tests passed! Email normalization is working correctly.")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
