#!/bin/bash
# Deploy to PRODUCTION environment (TradeControl repository)
# Created: 2025-10-17
# Usage: ./deploy-to-prod.sh

set -e

echo "🚀 Deploying to PRODUCTION..."
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

SERVER="root@194.135.36.195"
REMOTE_DIR="/var/www/www-root/data/www/prod.dataworker.ru"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check current git remote
echo -e "${BLUE}[1/7]${NC} Checking git configuration..."
CURRENT_REMOTE=$(git remote -v | grep -E "^prod.*fetch" | awk '{print $2}')
echo "Prod remote: $CURRENT_REMOTE"

# Step 2: Build for production
echo -e "${BLUE}[2/7]${NC} Building production bundle..."
npm run sync-version
npm run build:prod

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist directory not found.${NC}"
    exit 1
fi

# Step 3: Commit and push to prod repository
echo -e "${BLUE}[3/7]${NC} Pushing to prod repository..."
read -p "Commit message: " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="deploy: production update $(date +%Y-%m-%d)"
fi

git add .
git commit -m "$commit_msg" || echo "No changes to commit"
git push prod main

# Step 4: Backup on server
echo -e "${BLUE}[4/7]${NC} Creating backup on server..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p /tmp/backups
tar -czf /tmp/backups/prod-backup-${timestamp}.tar.gz dist server .env || true
echo "✅ Backup created: /tmp/backups/prod-backup-${timestamp}.tar.gz"
ENDSSH

# Step 5: Pull on server
echo -e "${BLUE}[5/7]${NC} Pulling latest code on server..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
git pull origin main
npm install --production
echo "✅ Code updated"
ENDSSH

# Step 6: Restart PM2
echo -e "${BLUE}[6/7]${NC} Restarting PM2 processes..."
ssh ${SERVER} "pm2 restart tradeframe-prod-frontend tradeframe-prod-backend"

# Step 7: Verify
echo -e "${BLUE}[7/7]${NC} Verifying deployment..."
sleep 3
ssh ${SERVER} "pm2 list | grep tradeframe-prod"

echo ""
echo -e "${GREEN}✅ Deployment to PRODUCTION completed!${NC}"
echo ""
echo -e "${BLUE}URL:${NC} https://prod.dataworker.ru"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  Check status:  ${BLUE}ssh ${SERVER} 'pm2 list'${NC}"
echo -e "  View logs:     ${BLUE}ssh ${SERVER} 'pm2 logs tradeframe-prod-frontend'${NC}"
echo ""
echo -e "${YELLOW}Rollback if needed:${NC}"
echo -e "  ssh ${SERVER}"
echo -e "  cd /var/www/www-root/data/www/prod.dataworker.ru"
echo -e "  # Find backup: ls /tmp/backups/"
echo -e "  # Restore: tar -xzf /tmp/backups/prod-backup-TIMESTAMP.tar.gz"
echo -e "  pm2 restart tradeframe-prod-frontend tradeframe-prod-backend"
echo ""
