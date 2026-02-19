# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# TALISAY AI â€” Ngrok + ML API Launcher
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# This script starts the local ML API (api.py) and creates a
# public HTTPS tunnel via ngrok so your mobile app and other
# devices can access it from anywhere on the internet.
#
# HOW IT WORKS:
#   1. Your Python ML API runs locally on port 5001
#   2. Ngrok creates a secure tunnel: internet â†’ your laptop
#   3. Any device with the ngrok URL can call the API
#   4. As long as YOUR LAPTOP is on + this script is running = API is live
#
# USAGE:
#   1. Run this script: .\start-ngrok.ps1
#   2. Copy the ngrok URL shown (e.g. https://xxxx.ngrok-free.app)
#   3. In the app â†’ Scan page â†’ tap "ML Status" badge â†’ paste ngrok URL
#   4. The app will use ngrok automatically (localhost stays as fallback)
#
# REQUIREMENTS:
#   - ngrok installed (auto-installs below if missing)
#   - Python ML venv at ml\venv\
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

$ErrorActionPreference = "Continue"
$ScriptDir = $PSScriptRoot

Write-Host ""
Write-Host "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—" -ForegroundColor Cyan
Write-Host "â•‘       TALISAY AI â€” Ngrok ML API Launcher             â•‘" -ForegroundColor Cyan
Write-Host "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor Cyan
Write-Host ""

# â”€â”€â”€ Step 1: Check / Install ngrok â”€â”€â”€
$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCmd) {
    Write-Host "ðŸ“¦ ngrok not found. Installing via winget..." -ForegroundColor Yellow
    try {
        winget install ngrok.ngrok --silent -ErrorAction SilentlyContinue
        $ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
        if (-not $ngrokCmd) {
            Write-Host "âš ï¸  winget install failed. Trying Chocolatey..." -ForegroundColor Yellow
            choco install ngrok -y 2>$null
            $ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "   Installation attempt failed, checking if ngrok is available..." -ForegroundColor Gray
        $ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
    }
    
    if (-not $ngrokCmd) {
        Write-Host ""
        Write-Host "âŒ Could not auto-install ngrok." -ForegroundColor Red
        Write-Host "   Please install manually:" -ForegroundColor Yellow
        Write-Host "   1. Go to https://ngrok.com/download" -ForegroundColor White
        Write-Host "   2. Download the Windows ZIP" -ForegroundColor White
        Write-Host "   3. Extract ngrok.exe to C:\Windows\System32\" -ForegroundColor White
        Write-Host "   4. Run this script again" -ForegroundColor White
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Host "âœ… ngrok installed!" -ForegroundColor Green
}

# â”€â”€â”€ Step 2: Check ngrok auth token â”€â”€â”€
$ngrokConfig = "$env:USERPROFILE\.ngrok2\ngrok.yml"
$ngrokConfigV3 = "$env:USERPROFILE\AppData\Local\ngrok\ngrok.yml"
$hasToken = (Test-Path $ngrokConfig) -or (Test-Path $ngrokConfigV3)

if (-not $hasToken) {
    Write-Host ""
    Write-Host "ðŸ”‘ ngrok requires a free account for tunnels." -ForegroundColor Yellow
    Write-Host "   1. Sign up free at: https://dashboard.ngrok.com/signup" -ForegroundColor White
    Write-Host "   2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
    Write-Host ""
    $token = Read-Host "Paste your ngrok authtoken here"
    if ($token) {
        ngrok config add-authtoken $token
        Write-Host "âœ… Auth token saved!" -ForegroundColor Green
    } else {
        Write-Host "âš ï¸  No token entered. Ngrok may fail." -ForegroundColor Yellow
    }
}

# â”€â”€â”€ Step 3: Start ML API (api.py) â”€â”€â”€
Write-Host ""
Write-Host "ðŸ Starting ML API on port 5001..." -ForegroundColor Cyan

$mlDir = Join-Path $ScriptDir "ml"
$pythonExe = Join-Path $mlDir "venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    # Try system python
    $pythonExe = "python"
    Write-Host "   Using system Python (venv not found at ml\venv)" -ForegroundColor Yellow
}

# Start api.py as a background job
$apiJob = Start-Job -ScriptBlock {
    param($mlDir, $pythonExe)
    Set-Location $mlDir
    & $pythonExe api.py 2>&1
} -ArgumentList $mlDir, $pythonExe

Write-Host "   ML API starting (Job ID: $($apiJob.Id))..." -ForegroundColor Gray

# Wait a moment for Flask to start
Start-Sleep -Seconds 4

# Quick health check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5001/" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "âœ… ML API is healthy!" -ForegroundColor Green
} catch {
    Write-Host "âš ï¸  ML API may still be starting... continuing anyway" -ForegroundColor Yellow
}

