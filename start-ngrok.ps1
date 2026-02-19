# TALISAY AI - Ngrok Launcher (ML API + Expo Frontend)

$ErrorActionPreference = "Continue"

if ($PSScriptRoot) { $ScriptDir = $PSScriptRoot }
else { $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition }

Write-Host ""
Write-Host "=============================================="
Write-Host "TALISAY AI - Ngrok Launcher"
Write-Host "  ML API  (port 5001)"
Write-Host "=============================================="
Write-Host ""

# ----------------------------
# STEP 1 - Check ngrok
# ----------------------------

$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCmd) {
    Write-Host "ngrok not found. Install from: https://ngrok.com/download"
    Read-Host "Press Enter to exit"
    exit 1
}

# ----------------------------
# STEP 2 - Start ML API
# ----------------------------

Write-Host "[1/4] Starting ML API (Python)..."

$mlDir     = Join-Path $ScriptDir "ml"
$pythonExe = Join-Path $mlDir "venv\Scripts\python.exe"
$apiScript = Join-Path $mlDir "api.py"
$apiLogFile = Join-Path $mlDir "api_output.log"
$apiErrFile = Join-Path $mlDir "api_error.log"

if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
    Write-Host "  Using system python."
}

try {
    $apiProcess = Start-Process `
        -FilePath $pythonExe `
        -ArgumentList $apiScript `
        -WorkingDirectory $mlDir `
        -NoNewWindow `
        -RedirectStandardOutput $apiLogFile `
        -RedirectStandardError $apiErrFile `
        -PassThru
    Write-Host "  ML API started (PID: $($apiProcess.Id))"
}
catch {
    Write-Host "  ERROR: Failed to start ML API: $_"
    exit 1
}

# ----------------------------
# STEP 3 - Start ngrok (both tunnels in ONE agent)
# ----------------------------
# Only tunnel the ML API. Expo uses --tunnel mode (its own tunnel)
# or runs directly on the LAN. No need for an ngrok expo tunnel.

Write-Host "[2/4] Starting ngrok tunnel (python ML API only)..."

# Kill any leftover ngrok sessions first
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

try {
    $ngrokProcess = Start-Process `
        -FilePath "ngrok" `
        -ArgumentList "start python" `
        -PassThru
    Write-Host "  ngrok started (PID: $($ngrokProcess.Id))"
}
catch {
    Write-Host "  ERROR: Failed to start ngrok: $_"
    exit 1
}

Start-Sleep -Seconds 4

# ----------------------------
# STEP 4 - Retrieve both tunnel URLs
# ----------------------------

Write-Host "[3/4] Retrieving ML API tunnel URL..."

$mlUrl   = $null
$attempts = 0

while ($attempts -lt 12) {
    try {
        $tunnelInfo = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 3
        foreach ($t in $tunnelInfo.tunnels) {
            if ($t.proto -eq "https") {
                if ($t.name -eq "python" -or $t.config.addr -match "5001") { $mlUrl = $t.public_url }
            }
        }
    }
    catch {}

    if ($mlUrl) { break }
    Start-Sleep -Seconds 2
    $attempts++
}

if (-not $mlUrl) {
    Write-Host "  WARNING: Could not retrieve ML API tunnel URL."
    Write-Host "  Check http://localhost:4040 manually."
}

# (No Expo tunnel — Expo runs separately via: npx expo start --tunnel)

# ----------------------------
# Wait for ML API health
# ----------------------------

Write-Host ""
Write-Host "Waiting for ML API to finish loading models..."
Start-Sleep -Seconds 6

$apiReady = $false
for ($i = 0; $i -lt 5; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5001/" -TimeoutSec 3
        if ($health.status -eq "healthy") {
            Write-Host "ML API: Ready"
            $apiReady = $true; break
        }
        elseif ($health.status -eq "limited") {
            Write-Host "ML API: Limited -- $($health.details)"
            $apiReady = $true; break
        }
    }
    catch {}
    Write-Host "  Retrying ML API health check... ($($i+1)/5)"
    Start-Sleep -Seconds 3
}

if (-not $apiReady) {
    Write-Host ""
    Write-Host "WARNING: ML API did not respond in time."
    Write-Host "  Output : $apiLogFile"
    Write-Host "  Errors : $apiErrFile"
}

# ----------------------------
# Summary
# ----------------------------

Write-Host ""
Write-Host "=============================================="
Write-Host "ML API TUNNEL ACTIVE"
Write-Host ""
if ($mlUrl) { Write-Host "  ML API : $mlUrl" } else { Write-Host "  ML API : see http://localhost:4040" }
Write-Host ""
Write-Host "To start the frontend separately:"
Write-Host "  npx expo start --tunnel"
Write-Host "=============================================="
Write-Host ""
Write-Host "Press CTRL+C to stop all services."
Write-Host ""

try {
    while ($true) { Start-Sleep -Seconds 30; Write-Host "Running..." }
}
finally {
    Write-Host "Stopping services..."
    if ($apiProcess    -and -not $apiProcess.HasExited)    { Stop-Process -Id $apiProcess.Id    -Force }
    if ($ngrokProcess  -and -not $ngrokProcess.HasExited)  { Stop-Process -Id $ngrokProcess.Id  -Force }
    Write-Host "Stopped."
}
