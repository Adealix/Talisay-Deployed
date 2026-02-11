# ========================================
# Build Environment Verification Script
# ========================================
# Run this before building APK to verify everything is set up correctly

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Talisay AI - Build Environment Verification        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# ─── Check EAS CLI ───
Write-Host "Checking EAS CLI..." -ForegroundColor Yellow
$eas = Get-Command eas -ErrorAction SilentlyContinue
if ($eas) {
    $version = eas --version 2>&1
    Write-Host "✅ EAS CLI installed: $version" -ForegroundColor Green
} else {
    Write-Host "❌ EAS CLI not found" -ForegroundColor Red
    Write-Host "   Install with: npm install -g eas-cli" -ForegroundColor Gray
    $allGood = $false
}

# ─── Check Expo Login ───
Write-Host ""
Write-Host "Checking Expo authentication..." -ForegroundColor Yellow
$whoami = eas whoami 2>&1 | Out-String
if ($whoami -notmatch "not logged in") {
    Write-Host "✅ Logged in to Expo as: $($whoami.Trim())" -ForegroundColor Green
} else {
    Write-Host "❌ Not logged in to Expo" -ForegroundColor Red
    Write-Host "   Login with: eas login" -ForegroundColor Gray
    $allGood = $false
}

# ─── Check ngrok ───
Write-Host ""
Write-Host "Checking ngrok..." -ForegroundColor Yellow
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrok) {
    $ngrokVersion = ngrok version 2>&1
    Write-Host "✅ ngrok installed: $ngrokVersion" -ForegroundColor Green
} else {
    Write-Host "❌ ngrok not found" -ForegroundColor Red
    Write-Host "   Download from: https://ngrok.com/download" -ForegroundColor Gray
    $allGood = $false
}

# ─── Check .env file ───
Write-Host ""
Write-Host "Checking configuration files..." -ForegroundColor Yellow
$envFile = "D:\talisay_ai\.env"
if (Test-Path $envFile) {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    # Read URLs
    $content = Get-Content $envFile -Raw
    $apiUrl = ($content | Select-String -Pattern 'EXPO_PUBLIC_API_URL=(.+)' | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
    $mlUrl = ($content | Select-String -Pattern 'EXPO_PUBLIC_ML_API_URL=(.+)' | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
    
    Write-Host ""
    Write-Host "   Node.js API URL: $apiUrl" -ForegroundColor White
    Write-Host "   Python ML URL:   $mlUrl" -ForegroundColor White
    Write-Host ""
    
    # Check API URL
    if ($apiUrl -match "localhost|127.0.0.1") {
        Write-Host "⚠️  API URL is localhost - won't work on different networks" -ForegroundColor Yellow
        Write-Host "   For production: Use ngrok or cloud deployment" -ForegroundColor Gray
    } elseif ($apiUrl -match "ngrok-free.app") {
        Write-Host "✅ Using ngrok URL for API (temporary - good for testing)" -ForegroundColor Green
    } elseif ($apiUrl -match "^https?://.*\." -and $apiUrl -notmatch "192.168|10.0") {
        Write-Host "✅ Using cloud/public URL for API (production-ready)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  API URL format unclear" -ForegroundColor Yellow
    }
    
    # Check ML URL
    if ($mlUrl -match "localhost|127.0.0.1") {
        Write-Host "⚠️  ML URL is localhost - won't work on different networks" -ForegroundColor Yellow
        Write-Host "   For production: Use ngrok or cloud deployment" -ForegroundColor Gray
    } elseif ($mlUrl -match "ngrok-free.app") {
        Write-Host "✅ Using ngrok URL for ML (temporary - good for testing)" -ForegroundColor Green
    } elseif ($mlUrl -match "^https?://.*\." -and $mlUrl -notmatch "192.168|10.0") {
        Write-Host "✅ Using cloud/public URL for ML (production-ready)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  ML URL format unclear" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    $allGood = $false
}

# ─── Check eas.json ───
Write-Host ""
$easJson = "D:\talisay_ai\eas.json"
if (Test-Path $easJson) {
    Write-Host "✅ eas.json exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  eas.json not found (will be created on first build)" -ForegroundColor Yellow
}

# ─── Check app.json ───
$appJson = "D:\talisay_ai\app.json"
if (Test-Path $appJson) {
    Write-Host "✅ app.json exists" -ForegroundColor Green
} else {
    Write-Host "❌ app.json not found" -ForegroundColor Red
    $allGood = $false
}

# ─── Test Backend Connectivity (if using ngrok/cloud) ───
Write-Host ""
Write-Host "Testing backend connectivity..." -ForegroundColor Yellow

if ($mlUrl -and $mlUrl -notmatch "localhost|127.0.0.1|192.168|10.0") {
    try {
        Write-Host "   Testing ML API: $mlUrl/api/info" -ForegroundColor Gray
        $response = Invoke-WebRequest -Uri "$mlUrl/api/info" -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ ML API is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ ML API not accessible: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Make sure Python ML server is running and ngrok tunnel is active" -ForegroundColor Gray
        $allGood = $false
    }
} else {
    Write-Host "⚠️  ML URL is local - skipping connectivity test" -ForegroundColor Yellow
}

if ($apiUrl -and $apiUrl -notmatch "localhost|127.0.0.1|192.168|10.0") {
    try {
        Write-Host "   Testing Node.js API: $apiUrl" -ForegroundColor Gray
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            Write-Host "✅ Node.js API is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
        }
    } catch {
        if ($_.Exception.Response.StatusCode -ne $null) {
            Write-Host "✅ Node.js API is accessible (Status: $($_.Exception.Response.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "❌ Node.js API not accessible: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Make sure Node.js server is running and ngrok tunnel is active" -ForegroundColor Gray
            $allGood = $false
        }
    }
} else {
    Write-Host "⚠️  API URL is local - skipping connectivity test" -ForegroundColor Yellow
}

# ─── Check Node & NPM ───
Write-Host ""
Write-Host "Checking development tools..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    $allGood = $false
}

$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($npm) {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found" -ForegroundColor Red
    $allGood = $false
}

# ─── Final Summary ───
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ All checks passed! Ready to build APK" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Make sure backends are running:" -ForegroundColor White
    Write-Host "   cd D:\talisay_ai\server; npm start" -ForegroundColor Gray
    Write-Host "   cd D:\talisay_ai\ml; .\venv\Scripts\activate; python api.py" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. If using ngrok, start tunnels:" -ForegroundColor White
    Write-Host "   .\setup-ngrok.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Build APK:" -ForegroundColor White
    Write-Host "   .\build-apk.ps1" -ForegroundColor Gray
} else {
    Write-Host "❌ Some checks failed - please fix issues above" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "- Install EAS CLI: npm install -g eas-cli" -ForegroundColor Gray
    Write-Host "- Login to Expo: eas login" -ForegroundColor Gray
    Write-Host "- Download ngrok: https://ngrok.com/download" -ForegroundColor Gray
    Write-Host "- Check .env file has correct URLs" -ForegroundColor Gray
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
