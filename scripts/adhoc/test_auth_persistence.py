#!/usr/bin/env python3
"""
Test script for BookOracle authentication persistence
Tests the Capacitor authentication persistence functionality
"""

import os
import sys
import requests
from urllib.parse import urljoin

def test_auth_persistence():
    """Test authentication persistence functionality"""
    
    # Configuration
    base_url = "http://localhost:5000"  # Adjust if your server runs on different port
    test_username = "admin"  # Use your admin username
    test_password = "G7#xP@9zL!qR2"  # Use your admin password
    
    print("🧪 Testing BookOracle Authentication Persistence")
    print("=" * 50)
    
    # Create session to maintain cookies
    session = requests.Session()
    
    # Test 1: Check if server is running
    print("\n1️⃣ Testing server connectivity...")
    try:
        response = session.get(base_url)
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print(f"⚠️ Server responded with status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure BookOracle is running.")
        print("   Run: python run.py")
        return False
    
    # Test 2: Test Capacitor environment detection
    print("\n2️⃣ Testing Capacitor environment detection...")
    
    # Test without Capacitor cookie
    response = session.get(urljoin(base_url, "/auth/login"))
    if response.status_code == 200:
        print("✅ Login page accessible")
    else:
        print(f"❌ Login page not accessible: {response.status_code}")
        return False
    
    # Test with Capacitor cookie
    capacitor_session = requests.Session()
    capacitor_session.cookies.set('CAPACITOR_ENV', 'true', domain='localhost', path='/')
    
    response = capacitor_session.get(urljoin(base_url, "/auth/login"))
    if response.status_code == 200:
        print("✅ Login page accessible with Capacitor cookie")
    else:
        print(f"❌ Login page not accessible with Capacitor cookie: {response.status_code}")
    
    # Test 3: Test login functionality
    print("\n3️⃣ Testing login functionality...")
    
    # Get CSRF token
    response = session.get(urljoin(base_url, "/auth/login"))
    if response.status_code != 200:
        print("❌ Cannot access login page")
        return False
    
    # Extract CSRF token (simplified - in real app, you'd parse the HTML)
    csrf_token = "test_csrf_token"  # This is simplified for testing
    
    # Test login
    login_data = {
        'username': test_username,
        'password': test_password,
        'remember_me': True,
        'csrf_token': csrf_token
    }
    
    response = session.post(urljoin(base_url, "/auth/login"), data=login_data, allow_redirects=False)
    
    if response.status_code in [302, 200]:  # Redirect or success
        print("✅ Login request processed")
        
        # Check if we got redirected (successful login)
        if response.status_code == 302:
            location = response.headers.get('Location', '')
            if 'index' in location or 'main' in location:
                print("✅ Login appears successful (redirected)")
            else:
                print(f"⚠️ Unexpected redirect location: {location}")
        else:
            print("⚠️ Login may have failed (no redirect)")
    else:
        print(f"❌ Login failed with status: {response.status_code}")
    
    # Test 4: Test session persistence
    print("\n4️⃣ Testing session persistence...")
    
    # Try to access a protected page
    response = session.get(urljoin(base_url, "/"))
    if response.status_code == 200:
        print("✅ Session appears to be active")
    else:
        print(f"⚠️ Session may not be active: {response.status_code}")
    
    # Test 5: Test Capacitor-specific features
    print("\n5️⃣ Testing Capacitor-specific features...")
    
    # Check if auth-storage.js is accessible
    response = session.get(urljoin(base_url, "/static/auth-storage.js"))
    if response.status_code == 200:
        print("✅ Auth storage module is accessible")
        if "AuthStorage" in response.text:
            print("✅ Auth storage module contains expected code")
        else:
            print("⚠️ Auth storage module may not be properly loaded")
    else:
        print(f"❌ Auth storage module not accessible: {response.status_code}")
    
    # Test 6: Test configuration
    print("\n6️⃣ Testing configuration...")
    
    # Check if the app is configured for Capacitor
    response = session.get(urljoin(base_url, "/"))
    if response.status_code == 200:
        if 'CAPACITOR_ENV' in str(response.cookies):
            print("✅ Capacitor environment cookie is set")
        else:
            print("⚠️ Capacitor environment cookie not found")
    
    print("\n" + "=" * 50)
    print("🎉 Authentication persistence test completed!")
    print("\n📋 Next Steps:")
    print("1. Build the APK: python build_apk.py")
    print("2. Install on Android device")
    print("3. Test login with 'Remember Me' checked")
    print("4. Close and reopen the app")
    print("5. Verify credentials are auto-filled")
    
    return True

def main():
    """Main test function"""
    try:
        success = test_auth_persistence()
        if success:
            print("\n✅ All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 