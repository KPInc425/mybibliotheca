#!/usr/bin/env python3
"""
Test script to verify API is working after to_dict fix
"""

import requests
import json

BASE_URL = 'http://localhost:5054'

def test_api_endpoints():
    """Test various API endpoints"""
    
    print("🧪 Testing BookOracle API endpoints...")
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        if response.status_code == 200:
            print("✅ OpenAPI spec accessible")
        else:
            print(f"❌ OpenAPI spec failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Server not accessible: {e}")
        return
    
    # Test 2: Check books endpoint (should redirect to login)
    try:
        response = requests.get(f"{BASE_URL}/api/books", allow_redirects=False)
        if response.status_code in [302, 401]:
            print("✅ Books endpoint correctly requires authentication")
        else:
            print(f"⚠️ Books endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Books endpoint test failed: {e}")
    
    # Test 3: Check user profile endpoint
    try:
        response = requests.get(f"{BASE_URL}/api/user/profile", allow_redirects=False)
        if response.status_code in [302, 401]:
            print("✅ User profile endpoint correctly requires authentication")
        else:
            print(f"⚠️ User profile endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"❌ User profile endpoint test failed: {e}")
    
    # Test 4: Check frontend proxy
    try:
        response = requests.get("http://localhost:3001/api/openapi.json")
        if response.status_code == 200:
            print("✅ Frontend proxy working correctly")
        else:
            print(f"❌ Frontend proxy failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend proxy test failed: {e}")
    
    print("\n🎉 API tests completed!")
    print("\n📝 Next steps:")
    print("1. Open http://localhost:3001 in your browser")
    print("2. Register a new user or login with existing credentials")
    print("3. Test the complete user flow")

if __name__ == "__main__":
    test_api_endpoints()
