"""
Models package initialization
"""

from .color_classifier import ColorClassifier, SimpleColorClassifier
from .oil_yield_predictor import OilYieldPredictor

__all__ = [
    "ColorClassifier",
    "SimpleColorClassifier",
    "OilYieldPredictor"
]
