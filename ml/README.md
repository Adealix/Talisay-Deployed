# Talisay (Terminalia catappa) Oil Yield Prediction - ML Module

## Overview (v2.1.0)
This Python ML module provides machine learning capabilities for:
1. **Background Segmentation** - Isolate fruit from various backgrounds
2. **Color Classification** - Deep learning + HSV-based ripeness detection (Green, Yellow, Brown)
3. **Dimension Estimation** - Using ₱5 coin reference (25mm) for accurate measurements
4. **Oil Yield Prediction** - Random Forest + Gradient Boosting ensemble

## Quick Start

### Installation
```bash
cd ml
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Integrate & Train All Models
```bash
python integrate_and_train.py
```

### Analyze an Image
```bash
# With coin reference (recommended)
python predict.py --image path/to/fruit_with_coin.jpg

# View photo guide
python predict.py --guide
```

### Start API Server
```bash
python api.py
```

## 📸 Photo Guidelines

For best results when analyzing Talisay fruit:

```
┌────────────────────────────────┐
│                                │
│   ₱5 COIN          FRUIT      │
│   (left)           (right)    │
│     ○               🍃        │
│   25mm                        │
│                                │
│   WHITE/NEUTRAL BACKGROUND    │
│   (A4 paper recommended)      │
│                                │
└────────────────────────────────┘
```

**Key Tips:**
- Place ₱5 **NEW silver coin** (25mm) on the LEFT
- Place fruit on the RIGHT at similar vertical position
- Use **zoomed** view (fill 60-80% of frame)
- Take photo from **directly above** (top-down)
- Use **white/neutral background** (A4 paper works great)

## Scientific Background

### Oil Content by Fruit Maturity
Based on peer-reviewed research:

| Fruit Stage | Color | Oil Content (%) | Source |
|-------------|-------|-----------------|--------|
| Immature | Green | 45-49% | Côte d'Ivoire Study 2017 |
| Mature | Yellow | 57-60% | Santos et al. 2022, Janporn et al. |
| Fully Ripe | Brown | 54-57% | Agu et al. 2020 |

### Physical Parameters
- **Fruit Length**: 3.5 - 7.0 cm
- **Fruit Width**: 2.0 - 5.5 cm
- **Kernel Mass**: 0.1 - 0.9 g
- **Whole Fruit Weight**: 15 - 60 g
- **Consensus Oil Yield**: 49-65%

## Project Structure
```
ml/
├── README.md
├── requirements.txt
├── config.py
├── integrate_and_train.py      # Complete integration script
├── predict.py                  # Main prediction interface
├── train.py                    # Model training scripts
├── api.py                      # REST API server
├── data/
│   ├── kaggle_talisay/         # Kaggle training images
│   ├── training/               # Organized training data
│   └── synthetic_dataset.csv   # Generated oil yield data
├── models/
│   ├── color_classifier.py     # HSV + DL color detection
│   ├── color_classifier_kaggle.keras  # Trained MobileNetV2
│   ├── dimension_estimator.py  # Coin-based measurements
│   ├── oil_yield_predictor.py  # Ensemble prediction
│   ├── oil_yield_predictor.joblib
│   ├── advanced_segmenter.py   # Background removal
│   └── system_config.json      # Integrated parameters
└── test_images/                # Test images with coin
```

## Models

### 1. Color Classifier
- **Deep Learning**: MobileNetV2 trained on Kaggle Talisay images
- **HSV-Based**: Fast fallback with spot detection
- **Ensemble**: Combines both for best accuracy

### 2. Dimension Estimator
- **Coin Reference**: ₱5 Silver Coin (NEW - 25mm diameter)
- **Detection Rules**:
  - Coin on LEFT 45% of image
  - Size 6-22% of image width
  - Saturation 55-90 (warm lighting)
  - Gradient >35 (coin texture/embossing)

### 3. Oil Yield Predictor
- **Model**: Random Forest + Gradient Boosting ensemble
- **Features**: Color, dimensions, kernel mass
- **Accuracy**: MAE ~1.0%, R² ~0.93

## API Usage

### Endpoints
```
POST /analyze     - Analyze fruit image
GET  /health      - Server health check
GET  /models      - List available models
```

### Example Request
```python
import requests

files = {'image': open('fruit.jpg', 'rb')}
response = requests.post('http://localhost:5001/analyze', files=files)
result = response.json()

print(f"Color: {result['color']}")
print(f"Oil Yield: {result['oil_yield_percent']}%")
```

## Research References
1. Janporn et al. - Terminalia catappa kernel oil (~60%)
2. Agu et al. 2020 - RSM & ANN optimization (~60.3% yield)
3. Santos et al. 2022 - Purple vs yellow variety (57% vs 54%)
4. Côte d'Ivoire 2017 - Mature vs immature comparison

## Version History
- **v2.1.0** - Coin detection improvements (25mm, gradient filtering)
- **v2.0.0** - Deep learning color classifier, advanced segmentation
- **v1.0.0** - Initial release with basic prediction
