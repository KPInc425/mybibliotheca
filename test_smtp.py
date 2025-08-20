#!/usr/bin/env python3
"""
Simple SMTP connection test
"""
import os
import smtplib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_smtp_connection():
    """Test SMTP connection directly"""
    server = os.getenv('MAIL_SERVER')
    port = int(os.getenv('MAIL_PORT', 465))
    username = os.getenv('MAIL_USERNAME')
    password = os.getenv('MAIL_PASSWORD')
    use_ssl = os.getenv('MAIL_USE_SSL', 'false').lower() == 'true'
    use_tls = os.getenv('MAIL_USE_TLS', 'false').lower() == 'true'
    
    print(f"Testing SMTP connection to {server}:{port}")
    print(f"Username: {username}")
    print(f"Use SSL: {use_ssl}")
    print(f"Use TLS: {use_tls}")
    
    try:
        if use_ssl:
            print("Connecting with SSL...")
            smtp = smtplib.SMTP_SSL(server, port, timeout=10)
        else:
            print("Connecting without SSL...")
            smtp = smtplib.SMTP(server, port, timeout=10)
            if use_tls:
                print("Starting TLS...")
                smtp.starttls()
        
        print("Logging in...")
        smtp.login(username, password)
        print("✅ SMTP connection successful!")
        
        # Test sending a simple email
        sender = os.getenv('MAIL_DEFAULT_SENDER')
        recipient = 'test@example.com'
        
        print(f"Sending test email from {sender} to {recipient}...")
        message = f"""From: {sender}
To: {recipient}
Subject: SMTP Test

This is a test email sent via direct SMTP connection.
"""
        
        smtp.sendmail(sender, [recipient], message)
        print("✅ Test email sent successfully!")
        
        smtp.quit()
        
    except Exception as e:
        print(f"❌ SMTP connection failed: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_smtp_connection()
