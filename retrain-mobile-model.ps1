# Retrain Talisay Model for Mobile Optimization
# Easy-to-use PowerShell script for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TALISAY MOBILE MODEL TRAINING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "ml\retrain_for_mobile.py")) {
    Write-Host "Error: Please run this script from the talisay_ml root directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Function to prompt user
function Show-Menu {
    Write-Host "Select training mode:" -ForegroundColor Green
    Write-Host "  1) Full Training (50 epochs, ~30-60 min with GPU)" -ForegroundColor White
    Write-Host "  2) Quick Training (10 epochs, ~10-15 min with GPU, for testing)" -ForegroundColor White
    Write-Host "  3) Test Existing Model Only" -ForegroundColor White
    Write-Host "  4) Prepare Training Data Only" -ForegroundColor White
    Write-Host "  5) Exit" -ForegroundColor White
    Write-Host ""
}

# Check Python and dependencies
Write-Host "Checking Python environment..." -ForegroundColor Yellow

$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    Write-Host "Error: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

Write-Host "  Found Python: $pythonCmd" -ForegroundColor Green

# Check TensorFlow
Write-Host "Checking TensorFlow..." -ForegroundColor Yellow
$tfCheck = & $pythonCmd -c "import tensorflow; print(tensorflow.__version__)" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "  TensorFlow not installed!" -ForegroundColor Red
    Write-Host ""
    $install = Read-Host "Install TensorFlow now? (y/n)"
    if ($install -eq 'y') {
        Write-Host "Installing TensorFlow..." -ForegroundColor Yellow
        & $pythonCmd -m pip install tensorflow
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install TensorFlow" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "TensorFlow is required. Exiting." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  TensorFlow version: $tfCheck" -ForegroundColor Green
}

Write-Host ""

# Main menu loop
do {
    Show-Menu
    $choice = Read-Host "Enter choice (1-5)"
    
    switch ($choice) {
        "1" {
            Write-Host ""
            Write-Host "Starting FULL TRAINING..." -ForegroundColor Cyan
            Write-Host "This will take 30-60 minutes with GPU, 2-4 hours with CPU" -ForegroundColor Yellow
            Write-Host ""
            $confirm = Read-Host "Continue? (y/n)"
            
            if ($confirm -eq 'y') {
                Set-Location ml
                & $pythonCmd retrain_for_mobile.py
                Set-Location ..
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Host "========================================" -ForegroundColor Green
                    Write-Host "TRAINING COMPLETED SUCCESSFULLY!" -ForegroundColor Green
                    Write-Host "========================================" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "Model saved to: ml\models\color_classifier_mobile_optimized.keras" -ForegroundColor Cyan
                    Write-Host ""
                    Write-Host "Next steps:" -ForegroundColor Yellow
                    Write-Host "  1. Test the model: python ml\test_mobile_model.py" -ForegroundColor White
                    Write-Host "  2. Restart your application to use the new model" -ForegroundColor White
                } else {
                    Write-Host ""
                    Write-Host "Training failed. Check error messages above." -ForegroundColor Red
                }
            }
            
            Write-Host ""
            Read-Host "Press Enter to continue"
            break
        }
        
        "2" {
            Write-Host ""
            Write-Host "Starting QUICK TRAINING..." -ForegroundColor Cyan
            Write-Host "This will take 10-15 minutes with GPU, 30-60 minutes with CPU" -ForegroundColor Yellow
            Write-Host ""
            
            Set-Location ml
            & $pythonCmd retrain_for_mobile.py --quick
            Set-Location ..
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "Quick training completed!" -ForegroundColor Green
                Write-Host "For production use, run full training (option 1)" -ForegroundColor Yellow
            } else {
                Write-Host ""
                Write-Host "Training failed. Check error messages above." -ForegroundColor Red
            }
            
            Write-Host ""
            Read-Host "Press Enter to continue"
            break
        }
        
        "3" {
            Write-Host ""
            Write-Host "Testing existing model..." -ForegroundColor Cyan
            
            Set-Location ml
            & $pythonCmd test_mobile_model.py
            Set-Location ..
            
            Write-Host ""
            Read-Host "Press Enter to continue"
            break
        }
        
        "4" {
            Write-Host ""
            Write-Host "Preparing training data..." -ForegroundColor Cyan
            
            Set-Location ml\data
            & $pythonCmd auto_label_kaggle.py
            Set-Location ..\..
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "Training data prepared successfully!" -ForegroundColor Green
                Write-Host "Review the labels: ml\data\kaggle_talisay\review_labels.html" -ForegroundColor Yellow
            }
            
            Write-Host ""
            Read-Host "Press Enter to continue"
            break
        }
        
        "5" {
            Write-Host ""
            Write-Host "Exiting..." -ForegroundColor Yellow
            exit 0
        }
        
        default {
            Write-Host ""
            Write-Host "Invalid choice. Please select 1-5." -ForegroundColor Red
            Write-Host ""
        }
    }
} while ($true)
