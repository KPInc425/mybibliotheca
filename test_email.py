#!/usr/bin/env python3
"""
Test email functionality
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app, db
from app.models import User
from flask_mail import Mail, Message

def test_email_functionality():
    """Test email functionality"""
    app = create_app()
    
    with app.app_context():
        # Check if we have any users
        users = User.query.all()
        print(f"Found {len(users)} users in database")
        
        if not users:
            print("No users found. Creating a test user...")
            # Create a test user
            test_user = User(
                username='testuser',
                email='test@example.com',
                is_admin=True
            )
            test_user.set_password('testpassword123')
            db.session.add(test_user)
            db.session.commit()
            print("Created test user: testuser (password: testpassword123)")
            test_email = 'test@example.com'
        else:
            # Use the first user's email
            test_email = users[0].email
            print(f"Using existing user email: {test_email}")
        
        # Test Flask-Mail configuration
        print("\n=== Testing Flask-Mail Configuration ===")
        print(f"MAIL_SERVER: {app.config.get('MAIL_SERVER')}")
        print(f"MAIL_PORT: {app.config.get('MAIL_PORT')}")
        print(f"MAIL_USE_TLS: {app.config.get('MAIL_USE_TLS')}")
        print(f"MAIL_USE_SSL: {app.config.get('MAIL_USE_SSL')}")
        print(f"MAIL_USERNAME: {app.config.get('MAIL_USERNAME')}")
        print(f"MAIL_DEFAULT_SENDER: {app.config.get('MAIL_DEFAULT_SENDER')}")
        
        mail = Mail(app)
        
        try:
            # Test sending a simple email
            print("\nAttempting to send test email...")
            msg = Message(
                'Test Email from BookOracle',
                sender=app.config['MAIL_DEFAULT_SENDER'],
                recipients=[test_email]
            )
            msg.body = "This is a test email to verify email functionality is working."
            
            mail.send(msg)
            print("✅ Test email sent successfully!")
            
        except Exception as e:
            print(f"❌ Error sending test email: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_email_functionality()
