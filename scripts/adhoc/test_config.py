#!/usr/bin/env python3
"""
Test Flask-Mail configuration
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app

def test_config():
    """Test Flask-Mail configuration"""
    app = create_app()
    
    with app.app_context():
        print("=== Flask-Mail Configuration ===")
        print(f"MAIL_SERVER: {app.config.get('MAIL_SERVER')}")
        print(f"MAIL_PORT: {app.config.get('MAIL_PORT')}")
        print(f"MAIL_USE_TLS: {app.config.get('MAIL_USE_TLS')}")
        print(f"MAIL_USE_SSL: {app.config.get('MAIL_USE_SSL')}")
        print(f"MAIL_USERNAME: {app.config.get('MAIL_USERNAME')}")
        print(f"MAIL_DEFAULT_SENDER: {app.config.get('MAIL_DEFAULT_SENDER')}")
        
        # Check if SSL is properly configured
        if app.config.get('MAIL_USE_SSL'):
            print("✅ MAIL_USE_SSL is properly configured")
        else:
            print("❌ MAIL_USE_SSL is not configured")
        
        # Check if we have all required settings
        required = ['MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_DEFAULT_SENDER']
        missing = [key for key in required if not app.config.get(key)]
        
        if missing:
            print(f"❌ Missing required settings: {missing}")
        else:
            print("✅ All required settings are present")

if __name__ == '__main__':
    test_config()
