"""
Main Prediction Interface for Talisay Oil Yield Analysis
Combines all models for end-to-end fruit analysis

INTEGRATED FEATURES:
- Advanced background segmentation (supports multiple scenarios)
- Dimension estimation with coin reference (₱5 silver coin default)
- Deep learning color classification (MobileNetV2 trained on Kaggle)
- HSV-based color classification with spot detection
- Oil yield prediction based on scientific research
"""

import numpy as np
from pathlib import Path
import sys
from typing import Union, Optional, Dict, Any
import json

sys.path.append(str(Path(__file__).parent))

from config import OIL_YIELD_BY_COLOR, DIMENSION_RANGES


class TalisayPredictor:
    """
    Main prediction class that combines all analysis steps:
    1. Background segmentation (isolate fruit from scene)
    2. Fruit identification (Is this a Talisay fruit?)
    3. Color classification (Green/Yellow/Brown) with spot detection
    4. Dimension estimation (Length, Width, Weight) with reference object
    5. Oil yield prediction
    
    Supports two color classification modes:
    - Simple (HSV-based): Fast, no GPU required, good accuracy
    - Deep Learning (MobileNetV2): Higher accuracy, trained on real images
    """
    
    def __init__(
        self,
        color_model_path: str = None,
        oil_model_path: str = None,
        use_simple_color: bool = True,
        use_deep_learning_color: bool = False,
        reference_coin: str = "peso_5",
        enable_segmentation: bool = True,
        use_yolo: bool = True,
        use_cnn: bool = True
    ):
        """
        Initialize the Talisay predictor.
        
        Args:
            color_model_path: Path to trained color classification model
            oil_model_path: Path to trained oil yield model
            use_simple_color: Use HSV-based color detection (fast, no GPU)
            use_deep_learning_color: Use MobileNetV2 trained on Kaggle images
            reference_coin: Reference coin type for dimension estimation
                           ("peso_5", "peso_5_new", "peso_5_old", "peso_1", etc.)
            enable_segmentation: Enable advanced background segmentation
            use_yolo: Use YOLOv8 for object detection (coin + fruit)
            use_cnn: Use enhanced CNN for color classification
        """
        self.use_simple_color = use_simple_color
        self.use_deep_learning_color = use_deep_learning_color
        self.use_yolo = use_yolo
        self.use_cnn = use_cnn
        self.reference_coin = reference_coin
        self.enable_segmentation = enable_segmentation
        
        # Model components
        self.color_classifier = None
        self.dl_color_classifier = None
        self.cnn_classifier = None      # NEW: Enhanced CNN classifier
        self.yolo_detector = None        # NEW: YOLO object detector
        self.oil_predictor = None
        self.dimension_estimator = None
        self.segmenter = None
        self.fruit_validator = None
        self.talisay_guard = None        # NEW: Multi-layer security guard
        
        # Model paths - Use best available models
        self.models_dir = Path(__file__).parent / "models"
        
        # Priority order: mobile_best > best_model > color_classifier_best
        mobile_best_path = self.models_dir / "color_classifier_mobile_best.keras"
        best_model_path = self.models_dir / "best_model.keras"
        color_best_path = self.models_dir / "color_classifier_best.keras"
        
        if color_model_path:
            self.dl_model_path = color_model_path
        elif mobile_best_path.exists():
            self.dl_model_path = str(mobile_best_path)
            print("ℹ Using mobile-optimized best color classifier")
        elif best_model_path.exists():
            self.dl_model_path = str(best_model_path)
            print("ℹ Using best color classifier model")
        else:
            self.dl_model_path = str(color_best_path)
        
        # Class indices (try mobile version first)
        mobile_indices_path = self.models_dir / "class_indices_mobile.json"
        standard_indices_path = self.models_dir / "class_indices.json"
        
        if mobile_indices_path.exists():
            self.class_indices_path = mobile_indices_path
        else:
            self.class_indices_path = standard_indices_path
        
        # Initialize components
        self._initialize_components()
    
    def _initialize_components(self):
        """Initialize all prediction components."""
        # ============================================================
        # FIRST: Initialize TalisayGuard (multi-layer security)
        # ============================================================
        try:
            from models.talisay_guard import TalisayGuard
            self.talisay_guard = TalisayGuard()
            print("✓ TalisayGuard multi-layer security initialized")
        except Exception as e:
            print(f"⚠ TalisayGuard unavailable ({e}), using basic validation")
            self.talisay_guard = None
        
        # ============================================================
        # NEW: Initialize YOLO detector (coin + fruit detection)
        # ============================================================
        if self.use_yolo:
            try:
                from models.yolo_detector import YOLODetector
                self.yolo_detector = YOLODetector()
                if self.yolo_detector.model_loaded:
                    print("✓ YOLO object detector initialized")
                else:
                    print("ℹ YOLO model not trained yet, using fallback detection")
                    self.yolo_detector = None
            except Exception as e:
                print(f"ℹ YOLO unavailable ({e}), using fallback detection")
                self.yolo_detector = None
        
        # ============================================================
        # NEW: Initialize enhanced CNN color classifier
        # ============================================================
        if self.use_cnn:
            try:
                from models.cnn_color_classifier import CNNColorClassifier
                self.cnn_classifier = CNNColorClassifier()
                if self.cnn_classifier.model_loaded:
                    print("✓ Enhanced CNN color classifier initialized")
                else:
                    print("ℹ CNN model not trained yet, using fallback classifiers")
                    self.cnn_classifier = None
            except Exception as e:
                print(f"ℹ CNN classifier unavailable ({e})")
                self.cnn_classifier = None
        
        # Initialize HSV-based color classifier (always available as fallback)
        from models.color_classifier import SimpleColorClassifier
        self.color_classifier = SimpleColorClassifier()
        
        # Initialize deep learning color classifier if requested (legacy MobileNetV2)
        if self.use_deep_learning_color:
            self._initialize_dl_classifier()
        
        # Initialize oil yield predictor
        from models.oil_yield_predictor import OilYieldPredictor
        self.oil_predictor = OilYieldPredictor()
        
        # Initialize dimension estimator
        from models.dimension_estimator import DimensionEstimator
        self.dimension_estimator = DimensionEstimator(reference_type=self.reference_coin)
        
        # Initialize advanced segmenter (with coin exclusion enabled)
        if self.enable_segmentation:
            from models.advanced_segmenter import AdvancedSegmenter
            self.segmenter = AdvancedSegmenter(exclude_coin=True)
        
        # Initialize Talisay fruit validator (mobile-optimized)
        try:
            from models.fruit_validator_mobile import MobileTalisayValidator
            self.fruit_validator = MobileTalisayValidator()
            print("✓ Using mobile-optimized fruit validator")
        except ImportError:
            from models.fruit_validator import TalisayValidator
            self.fruit_validator = TalisayValidator()
            print("ℹ Using standard fruit validator")
    
    def _initialize_dl_classifier(self):
        """Initialize the deep learning color classifier."""
        try:
            import tensorflow as tf
            
            if Path(self.dl_model_path).exists():
                self.dl_color_classifier = tf.keras.models.load_model(self.dl_model_path)
                
                # Load class indices
                if self.class_indices_path.exists():
                    with open(self.class_indices_path) as f:
                        data = json.load(f)
                        self.dl_class_indices = data.get("idx_to_class", {
                            "0": "brown", "1": "green", "2": "yellow"
                        })
                else:
                    self.dl_class_indices = {"0": "brown", "1": "green", "2": "yellow"}
                
                print(f"✓ Deep learning color classifier loaded from: {self.dl_model_path}")
            else:
                print(f"⚠ Deep learning model not found at: {self.dl_model_path}")
                print("  Falling back to HSV-based classifier")
                self.use_deep_learning_color = False
                
        except ImportError:
            print("⚠ TensorFlow not installed. Using HSV-based classifier.")
            self.use_deep_learning_color = False
        except Exception as e:
            print(f"⚠ Error loading DL model: {e}")
            self.use_deep_learning_color = False
    
    def analyze_image(
        self,
        image,
        known_dimensions: dict = None,
        reference_method: str = "auto",
        return_visualization: bool = False,
        skip_fruit_validation: bool = False
    ) -> dict:
        """
        Analyze a Talisay fruit image end-to-end.
        
        Args:
            image: Image path, PIL Image, or numpy array
            known_dimensions: Optional dict with known measurements
                             {"length_cm": x, "width_cm": y, "kernel_mass_g": z}
            reference_method: Method for dimension estimation
                             ("auto", "coin", "aruco", "contour")
            return_visualization: Include visualization images in result
            skip_fruit_validation: Skip Talisay fruit validation check
                             
        Returns:
            Complete analysis result dictionary including:
            - is_talisay: Whether image contains a valid Talisay fruit
            - fruit_validation: Details about fruit detection/identification
            - color, dimensions, oil_yield: Analysis results (if Talisay)
        """
        result = {
            "is_talisay": False,
            "analysis_complete": False,
            "error": None,
            "pipeline_info": {
                "color_method": "deep_learning" if self.use_deep_learning_color else "hsv_based",
                "segmentation_enabled": self.enable_segmentation,
                "reference_coin": self.reference_coin
            }
        }
        
        try:
            # Load image if path provided
            img_array = self._load_image(image)
            if img_array is None:
                result["error"] = "Could not load image"
                return result
            
            # Downscale large images for performance (cap at 1280px longest side)
            import cv2
            h, w = img_array.shape[:2]
            max_dim = 1280
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                new_w, new_h = int(w * scale), int(h * scale)
                img_array = cv2.resize(img_array, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
            # ============================================================
            # Step 0-GUARD: TalisayGuard multi-layer security check
            # Run BEFORE any analysis to reject non-Talisay images early.
            # This catches: blank screens, persons/faces, Capsicum/peppers,
            # non-Talisay fruits, wrong shape, wrong colour, wrong texture.
            # ============================================================
            if not skip_fruit_validation and self.talisay_guard:
                guard_result = self.talisay_guard.verify(
                    img_array,
                    fruit_mask=None,        # Let guard build its own mask
                    yolo_fruit_info=None,   # Don't bias with YOLO yet
                    coin_info=None,
                )
                result["pipeline_info"]["talisay_guard"] = {
                    "used": True,
                    "verdict": guard_result["verdict"],
                    "score": guard_result["score"],
                }
                
                if not guard_result["accepted"]:
                    result["is_talisay"] = False
                    result["analysis_complete"] = True
                    result["analysis_stopped_reason"] = guard_result["verdict"]
                    result["user_message"] = guard_result["reason"]
                    result["fruit_validation"] = {
                        "is_talisay": False,
                        "result": guard_result["verdict"],
                        "confidence": guard_result["score"],
                        "message": guard_result["reason"],
                        "guard_layers": guard_result.get("layers", {}),
                    }
                    return result
            
            # ============================================================
            # Step 0a: YOLO Detection (if available) — replaces HoughCircles
            # ============================================================
            yolo_result = None
            yolo_coin_info = None
            yolo_fruit_info = None
            
            if self.yolo_detector:
                yolo_result = self.yolo_detector.detect(img_array)
                if yolo_result.get("success"):
                    if yolo_result.get("has_coin_reference"):
                        yolo_coin_info = yolo_result["coin_info"]
                    yolo_fruit_info = yolo_result.get("fruit_info")
                    
                    result["pipeline_info"]["yolo_detection"] = {
                        "used": True,
                        "fruits_detected": yolo_result["fruits_detected"],
                        "coins_detected": yolo_result["coins_detected"],
                    }
            
            # Step 0a-fallback: If YOLO didn't find coin, decide method
            coin_info = None
            
            if yolo_coin_info:
                # Use YOLO's coin detection (more robust)
                coin_info = yolo_coin_info
                dim_result = {
                    "reference_detected": True,
                    "pixels_per_cm": yolo_coin_info["pixels_per_cm"],
                    "coin_center": yolo_coin_info["coin_center"],
                    "coin_radius": yolo_coin_info["coin_radius"],
                    "coin_name": yolo_coin_info.get("coin_name", "₱5 Coin"),
                    "coin_diameter_cm": yolo_coin_info.get("coin_diameter_cm", 2.5),
                    "confidence": yolo_coin_info["confidence"],
                    "method_used": "yolo_v8",
                    "detection_method": "yolo_v8"
                }
                # Estimate fruit dimensions using YOLO + coin reference
                if yolo_fruit_info and yolo_fruit_info.get("estimated_length_cm"):
                    dim_result["length_cm"] = yolo_fruit_info["estimated_length_cm"]
                    dim_result["width_cm"] = yolo_fruit_info["estimated_width_cm"]
                else:
                    # Fall back to contour-based measurement with YOLO's pixels_per_cm
                    fruit_dims = self.dimension_estimator._measure_fruit(img_array, yolo_coin_info["pixels_per_cm"])
                    dim_result.update(fruit_dims)
            elif self.yolo_detector:
                # YOLO found fruit but no coin → try fast_coin_search,
                # pass fruit size so it only looks for coin-sized circles
                fast_coin = self.dimension_estimator.fast_coin_search(
                    img_array, fruit_bbox=yolo_fruit_info
                )
                if fast_coin.get("detected"):
                    # Fast search found a coin! Use it for accurate measurement
                    coin_info = fast_coin
                    dim_result = {
                        "reference_detected": True,
                        "pixels_per_cm": fast_coin["pixels_per_cm"],
                        "coin_center": fast_coin["coin_center"],
                        "coin_radius": fast_coin["coin_radius"],
                        "coin_name": fast_coin.get("coin_name", "₱5 Coin"),
                        "coin_diameter_cm": fast_coin.get("coin_diameter_cm", 2.4),
                        "confidence": fast_coin["confidence"],
                        "method_used": "fast_hough_silver",
                        "detection_method": "fast_hough_silver"
                    }
                    # Measure fruit with the discovered pixels_per_cm
                    fruit_dims = self.dimension_estimator._measure_fruit(img_array, fast_coin["pixels_per_cm"])
                    dim_result.update(fruit_dims)
                else:
                    # No coin at all → contour estimation with actual dimensions
                    dim_result = self.dimension_estimator._estimate_from_contour(img_array)
                    dim_result["method_used"] = "contour_estimation"
            else:
                # No YOLO available → use traditional detection (HoughCircles)
                dim_result = self.dimension_estimator.estimate_from_image(
                    img_array, 
                    reference_method=reference_method
                )
                if dim_result.get("reference_detected"):
                    coin_info = {
                        "detected": True,
                        "coin_center": dim_result.get("coin_center"),
                        "coin_radius": dim_result.get("coin_radius"),
                        "coin_name": dim_result.get("coin_name", "₱5 Coin"),
                        "coin_diameter_cm": dim_result.get("coin_diameter_cm", 2.5)
                    }
            
            # Step 0b: Background Segmentation with coin exclusion
            # Use fast COLOR_BASED method instead of slow ENSEMBLE
            segmentation_result = None
            if self.enable_segmentation and self.segmenter:
                from models.advanced_segmenter import SegmentationMethod
                segmentation_result = self.segmenter.segment(
                    img_array, 
                    method=SegmentationMethod.COLOR_BASED,
                    return_debug=return_visualization,
                    coin_info=coin_info  # Pass coin info to exclude from fruit mask
                )
                
                result["segmentation"] = {
                    "success": segmentation_result.get("success", False),
                    "background_type": segmentation_result.get("background_type"),
                    "confidence": segmentation_result.get("confidence", 0),
                    "fruit_area_ratio": segmentation_result.get("fruit_area_ratio", 0),
                    "coin_excluded": segmentation_result.get("coin_detected", False)
                }
                
                if return_visualization and "debug" in segmentation_result:
                    result["visualizations"] = {
                        "segmentation_overlay": segmentation_result["debug"].get("overlay")
                    }
            
            # Step 0c: Validate if this is a Talisay fruit
            # Even when YOLO detects a fruit, do a QUICK color check to ensure
            # it matches Talisay colors (green/yellow/brown). This prevents
            # non-Talisay fruits (red apples, oranges, etc.) from being analyzed.
            # RAISED THRESHOLD: From 0.5 to 0.8 for stricter YOLO confidence
            yolo_confirmed_fruit = (
                yolo_fruit_info
                and yolo_fruit_info.get("confidence", 0) >= 0.8
            )
            
            if not skip_fruit_validation and self.fruit_validator:
                if yolo_confirmed_fruit:
                    # YOLO confirmed fruit — STILL do full validation
                    # YOLO can misidentify peppers, mangoes, etc. as "talisay_fruit"
                    fruit_mask = segmentation_result.get("mask") if segmentation_result else None
                    validator_coin_info = coin_info if coin_info else {"detected": False}
                    validation_result = self.fruit_validator.validate(
                        img_array,
                        segmentation_mask=fruit_mask,
                        return_details=True,
                        coin_info=validator_coin_info
                    )
                    
                    # With YOLO, reject for ANY negative validation result
                    if not validation_result["is_talisay"]:
                        detection_result = validation_result["result"]
                        result["fruit_validation"] = {
                            "is_talisay": False,
                            "result": detection_result,
                            "confidence": validation_result["confidence"],
                            "message": validation_result["message"]
                        }
                        result["is_talisay"] = False
                        result["analysis_complete"] = True
                        result["analysis_stopped_reason"] = "not_talisay_fruit"
                        
                        if detection_result == "non_talisay":
                            result["user_message"] = (
                                "🍎 This appears to be a different type of fruit, not a Talisay. "
                                "Talisay fruits are green (immature), yellow (mature), or brown (ripe)."
                            )
                        elif detection_result == "unknown":
                            result["user_message"] = (
                                "❓ An object was detected, but it doesn't match Talisay fruit "
                                "characteristics (shape, colour, texture). Talisay fruits are "
                                "almond-shaped drupes, NOT round or elongated like peppers."
                            )
                        else:
                            result["user_message"] = validation_result.get("message",
                                "This doesn't appear to be a Talisay fruit."
                            )
                        return result
                    
                    result["is_talisay"] = True
                    result["fruit_validation"] = {
                        "skipped": False,
                        "reason": "yolo_confirmed_with_full_validation",
                        "yolo_confidence": yolo_fruit_info.get("confidence", 0)
                    }
                else:
                    fruit_mask = segmentation_result.get("mask") if segmentation_result else None
                    # Always pass coin_info to skip the validator's slow internal coin detection.
                    # If we already searched and found no coin, tell the validator explicitly.
                    validator_coin_info = coin_info if coin_info else {"detected": False}
                    validation_result = self.fruit_validator.validate(
                        img_array, 
                        segmentation_mask=fruit_mask,
                        return_details=True,
                        coin_info=validator_coin_info
                    )
                    
                    result["fruit_validation"] = {
                        "is_talisay": validation_result["is_talisay"],
                        "result": validation_result["result"],
                        "confidence": validation_result["confidence"],
                        "message": validation_result["message"]
                    }
                    
                    if not validation_result["is_talisay"]:
                        # Not a Talisay fruit - return early with validation message
                        result["is_talisay"] = False
                        result["analysis_complete"] = True
                        result["analysis_stopped_reason"] = "not_talisay_fruit"
                        
                        # Include helpful information based on detection result
                        detection_result = validation_result["result"]
                        
                        if detection_result == "coin_only":
                            result["user_message"] = (
                                "🪙 Only a coin was detected in the image. "
                                "Please include a Talisay fruit alongside the coin for size reference."
                            )
                            # Mark that coin WAS detected (just no fruit)
                            result["coin_detected"] = True
                            
                        elif detection_result == "non_talisay":
                            result["user_message"] = (
                                "🍎 This appears to be a different type of fruit, not a Talisay. "
                                "Talisay fruits are green (immature), yellow (mature), or brown (ripe). "
                                "Red, orange, pink, and purple fruits are not Talisay."
                            )
                            
                        elif detection_result == "no_object":
                            result["user_message"] = (
                                "📷 No fruit detected in the image. "
                                "Please take a clear photo of a Talisay (Terminalia catappa) fruit."
                            )
                            
                        elif detection_result == "unknown":
                            result["user_message"] = (
                                "❓ An object was detected, but it doesn't appear to be a Talisay fruit. "
                                "Talisay fruits have an almond/elliptical shape (not circular). "
                                "Please provide an image of a Talisay fruit."
                            )
                            
                        else:
                            result["user_message"] = validation_result["message"]
                        
                        return result
                    
                    result["is_talisay"] = True
            else:
                result["is_talisay"] = True
                if yolo_confirmed_fruit:
                    result["fruit_validation"] = {
                        "skipped": True,
                        "reason": "yolo_confirmed",
                        "yolo_confidence": yolo_fruit_info.get("confidence", 0)
                    }
                else:
                    result["fruit_validation"] = {"skipped": True}
            
            # Step 1: Color Classification (only if Talisay confirmed)
            # NEW: Use enhanced CNN if available, with YOLO fruit bbox for focused crop
            fruit_bbox = None
            if yolo_fruit_info and yolo_fruit_info.get("bbox"):
                fruit_bbox = yolo_fruit_info["bbox"]
            
            color_result = self._classify_color(img_array, segmentation_result, fruit_bbox=fruit_bbox)
            result["color"] = color_result["predicted_color"]
            result["color_confidence"] = color_result["confidence"]
            result["maturity_stage"] = color_result["maturity_stage"]
            result["color_probabilities"] = color_result["probabilities"]
            result["color_method_used"] = color_result.get("method", "hsv_based")
            
            # SAFETY CHECK: If color confidence is extremely low, the image
            # likely doesn't contain a recognizable Talisay fruit.
            # This prevents the "Brown with 0% confidence" default.
            
            # CRITICAL: If confidence is below 10%, always reject
            if color_result["confidence"] < 0.10:
                result["is_talisay"] = False
                result["analysis_complete"] = True
                result["analysis_stopped_reason"] = "extremely_low_confidence"
                result["user_message"] = (
                    "🚫 This image doesn't appear to contain a Talisay fruit. "
                    "Please provide a clear photo of a Talisay (Terminalia catappa) fruit. "
                    "Talisay fruits are elliptical/almond-shaped and green, yellow, or brown."
                )
                return result
            
            # SECONDARY CHECK: Low confidence with unclear color distribution
            if color_result["confidence"] < 0.25:
                # Check if all probabilities are roughly equal (no clear color)
                probs = color_result.get("probabilities", {})
                max_prob = max(probs.values()) if probs else 0
                min_prob = min(probs.values()) if probs else 0
                
                # Loosened from 0.15 to 0.20 to catch more ambiguous cases
                if max_prob - min_prob < 0.20:
                    # No dominant color detected — likely not a Talisay fruit
                    result["is_talisay"] = False
                    result["analysis_complete"] = True
                    result["analysis_stopped_reason"] = "no_confident_color"
                    result["user_message"] = (
                        "❓ Could not confidently identify a Talisay fruit in this image. "
                        "The colors don't clearly match green, yellow, or brown Talisay fruit. "
                        "Please provide a clearer image of a Talisay fruit."
                    )
                    return result
            
            # Include spot detection info
            if "has_spots" in color_result:
                result["has_spots"] = color_result["has_spots"]
                result["spot_coverage_percent"] = color_result.get("spot_coverage_percent", 0)
            
            # Step 2: Dimension Estimation (using already-detected coin from step 0a)
            if known_dimensions:
                result["dimensions"] = known_dimensions
                result["dimensions_source"] = "user_provided"
                result["dimensions_confidence"] = 1.0
                result["reference_detected"] = True
                result["measurement_mode"] = "manual"
            else:
                # Use the dim_result we already computed in step 0a
                raw_length = dim_result.get("length_cm", 5.0)
                raw_width = dim_result.get("width_cm", 3.5)
                
                # Validate and clamp dimensions to realistic Talisay fruit ranges
                length_range = DIMENSION_RANGES["length"]
                width_range = DIMENSION_RANGES["width"]
                
                clamped_length = max(length_range["min"], min(length_range["max"], raw_length))
                clamped_width = max(width_range["min"], min(width_range["max"], raw_width))
                
                # Check if clamping occurred (dimension out of range)
                dimension_clamped = (clamped_length != raw_length) or (clamped_width != raw_width)
                
                result["dimensions"] = {
                    "length_cm": clamped_length,
                    "width_cm": clamped_width,
                    "kernel_mass_g": dim_result.get("estimated_kernel_mass_g", 0.4),
                    "whole_fruit_weight_g": dim_result.get("estimated_weight_g", 35.0)
                }
                result["dimensions_source"] = dim_result.get("method_used", "estimated")
                result["dimensions_confidence"] = dim_result.get("confidence", 0.4)
                result["reference_detected"] = dim_result.get("reference_detected", False)
                
                # Add warning if dimensions were clamped
                if dimension_clamped:
                    result["dimension_warning"] = (
                        f"Estimated dimensions adjusted to valid Talisay fruit range "
                        f"(Length: {length_range['min']}-{length_range['max']}cm, "
                        f"Width: {width_range['min']}-{width_range['max']}cm). "
                        f"Original: L={raw_length:.1f}cm, W={raw_width:.1f}cm. "
                        f"Use a ₱5 coin reference for accurate measurements."
                    )
                
                # Enhanced coin detection info
                if coin_info and coin_info.get("detected"):
                    result["measurement_mode"] = "coin_reference"
                    result["coin_info"] = coin_info
                    # Boost confidence when coin is detected
                    result["dimensions_confidence"] = min(0.95, dim_result.get("confidence", 0.7) + 0.15)
                else:
                    result["measurement_mode"] = "smart_estimation"
                    result["coin_info"] = {"detected": False}
                    # Provide helpful tip instead of "less confident"
                    result["measurement_tip"] = (
                        "💡 For more accurate measurements, try retaking the photo with a ₱5 coin "
                        "placed on the LEFT side of the image as a size reference. "
                        "Position the fruit on the RIGHT side, both at similar vertical center."
                    )
            
            # Step 3: Oil Yield Prediction
            oil_input = {
                "color": result["color"],
                "length_cm": result["dimensions"].get("length_cm", 5.0),
                "width_cm": result["dimensions"].get("width_cm", 3.5),
                "kernel_mass_g": result["dimensions"].get("kernel_mass_g", 0.4),
                "whole_fruit_weight_g": result["dimensions"].get("whole_fruit_weight_g", 35.0)
            }
            
            # Add spot coverage if available (affects oil quality estimate)
            if "spot_coverage_percent" in result:
                oil_input["spot_coverage_percent"] = result["spot_coverage_percent"]
            
            oil_result = self.oil_predictor.predict(oil_input)
            result["oil_yield_percent"] = oil_result["oil_yield_percent"]
            result["oil_confidence"] = oil_result["confidence"]
            result["yield_category"] = oil_result["yield_category"]
            result["interpretation"] = oil_result["interpretation"]
            
            # Calculate overall confidence
            result["overall_confidence"] = self._calculate_overall_confidence(result)
            
            result["analysis_complete"] = True
            
        except Exception as e:
            import traceback
            result["error"] = str(e)
            result["error_trace"] = traceback.format_exc()
            result["analysis_complete"] = False
        
        return result
    
    def _load_image(self, image) -> Optional[np.ndarray]:
        """Load image from various sources."""
        import cv2
        from PIL import Image as PILImage
        
        if isinstance(image, (str, Path)):
            return cv2.imread(str(image))
        elif isinstance(image, PILImage.Image):
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        elif isinstance(image, np.ndarray):
            if len(image.shape) == 3 and image.shape[2] == 3:
                return image.copy()
            elif len(image.shape) == 2:
                return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        return None
    
    def _classify_color(
        self, 
        img_array: np.ndarray, 
        segmentation_result: Optional[Dict] = None,
        fruit_bbox: Optional[list] = None
    ) -> Dict:
        """
        Classify fruit color using available methods.
        
        Priority: Enhanced CNN > Legacy DL (MobileNetV2) > HSV
        Uses ensemble of available methods for best accuracy.
        """
        results = {}
        
        # Get masked image if segmentation available
        if segmentation_result and segmentation_result.get("success"):
            mask = segmentation_result.get("mask")
            if mask is not None:
                # Apply mask to image for better color analysis
                # IMPORTANT: Set background to WHITE (255) not BLACK (0)
                # Black pixels get counted as dark/brown spots, biasing results
                masked_img = img_array.copy()
                masked_img[mask == 0] = 255  # White background - won't bias color analysis
            else:
                masked_img = img_array
        else:
            masked_img = img_array
        
        # Method 0 (NEW): Enhanced CNN classification (highest priority)
        if self.cnn_classifier:
            cnn_result = self.cnn_classifier.predict(img_array, fruit_bbox=fruit_bbox)
            results["cnn"] = cnn_result
            
            # If CNN is very confident, use it directly
            if cnn_result["confidence"] > 0.75:
                cnn_result["method"] = "cnn_enhanced"
                # Still include spot info from HSV
                hsv_result = self.color_classifier.predict(masked_img)
                if "has_spots" in hsv_result:
                    cnn_result["has_spots"] = hsv_result["has_spots"]
                    cnn_result["spot_coverage_percent"] = hsv_result.get("spot_coverage_percent", 0)
                return cnn_result
        
        # Method 1: HSV-based classification (always run)
        hsv_result = self.color_classifier.predict(masked_img)
        results["hsv"] = hsv_result
        
        # Method 2: Deep learning classification (if available - legacy MobileNetV2)
        if self.use_deep_learning_color and self.dl_color_classifier:
            dl_result = self._dl_classify(img_array)
            results["dl"] = dl_result
            
            # Ensemble: Weight DL higher if confident
            dl_conf = dl_result["confidence"]
            hsv_conf = hsv_result["confidence"]
            
            if dl_conf > 0.7:
                # DL is confident, use it
                final_result = dl_result.copy()
                final_result["method"] = "deep_learning"
            elif hsv_conf > dl_conf:
                # HSV is more confident
                final_result = hsv_result.copy()
                final_result["method"] = "hsv_based"
            else:
                # Average the probabilities
                final_probs = {}
                for color in ["green", "yellow", "brown"]:
                    dl_p = dl_result["probabilities"].get(color, 0)
                    hsv_p = hsv_result["probabilities"].get(color, 0)
                    final_probs[color] = (dl_p * 0.6 + hsv_p * 0.4)
                
                # Normalize
                total = sum(final_probs.values())
                if total > 0:
                    final_probs = {k: v/total for k, v in final_probs.items()}
                
                predicted = max(final_probs, key=final_probs.get)
                
                final_result = {
                    "predicted_color": predicted,
                    "confidence": final_probs[predicted],
                    "probabilities": final_probs,
                    "maturity_stage": self._get_maturity_stage(predicted),
                    "method": "ensemble"
                }
                
                # Include spot info from HSV
                if "has_spots" in hsv_result:
                    final_result["has_spots"] = hsv_result["has_spots"]
                    final_result["spot_coverage_percent"] = hsv_result.get("spot_coverage_percent", 0)
            
            return final_result
        
        # Return HSV result if DL not available
        hsv_result["method"] = "hsv_based"
        return hsv_result
    
    def _dl_classify(self, img_array: np.ndarray) -> Dict:
        """Classify using deep learning model."""
        import tensorflow as tf
        import cv2
        
        # Preprocess for MobileNetV2
        img_resized = cv2.resize(img_array, (224, 224))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        img_normalized = img_rgb.astype(np.float32) / 255.0
        img_batch = np.expand_dims(img_normalized, 0)
        
        # Predict
        predictions = self.dl_color_classifier.predict(img_batch, verbose=0)[0]
        
        # Map to colors
        probs = {}
        for idx, prob in enumerate(predictions):
            color = self.dl_class_indices.get(str(idx), f"class_{idx}")
            probs[color] = float(prob)
        
        predicted = max(probs, key=probs.get)
        
        return {
            "predicted_color": predicted,
            "confidence": probs[predicted],
            "probabilities": probs,
            "maturity_stage": self._get_maturity_stage(predicted)
        }
    
    def _get_maturity_stage(self, color: str) -> str:
        """Get maturity stage from color."""
        stages = {
            "green": "Immature",
            "yellow": "Mature (Optimal)",
            "brown": "Fully Ripe"
        }
        return stages.get(color, "Unknown")
    
    def _calculate_overall_confidence(self, result: dict) -> float:
        """Calculate overall analysis confidence."""
        weights = {
            "color": 0.35,
            "dimensions": 0.25,
            "segmentation": 0.15,
            "oil": 0.25
        }
        
        scores = {
            "color": result.get("color_confidence", 0.5),
            "dimensions": result.get("dimensions_confidence", 0.4),
            "segmentation": result.get("segmentation", {}).get("confidence", 0.5) if self.enable_segmentation else 0.7,
            "oil": result.get("oil_confidence", 0.5)
        }
        
        overall = sum(weights[k] * scores[k] for k in weights)
        return round(overall, 3)
    
    def analyze_measurements(
        self,
        color: str,
        length_cm: float,
        width_cm: float,
        kernel_mass_g: float = None,
        whole_fruit_weight_g: float = None
    ) -> dict:
        """
        Analyze fruit based on manual measurements (no image required).
        
        Args:
            color: Fruit color ("green", "yellow", "brown")
            length_cm: Fruit length in cm
            width_cm: Fruit width in cm
            kernel_mass_g: Kernel mass in grams (optional, will estimate)
            whole_fruit_weight_g: Whole fruit weight in grams (optional)
            
        Returns:
            Analysis result dictionary
        """
        # Validate color
        color = color.lower()
        if color not in ["green", "yellow", "brown"]:
            raise ValueError(f"Invalid color: {color}. Must be green, yellow, or brown.")
        
        # Estimate kernel mass if not provided
        if kernel_mass_g is None:
            kernel_mass_g = self._estimate_kernel_mass(length_cm, width_cm)
        
        # Estimate fruit weight if not provided
        if whole_fruit_weight_g is None:
            whole_fruit_weight_g = self._estimate_fruit_weight(length_cm, width_cm)
        
        # Build input
        oil_input = {
            "color": color,
            "length_cm": length_cm,
            "width_cm": width_cm,
            "kernel_mass_g": kernel_mass_g,
            "whole_fruit_weight_g": whole_fruit_weight_g
        }
        
        # Get prediction
        oil_result = self.oil_predictor.predict(oil_input)
        
        return {
            "color": color,
            "maturity_stage": self._get_maturity_stage(color),
            "dimensions": {
                "length_cm": length_cm,
                "width_cm": width_cm,
                "kernel_mass_g": round(kernel_mass_g, 3),
                "whole_fruit_weight_g": round(whole_fruit_weight_g, 1)
            },
            "oil_yield_percent": oil_result["oil_yield_percent"],
            "yield_category": oil_result["yield_category"],
            "confidence": oil_result["confidence"],
            "interpretation": oil_result["interpretation"],
            "analysis_complete": True
        }
    
    def _estimate_kernel_mass(self, length_cm: float, width_cm: float) -> float:
        """Estimate kernel mass based on fruit dimensions."""
        size_factor = (length_cm * width_cm) / (5.0 * 3.5)
        kernel_range = DIMENSION_RANGES["kernel_mass"]
        estimated_mass = 0.4 * size_factor
        return np.clip(estimated_mass, kernel_range["min"], kernel_range["max"])
    
    def _estimate_fruit_weight(self, length_cm: float, width_cm: float) -> float:
        """Estimate whole fruit weight based on dimensions."""
        avg_radius = (length_cm + width_cm) / 4
        volume_factor = (4/3) * np.pi * (length_cm/2) * (width_cm/2) * avg_radius
        estimated_weight = volume_factor * 0.8
        weight_range = DIMENSION_RANGES["whole_fruit_weight"]
        return np.clip(estimated_weight, weight_range["min"], weight_range["max"])
    
    def analyze_with_reference(
        self,
        image,
        reference_type: str = "peso_5"
    ) -> dict:
        """
        Analyze image with specific reference object.
        
        Args:
            image: Image with fruit and reference object
            reference_type: Type of reference object
                           ("peso_5", "peso_5_old", "peso_1", "credit_card", "aruco_4x4")
        
        Returns:
            Analysis result with accurate dimensions
        """
        # Update reference type
        self.dimension_estimator.reference_type = reference_type
        from models.dimension_estimator import REFERENCE_OBJECTS
        self.dimension_estimator.reference_info = REFERENCE_OBJECTS.get(
            reference_type, 
            REFERENCE_OBJECTS["peso_5"]
        )
        
        # Analyze with coin detection
        return self.analyze_image(image, reference_method="coin")
    
    def batch_analyze(
        self,
        images: list,
        known_dimensions: dict = None,
        progress_callback=None
    ) -> list:
        """
        Analyze multiple images.
        
        Args:
            images: List of image paths or arrays
            known_dimensions: Optional dimensions to apply to all
            progress_callback: Function to call with progress (0-100)
            
        Returns:
            List of analysis results
        """
        results = []
        total = len(images)
        
        for i, image in enumerate(images):
            result = self.analyze_image(image, known_dimensions)
            result["image_index"] = i
            results.append(result)
            
            if progress_callback:
                progress_callback(int((i + 1) / total * 100))
        
        return results
    
    def get_system_info(self) -> dict:
        """Get information about the prediction system."""
        return {
            "version": "3.0.0",
            "features": {
                "yolo_object_detection": self.yolo_detector is not None,
                "cnn_color_classification": self.cnn_classifier is not None,
                "hsv_color_classification": True,
                "deep_learning_classification": self.use_deep_learning_color,
                "advanced_segmentation": self.enable_segmentation,
                "dimension_estimation": True,
                "spot_detection": True,
                "reference_object_detection": True
            },
            "models": {
                "yolo_detector": "YOLOv8 (fruit + coin detection)" if self.yolo_detector else "Not loaded",
                "cnn_classifier": "Enhanced CNN (EfficientNet + Attention)" if self.cnn_classifier else "Not loaded",
                "color_classifier": "SimpleColorClassifier (HSV-based with spot detection)",
                "dl_color_classifier": self.dl_model_path if self.use_deep_learning_color else None,
                "oil_predictor": "Ensemble (RandomForest + GradientBoosting)",
                "segmenter": "AdvancedSegmenter (Ensemble method)",
                "dimension_estimator": f"DimensionEstimator (Reference: {self.reference_coin})"
            },
            "reference_coin": self.reference_coin,
            "supported_references": [
                "peso_5 (₱5 Silver, New - 24mm) - RECOMMENDED",
                "peso_5_old (₱5 Gold, Old - 25mm)",
                "peso_1 (₱1 Silver - 20mm)",
                "peso_10 (₱10 - 24.5mm)",
                "credit_card (Standard ID card)",
                "aruco_4x4 (Printed ArUco marker)"
            ],
            "oil_yield_by_color": OIL_YIELD_BY_COLOR,
            "dimension_ranges": DIMENSION_RANGES
        }
    
    def get_research_summary(self) -> dict:
        """Get summary of scientific research used for predictions."""
        return {
            "oil_yield_by_maturity": OIL_YIELD_BY_COLOR,
            "dimension_ranges": DIMENSION_RANGES,
            "key_findings": [
                "Yellow (mature) fruits have the highest oil content (57-60%)",
                "Green (immature) fruits have the lowest oil content (45-49%)",
                "Kernel mass is the strongest predictor of oil yield",
                "Larger fruits generally produce more oil per kernel",
                "Optimal harvest is at the yellow/mature stage",
                "Spots on fruit surface do not significantly affect oil content"
            ],
            "references": [
                "Janporn et al. - Terminalia catappa kernel oil (~60%)",
                "Agu et al. 2020 - RSM & ANN optimization (60.3%)",
                "Santos et al. 2022 - Variety comparison (purple 57%, yellow 54%)",
                "Côte d'Ivoire 2017 - Maturity stage effects",
                "Kaggle Biome Azuero 2022 - Real fruit image training"
            ]
        }


def quick_analysis(
    color: str = None,
    length_cm: float = None,
    width_cm: float = None,
    kernel_mass_g: float = None,
    image_path: str = None
) -> None:
    """
    Quick analysis function for command-line usage.
    
    Args:
        color: Fruit color (green, yellow, brown) - for manual mode
        length_cm: Fruit length - for manual mode
        width_cm: Fruit width - for manual mode
        kernel_mass_g: Kernel mass (optional) - for manual mode
        image_path: Path to image - for image mode
    """
    # Initialize predictor with all features
    predictor = TalisayPredictor(
        use_simple_color=True,
        use_deep_learning_color=True,  # Will fallback if not available
        reference_coin="peso_5",
        enable_segmentation=True
    )
    
    if image_path:
        # Image-based analysis
        print(f"\nAnalyzing image: {image_path}")
        result = predictor.analyze_image(image_path)
        
        print("\n" + "=" * 60)
        print("TALISAY FRUIT OIL YIELD ANALYSIS (Image Mode)")
        print("=" * 60)
        
        if result.get("error"):
            print(f"\n❌ Error: {result['error']}")
            return
        
        # Step 0: Check fruit validation
        print(f"\n🔍 FRUIT VALIDATION:")
        if "fruit_validation" in result:
            fv = result["fruit_validation"]
            if fv.get("skipped"):
                print(f"   Validation: Skipped")
            else:
                is_talisay = fv.get("is_talisay", False)
                if is_talisay:
                    print(f"   ✅ Talisay fruit confirmed")
                    print(f"   Confidence: {fv.get('confidence', 0)*100:.1f}%")
                else:
                    print(f"   ❌ {fv.get('result', 'unknown').upper()}")
                    print(f"   {fv.get('message', '')}")
                    
                    # If not a Talisay fruit, show the user message and return
                    if result.get("user_message"):
                        print(f"\n{result['user_message']}")
                    print("=" * 60)
                    return
        
        print(f"\n📊 SEGMENTATION:")
        if "segmentation" in result:
            seg = result["segmentation"]
            print(f"   Background Type: {seg.get('background_type', 'N/A')}")
            print(f"   Confidence: {seg.get('confidence', 0)*100:.1f}%")
            if seg.get("coin_excluded"):
                print(f"   ✓ Coin region excluded from fruit mask")
        
        print(f"\n🎨 COLOR CLASSIFICATION:")
        print(f"   Color: {result['color'].upper()}")
        print(f"   Maturity: {result['maturity_stage']}")
        print(f"   Confidence: {result['color_confidence']*100:.1f}%")
        print(f"   Method: {result.get('color_method_used', 'N/A')}")
        
        if result.get("has_spots"):
            print(f"   ⚠ Spots detected: {result.get('spot_coverage_percent', 0):.1f}% coverage")
        
        print(f"\n📏 DIMENSIONS:")
        dims = result["dimensions"]
        
        # Check if coin reference was detected
        measurement_mode = result.get("measurement_mode", "smart_estimation")
        coin_info = result.get("coin_info", {})
        
        if coin_info.get("detected"):
            # Coin reference detected - show confident measurements
            coin_name = coin_info.get("coin_name", "₱5 Coin")
            print(f"   ✅ Reference Detected: {coin_name}")
            print(f"   Length: {dims.get('length_cm', 'N/A'):.2f} cm")
            print(f"   Width: {dims.get('width_cm', 'N/A'):.2f} cm")
            print(f"   Est. Weight: {dims.get('whole_fruit_weight_g', 'N/A'):.1f} g")
            print(f"   Est. Kernel: {dims.get('kernel_mass_g', 'N/A'):.3f} g")
            print(f"   Measurement Confidence: {result.get('dimensions_confidence', 0)*100:.0f}%")
        else:
            # No coin reference - show estimation with friendly tip
            print(f"   Mode: Smart Estimation (no coin reference)")
            print(f"   Length: ~{dims.get('length_cm', 'N/A'):.1f} cm (estimated)")
            print(f"   Width: ~{dims.get('width_cm', 'N/A'):.1f} cm (estimated)")
            print(f"   Est. Weight: ~{dims.get('whole_fruit_weight_g', 'N/A'):.0f} g")
            print(f"   Est. Kernel: ~{dims.get('kernel_mass_g', 'N/A'):.2f} g")
            print()
            print(f"   💡 For more accurate measurements:")
            print(f"      Retake the photo with a ₱5 coin on the LEFT side")
            print(f"      and the fruit on the RIGHT side of the image.")
        
        print(f"\n🛢️ OIL YIELD PREDICTION:")
        print(f"   Predicted Yield: {result['oil_yield_percent']}%")
        print(f"   Category: {result['yield_category']}")
        print(f"   Confidence: {result.get('oil_confidence', 0)*100:.1f}%")
        
        print(f"\n📈 OVERALL CONFIDENCE: {result.get('overall_confidence', 0)*100:.1f}%")
        print(f"\n💬 {result['interpretation']}")
        
    else:
        # Manual measurement mode
        if not all([color, length_cm, width_cm]):
            print("Error: Provide either image_path OR (color, length_cm, width_cm)")
            return
        
        result = predictor.analyze_measurements(
            color=color,
            length_cm=length_cm,
            width_cm=width_cm,
            kernel_mass_g=kernel_mass_g
        )
        
        print("\n" + "=" * 60)
        print("TALISAY FRUIT OIL YIELD ANALYSIS (Manual Mode)")
        print("=" * 60)
        print(f"\nFruit Color: {result['color'].capitalize()}")
        print(f"Maturity Stage: {result['maturity_stage']}")
        print(f"\nDimensions:")
        print(f"  Length: {result['dimensions']['length_cm']} cm")
        print(f"  Width: {result['dimensions']['width_cm']} cm")
        print(f"  Kernel Mass: {result['dimensions']['kernel_mass_g']} g")
        print(f"  Fruit Weight: {result['dimensions']['whole_fruit_weight_g']} g")
        print(f"\n🛢️ PREDICTED OIL YIELD: {result['oil_yield_percent']}%")
        print(f"Yield Category: {result['yield_category']}")
        print(f"Confidence: {result['confidence'] * 100:.1f}%")
        print(f"\n{result['interpretation']}")
    
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Talisay Fruit Oil Yield Predictor")
    parser.add_argument("--image", "-i", help="Path to fruit image")
    parser.add_argument("--color", "-c", choices=["green", "yellow", "brown"],
                       help="Fruit color (for manual mode)")
    parser.add_argument("--length", "-l", type=float, help="Fruit length in cm")
    parser.add_argument("--width", "-w", type=float, help="Fruit width in cm")
    parser.add_argument("--kernel", "-k", type=float, help="Kernel mass in grams")
    parser.add_argument("--info", action="store_true", help="Show system info")
    parser.add_argument("--demo", action="store_true", help="Run demo predictions")
    parser.add_argument("--guide", action="store_true", help="Show photo-taking guide")
    
    args = parser.parse_args()
    
    if args.guide:
        print("\n" + "=" * 60)
        print("📸 TALISAY FRUIT PHOTO GUIDE")
        print("=" * 60)
        print("""
For best measurement accuracy, follow these guidelines:

┌─────────────────────────────────────────────────────────┐
│                                                         │
│      ┌───────┐                    ┌───────────┐        │
│      │  ₱5   │                    │           │        │
│      │ COIN  │                    │   FRUIT   │        │
│      │       │                    │           │        │
│      └───────┘                    └───────────┘        │
│                                                         │
│      LEFT SIDE                    RIGHT SIDE           │
│      (Coin here)                  (Fruit here)         │
│                                                         │
└─────────────────────────────────────────────────────────┘

📍 PLACEMENT TIPS:
   • Place the ₱5 coin on the LEFT side (center-left)
   • Place the Talisay fruit on the RIGHT side (center-right)
   • Keep both at the same vertical height
   • Use a plain background (white, black, or neutral)
   • Ensure good lighting (avoid harsh shadows)
   • Take photo from directly above (top-down view)

💰 COIN RECOMMENDATION:
   • Use the NEW SILVER ₱5 coin (25mm diameter)
   • Silver provides better contrast with green/yellow fruits
   • Ensure coin is clean and not tarnished for best detection

📱 CAMERA TIPS:
   • Keep the camera parallel to the surface (not angled)
   • Fill 60-80% of frame with coin and fruit
   • Focus on the fruit for best color detection
   • Avoid flash if possible (natural light preferred)

⚡ WITHOUT COIN:
   • System can still estimate dimensions
   • Results will be less precise but still useful
   • Follow the suggestion to retake with coin if accuracy is critical
""")
        print("=" * 60)
    
    elif args.info:
        predictor = TalisayPredictor()
        info = predictor.get_system_info()
        print("\n=== Talisay Predictor System Info ===")
        print(f"Version: {info['version']}")
        print(f"\nFeatures:")
        for k, v in info['features'].items():
            print(f"  {k}: {'✓' if v else '✗'}")
        print(f"\nReference Coin: {info['reference_coin']}")
        print(f"\nSupported References:")
        for ref in info['supported_references']:
            print(f"  - {ref}")
        print(f"\n💡 Use --guide for photo-taking instructions")
    
    elif args.demo:
        print("Running demo predictions...")
        demo_samples = [
            ("green", 4.5, 3.0, 0.3),
            ("yellow", 5.5, 4.0, 0.55),
            ("brown", 6.0, 4.5, 0.7),
        ]
        for color, length, width, kernel in demo_samples:
            quick_analysis(color=color, length_cm=length, width_cm=width, kernel_mass_g=kernel)
    
    elif args.image:
        quick_analysis(image_path=args.image)
    
    elif args.color and args.length and args.width:
        quick_analysis(
            color=args.color,
            length_cm=args.length,
            width_cm=args.width,
            kernel_mass_g=args.kernel
        )
    
    else:
        parser.print_help()
        print("\n\nExamples:")
        print("  # Analyze an image:")
        print("  python predict.py --image test_images/talisay1.jpg")
        print("")
        print("  # Manual measurement:")
        print("  python predict.py --color yellow --length 5.5 --width 4.0")
        print("")
        print("  # System info:")
        print("  python predict.py --info")
