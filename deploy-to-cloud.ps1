# ========================================
# Cloud Deployment Helper
# ========================================
# This guide helps you deploy both backends to free cloud services

Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Talisay AI - Cloud Deployment Guide               ║" -ForegroundColor Cyan  
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "We'll deploy to FREE cloud services:" -ForegroundColor Yellow
Write-Host "  1. Railway - For Node.js backend" -ForegroundColor White
Write-Host "  2. Render - For Python ML API" -ForegroundColor White
Write-Host ""
Write-Host "Total time: ~30-45 minutes" -ForegroundColor Gray
Write-Host "Cost: $0 (free tiers)" -ForegroundColor Green
Write-Host ""

$continue = Read-Host "Ready to start? (y/n)"
if ($continue -ne "y") {
    Write-Host "Cancelled. Run this script again when ready!" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 1: Deploy Node.js Backend to Railway" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Visit: https://railway.app" -ForegroundColor Yellow
Write-Host "2. Sign up with GitHub" -ForegroundColor White
Write-Host "3. Click 'New Project'" -ForegroundColor White
Write-Host "4. Select 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "5. Authorize Railway to access your GitHub" -ForegroundColor White
Write-Host ""

Write-Host "If you don't have this project on GitHub:" -ForegroundColor Yellow
Write-Host "  Option A: Push your project to GitHub first" -ForegroundColor White
Write-Host "  Option B: Use 'Deploy from CLI' option" -ForegroundColor White
Write-Host ""

$hasGitHub = Read-Host "Is your project on GitHub? (y/n)"

if ($hasGitHub -eq "n") {
    Write-Host ""
    Write-Host "Setting up git for Railway deployment..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Push to GitHub (Recommended)" -ForegroundColor Green
    Write-Host "  1. Create new repo on https://github.com/new" -ForegroundColor White
    Write-Host "  2. Run these commands:" -ForegroundColor White
    Write-Host "     cd D:\talisay_ai" -ForegroundColor Gray
    Write-Host "     git init" -ForegroundColor Gray
    Write-Host "     git add ." -ForegroundColor Gray
    Write-Host "     git commit -m 'Initial commit'" -ForegroundColor Gray
    Write-Host "     git remote add origin YOUR_GITHUB_REPO_URL" -ForegroundColor Gray
    Write-Host "     git push -u origin main" -ForegroundColor Gray
    Write-Host ""
    
    $pushNow = Read-Host "Push to GitHub now? (y/n)"
    if ($pushNow -eq "y") {
        $repoUrl = Read-Host "Enter your GitHub repo URL"
        Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
        cd D:\talisay_ai
        
        # Check if git is initialized
        if (-not (Test-Path ".git")) {
            git init
            Write-Host "✅ Git initialized" -ForegroundColor Green
        }
        
        # Create .gitignore if it doesn't exist
        if (-not (Test-Path ".gitignore")) {
            @"
node_modules/
venv/
__pycache__/
*.pyc
.env
*.log
.DS_Store
ml/models/*.pth
ml/models/*.h5
ml/yolov8n.pt
server/.env
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
            Write-Host "✅ .gitignore created" -ForegroundColor Green
        }
        
        git add .
        git commit -m "Initial commit for deployment"
        git branch -M main
        git remote add origin $repoUrl
        git push -u origin main
        
        Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "After project is on GitHub:" -ForegroundColor Yellow
Write-Host "6. Select your repository" -ForegroundColor White
Write-Host "7. Railway will detect Node.js automatically" -ForegroundColor White
Write-Host "8. Set Root Directory: server" -ForegroundColor White
Write-Host "9. Click 'Deploy'" -ForegroundColor White
Write-Host ""

Write-Host "Configure environment variables in Railway:" -ForegroundColor Yellow
Write-Host "  Variables tab → Add:" -ForegroundColor White
Write-Host "    PORT=3000" -ForegroundColor Gray
Write-Host "    MONGODB_URI=your-mongodb-connection-string" -ForegroundColor Gray
Write-Host "    JWT_SECRET=your-secret-key" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter when Railway deployment is complete"

Write-Host ""
$railwayUrl = Read-Host "Enter your Railway app URL (e.g., https://yourapp.up.railway.app)"

Write-Host ""
Write-Host "✅ Node.js backend deployed to Railway!" -ForegroundColor Green
Write-Host "   URL: $railwayUrl" -ForegroundColor Green
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 2: Deploy Python ML API to Render" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Visit: https://render.com" -ForegroundColor Yellow
Write-Host "2. Sign up with GitHub" -ForegroundColor White
Write-Host "3. Click 'New +' → 'Web Service'" -ForegroundColor White
Write-Host "4. Connect your GitHub repository" -ForegroundColor White
Write-Host "5. Configure:" -ForegroundColor White
Write-Host ""
Write-Host "   Name: talisay-ml-api" -ForegroundColor Gray
Write-Host "   Root Directory: ml" -ForegroundColor Gray
Write-Host "   Runtime: Python 3" -ForegroundColor Gray
Write-Host "   Build Command: pip install -r requirements.txt" -ForegroundColor Gray
Write-Host "   Start Command: python api.py" -ForegroundColor Gray
Write-Host "   Instance Type: Free" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Click 'Create Web Service'" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  Note: Free tier spins down after inactivity (cold starts)" -ForegroundColor Yellow
Write-Host "   First request after idle may take 30 seconds" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter when Render deployment is complete"

Write-Host ""
$renderUrl = Read-Host "Enter your Render app URL (e.g., https://talisay-ml-api.onrender.com)"

Write-Host ""
Write-Host "✅ Python ML API deployed to Render!" -ForegroundColor Green
Write-Host "   URL: $renderUrl" -ForegroundColor Green
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 3: Update .env File" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Updating .env file with production URLs..." -ForegroundColor Yellow

$envContent = @"
# Production URLs - Deployed to Cloud
EXPO_PUBLIC_API_URL=$railwayUrl
EXPO_PUBLIC_ML_API_URL=$renderUrl

# These are permanent URLs that work from anywhere
# Your laptop does NOT need to be running
# APK will work on any network (WiFi, mobile data, etc.)
"@

$envContent | Out-File -FilePath "D:\talisay_ai\.env" -Encoding UTF8

Write-Host "✅ .env file updated!" -ForegroundColor Green
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 4: Test the URLs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing Node.js API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $railwayUrl -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Node.js API is accessible" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Node.js API test: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   This might be okay - check if deployment is complete" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Testing Python ML API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$renderUrl/api/info" -TimeoutSec 30 -ErrorAction Stop
    Write-Host "✅ Python ML API is accessible" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Python ML API test: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Render might be spinning up (30 sec wait). Try again in a moment." -ForegroundColor Gray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "Your backends are now deployed to cloud!" -ForegroundColor White
Write-Host "  Node.js: $railwayUrl" -ForegroundColor Green
Write-Host "  Python ML: $renderUrl" -ForegroundColor Green
Write-Host ""

Write-Host "Next: Build your APK" -ForegroundColor Yellow
Write-Host "  Run: .\build-apk.ps1" -ForegroundColor White
Write-Host "  Choose: option 2 (production)" -ForegroundColor White
Write-Host ""

Write-Host "Benefits of cloud deployment:" -ForegroundColor Cyan
Write-Host "  ✅ APK works on ANY network (WiFi, mobile data)" -ForegroundColor Green
Write-Host "  ✅ Laptop can be OFF" -ForegroundColor Green
Write-Host "  ✅ Permanent URLs (no need to rebuild)" -ForegroundColor Green
Write-Host "  ✅ Free tier for both services" -ForegroundColor Green
Write-Host ""
