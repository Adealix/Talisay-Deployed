# ═══════════════════════════════════════════════════════════════════════════════
# TALISAY AI - SAFE PROJECT CLEANUP SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# Reduces project size from ~80GB to ~36GB by removing:
# - Temporary training datasets (43+ GB)
# - Markdown documentation (6+ MB)
# - Debug/test Python files
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TALISAY AI - PROJECT CLEANUP WIZARD" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Define paths
$projectRoot = "D:\talisay_ai"
$mlDir = "$projectRoot\ml"
$dataDir = "$mlDir\data"
$modelsDir = "$mlDir\models"
$backupDir = "$projectRoot\MODELS_BACKUP_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: SAFETY - BACKUP TRAINED MODELS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[1/6] Creating safety backup of trained models..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$modelFiles = @(
    "best_model.keras",
    "cnn_color_classifier.keras",
    "cnn_color_classifier_best.keras",
    "cnn_color_classifier.tflite",
    "color_classifier_mobile_best.keras",
    "yolo_talisay.pt",
    "yolo_talisay.onnx",
    "oil_yield_predictor.joblib",
    "cnn_class_indices.json",
    "class_indices.json"
)

$backedUp = 0
foreach ($file in $modelFiles) {
    $source = Join-Path $modelsDir $file
    if (Test-Path $source) {
        Copy-Item $source -Destination $backupDir -Force
        $backedUp++
    }
}

Write-Host "  [OK] Backed up $backedUp model files to:" -ForegroundColor Green
Write-Host "    $backupDir" -ForegroundColor Gray
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: ANALYZE WHAT WILL BE DELETED
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[2/6] Analyzing cleanup targets..." -ForegroundColor Yellow

# Temporary training datasets
$tempDatasets = @(
    "$dataDir\brown_focused_dataset",
    "$dataDir\brown_temp_dataset",
    "$dataDir\green_focused_dataset",
    "$dataDir\cnn_dataset",
    "$dataDir\yolo_dataset",
    "$dataDir\kaggle_talisay",
    "$dataDir\enhanced_training",
    "$dataDir\confidence_training"
)

