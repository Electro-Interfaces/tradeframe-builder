#!/bin/bash
# Sync repositories between TEST and PROD
# Created: 2025-10-17
# Usage: ./sync-repos.sh [test-to-prod|prod-to-test]

set -e

DIRECTION=${1:-test-to-prod}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$DIRECTION" = "test-to-prod" ]; then
    echo "🔄 Syncing TEST → PROD repositories..."
    echo ""
    echo -e "${YELLOW}This will:${NC}"
    echo "1. Fetch latest from test (tradeframe-builder)"
    echo "2. Merge test/main into current branch"
    echo "3. Push to prod (TradeControl)"
    echo ""
    read -p "Type 'SYNC' to continue: " confirm

    if [ "$confirm" != "SYNC" ]; then
        echo "Cancelled."
        exit 0
    fi

    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)

    echo -e "${BLUE}[1/5]${NC} Fetching from test repository..."
    git fetch test

    echo -e "${BLUE}[2/5]${NC} Creating sync branch..."
    git checkout -b sync-test-to-prod-$(date +%Y%m%d-%H%M%S)

    echo -e "${BLUE}[3/5]${NC} Merging test/main..."
    git merge test/main --no-ff -m "sync: merge tested code from test/main"

    echo -e "${BLUE}[4/5]${NC} Pushing to prod repository..."
    git push prod $(git branch --show-current)

    echo -e "${BLUE}[5/5]${NC} Cleanup..."
    git checkout ${CURRENT_BRANCH}

    echo ""
    echo -e "${GREEN}✅ Sync TEST → PROD complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review changes in prod repository"
    echo "2. Merge sync branch to prod/main"
    echo "3. Deploy to production: ./deploy-to-prod.sh"
    echo ""

elif [ "$DIRECTION" = "prod-to-test" ]; then
    echo "🔄 Syncing PROD → TEST repositories..."
    echo ""
    echo -e "${YELLOW}This will:${NC}"
    echo "1. Fetch latest from prod (TradeControl)"
    echo "2. Merge prod/main into current branch"
    echo "3. Push to test (tradeframe-builder)"
    echo ""
    read -p "Type 'SYNC' to continue: " confirm

    if [ "$confirm" != "SYNC" ]; then
        echo "Cancelled."
        exit 0
    fi

    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)

    echo -e "${BLUE}[1/5]${NC} Fetching from prod repository..."
    git fetch prod

    echo -e "${BLUE}[2/5]${NC} Creating sync branch..."
    git checkout -b sync-prod-to-test-$(date +%Y%m%d-%H%M%S)

    echo -e "${BLUE}[3/5]${NC} Merging prod/main..."
    git merge prod/main --no-ff -m "sync: merge production code from prod/main"

    echo -e "${BLUE}[4/5]${NC} Pushing to test repository..."
    git push test $(git branch --show-current)

    echo -e "${BLUE}[5/5]${NC} Cleanup..."
    git checkout ${CURRENT_BRANCH}

    echo ""
    echo -e "${GREEN}✅ Sync PROD → TEST complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review changes in test repository"
    echo "2. Merge sync branch to test/main"
    echo "3. Deploy to test: ./deploy-to-test.sh"
    echo ""

else
    echo -e "${RED}❌ Invalid direction: $DIRECTION${NC}"
    echo ""
    echo "Usage: ./sync-repos.sh [test-to-prod|prod-to-test]"
    echo ""
    echo "Examples:"
    echo "  ./sync-repos.sh test-to-prod    # Sync tested code to production"
    echo "  ./sync-repos.sh prod-to-test    # Sync hotfix back to test"
    exit 1
fi
