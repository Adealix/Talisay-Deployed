# ========================================
# Build APK with Current .env Configuration
# ========================================
# This script builds your APK using the URLs in .env file

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Talisay AI - APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Read .env file
$envFile = "D:\talisay_ai\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Current Configuration:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$apiUrl = (Get-Content $envFile | Select-String "^EXPO_PUBLIC_API_URL=" | ForEach-Object { $_ -replace "EXPO_PUBLIC_API_URL=", "" }).Trim()
$mlApiUrl = (Get-Content $envFile | Select-String "^EXPO_PUBLIC_ML_API_URL=" | ForEach-Object { $_ -replace "EXPO_PUBLIC_ML_API_URL=", "" }).Trim()

Write-Host "Node.js API: $apiUrl" -ForegroundColor White
Write-Host "ML API: $mlApiUrl" -ForegroundColor White
Write-Host ""

# Check if URLs are localhost
if ($apiUrl -match "localhost|127.0.0.1" -or $mlApiUrl -match "localhost|127.0.0.1") {
    Write-Host "⚠️  WARNING: You're using localhost URLs!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Your APK will NOT work when:" -ForegroundColor Yellow
    Write-Host "  - Phone is on mobile data" -ForegroundColor White
    Write-Host "  - Phone is on different WiFi" -ForegroundColor White
    Write-Host "  - Laptop is turned off" -ForegroundColor White
    Write-Host ""
    Write-Host "For production APK, you need public URLs from:" -ForegroundColor Yellow
    Write-Host "  - ngrok (testing): Run setup-ngrok.ps1" -ForegroundColor White
    Write-Host "  - Cloud deployment: Railway, Render, Heroku" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Build cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🏗️  Build Options:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. preview  - Recommended for testing (medium size)" -ForegroundColor Green
Write-Host "2. production - Optimized for release (smallest)" -ForegroundColor Yellow
Write-Host "3. development - With dev tools (largest)" -ForegroundColor Gray
Write-Host ""
$buildProfile = Read-Host "Choose build profile (1/2/3)"

switch ($buildProfile) {
    "1" { $profile = "preview" }
    "2" { $profile = "production" }
    "3" { $profile = "development" }
    default { 
        Write-Host "Invalid choice. Using 'preview'" -ForegroundColor Yellow
        $profile = "preview"
    }
}

Write-Host ""
Write-Host "Building with profile: $profile" -ForegroundColor Green
Write-Host ""

# Check if EAS CLI is installed
$easPath = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easPath) {
    Write-Host "❌ EAS CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing EAS CLI..." -ForegroundColor Yellow
    npm install -g eas-cli
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install EAS CLI" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ EAS CLI installed" -ForegroundColor Green
}

# Check if logged in to Expo
Write-Host "Checking Expo login status..." -ForegroundColor Yellow
eas whoami 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to Expo" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please login to Expo (create free account if needed):" -ForegroundColor Cyan
    eas login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Starting Build..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will take 10-20 minutes..." -ForegroundColor Yellow
Write-Host "You can close this window - build happens on Expo servers" -ForegroundColor White
Write-Host ""

# Change to project directory
Set-Location "D:\talisay_ai"

# Start the build
eas build --profile $profile --platform android

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Download APK from the link above" -ForegroundColor White
    Write-Host "2. Transfer to your Android phone" -ForegroundColor White
    Write-Host "3. Enable 'Install unknown apps' in Settings" -ForegroundColor White
    Write-Host "4. Install the APK" -ForegroundColor White
    Write-Host "5. Make sure backends are running and accessible" -ForegroundColor White
    Write-Host ""
    
    if ($apiUrl -match "ngrok" -or $mlApiUrl -match "ngrok") {
        Write-Host "⚠️  Remember: Keep ngrok and backends running!" -ForegroundColor Yellow
        Write-Host "   Your APK needs those services to be online" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
}
