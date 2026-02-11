<# 
  Talisay ML - Start ML Backend Only
  Quick command to start just the Python ML Flask server
#>

$projectRoot = $PSScriptRoot

Write-Host "Starting Python ML Backend..." -ForegroundColor Cyan
Write-Host "Server will be available at: http://localhost:5000" -ForegroundColor Green
Write-Host ""

cd "$projectRoot\ml"
& "$projectRoot\.venv\Scripts\python.exe" api.py
