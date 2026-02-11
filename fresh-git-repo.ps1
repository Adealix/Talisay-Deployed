# ===============================================================
# Create Fresh Git Repository (Clean History)
# ===============================================================
# This script removes git history and creates a clean repo
# suitable for pushing to GitHub (< 200 MB)
# ===============================================================

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  Fresh Git Repository Setup" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# Step 1: Remove old .git folder
Write-Host "[1/6] Removing old .git folder..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Remove-Item -Path ".git" -Recurse -Force
    Write-Host "  ✓ Old git history removed" -ForegroundColor Green
} else {
    Write-Host "  ✓ No .git folder found" -ForegroundColor Green
}
Write-Host ""

# Step 2: Initialize fresh repository
Write-Host "[2/6] Initializing fresh git repository..." -ForegroundColor Yellow
git init
git branch -M main
Write-Host "  ✓ Fresh repository initialized" -ForegroundColor Green
Write-Host ""

# Step 3: Get GitHub repository URL
Write-Host "[3/6] GitHub Repository Setup" -ForegroundColor Yellow
Write-Host "Enter your GitHub repository URL:" -ForegroundColor Cyan
Write-Host "Format: https://github.com/USERNAME/REPO_NAME.git" -ForegroundColor Gray
$repoUrl = Read-Host "GitHub URL"

if ($repoUrl) {
    git remote add origin $repoUrl
    Write-Host "  ✓ Remote added: $repoUrl" -ForegroundColor Green
} else {
    Write-Host "  ! No remote added (you can add it later)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Stage files (respects .gitignore)
Write-Host "[4/6] Staging files..." -ForegroundColor Yellow
git add .
Write-Host "  ✓ Files staged (respecting .gitignore)" -ForegroundColor Green
Write-Host ""

# Step 5: Show what will be committed
Write-Host "[5/6] Files to be committed:" -ForegroundColor Yellow
git status --short | Select-Object -First 20
$fileCount = (git diff --cached --name-only | Measure-Object).Count
Write-Host "`n  Total files: $fileCount" -ForegroundColor Cyan
Write-Host ""

# Step 6: Confirm and commit
$confirm = Read-Host "Create initial commit? (y/n)"
if ($confirm -eq 'y') {
    Write-Host "[6/6] Creating initial commit..." -ForegroundColor Yellow
    git commit -m "Initial commit - Talisay AI deployment ready (cleaned repo)"
    Write-Host "  ✓ Initial commit created" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "  ✓ Fresh repository ready!" -ForegroundColor Green
    Write-Host "===============================================`n" -ForegroundColor Green
    
    if ($repoUrl) {
        Write-Host "Next step: Push to GitHub" -ForegroundColor Cyan
        Write-Host "  git push -u origin main`n" -ForegroundColor White
    } else {
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. git remote add origin YOUR_GITHUB_URL" -ForegroundColor White
        Write-Host "  2. git push -u origin main`n" -ForegroundColor White
    }
} else {
    Write-Host "`nCommit cancelled. Files are staged and ready." -ForegroundColor Yellow
    Write-Host "To commit later: git commit -m 'Initial commit'`n" -ForegroundColor Cyan
}
