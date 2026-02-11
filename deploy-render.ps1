# ===============================================================
# Talisay AI - Render.com Deployment Helper Script
# FREE hosting with NO credit card required!
# ===============================================================

Write-Host ''
Write-Host '===============================================================' -ForegroundColor Cyan
Write-Host '    Talisay AI - Render.com Deployment (FREE!)' -ForegroundColor Cyan
Write-Host '    NO Credit Card Required!' -ForegroundColor Green
Write-Host '===============================================================' -ForegroundColor Cyan
Write-Host ''

# --- Step 1: Check Git ---
Write-Host 'STEP 1: Checking Prerequisites' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''

$git = Get-Command git -ErrorAction SilentlyContinue
if (!$git) {
    Write-Host 'ERROR: Git is not installed!' -ForegroundColor Red
    Write-Host '   Download from: https://git-scm.com/download/win' -ForegroundColor Yellow
    Write-Host ''
    exit
}

Write-Host 'SUCCESS: Git is installed' -ForegroundColor Green
Write-Host ''

# --- Step 2: MongoDB Atlas ---
Write-Host 'STEP 2: MongoDB Atlas Setup (FREE - No Card Needed)' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''
Write-Host 'MongoDB Atlas is completely FREE and requires NO credit card!' -ForegroundColor White
Write-Host ''
Write-Host 'Setup Instructions:' -ForegroundColor Cyan
Write-Host '1. Go to: https://www.mongodb.com/cloud/atlas' -ForegroundColor Green
Write-Host '2. Sign up (NO credit card required!)' -ForegroundColor White
Write-Host '3. Create FREE Shared Cluster (M0 - 512MB)' -ForegroundColor White
Write-Host '4. Add Database User with password' -ForegroundColor White
Write-Host '5. Add Network Access: 0.0.0.0/0 (allow from anywhere)' -ForegroundColor White
Write-Host '6. Get Connection String' -ForegroundColor White
Write-Host ''

$hasMongoAtlas = Read-Host 'Have you created MongoDB Atlas cluster? (y/n)'
if ($hasMongoAtlas -eq 'y') {
    Write-Host ''
    Write-Host 'Enter your MongoDB Atlas connection string:' -ForegroundColor Cyan
    Write-Host 'Format: mongodb+srv://user:pass@cluster.mongodb.net/talisay?retryWrites=true' -ForegroundColor Gray
    $mongoUri = Read-Host 'MongoDB URI'
    Write-Host ''
    Write-Host 'MongoDB URI saved!' -ForegroundColor Green
} else {
    Write-Host ''
    Write-Host 'WARNING: Create MongoDB Atlas cluster first (free, no card needed!)' -ForegroundColor Yellow
    Write-Host '   Open: https://www.mongodb.com/cloud/atlas' -ForegroundColor Green
    Write-Host ''
    Start-Process 'https://www.mongodb.com/cloud/atlas'
    $mongoUri = 'mongodb+srv://user:password@cluster.mongodb.net/talisay?retryWrites=true'
}

# --- Step 3: GitHub Setup ---
Write-Host ''
Write-Host 'STEP 3: Push Code to GitHub' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''