# â”€â”€â”€ Step 4: Start ngrok tunnel â”€â”€â”€
Write-Host ""
Write-Host "ðŸŒ Starting ngrok tunnel to port 5001..." -ForegroundColor Cyan

# Start ngrok HTTP tunnel on port 5001
$ngrokJob = Start-Job -ScriptBlock {
    ngrok http 5001 --log=stdout
}

# Wait for ngrok to establish the tunnel
Start-Sleep -Seconds 4

# â”€â”€â”€ Step 5: Get the public ngrok URL â”€â”€â”€
$ngrokUrl = $null
$attempts = 0
while (-not $ngrokUrl -and $attempts -lt 10) {
    try {
        $tunnelInfo = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 3 -ErrorAction Stop
        $httpsTunnel = $tunnelInfo.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        $ngrokUrl = $httpsTunnel.public_url
    }
    catch {
        # Silently continue, will retry
    }
    if (-not $ngrokUrl) {
        $attempts++
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
if ($ngrokUrl) {
    Write-Host "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—" -ForegroundColor Green
    Write-Host "â•‘  âœ…  NGROK TUNNEL ACTIVE                             â•‘" -ForegroundColor Green
    Write-Host "â•‘                                                      â•‘" -ForegroundColor Green
    Write-Host "â•‘  Public URL:                                         â•‘" -ForegroundColor Green
    Write-Host "â•‘  $ngrokUrl" -ForegroundColor White
    Write-Host "â•‘                                                      â•‘" -ForegroundColor Green
    Write-Host "â•‘  HOW TO USE IN THE APP:                              â•‘" -ForegroundColor Green
    Write-Host "â•‘  1. Open Talisay AI app                              â•‘" -ForegroundColor Green
    Write-Host "â•‘  2. Go to Scan page                                  â•‘" -ForegroundColor Green
    Write-Host "â•‘  3. Tap the ML Status badge (top right)              â•‘" -ForegroundColor Green  
    Write-Host "â•‘  4. Paste the URL above                              â•‘" -ForegroundColor Green
    Write-Host "â•‘                                                      â•‘" -ForegroundColor Green
    Write-Host "â•‘  Press Ctrl+C to stop everything                     â•‘" -ForegroundColor Green
    Write-Host "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor Green
    Write-Host ""
    
    # Also copy to clipboard
    $ngrokUrl | Set-Clipboard
    Write-Host "ðŸ“‹ URL copied to clipboard!" -ForegroundColor Cyan
    
    # Save to a file for easy access
    $ngrokUrl | Out-File -FilePath (Join-Path $ScriptDir ".ngrok-url") -Encoding utf8
    Write-Host "ðŸ’¾ URL saved to .ngrok-url file" -ForegroundColor Cyan
} else {
    Write-Host "âš ï¸  Could not get ngrok URL automatically." -ForegroundColor Yellow
    Write-Host "   Check ngrok dashboard at: http://localhost:4040" -ForegroundColor White
}

# â”€â”€â”€ Step 6: Monitor and keep alive â”€â”€â”€
Write-Host ""
Write-Host "â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor DarkGray
Write-Host " Both services are running." -ForegroundColor Gray
Write-Host " Keep this window open to maintain the tunnel." -ForegroundColor Gray
Write-Host " Press Ctrl+C to stop everything." -ForegroundColor Gray
Write-Host "â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor DarkGray
Write-Host ""

# Keep showing status every 30 seconds
try {
    while ($true) {
        Start-Sleep -Seconds 30
        $apiRunning = (Get-Job $apiJob.Id).State -eq "Running"
        $ngrokRunning = (Get-Job $ngrokJob.Id).State -eq "Running"
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] ML API: $(if ($apiRunning) {'âœ… Running'} else {'âŒ Stopped'})" -NoNewline
        Write-Host " | Ngrok: $(if ($ngrokRunning) {'âœ… Running'} else {'âŒ Stopped'})" -ForegroundColor Gray
    }
} finally {
    Write-Host ""
    Write-Host "ðŸ›‘ Stopping services..." -ForegroundColor Yellow
    Stop-Job $apiJob -ErrorAction SilentlyContinue
    Stop-Job $ngrokJob -ErrorAction SilentlyContinue
    Remove-Job $apiJob -ErrorAction SilentlyContinue
    Remove-Job $ngrokJob -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $ScriptDir ".ngrok-url") -ErrorAction SilentlyContinue
    Write-Host "âœ… All services stopped." -ForegroundColor Green
}

