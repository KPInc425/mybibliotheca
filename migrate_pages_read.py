#!/usr/bin/env python3
"""
Migration script to add pages_read field to ReadingLog table.
This script adds the pages_read column to existing ReadingLog records.
"""

import os
import sys
from app import create_app
from app.models import db

def migrate_pages_read():
    """Add pages_read field to ReadingLog table"""
    
    app = create_app()
    
    with app.app_context():
        try:
            # Get the database engine to check if the column exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('reading_log')]
            
            if 'pages_read' in columns:
                print("pages_read column already exists in reading_log table.")
                return True
            
            # Add the pages_read column using SQLAlchemy
            print("Adding pages_read column to reading_log table...")
            db.engine.execute("ALTER TABLE reading_log ADD COLUMN pages_read INTEGER")
            
            print("Successfully added pages_read column to reading_log table.")
            
            # Verify the column was added
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('reading_log')]
            if 'pages_read' in columns:
                print("Verification: pages_read column successfully added.")
                return True
            else:
                print("Error: pages_read column was not added properly.")
                return False
                
        except Exception as e:
            print(f"Error: {e}")
            return False

if __name__ == "__main__":
    print("Starting migration to add pages_read field to ReadingLog table...")
    
    if migrate_pages_read():
        print("Migration completed successfully!")
        sys.exit(0)
    else:
        print("Migration failed!")
        sys.exit(1) 