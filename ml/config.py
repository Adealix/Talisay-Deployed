"""
Talisay Oil Yield Prediction - Configuration
Based on scientific research data from Terminalia catappa studies
"""

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
TRAINING_DATA_DIR = DATA_DIR / "training"

# Ensure directories exist
for dir_path in [DATA_DIR, MODELS_DIR, TRAINING_DATA_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# ============================================================================# API SERVER CONFIGURATION
# ============================================================================

API_CONFIG = {
    "host": "0.0.0.0",  # Listen on all network interfaces
    "port": int(os.environ.get("PORT", 5001)),  # Use Render's PORT env var, fallback to 5001
    "debug": False,     # Set to False in production
    "max_content_length": 16 * 1024 * 1024,  # 16 MB max file upload
}

# ============================================================================# SCIENTIFIC CONSTANTS - Based on Terminalia catappa research
# ============================================================================

# Fruit color classifications
FRUIT_COLORS = ["green", "yellow", "brown"]

# Physical dimension ranges (in cm and grams)
# Based on: Various Terminalia catappa morphological studies
# Talisay fruit length range: 2.5-10cm (varies by maturity and variety)
DIMENSION_RANGES = {
    "length": {"min": 3.0, "max": 8.0, "unit": "cm"},
    "width": {"min": 1.5, "max": 6.0, "unit": "cm"},
    "kernel_mass": {"min": 0.1, "max": 0.9, "unit": "g"},
    "whole_fruit_weight": {"min": 15.0, "max": 60.0, "unit": "g"},
}

# Oil yield percentages by fruit color/maturity
# Based on:
# - Janporn et al. - Terminalia catappa seed oil (~60%)
# - Agu et al. 2020 - RSM & ANN optimization (~60.3%)
# - Santos et al. 2022 - Purple vs yellow variety (57% vs 54%)
# - Côte d'Ivoire 2017 - Mature vs unripe comparison
OIL_YIELD_BY_COLOR = {
    "green": {
        "mean": 47.0,
        "min": 45.0,
        "max": 49.0,
        "std": 1.5,
        "description": "Immature fruit - lowest oil content"
    },
    "yellow": {
        "mean": 58.5,
        "min": 57.0,
        "max": 60.0,
        "std": 1.2,
        "description": "Mature fruit - highest oil content"
    },
    "brown": {
        "mean": 55.5,
        "min": 54.0,
        "max": 57.0,
        "std": 1.3,
        "description": "Fully ripe/overripe - slightly lower than yellow"
    }
}

# Correlation factors for oil yield prediction
# Higher values = stronger positive correlation with oil yield
CORRELATION_FACTORS = {
    "kernel_mass": 0.85,      # Strong positive correlation
    "fruit_length": 0.65,     # Moderate positive correlation
    "fruit_width": 0.60,      # Moderate positive correlation
    "whole_fruit_weight": 0.55,  # Moderate correlation
}

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

# Image processing
IMAGE_SIZE = (224, 224)
IMAGE_CHANNELS = 3

# Color classification model
COLOR_MODEL_CONFIG = {
    "architecture": "MobileNetV2",
    "pretrained": True,
    "num_classes": 3,
    "dropout_rate": 0.3,
    "learning_rate": 0.001,
}

# Fruit detection model
DETECTION_MODEL_CONFIG = {
    "architecture": "EfficientNetB0",
    "pretrained": True,
    "num_classes": 2,  # Talisay vs Not Talisay
    "confidence_threshold": 0.75,
}

# Dimension estimation model (regression)
DIMENSION_MODEL_CONFIG = {
    "architecture": "ResNet50",
    "pretrained": True,
    "output_features": 3,  # length, width, weight
    "learning_rate": 0.0001,
}

# Oil yield prediction model
OIL_YIELD_MODEL_CONFIG = {
    "type": "ensemble",  # Random Forest + Gradient Boosting
    "input_features": ["color_encoded", "length", "width", "weight"],
    "output": "oil_yield_percent",
}

# Training configuration
TRAINING_CONFIG = {
    "batch_size": 32,
    "epochs": 50,
    "validation_split": 0.2,
    "early_stopping_patience": 10,
    "reduce_lr_patience": 5,
    "data_augmentation": True,
}

# API configuration
API_CONFIG = {
    "host": "0.0.0.0",
    "port": 5001,
    "debug": False,
    "max_content_length": 16 * 1024 * 1024,  # 16MB max upload
}

# ============================================================================
# RESEARCH REFERENCE DATA
# ============================================================================

RESEARCH_REFERENCES = [
    {
        "authors": "Janporn et al.",
        "title": "Terminalia catappa kernel oil characterization",
        "oil_yield": "~60%",
        "notes": "Comprehensive kernel oil analysis"
    },
    {
        "authors": "Agu et al.",
        "year": 2020,
        "title": "Response Surface Methodology and Artificial Neural Network optimization",
        "oil_yield": "60.3%",
        "notes": "Optimized extraction methods"
    },
    {
        "authors": "Santos et al.",
        "year": 2022,
        "title": "Oil content comparison between purple and yellow varieties",
        "findings": {
            "purple_variety": "57%",
            "yellow_variety": "54%"
        },
        "notes": "Variety-specific oil content"
    },
    {
        "location": "Côte d'Ivoire",
        "year": 2017,
        "title": "Mature vs immature fruit oil comparison",
        "findings": {
            "mature": "Higher oil content",
            "immature": "Lower oil content"
        },
        "notes": "Maturity stage affects oil yield"
    }
]

# Synthetic dataset generation parameters
SYNTHETIC_DATA_CONFIG = {
    "num_samples": 1000,
    "noise_level": 0.05,
    "color_distribution": {
        "green": 0.25,
        "yellow": 0.50,  # Most commonly harvested
        "brown": 0.25
    }
}