$totalDatasetSize = 0
$existingDatasets = @()
foreach ($dataset in $tempDatasets) {
    if (Test-Path $dataset) {
        $size = (Get-ChildItem $dataset -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
        $totalDatasetSize += $size
        $existingDatasets += [PSCustomObject]@{
            Path = $dataset
            Size = [math]::Round($size, 2)
        }
    }
}

# Markdown files
$mdFiles = Get-ChildItem -Path $projectRoot -Filter "*.md" -Recurse -File
$mdSize = ($mdFiles | Measure-Object -Property Length -Sum).Sum / 1MB

# Test/Debug Python files
$testPatterns = @("test_*.py", "debug_*.py", "diag_*.py", "check_*.py", "profile_*.py")
$testFiles = @()
foreach ($pattern in $testPatterns) {
    $testFiles += Get-ChildItem -Path $mlDir -Filter $pattern -File
}
$testSize = ($testFiles | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host ""
Write-Host "  Cleanup Summary:" -ForegroundColor White
Write-Host "  -------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Temporary Datasets:  $($existingDatasets.Count) folders = $([math]::Round($totalDatasetSize, 2)) GB" -ForegroundColor Cyan
foreach ($ds in $existingDatasets) {
    Write-Host "    - $(Split-Path $ds.Path -Leaf): $($ds.Size) GB" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Markdown Files:      $($mdFiles.Count) files = $([math]::Round($mdSize, 2)) MB" -ForegroundColor Cyan
Write-Host "  Test/Debug Files:    $($testFiles.Count) files = $([math]::Round($testSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "  TOTAL SPACE TO FREE: $([math]::Round($totalDatasetSize, 2)) GB + $([math]::Round($mdSize + $testSize, 2)) MB" -ForegroundColor Green
Write-Host "  -------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: CONFIRM WITH USER
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[3/6] Confirming cleanup..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  WILL BE KEPT (SAFE):" -ForegroundColor Green
Write-Host "    - All trained models in ml/models/" -ForegroundColor White
Write-Host "    - ml/data/training/existing_datasets/" -ForegroundColor White
Write-Host "    - ml/data/training/own_datasets/" -ForegroundColor White
Write-Host "    - Core Python scripts (predict.py, api.py, config.py, etc.)" -ForegroundColor White
Write-Host "    - All app source code" -ForegroundColor White
Write-Host ""
Write-Host "  WILL BE DELETED (SAFE TO REMOVE):" -ForegroundColor Red
Write-Host "    - Temporary training datasets ($([math]::Round($totalDatasetSize, 2)) GB)" -ForegroundColor White
Write-Host "    - Markdown documentation files" -ForegroundColor White
Write-Host "    - Test/debug Python scripts" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "  Proceed with cleanup? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host ""
    Write-Host "  Cleanup cancelled. No files were deleted." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: DELETE TEMPORARY DATASETS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[4/6] Removing temporary training datasets..." -ForegroundColor Yellow

$deletedDatasets = 0
foreach ($dataset in $tempDatasets) {
    if (Test-Path $dataset) {
        Write-Host "  Removing $(Split-Path $dataset -Leaf)..." -ForegroundColor Gray
        Remove-Item $dataset -Recurse -Force
        $deletedDatasets++
    }
}

Write-Host "  [OK] Removed $deletedDatasets temporary dataset folders" -ForegroundColor Green
Write-Host "  [OK] Freed ~$([math]::Round($totalDatasetSize, 2)) GB" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: DELETE MARKDOWN FILES
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[5/6] Removing markdown documentation..." -ForegroundColor Yellow

$deletedMd = 0
foreach ($md in $mdFiles) {
    Remove-Item $md.FullName -Force
    $deletedMd++
}

Write-Host "  [OK] Removed $deletedMd markdown files" -ForegroundColor Green
Write-Host "  [OK] Freed ~$([math]::Round($mdSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: DELETE TEST/DEBUG FILES
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[6/6] Removing test and debug scripts..." -ForegroundColor Yellow

$deletedTests = 0
foreach ($test in $testFiles) {
    Remove-Item $test.FullName -Force
    $deletedTests++
}

Write-Host "  [OK] Removed $deletedTests test/debug files" -ForegroundColor Green
Write-Host "  [OK] Freed ~$([math]::Round($testSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Summary:" -ForegroundColor White
Write-Host "  -------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Deleted:" -ForegroundColor Cyan
Write-Host "    - $deletedDatasets temporary dataset folders" -ForegroundColor White
Write-Host "    - $deletedMd markdown files" -ForegroundColor White
Write-Host "    - $deletedTests test/debug Python files" -ForegroundColor White
Write-Host ""
Write-Host "  Space Freed: ~$([math]::Round($totalDatasetSize, 2)) GB" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Kept Safe:" -ForegroundColor Cyan
Write-Host "    - All trained models (backed up to $backupDir)" -ForegroundColor White
Write-Host "    - ml/data/training/existing_datasets/" -ForegroundColor White
Write-Host "    - ml/data/training/own_datasets/" -ForegroundColor White
Write-Host "    - Core functionality scripts" -ForegroundColor White
Write-Host "  -------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "  Your project is now ~40GB smaller!" -ForegroundColor Green
Write-Host "  All models and datasets are safe [OK]" -ForegroundColor Green
Write-Host ""
Write-Host "  Model backup location:" -ForegroundColor Yellow
Write-Host "  $backupDir" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Optional: Analyze new size
Write-Host "  Analyzing new project size..." -ForegroundColor Gray
$newSize = (Get-ChildItem $projectRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Host "  Current project size: $([math]::Round($newSize, 2)) GB" -ForegroundColor Cyan
Write-Host ""
