# ========================================
# Quick APK Build Setup with ngrok
# ========================================
# This script helps you set up ngrok tunnels for testing your APK
# Run this BEFORE building your APK

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Talisay AI - APK Build Setup with ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
Write-Host "Checking for ngrok..." -ForegroundColor Yellow
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokPath) {
    Write-Host "❌ ngrok is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install ngrok:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Download and extract ngrok.exe" -ForegroundColor White
    Write-Host "3. Add to PATH or place in this folder" -ForegroundColor White
    Write-Host "4. Sign up at https://ngrok.com/signup" -ForegroundColor White
    Write-Host "5. Run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ ngrok found at: $($ngrokPath.Source)" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "📋 Setup Instructions:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Start your backend servers" -ForegroundColor Yellow
Write-Host "   Open 2 separate PowerShell windows:" -ForegroundColor White
Write-Host ""
Write-Host "   Terminal 1 - Node.js Server:" -ForegroundColor Green
Write-Host "   cd D:\talisay_ai\server" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "   Terminal 2 - Python ML API:" -ForegroundColor Green
Write-Host "   cd D:\talisay_ai\ml" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\activate" -ForegroundColor Gray
Write-Host "   python api.py" -ForegroundColor Gray
Write-Host ""
Write-Host "   Wait for both to show 'Server running...'" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter when both backends are running"

Write-Host ""
Write-Host "Step 2: Starting ngrok tunnels..." -ForegroundColor Yellow
Write-Host ""

# Start ngrok for Node.js server (port 3000)
Write-Host "Starting ngrok tunnel for Node.js server (port 3000)..." -ForegroundColor Green
Start-Process -FilePath "ngrok" -ArgumentList "http", "3000", "--log=stdout" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start ngrok for Python ML API (port 5001)
Write-Host "Starting ngrok tunnel for Python ML API (port 5001)..." -ForegroundColor Green
Start-Process -FilePath "ngrok" -ArgumentList "http", "5001", "--log=stdout" -WindowStyle Normal

Write-Host ""
Write-Host "✅ ngrok tunnels started!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Look at the ngrok windows and find the 'Forwarding' URLs" -ForegroundColor Yellow
Write-Host "   They look like: https://abc123.ngrok-free.app" -ForegroundColor White
Write-Host ""
Write-Host "2. Copy BOTH URLs:" -ForegroundColor Yellow
Write-Host "   - One for port 3000 (Node.js)" -ForegroundColor White
Write-Host "   - One for port 5001 (Python ML)" -ForegroundColor White
Write-Host ""
Write-Host "3. Open .env file and update:" -ForegroundColor Yellow
Write-Host "   EXPO_PUBLIC_API_URL=https://YOUR-3000-URL.ngrok-free.app" -ForegroundColor White
Write-Host "   EXPO_PUBLIC_ML_API_URL=https://YOUR-5001-URL.ngrok-free.app" -ForegroundColor White
Write-Host ""
Write-Host "4. Test the URLs in browser:" -ForegroundColor Yellow
Write-Host "   Visit: https://YOUR-5001-URL.ngrok-free.app/api/info" -ForegroundColor White
Write-Host "   Should show ML API information" -ForegroundColor White
Write-Host ""
Write-Host "5. Build your APK:" -ForegroundColor Yellow
Write-Host "   eas build --profile preview --platform android" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   - Keep ngrok windows running while building APK" -ForegroundColor White
Write-Host "   - Keep backends running while using APK" -ForegroundColor White
Write-Host "   - ngrok URLs change every restart (free tier)" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
