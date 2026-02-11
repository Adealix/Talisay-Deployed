<# 
  Talisay ML - Start All Services
  This script starts all 3 services needed for the full application:
  1. Python ML Backend (Flask API)
  2. Node.js Backend (Express API)
  3. React Native Expo Frontend
#>

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TALISAY ML - Starting All Services  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# 1. Start Python ML Backend
Write-Host "[1/3] Starting Python ML Backend..." -ForegroundColor Yellow
$mlCmd = "cd '$projectRoot\ml'; & '$projectRoot\.venv\Scripts\python.exe' api.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $mlCmd -WindowStyle Normal
Write-Host "      ML Backend starting on http://localhost:5000" -ForegroundColor Green

Start-Sleep -Seconds 2

# 2. Start Node.js Backend
Write-Host "[2/3] Starting Node.js Backend..." -ForegroundColor Yellow
$backendCmd = "cd '$projectRoot\server'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal
Write-Host "      Node Backend starting on http://localhost:3000" -ForegroundColor Green

Start-Sleep -Seconds 2

# 3. Start Expo Frontend
Write-Host "[3/3] Starting Expo Frontend..." -ForegroundColor Yellow
$expoCmd = "cd '$projectRoot'; npx expo start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $expoCmd -WindowStyle Normal
Write-Host "      Expo starting..." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services are starting!           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  - ML Backend:   http://localhost:5000" -ForegroundColor Gray
Write-Host "  - Node Backend: http://localhost:3000" -ForegroundColor Gray
Write-Host "  - Expo:         Check the Expo terminal" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop all services, close the terminal windows." -ForegroundColor Yellow