# Check if already a git repo
if (!(Test-Path '.git')) {
    Write-Host 'Initializing Git repository...' -ForegroundColor Cyan
    git init
    git add .
    git commit -m 'Initial commit for Render deployment'
    git branch -M main
    Write-Host 'SUCCESS: Git repository initialized' -ForegroundColor Green
} else {
    Write-Host 'SUCCESS: Git repository already exists' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Next: Push your code to GitHub' -ForegroundColor Yellow
Write-Host ''
Write-Host 'If you have not created a GitHub repository yet:' -ForegroundColor White
Write-Host '1. Go to: https://github.com/new' -ForegroundColor Green
Write-Host '2. Create a new repository (public or private)' -ForegroundColor White
Write-Host '3. Copy the repository URL' -ForegroundColor White
Write-Host ''

$hasGitHub = Read-Host 'Is your code already on GitHub? (y/n)'
if ($hasGitHub -ne 'y') {
    Write-Host ''
    Write-Host 'Opening GitHub to create a new repository...' -ForegroundColor Cyan
    Start-Process 'https://github.com/new'
    Write-Host ''
    Write-Host 'After creating the repo, run these commands:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'git remote add origin https://github.com/YOUR_USERNAME/talisay_ai.git' -ForegroundColor Gray
    Write-Host 'git push -u origin main' -ForegroundColor Gray
    Write-Host ''
    Read-Host 'Press Enter after you have pushed to GitHub'
}

# --- Step 4: Render.com Setup ---
Write-Host ''
Write-Host 'STEP 4: Deploy to Render.com (FREE - No Card!)' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''

Write-Host 'Render.com offers completely FREE hosting!' -ForegroundColor Green
Write-Host '[+] No credit card required' -ForegroundColor White
Write-Host '[+] 512MB RAM per service' -ForegroundColor White
Write-Host '[+] Automatic HTTPS' -ForegroundColor White
Write-Host '[+] Auto-deploy from GitHub' -ForegroundColor White
Write-Host '[!] Services sleep after 15min inactivity (wake in ~30sec)' -ForegroundColor Yellow
Write-Host ''

Write-Host 'Opening Render.com signup...' -ForegroundColor Cyan
Start-Process 'https://dashboard.render.com/register'
Write-Host ''
Write-Host 'Sign up steps:' -ForegroundColor White
Write-Host '1. Click Sign up with GitHub (easiest)' -ForegroundColor Gray
Write-Host '2. Authorize Render to access your repositories' -ForegroundColor Gray
Write-Host ''

Read-Host 'Press Enter after you have signed up on Render'

# --- Step 5: Deployment Instructions ---
Write-Host ''
Write-Host 'STEP 5: Deploy Your Services' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''

Write-Host 'DEPLOY BACKEND (Node.js):' -ForegroundColor Cyan
Write-Host '---------------------------------------------------------------' -ForegroundColor Gray
Write-Host '1. In Render Dashboard, click New+ then Web Service' -ForegroundColor White
Write-Host '2. Select your GitHub repository' -ForegroundColor White
Write-Host '3. Configure:' -ForegroundColor White
Write-Host '   Name:           talisay-backend' -ForegroundColor Gray
Write-Host '   Region:         Singapore (or closest)' -ForegroundColor Gray
Write-Host '   Branch:         main' -ForegroundColor Gray
Write-Host '   Root Directory: server' -ForegroundColor Yellow
Write-Host '   Runtime:        Node' -ForegroundColor Gray
Write-Host '   Build Command:  npm install' -ForegroundColor Gray
Write-Host '   Start Command:  node index.js' -ForegroundColor Gray
Write-Host ''
Write-Host '4. Add Environment Variables:' -ForegroundColor White
Write-Host '   PORT=10000' -ForegroundColor Gray
Write-Host ('   MONGODB_URI=' + $mongoUri) -ForegroundColor Gray
Write-Host '   JWT_SECRET=your-random-secret-key-min-32-chars' -ForegroundColor Gray
Write-Host '   (Copy the rest from server/.env)' -ForegroundColor Gray
Write-Host ''
Write-Host '5. Choose FREE plan' -ForegroundColor Green
Write-Host '6. Click Create Web Service' -ForegroundColor White
Write-Host ''

Read-Host 'Press Enter after backend is deployed'

$backendUrl = Read-Host 'Enter your backend URL, e.g. https://talisay-backend.onrender.com'

Write-Host ''
Write-Host 'DEPLOY ML API (Python):' -ForegroundColor Cyan
Write-Host '---------------------------------------------------------------' -ForegroundColor Gray
Write-Host '1. Click New+ then Web Service again' -ForegroundColor White
Write-Host '2. Select your repository' -ForegroundColor White
Write-Host '3. Configure:' -ForegroundColor White
Write-Host '   Name:           talisay-ml-api' -ForegroundColor Gray
Write-Host '   Region:         Singapore (same as backend)' -ForegroundColor Gray
Write-Host '   Branch:         main' -ForegroundColor Gray
Write-Host '   Root Directory: ml' -ForegroundColor Yellow
Write-Host '   Runtime:        Python 3' -ForegroundColor Gray
Write-Host '   Build Command:  pip install -r requirements.txt' -ForegroundColor Gray
Write-Host '   Start Command:  python api.py' -ForegroundColor Gray
Write-Host ''
Write-Host '4. Add Environment Variables:' -ForegroundColor White
Write-Host '   PORT=10000' -ForegroundColor Gray
Write-Host '   MODEL_PATH=./models' -ForegroundColor Gray
Write-Host ''
Write-Host '5. Choose FREE plan' -ForegroundColor Green
Write-Host '6. Click Create Web Service' -ForegroundColor White
Write-Host '   (This takes 10-15 min due to ML models)' -ForegroundColor Yellow
Write-Host ''

Read-Host 'Press Enter after ML API is deployed'

$mlUrl = Read-Host 'Enter your ML API URL, e.g. https://talisay-ml-api.onrender.com'

# --- Step 6: UptimeRobot (Optional) ---
Write-Host ''
Write-Host 'STEP 6: Keep Services Awake (Optional but Recommended)' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''
Write-Host 'FREE Render services sleep after 15 minutes of inactivity.' -ForegroundColor Yellow
Write-Host 'Use UptimeRobot (also FREE) to ping them every 5 minutes!' -ForegroundColor White
Write-Host ''

$setupUptimeRobot = Read-Host 'Set up UptimeRobot to prevent sleep? (y/n)'
if ($setupUptimeRobot -eq 'y') {
    Write-Host ''
    Write-Host 'Opening UptimeRobot...' -ForegroundColor Cyan
    Start-Process 'https://uptimerobot.com/signUp'
    Write-Host ''
    Write-Host 'Setup steps:' -ForegroundColor White
    Write-Host '1. Sign up (FREE - no card needed)' -ForegroundColor Gray
    Write-Host '2. Click + Add New Monitor' -ForegroundColor Gray
    Write-Host '3. Add monitor for backend:' -ForegroundColor Gray
    Write-Host '   Monitor Type: HTTP(s)' -ForegroundColor Gray
    Write-Host ('   URL: ' + $backendUrl) -ForegroundColor Yellow
    Write-Host '   Monitoring Interval: 5 minutes' -ForegroundColor Gray
    Write-Host '4. Add another monitor for ML API:' -ForegroundColor Gray
    Write-Host ('   URL: ' + $mlUrl + '/api/info') -ForegroundColor Yellow
    Write-Host '   Monitoring Interval: 5 minutes' -ForegroundColor Gray
    Write-Host ''
    Write-Host 'SUCCESS: This keeps your apps awake 24/7!' -ForegroundColor Green
}

# --- Step 7: Update .env ---
Write-Host ''
Write-Host 'STEP 7: Update .env File' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''

if ($backendUrl -and $mlUrl) {
    $envLines = @(
        '# ==============================================='
        '# TALISAY ML - Production Environment (Render.com)'
        '# ==============================================='
        ''
        '# Node.js Backend URL - Render.com (FREE)'
        ('EXPO_PUBLIC_API_URL=' + $backendUrl)
        ''
        '# ML Backend URL - Render.com (FREE)'
        ('EXPO_PUBLIC_ML_API_URL=' + $mlUrl)
        ''
        '# ==============================================='
        '# RENDER.COM DEPLOYMENT - FREE FOREVER'
        '# ==============================================='
        ('# Backend: ' + $backendUrl)
        ('# ML API:  ' + $mlUrl)
        '# MongoDB: MongoDB Atlas (Free M0)'
        '# Cost: $0/month (completely FREE!)'
        '# Note: Services sleep after 15min inactivity'
        '#       Use UptimeRobot to keep them awake'
        '# ==============================================='
    )
    $envContent = $envLines -join "`r`n"

    # Backup existing .env
    if (Test-Path 'env-file') {
        # Use explicit path to avoid dot-prefix issues
    }
    $envPath = Join-Path $PSScriptRoot '.env'
    if (Test-Path $envPath) {
        $backupPath = Join-Path $PSScriptRoot '.env.backup'
        Copy-Item $envPath $backupPath -Force
        Write-Host 'Backed up existing .env to .env.backup' -ForegroundColor Green
    }

    # Write new .env
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host 'Updated .env with Render URLs!' -ForegroundColor Green
    Write-Host ''
    Write-Host ('Backend URL: ' + $backendUrl) -ForegroundColor Cyan
    Write-Host ('ML API URL:  ' + $mlUrl) -ForegroundColor Cyan
}

# --- Step 8: Next Steps ---
Write-Host ''
Write-Host 'FINAL STEPS' -ForegroundColor Yellow
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''

Write-Host '1. Test backend:' -ForegroundColor White
Write-Host ('   Open: ' + $backendUrl) -ForegroundColor Cyan
Write-Host '   (First load may take 30 sec if sleeping)' -ForegroundColor Gray
Write-Host ''

Write-Host '2. Test ML API:' -ForegroundColor White
Write-Host ('   Open: ' + $mlUrl + '/api/info') -ForegroundColor Cyan
Write-Host '   (First load may take 30 sec if sleeping)' -ForegroundColor Gray
Write-Host ''

Write-Host '3. Test web app locally:' -ForegroundColor White
Write-Host '   npx expo start' -ForegroundColor Cyan
Write-Host '   (Test login and scanning)' -ForegroundColor Gray
Write-Host ''

Write-Host '4. Build production APK:' -ForegroundColor White
Write-Host '   eas build --platform android --profile production' -ForegroundColor Cyan
Write-Host ''

Write-Host '5. Download and install APK on phone' -ForegroundColor White
Write-Host '   (Works on mobile data!)' -ForegroundColor Gray
Write-Host ''

Write-Host '===============================================================' -ForegroundColor Gray
Write-Host 'Your app is LIVE for FREE with NO credit card!' -ForegroundColor Green
Write-Host '===============================================================' -ForegroundColor Gray
Write-Host ''
Write-Host 'Tip: First requests may take 30 sec after inactivity' -ForegroundColor Yellow
Write-Host 'Full guide: RENDER_DEPLOYMENT.md' -ForegroundColor Cyan
Write-Host ''
