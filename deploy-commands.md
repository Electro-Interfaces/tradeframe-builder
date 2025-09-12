# Deployment Commands

## Local Development to DEV Branch

### Step 1: Commit changes locally
```bash
git add .
git commit -m "feat: apply premium header design to Prices page

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 2: Push to DEV branch (auto-deploys to test.dataworker.ru)
```bash
git push new-origin localMag:dev
```

## DEV Branch to MAIN Branch 

### Step 3: After testing on DEV, merge to MAIN
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull new-origin main

# Merge dev branch
git merge dev

# Push to main
git push new-origin main
```

## Alternative: Direct push to both repositories
```bash
# Push to both remotes simultaneously
git push origin localMag:main
git push new-origin localMag:main
```

## Deployment Status Check
- **DEV**: Automatically deploys to test.dataworker.ru via GitHub Actions
- **MAIN**: Manual deployment or production CI/CD (if configured)

## Notes
- DEV branch has automatic deployment configured in `.github/workflows/dev-deploy.yml`
- Always test on DEV before merging to MAIN
- Use feature branch `localMag` for local development