#!/bin/bash
# Deploy to Testing Environment
# Created: 2025-10-17
# Usage: ./deploy-test.sh

set -e

echo "🧪 Starting deployment to TESTING environment..."

# Configuration
SERVER="root@194.135.36.195"
REMOTE_DIR="/var/www/www-root/data/www/test.dataworker.ru"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Build
echo -e "${BLUE}[1/7]${NC} Building test bundle..."
npm run sync-version
npm run build -- --mode testing

# Check if build succeeded
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist directory not found.${NC}"
    exit 1
fi

# Step 2: Create archives
echo -e "${BLUE}[2/7]${NC} Creating archives..."
cd dist && tar -czf ../dist-test.tar.gz . && cd ..
tar -czf server-test.tar.gz server/

# Step 3: Upload to server
echo -e "${BLUE}[3/7]${NC} Uploading to server..."
scp dist-test.tar.gz ${SERVER}:/tmp/
scp server-test.tar.gz ${SERVER}:/tmp/
scp .env.test ${SERVER}:/tmp/
scp ecosystem.test.config.cjs ${SERVER}:/tmp/
scp package.json ${SERVER}:/tmp/
scp package-lock.json ${SERVER}:/tmp/

# Step 4: Stop PM2
echo -e "${BLUE}[4/7]${NC} Stopping PM2 processes..."
ssh ${SERVER} "pm2 stop tradeframe-test-frontend tradeframe-test-backend || true"

# Step 5: Deploy files
echo -e "${BLUE}[5/7]${NC} Deploying files..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/test.dataworker.ru

# Clean old dist
rm -rf dist
mkdir -p dist
cd dist
tar -xzf /tmp/dist-test.tar.gz
cd ..

# Deploy server
rm -rf server
tar -xzf /tmp/server-test.tar.gz

# Update configs
cp /tmp/.env.test .env
cp /tmp/ecosystem.test.config.cjs .
cp /tmp/package.json .
cp /tmp/package-lock.json .

# Install dependencies
npm install --production

# Cleanup tmp
rm /tmp/dist-test.tar.gz /tmp/server-test.tar.gz /tmp/.env.test /tmp/ecosystem.test.config.cjs

echo "✅ Files deployed successfully"
ENDSSH

# Step 6: Start PM2
echo -e "${BLUE}[6/7]${NC} Starting PM2 processes..."
ssh ${SERVER} << 'ENDSSH'
cd /var/www/www-root/data/www/test.dataworker.ru
pm2 start ecosystem.test.config.cjs
pm2 save
ENDSSH

# Step 7: Verify
echo -e "${BLUE}[7/7]${NC} Verifying deployment..."
sleep 3
ssh ${SERVER} "pm2 list | grep tradeframe-test"

# Cleanup local
rm -f dist-test.tar.gz server-test.tar.gz

echo ""
echo -e "${GREEN}✅ Deployment to TESTING completed successfully!${NC}"
echo ""
echo -e "${BLUE}URL:${NC} https://test.dataworker.ru"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  Check status:  ${BLUE}ssh ${SERVER} 'pm2 list'${NC}"
echo -e "  View logs:     ${BLUE}ssh ${SERVER} 'pm2 logs tradeframe-test-frontend'${NC}"
echo -e "  Restart:       ${BLUE}ssh ${SERVER} 'pm2 restart tradeframe-test-frontend'${NC}"
echo ""
