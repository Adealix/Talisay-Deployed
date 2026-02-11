<# 
  Talisay ML - Train Models
  Quick command to train the ML models
#>

$projectRoot = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TALISAY ML - Model Training          " -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

cd "$projectRoot\ml"
& "$projectRoot\.venv\Scripts\python.exe" train.py
