#!/bin/bash
# Deploy to TEST environment (tradeframe-builder repository)
# Created: 2025-10-17
# Usage: ./deploy-to-test.sh

set -e

echo "🧪 Deploying to TEST environment..."

SERVER="root@194.135.36.195"
REMOTE_DIR="/var/www/www-root/data/www/test.dataworker.ru"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check current git remote
echo -e "${BLUE}[1/6]${NC} Checking git configuration..."
CURRENT_REMOTE=$(git remote -v | grep -E "^test.*fetch" | awk '{print $2}')
echo "Test remote: $CURRENT_REMOTE"

# Step 2: Build for test
echo -e "${BLUE}[2/6]${NC} Building test bundle..."
npm run sync-version
npm run build -- --mode development

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist directory not found.${NC}"
    exit 1
fi

# Step 3: Commit and push to test repository
echo -e "${BLUE}[3/6]${NC} Pushing to test repository..."
read -p "Commit message: " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="deploy: update test environment $(date +%Y-%m-%d)"
fi

git add .
git commit -m "$commit_msg" || echo "No changes to commit"
git push test main

# Step 4: Pull on server
echo -e "${BLUE}[4/6]${NC} Pulling latest code on server..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/test.dataworker.ru
git pull origin main
npm install --production
echo "✅ Code updated"
ENDSSH

# Step 5: Restart PM2
echo -e "${BLUE}[5/6]${NC} Restarting PM2 processes..."
ssh ${SERVER} "pm2 restart tradeframe-test-frontend tradeframe-test-backend"

# Step 6: Verify
echo -e "${BLUE}[6/6]${NC} Verifying deployment..."
sleep 3
ssh ${SERVER} "pm2 list | grep tradeframe-test"

echo ""
echo -e "${GREEN}✅ Deployment to TEST completed!${NC}"
echo ""
echo -e "${BLUE}URL:${NC} https://test.dataworker.ru"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  Check status:  ${BLUE}ssh ${SERVER} 'pm2 list'${NC}"
echo -e "  View logs:     ${BLUE}ssh ${SERVER} 'pm2 logs tradeframe-test-frontend'${NC}"
echo ""
