#!/usr/bin/env python3
"""
Check environment variables for email configuration
"""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("=== Email Configuration Check ===")
print(f"MAIL_SERVER: {'✓ Set' if os.getenv('MAIL_SERVER') else '✗ Missing'}")
print(f"MAIL_PORT: {'✓ Set' if os.getenv('MAIL_PORT') else '✗ Missing'}")
print(f"MAIL_USERNAME: {'✓ Set' if os.getenv('MAIL_USERNAME') else '✗ Missing'}")
print(f"MAIL_PASSWORD: {'✓ Set' if os.getenv('MAIL_PASSWORD') else '✗ Missing'}")
print(f"MAIL_DEFAULT_SENDER: {'✓ Set' if os.getenv('MAIL_DEFAULT_SENDER') else '✗ Missing'}")
print(f"MAIL_USE_TLS: {'✓ Set' if os.getenv('MAIL_USE_TLS') else '✗ Missing'}")
print(f"MAIL_USE_SSL: {'✓ Set' if os.getenv('MAIL_USE_SSL') else '✗ Missing'}")

print("\n=== Current Values (non-sensitive) ===")
print(f"MAIL_SERVER: {os.getenv('MAIL_SERVER', 'Not set')}")
print(f"MAIL_PORT: {os.getenv('MAIL_PORT', 'Not set')}")
print(f"MAIL_USE_TLS: {os.getenv('MAIL_USE_TLS', 'Not set')}")
print(f"MAIL_USE_SSL: {os.getenv('MAIL_USE_SSL', 'Not set')}")
print(f"MAIL_DEFAULT_SENDER: {os.getenv('MAIL_DEFAULT_SENDER', 'Not set')}")

# Check if we have the minimum required variables
required_vars = ['MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_DEFAULT_SENDER']
missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    print(f"\n❌ Missing required variables: {', '.join(missing_vars)}")
    print("\nAdd these to your .env file:")
    for var in missing_vars:
        if var == 'MAIL_SERVER':
            print(f"{var}=smtp.gmail.com  # or your SMTP server")
        elif var == 'MAIL_PORT':
            print(f"{var}=587  # or 465 for SSL")
        elif var == 'MAIL_USERNAME':
            print(f"{var}=your-email@gmail.com")
        elif var == 'MAIL_PASSWORD':
            print(f"{var}=your-app-password")
        elif var == 'MAIL_DEFAULT_SENDER':
            print(f"{var}=your-email@gmail.com")
else:
    print("\n✅ All required email variables are set!")
    
    # Check TLS/SSL configuration
    use_tls = os.getenv('MAIL_USE_TLS', 'false').lower() == 'true'
    use_ssl = os.getenv('MAIL_USE_SSL', 'false').lower() == 'true'
    port = os.getenv('MAIL_PORT', '')
    
    if use_tls and use_ssl:
        print("⚠️  Warning: Both MAIL_USE_TLS and MAIL_USE_SSL are true. Use only one.")
    elif not use_tls and not use_ssl:
        print("⚠️  Warning: Neither MAIL_USE_TLS nor MAIL_USE_SSL is set to true.")
    
    if port == '587' and not use_tls:
        print("⚠️  Warning: Port 587 typically requires MAIL_USE_TLS=true")
    elif port == '465' and not use_ssl:
        print("⚠️  Warning: Port 465 typically requires MAIL_USE_SSL=true")
