# Python ML Backend Setup Guide

## Quick Setup

### Step 1: Create Virtual Environment
```powershell
# Navigate to ml directory
cd ml

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Your prompt should now show (venv)
```

### Step 2: Install Dependencies
```powershell
# Make sure venv is activated (you should see (venv) in your prompt)
pip install -r requirements.txt
```

This will install:
- TensorFlow (Deep Learning)
- NumPy & Pandas (Data Processing)
- OpenCV & Pillow (Image Processing)
- Flask & Flask-CORS (API Server)
- scikit-learn (ML Utilities)
- matplotlib & seaborn (Visualization)
- Other dependencies

### Step 3: Verify Installation
```powershell
# Check if Flask is installed
python -c "import flask; print(flask.__version__)"

# Check if TensorFlow is installed
python -c "import tensorflow; print(tensorflow.__version__)"

# Check if OpenCV is installed
python -c "import cv2; print(cv2.__version__)"
```

### Step 4: Run ML API
```powershell
# Make sure you're in the ml directory with venv activated
python api.py
```

You should see:
```
 * Serving Flask app 'api'
 * Running on http://localhost:5000
```

## Common Issues & Solutions

### Issue 1: Python not found
**Solution:** 
- Install Python 3.8+ from python.org
- Make sure Python is added to PATH during installation
- Restart PowerShell after installation

### Issue 2: pip not found
**Solution:**
```powershell
python -m ensurepip --upgrade
```

### Issue 3: TensorFlow installation fails
**Solution:**
```powershell
# Try installing with specific version
pip install tensorflow==2.15.0

# Or use CPU-only version if you don't have GPU
pip install tensorflow-cpu
```

### Issue 4: OpenCV installation fails
**Solution:**
```powershell
# Install prebuilt binary
pip install opencv-python-headless
```

### Issue 5: Permission errors on Windows
**Solution:**
```powershell
# Run PowerShell as Administrator, or use:
pip install --user -r requirements.txt
```

## Testing the ML Backend

### Test 1: API Health Check
```powershell
# In another terminal (keep ML server running)
curl http://localhost:5000/
```

Expected response: `{"status": "ok"}`

### Test 2: Predict with Test Image
```python
# test_prediction.py
import requests

url = "http://localhost:5000/predict"
files = {"image": open("test_images/talisay1.jpg", "rb")}
response = requests.post(url, files=files)
print(response.json())
```

Run it:
```powershell
python test_prediction.py
```

### Test 3: Use Built-in Test Script
```powershell
python test_image.py test_images/talisay1.jpg
```

## Training Your Own Model

### Option 1: Quick Training (Using Provided Scripts)
```powershell
# Train standard model
python train.py

# Train mobile-optimized model
python train_mobile_optimized.py

# Models will be saved to ml/models/
```

### Option 2: Using PowerShell Script
```powershell
# From project root
.\train-model.ps1
```

### Option 3: Retrain for Mobile
```powershell
.\retrain-mobile-model.ps1
```

## Directory Structure

```
ml/
├── venv/                    # Virtual environment (create this)
├── data/
│   ├── training/
│   │   ├── green/          # 1000+ training images
│   │   └── yellow/         # 90+ training images
│   └── generate_dataset.py
├── models/                  # Trained models saved here
│   ├── talisay_model.h5    # Standard model
│   └── talisay_mobile.tflite # Mobile model
├── test_images/            # Test images
├── api.py                  # Flask API server
├── predict.py              # Prediction logic
├── train.py                # Training script
├── config.py               # Configuration
└── requirements.txt        # Dependencies
```

## API Endpoints

### POST /predict
Predict oil yield from uploaded image.

**Request:**
```bash
curl -X POST -F "image=@path/to/image.jpg" http://localhost:5000/predict
```

**Response:**
```json
{
  "prediction": {
    "class": "green",
    "confidence": 0.95,
    "oil_yield": 42.5
  },
  "status": "success"
}
```

## Development Tips

### Keep venv Activated
Always activate venv before working:
```powershell
cd ml
.\venv\Scripts\activate
```

### Deactivate venv
When done working:
```powershell
deactivate
```

### Update Dependencies
If you add new packages:
```powershell
pip freeze > requirements.txt
```

### Check Installed Packages
```powershell
pip list
```

## Performance Tips

### For Training:
- Use GPU if available (requires CUDA-enabled TensorFlow)
- Adjust batch size in config.py
- Monitor GPU usage with nvidia-smi

### For API:
- Use production WSGI server (gunicorn, waitress)
- Enable caching for repeated predictions
- Consider model quantization for mobile

## Next Steps

1. ✅ Create virtual environment
2. ✅ Install dependencies
3. ✅ Test ML API
4. 🔲 Train your own model (or use existing)
5. 🔲 Integrate with Node.js backend
6. 🔲 Test end-to-end workflow

## Need Help?

Check these files:
- [ML README](README.md) - Detailed ML documentation
- [Mobile Training Guide](MOBILE_TRAINING_GUIDE.md) - Mobile optimization
- [Main README](../README.md) - Complete project documentation

---

**Setup Guide Created:** February 6, 2026  
**Python Version Required:** 3.8+  
**Key Dependencies:** TensorFlow 2.15+, Flask 3.0+, OpenCV 4.8+
