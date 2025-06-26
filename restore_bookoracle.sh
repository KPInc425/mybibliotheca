#!/bin/bash

# BookOracle Restore Script for Ubuntu Server
# This script restores BookOracle data from backups

# Configuration
DATA_DIR="../data/bookoracle"
BACKUP_DIR="../backups/bookoracle"
LOG_FILE="../logs/bookoracle_restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to show available backups
show_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    echo "----------------------------------------"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}Backup directory $BACKUP_DIR does not exist${NC}"
        return 1
    fi
    
    # Show full backups
    echo -e "${GREEN}Full backups:${NC}"
    ls -lh "$BACKUP_DIR"/bookoracle_backup_*.tar.gz 2>/dev/null | while read line; do
        echo "  $line"
    done
    
    # Show database-only backups
    echo -e "${GREEN}Database-only backups:${NC}"
    ls -lh "$BACKUP_DIR"/books_*.db 2>/dev/null | while read line; do
        echo "  $line"
    done
    
    echo "----------------------------------------"
}

# Function to restore from full backup
restore_full_backup() {
    local backup_file="$1"
    
    log "Starting full restore from: $backup_file"
    
    # Stop BookOracle container if running
    if docker ps | grep -q bookoracle; then
        log "Stopping BookOracle container..."
        docker-compose down
    fi
    
    # Create backup of current data
    if [ -d "$DATA_DIR" ] && [ "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
        CURRENT_BACKUP="$BACKUP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
        log "Creating backup of current data: $CURRENT_BACKUP"
        tar -czf "$CURRENT_BACKUP" -C "$DATA_DIR" .
    fi
    
    # Clear current data directory
    log "Clearing current data directory..."
    rm -rf "$DATA_DIR"/*
    
    # Restore from backup
    log "Restoring from backup..."
    if tar -xzf "$backup_file" -C "$DATA_DIR"; then
        log "${GREEN}✓ Full restore completed successfully${NC}"
    else
        log "${RED}✗ Restore failed${NC}"
        exit 1
    fi
    
    # Set proper permissions
    log "Setting proper permissions..."
    chown -R 1000:1000 "$DATA_DIR" 2>/dev/null || true
    
    # Start BookOracle
    log "Starting BookOracle..."
    docker-compose up -d
    
    log "${GREEN}Restore completed! BookOracle should be running.${NC}"
}

# Function to restore database only
restore_database() {
    local db_backup="$1"
    
    log "Starting database restore from: $db_backup"
    
    # Stop BookOracle container if running
    if docker ps | grep -q bookoracle; then
        log "Stopping BookOracle container..."
        docker-compose down
    fi
    
    # Create backup of current database
    if [ -f "$DATA_DIR/books.db" ]; then
        CURRENT_DB_BACKUP="$BACKUP_DIR/pre_restore_db_$(date +%Y%m%d_%H%M%S).db"
        log "Creating backup of current database: $CURRENT_DB_BACKUP"
        cp "$DATA_DIR/books.db" "$CURRENT_DB_BACKUP"
    fi
    
    # Restore database
    log "Restoring database..."
    if cp "$db_backup" "$DATA_DIR/books.db"; then
        log "${GREEN}✓ Database restore completed successfully${NC}"
    else
        log "${RED}✗ Database restore failed${NC}"
        exit 1
    fi
    
    # Set proper permissions
    log "Setting proper permissions..."
    chown 1000:1000 "$DATA_DIR/books.db" 2>/dev/null || true
    
    # Start BookOracle
    log "Starting BookOracle..."
    docker-compose up -d
    
    log "${GREEN}Database restore completed! BookOracle should be running.${NC}"
}

# Main script
main() {
    echo -e "${BLUE}BookOracle Restore Script${NC}"
    echo "================================"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}Error: Backup directory $BACKUP_DIR does not exist${NC}"
        exit 1
    fi
    
    # Show available backups
    show_backups
    
    # Get user input
    echo -e "${YELLOW}Enter backup file to restore from (or 'latest' for latest backup):${NC}"
    read -r backup_file
    
    # Handle 'latest' option
    if [ "$backup_file" = "latest" ]; then
        if [ -L "$BACKUP_DIR/latest_backup" ]; then
            backup_file=$(readlink "$BACKUP_DIR/latest_backup")
            echo "Using latest backup: $backup_file"
        else
            echo -e "${RED}No latest backup symlink found${NC}"
            exit 1
        fi
    fi
    
    # Validate backup file
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Error: Backup file $backup_file does not exist${NC}"
        exit 1
    fi
    
    # Determine backup type and confirm
    if [[ "$backup_file" == *.tar.gz ]]; then
        echo -e "${YELLOW}This will perform a FULL restore from: $backup_file${NC}"
        echo -e "${RED}This will replace ALL current data!${NC}"
    elif [[ "$backup_file" == *.db ]]; then
        echo -e "${YELLOW}This will restore only the database from: $backup_file${NC}"
        echo -e "${RED}This will replace the current database!${NC}"
    else
        echo -e "${RED}Unknown backup file type${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Are you sure you want to continue? (yes/no):${NC}"
    read -r confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
    
    # Perform restore
    if [[ "$backup_file" == *.tar.gz ]]; then
        restore_full_backup "$backup_file"
    elif [[ "$backup_file" == *.db ]]; then
        restore_database "$backup_file"
    fi
}

# Run main function
main "$@" 