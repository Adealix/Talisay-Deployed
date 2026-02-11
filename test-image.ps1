<# 
  Talisay ML - Test/Predict from Image
  Quick command to analyze an image from the terminal
  
  Usage:
    .\test-image.ps1 "path\to\image.jpg"
    .\test-image.ps1   # Interactive mode
#>

param(
    [Parameter(Position=0)]
    [string]$ImagePath
)

$projectRoot = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TALISAY ML - Image Analysis          " -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

cd "$projectRoot\ml"

if ($ImagePath) {
    Write-Host "Analyzing: $ImagePath" -ForegroundColor Yellow
    Write-Host ""
    & "$projectRoot\.venv\Scripts\python.exe" predict.py --image $ImagePath
} else {
    Write-Host "No image path provided. Running demo..." -ForegroundColor Yellow
    Write-Host ""
    & "$projectRoot\.venv\Scripts\python.exe" predict.py --demo
}
