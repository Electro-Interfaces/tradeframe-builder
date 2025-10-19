#!/bin/bash
# Sync tested code from TEST to PRODUCTION
# Created: 2025-10-17
# Usage: ./sync-test-to-prod.sh

set -e

echo "🔄 Sync TEST → PRODUCTION"
echo ""
echo "⚠️  This will copy TESTED code from TEST environment to PRODUCTION"
echo "⚠️  Make sure you have thoroughly tested on https://test.dataworker.ru first!"
echo ""
read -p "Are you absolutely sure? Type 'SYNC' to continue: " confirm

if [ "$confirm" != "SYNC" ]; then
    echo "Cancelled."
    exit 0
fi

SERVER="root@194.135.36.195"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}[1/5]${NC} Creating production backup..."

ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p /tmp/backups
tar -czf /tmp/backups/prod-backup-before-sync-${timestamp}.tar.gz dist server .env
echo "✅ Backup created: /tmp/backups/prod-backup-before-sync-${timestamp}.tar.gz"
ENDSSH

echo -e "${BLUE}[2/5]${NC} Stopping production processes..."
ssh ${SERVER} "pm2 stop tradeframe-prod-frontend tradeframe-prod-backend"

echo -e "${BLUE}[3/5]${NC} Copying files from TEST to PROD..."
ssh ${SERVER} << 'ENDSSH'
# Remove old production files
cd /var/www/www-root/data/www/prod.dataworker.ru
rm -rf dist server

# Copy from test
cp -r /var/www/www-root/data/www/test.dataworker.ru/dist .
cp -r /var/www/www-root/data/www/test.dataworker.ru/server .

# Keep production .env
# (do not copy .env from test!)

echo "✅ Files copied"
ENDSSH

echo -e "${BLUE}[4/5]${NC} Starting production processes..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
pm2 start ecosystem.prod.config.cjs
pm2 save
ENDSSH

echo -e "${BLUE}[5/5]${NC} Verifying deployment..."
sleep 3
ssh ${SERVER} "pm2 list | grep tradeframe-prod"

echo ""
echo -e "${GREEN}✅ SYNC completed successfully!${NC}"
echo ""
echo -e "${BLUE}Production URL:${NC} https://prod.dataworker.ru"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test production thoroughly"
echo "2. Monitor logs: ssh ${SERVER} 'pm2 logs tradeframe-prod-frontend'"
echo "3. Check status: ssh ${SERVER} 'pm2 list'"
echo ""
echo -e "${YELLOW}Rollback if needed:${NC}"
echo "  ssh ${SERVER}"
echo "  cd /var/www/www-root/data/www/prod.dataworker.ru"
echo "  # Find backup: ls /tmp/backups/"
echo "  # Restore: tar -xzf /tmp/backups/prod-backup-before-sync-TIMESTAMP.tar.gz"
echo "  pm2 restart tradeframe-prod-frontend tradeframe-prod-backend"
echo ""
