-- Add debug_enabled column to user table
-- Run this SQL script on your production database

-- Check if column exists first
SELECT COUNT(*) FROM pragma_table_info('user') WHERE name='debug_enabled';

-- Add the column if it doesn't exist (SQLite syntax)
ALTER TABLE "user" ADD COLUMN debug_enabled BOOLEAN DEFAULT 0;

-- Update existing users to have debug_enabled = False
UPDATE "user" SET debug_enabled = 0 WHERE debug_enabled IS NULL;

-- Verify the column was added
SELECT COUNT(*) FROM pragma_table_info('user') WHERE name='debug_enabled'; 