#!/bin/bash
# Deploy to Production Environment
# Created: 2025-10-17
# Usage: ./deploy-prod.sh

set -e

echo "🚀 Starting deployment to PRODUCTION environment..."
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Configuration
SERVER="root@194.135.36.195"
REMOTE_DIR="/var/www/www-root/data/www/prod.dataworker.ru"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Build
echo -e "${BLUE}[1/7]${NC} Building production bundle..."
npm run sync-version
npm run build:prod

# Check if build succeeded
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist directory not found.${NC}"
    exit 1
fi

# Step 2: Create archives
echo -e "${BLUE}[2/7]${NC} Creating archives..."
cd dist && tar -czf ../dist-prod.tar.gz . && cd ..
tar -czf server-prod.tar.gz server/

# Step 3: Upload to server
echo -e "${BLUE}[3/7]${NC} Uploading to server..."
scp dist-prod.tar.gz ${SERVER}:/tmp/
scp server-prod.tar.gz ${SERVER}:/tmp/
scp .env.production ${SERVER}:/tmp/
scp ecosystem.prod.config.cjs ${SERVER}:/tmp/
scp package.json ${SERVER}:/tmp/
scp package-lock.json ${SERVER}:/tmp/

# Step 4: Stop PM2
echo -e "${BLUE}[4/7]${NC} Stopping PM2 processes..."
ssh ${SERVER} "pm2 stop tradeframe-prod-frontend tradeframe-prod-backend || true"

# Step 5: Deploy files
echo -e "${BLUE}[5/7]${NC} Deploying files..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru

# Backup current version
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p /tmp/backups
tar -czf /tmp/backups/prod-backup-${timestamp}.tar.gz dist server || true

# Clean old dist
rm -rf dist
mkdir -p dist
cd dist
tar -xzf /tmp/dist-prod.tar.gz
cd ..

# Deploy server
rm -rf server
tar -xzf /tmp/server-prod.tar.gz

# Update configs
cp /tmp/.env.production .env
cp /tmp/ecosystem.prod.config.cjs .
cp /tmp/package.json .
cp /tmp/package-lock.json .

# Install dependencies
npm install --production

# Cleanup tmp
rm /tmp/dist-prod.tar.gz /tmp/server-prod.tar.gz /tmp/.env.production /tmp/ecosystem.prod.config.cjs

echo "✅ Files deployed successfully"
echo "📦 Backup saved to: /tmp/backups/prod-backup-${timestamp}.tar.gz"
ENDSSH

# Step 6: Start PM2
echo -e "${BLUE}[6/7]${NC} Starting PM2 processes..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/prod.dataworker.ru
pm2 start ecosystem.prod.config.cjs
pm2 save
ENDSSH

# Step 7: Verify
echo -e "${BLUE}[7/7]${NC} Verifying deployment..."
sleep 3
ssh ${SERVER} "pm2 list | grep tradeframe-prod"

# Cleanup local
rm -f dist-prod.tar.gz server-prod.tar.gz

echo ""
echo -e "${GREEN}✅ Deployment to PRODUCTION completed successfully!${NC}"
echo ""
echo -e "${BLUE}URL:${NC} https://prod.dataworker.ru"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  Check status:  ${BLUE}ssh ${SERVER} 'pm2 list'${NC}"
echo -e "  View logs:     ${BLUE}ssh ${SERVER} 'pm2 logs tradeframe-prod-frontend'${NC}"
echo -e "  Restart:       ${BLUE}ssh ${SERVER} 'pm2 restart tradeframe-prod-frontend'${NC}"
echo ""
