#!/bin/bash

# BookOracle Backup Script for Ubuntu Server
# This script creates daily backups of the BookOracle database and data

# Configuration
DATA_DIR="../data/bookoracle"
BACKUP_DIR="../backups/bookoracle"
LOG_FILE="../logs/bookoracle_backup.log"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
set -e

# Create necessary directories
log "Creating backup directories..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Check if data directory exists
if [ ! -d "$DATA_DIR" ]; then
    log "${RED}ERROR: Data directory $DATA_DIR does not exist${NC}"
    exit 1
fi

# Check if database file exists
if [ ! -f "$DATA_DIR/books.db" ]; then
    log "${YELLOW}WARNING: Database file $DATA_DIR/books.db not found${NC}"
    log "This might be normal if BookOracle hasn't been started yet"
fi

# Create backup
log "Starting BookOracle backup..."
BACKUP_FILE="$BACKUP_DIR/bookoracle_backup_$DATE.tar.gz"

# Create tar backup of entire data directory
if tar -czf "$BACKUP_FILE" -C "$DATA_DIR" .; then
    log "${GREEN}✓ Backup created successfully: $BACKUP_FILE${NC}"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
else
    log "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Clean up old backups
log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "bookoracle_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "bookoracle_backup_*.tar.gz" | wc -l)
log "Remaining backups: $REMAINING_BACKUPS"

# Create a symlink to the latest backup for easy access
LATEST_BACKUP="$BACKUP_DIR/latest_backup"
if [ -L "$LATEST_BACKUP" ]; then
    rm "$LATEST_BACKUP"
fi
ln -s "$BACKUP_FILE" "$LATEST_BACKUP"
log "Latest backup symlink updated"

# Optional: Create a simple database-only backup
if [ -f "$DATA_DIR/books.db" ]; then
    DB_BACKUP="$BACKUP_DIR/books_$DATE.db"
    cp "$DATA_DIR/books.db" "$DB_BACKUP"
    log "${GREEN}✓ Database-only backup created: $DB_BACKUP${NC}"
    
    # Clean up old database-only backups
    find "$BACKUP_DIR" -name "books_*.db" -mtime +$RETENTION_DAYS -delete
fi

# Show backup summary
log "${GREEN}=== Backup Summary ===${NC}"
log "Backup location: $BACKUP_FILE"
log "Latest symlink: $LATEST_BACKUP"
log "Total backups: $REMAINING_BACKUPS"
log "${GREEN}Backup completed successfully!${NC}"

# Optional: Send notification (uncomment and configure if needed)
# if command -v curl >/dev/null 2>&1; then
#     curl -X POST "YOUR_WEBHOOK_URL" \
#          -H "Content-Type: application/json" \
#          -d "{\"text\":\"BookOracle backup completed: $BACKUP_FILE\"}"
# fi 