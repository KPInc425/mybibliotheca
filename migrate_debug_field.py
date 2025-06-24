#!/usr/bin/env python3
"""
Migration script to add debug_enabled column to user table.
Run this script to update the production database schema.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

def migrate_debug_field():
    """Add debug_enabled column to user table if it doesn't exist."""
    
    # Get database path from environment or use default
    db_path = os.environ.get('DATABASE_PATH', 'data/mybibliotheca.db')
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Create database engine
    engine = create_engine(f'sqlite:///{db_path}')
    
    try:
        with engine.connect() as conn:
            # Check if debug_enabled column already exists
            result = conn.execute(text("PRAGMA table_info(user)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'debug_enabled' not in columns:
                print("Adding debug_enabled column to user table...")
                
                # Add the debug_enabled column with default value False
                conn.execute(text("ALTER TABLE user ADD COLUMN debug_enabled BOOLEAN DEFAULT 0"))
                conn.commit()
                
                print("✅ Successfully added debug_enabled column to user table")
                
                # Update existing users to have debug_enabled = False
                conn.execute(text("UPDATE user SET debug_enabled = 0 WHERE debug_enabled IS NULL"))
                conn.commit()
                
                print("✅ Updated existing users with default debug_enabled = False")
                
            else:
                print("✅ debug_enabled column already exists in user table")
                
    except OperationalError as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

if __name__ == '__main__':
    print("Starting debug_enabled field migration...")
    
    if migrate_debug_field():
        print("✅ Migration completed successfully!")
        sys.exit(0)
    else:
        print("❌ Migration failed!")
        sys.exit(1) 