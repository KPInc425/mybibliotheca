#!/bin/bash

# BookOracle Ubuntu Server Setup Script
# This script sets up the server environment for BookOracle

# Configuration
DATA_DIR="../data/bookoracle"
BACKUP_DIR="../backups/bookoracle"
LOG_DIR="../logs/bookoracle"
SCRIPT_DIR="../scripts/bookoracle"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}BookOracle Ubuntu Server Setup${NC}"
echo "====================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please do not run this script as root${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p "$DATA_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$SCRIPT_DIR"

# Set proper permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chmod 755 "$DATA_DIR"
chmod 755 "$BACKUP_DIR"
chmod 755 "$LOG_DIR"
chmod 755 "$SCRIPT_DIR"

# Copy scripts to script directory
echo -e "${YELLOW}Installing scripts...${NC}"
if [ -f "backup_bookoracle.sh" ]; then
    cp backup_bookoracle.sh "$SCRIPT_DIR/"
    chmod +x "$SCRIPT_DIR/backup_bookoracle.sh"
    echo -e "${GREEN}✓ Backup script installed${NC}"
fi

if [ -f "restore_bookoracle.sh" ]; then
    cp restore_bookoracle.sh "$SCRIPT_DIR/"
    chmod +x "$SCRIPT_DIR/restore_bookoracle.sh"
    echo -e "${GREEN}✓ Restore script installed${NC}"
fi

# Create a simple status script
cat > "$SCRIPT_DIR/bookoracle_status.sh" << 'EOF'
#!/bin/bash
echo "=== BookOracle Status ==="
echo "Container status:"
docker ps | grep bookoracle || echo "No BookOracle container running"
echo ""
echo "Data directory:"
ls -la ../data/bookoracle/
echo ""
echo "Recent backups:"
ls -la ../backups/bookoracle/ | head -10
echo ""
echo "Recent logs:"
tail -20 ../logs/bookoracle/bookoracle_backup.log 2>/dev/null || echo "No backup logs found"
EOF

chmod +x "$SCRIPT_DIR/bookoracle_status.sh"

# Create systemd service for automated backups (optional)
echo -e "${YELLOW}Setting up automated backups...${NC}"
read -p "Do you want to set up automated daily backups? (y/n): " setup_cron

if [ "$setup_cron" = "y" ] || [ "$setup_cron" = "Y" ]; then
    # Create cron job
    CRON_JOB="0 2 * * * cd $(pwd) && ../scripts/backup_bookoracle.sh > /dev/null 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "backup_bookoracle.sh"; then
        echo -e "${YELLOW}Cron job already exists${NC}"
    else
        # Add to crontab
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo -e "${GREEN}✓ Daily backup cron job added (runs at 2 AM)${NC}"
    fi
fi

# Create environment file template
echo -e "${YELLOW}Creating environment file template...${NC}"
cat > .env.template << 'EOF'
# BookOracle Environment Configuration
# Copy this to .env and fill in your values

# Security (REQUIRED - generate secure values)
SECRET_KEY=your-secret-key-here
SECURITY_PASSWORD_SALT=your-security-salt-here

# Application settings
TIMEZONE=UTC
WORKERS=4

# Optional: Email settings (if you want email notifications)
# MAIL_SERVER=smtp.gmail.com
# MAIL_PORT=587
# MAIL_USE_TLS=true
# MAIL_USERNAME=your-email@gmail.com
# MAIL_PASSWORD=your-app-password
# MAIL_DEFAULT_SENDER=your-email@gmail.com
EOF

echo -e "${GREEN}✓ Environment template created${NC}"

# Create a deployment script
cat > "$SCRIPT_DIR/deploy_bookoracle.sh" << 'EOF'
#!/bin/bash
# BookOracle Deployment Script

echo "=== BookOracle Deployment ==="

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo "Pulling latest changes..."
    git pull
fi

# Build and start
echo "Building and starting BookOracle..."
docker-compose up -d --build

# Check status
echo "Checking container status..."
docker ps | grep bookoracle

echo "Deployment completed!"
echo "Check logs with: docker-compose logs -f bookoracle"
EOF

chmod +x "$SCRIPT_DIR/deploy_bookoracle.sh"

# Create a log rotation configuration
echo -e "${YELLOW}Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/bookoracle > /dev/null << 'EOF'
../logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 steam steam
}
EOF

echo -e "${GREEN}✓ Log rotation configured${NC}"

# Final setup summary
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo "Directories created:"
echo "  Data: $DATA_DIR"
echo "  Backups: $BACKUP_DIR"
echo "  Logs: $LOG_DIR"
echo "  Scripts: $SCRIPT_DIR"
echo ""
echo "Scripts installed:"
echo "  $SCRIPT_DIR/backup_bookoracle.sh"
echo "  $SCRIPT_DIR/restore_bookoracle.sh"
echo "  $SCRIPT_DIR/bookoracle_status.sh"
echo "  $SCRIPT_DIR/deploy_bookoracle.sh"
echo ""
echo "Next steps:"
echo "1. Copy .env.template to .env and configure your settings"
echo "2. Run: docker-compose up -d"
echo "3. Check status: $SCRIPT_DIR/bookoracle_status.sh"
echo "4. Test backup: $SCRIPT_DIR/backup_bookoracle.sh"
echo ""
echo -e "${GREEN}BookOracle server setup completed!${NC}" 