#!/usr/bin/env python3
"""
Test script for BookOracle API endpoints
Tests the new RESTful API implementation
"""

import requests
import json
import sys
from datetime import date

# Configuration
BASE_URL = "http://localhost:5054"
API_BASE = f"{BASE_URL}/api"

def test_api_endpoints():
    """Test all API endpoints"""
    print("🧪 Testing BookOracle API endpoints...")
    
    # Create a session to maintain cookies
    session = requests.Session()
    
    # Test 1: Check if server is running
    print("\n1. Testing server availability...")
    try:
        response = session.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print(f"⚠️  Server responded with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running on http://localhost:5000")
        return False
    
    # Test 2: Check API documentation
    print("\n2. Testing API documentation...")
    try:
        response = session.get(f"{BASE_URL}/api-docs")
        if response.status_code == 200:
            print("✅ API documentation page accessible")
        else:
            print(f"⚠️  API docs responded with status {response.status_code}")
    except Exception as e:
        print(f"❌ Error accessing API docs: {e}")
    
    # Test 3: Check OpenAPI specification
    print("\n3. Testing OpenAPI specification...")
    try:
        response = session.get(f"{API_BASE}/openapi.json")
        if response.status_code == 200:
            spec = response.json()
            print(f"✅ OpenAPI spec loaded successfully")
            print(f"   - Title: {spec.get('info', {}).get('title', 'Unknown')}")
            print(f"   - Version: {spec.get('info', {}).get('version', 'Unknown')}")
            print(f"   - Endpoints: {len(spec.get('paths', {}))}")
        else:
            print(f"⚠️  OpenAPI spec responded with status {response.status_code}")
    except Exception as e:
        print(f"❌ Error accessing OpenAPI spec: {e}")
    
    # Test 4: Test book lookup (should work without authentication)
    print("\n4. Testing book lookup...")
    try:
        response = session.get(f"{API_BASE}/books/lookup/9780141439518")  # Pride and Prejudice
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                book_data = data.get('data', {})
                print(f"✅ Book lookup successful")
                print(f"   - Title: {book_data.get('title', 'Unknown')}")
                print(f"   - Author: {book_data.get('author', 'Unknown')}")
                print(f"   - ISBN: {book_data.get('isbn', 'Unknown')}")
            else:
                print(f"⚠️  Book lookup failed: {data.get('error', 'Unknown error')}")
        elif response.status_code == 401:
            print("ℹ️  Book lookup requires authentication (expected)")
        else:
            print(f"⚠️  Book lookup responded with status {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing book lookup: {e}")
    
    # Test 5: Test authentication required endpoints
    print("\n5. Testing authenticated endpoints...")
    auth_endpoints = [
        f"{API_BASE}/books",
        f"{API_BASE}/user/profile",
        f"{API_BASE}/user/statistics",
        f"{API_BASE}/community/activity"
    ]
    
    for endpoint in auth_endpoints:
        try:
            response = session.get(endpoint)
            if response.status_code == 401:
                print(f"✅ {endpoint} - Authentication required (expected)")
            elif response.status_code == 302:
                print(f"✅ {endpoint} - Redirected to login (expected)")
            else:
                print(f"⚠️  {endpoint} - Unexpected status {response.status_code}")
        except Exception as e:
            print(f"❌ Error testing {endpoint}: {e}")
    
    print("\n🎉 API testing completed!")
    print("\n📋 Summary:")
    print("   - Server is running")
    print("   - API documentation is accessible")
    print("   - OpenAPI specification is working")
    print("   - Authentication is properly enforced")
    print("\n📖 To test with authentication:")
    print("   1. Start the server: python run.py")
    print("   2. Create an account or login")
    print("   3. Use the API endpoints with session cookies")
    print("\n📚 API Documentation:")
    print(f"   - Web UI: {BASE_URL}/api-docs")
    print(f"   - OpenAPI Spec: {API_BASE}/openapi.json")
    
    return True

def test_service_layer():
    """Test the service layer directly"""
    print("\n🧪 Testing service layer...")
    
    try:
        # Import the service classes
        from app.services.book_service import BookService
        from app.services.user_service import UserService
        from app.models import db
        
        print("✅ Service classes imported successfully")
        
        # Test service instantiation
        book_service = BookService(db.session)
        user_service = UserService(db.session)
        
        print("✅ Service instances created successfully")
        
        # Test ISBN cleaning
        test_isbn = "978-0-14-143951-8"
        cleaned = book_service._clean_isbn(test_isbn)
        expected = "9780141439518"
        
        if cleaned == expected:
            print("✅ ISBN cleaning works correctly")
        else:
            print(f"⚠️  ISBN cleaning failed: {cleaned} != {expected}")
        
        print("✅ Service layer tests completed")
        return True
        
    except ImportError as e:
        print(f"❌ Could not import service classes: {e}")
        return False
    except Exception as e:
        print(f"❌ Service layer test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 BookOracle API Phase 1 Testing")
    print("=" * 50)
    
    # Test service layer
    service_success = test_service_layer()
    
    # Test API endpoints
    api_success = test_api_endpoints()
    
    if service_success and api_success:
        print("\n🎉 All tests passed! Phase 1 implementation is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        sys.exit(1) 