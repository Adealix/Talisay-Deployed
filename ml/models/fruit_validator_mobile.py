"""
Mobile-Enhanced Talisay Fruit Validator
========================================

Extends the base fruit validator with mobile-specific improvements:
- Handles variable lighting from auto-exposure
- Better detection in shadows and low-light conditions
- Robust to motion blur and compression artifacts
- Improved coin detection with different camera angles
- Enhanced color detection accounting for white balance variations
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Optional, Tuple
from PIL import Image

# Import base validator
from fruit_validator import TalisayValidator, FruitDetectionResult


class MobileTalisayValidator(TalisayValidator):
    """
    Enhanced validator specifically tuned for mobile camera images.
    
    Key improvements:
    1. Adaptive color ranges (handles auto white-balance)
    2. Multi-scale coin detection (different camera distances)
    3. Lighting normalization (shadows, overexposure)
    4. Robust shape detection (tolerates motion blur)
    5. Texture-based validation (organic vs artifacts)
    """
    
    def __init__(self):
        """Initialize mobile-enhanced validator."""
        super().__init__()
        
        # Expanded but still strict color ranges for mobile auto-white-balance
        self.talisay_colors_mobile = {
            "green": {
                "lower": np.array([25, 30, 30]),      # Slightly wider than desktop
                "upper": np.array([85, 255, 250]),    # But not as wide as before
                "description": "Immature Talisay (mobile)"
            },
            "yellow": {
                "lower": np.array([15, 50, 60]),      # Include slightly darker yellows
                "upper": np.array([40, 255, 255]),    # Strict upper bound
                "description": "Mature Talisay (mobile)"
            },
            "brown": {
                "lower": np.array([4, 35, 25]),       # Extend slightly for shadows
                "upper": np.array([26, 215, 200]),    # Strict upper bound
                "description": "Fully Ripe Talisay (mobile)"
            }
        }
        
        # Tighter shape parameters — still allow some blur/angle tolerance
        self.talisay_shape_mobile = {
            "min_circularity": 0.32,    # Allow some blur distortion
            "max_circularity": 0.82,    # Reject near-circular objects
            "min_aspect_ratio": 1.15,   # Must be elongated
            "max_aspect_ratio": 2.6,    # Not too elongated (reject peppers)
            "min_convexity": 0.78,      # Allow some imperfections
        }
    
    def validate(
        self, 
        image,
        segmentation_mask: Optional[np.ndarray] = None,
        return_details: bool = True,
        mobile_mode: bool = True,
        coin_info: Optional[dict] = None
    ) -> Dict:
        """
        Validate with mobile-specific preprocessing.
        
        Args:
            image: Input image
            segmentation_mask: Optional pre-computed mask
            return_details: Include detailed analysis
            mobile_mode: Use mobile-specific enhancements
            
        Returns:
            Validation result dictionary
        """
        # Load image
        img = self._load_image(image)
        if img is None:
            return self._make_result(
                FruitDetectionResult.NO_OBJECT,
                0.0,
                "Could not load image"
            )
        
        # Mobile preprocessing
        if mobile_mode:
            img = self._preprocess_mobile_image(img)
        
        h, w = img.shape[:2]
        
        # Enhanced coin detection for mobile — skip if already provided
        if coin_info is not None:
            if coin_info.get("detected"):
                coin_result = {
                    "is_coin": True,
                    "coin_type": coin_info.get("coin_name", "peso_5"),
                    "coin_center": coin_info.get("coin_center"),
                    "coin_radius": coin_info.get("coin_radius"),
                    "coin_area_ratio": 0.0,
                    "confidence": coin_info.get("confidence", 0.7),
                    "detection_method": "external_precomputed"
                }
            else:
                coin_result = {
                    "is_coin": False,
                    "coin_type": None,
                    "coin_center": None,
                    "coin_radius": None,
                    "coin_area_ratio": 0.0,
                    "confidence": 0.0,
                    "detection_method": "external_no_coin"
                }
        else:
            coin_result = self._detect_coin_mobile(img)
        
        # Enhanced fruit detection
        fruit_mask, fruit_info = self._detect_fruit_regions_mobile(
            img, segmentation_mask, coin_result
        )
        
        # Check if only coin detected
        if fruit_mask is None or np.sum(fruit_mask) < 500:
            if coin_result["is_coin"]:
                return self._make_result(
                    FruitDetectionResult.COIN_ONLY,
                    0.95,
                    "Only a coin was detected. Please include a Talisay fruit in the photo.",
                    details={"coin_detected": True, "coin_info": coin_result}
                )
            else:
                return self._make_result(
                    FruitDetectionResult.NO_OBJECT,
                    0.90,
                    "No fruit detected. Please take a clear photo of a Talisay fruit."
                )
        
        # Non-Talisay check with mobile color compensation
        non_talisay_result = self._check_non_talisay_fruit_mobile(img, fruit_mask)
        
        if non_talisay_result["is_non_talisay"]:
            return self._make_result(
                FruitDetectionResult.NON_TALISAY_FRUIT,
                non_talisay_result["confidence"],
                f"This appears to be a {non_talisay_result['detected_type']} fruit, not a Talisay. "
                f"Talisay fruits are green, yellow, or brown.",
                details=non_talisay_result
            )
        
        # Talisay validation with mobile parameters
        color_result = self._analyze_talisay_color_mobile(img, fruit_mask)
        shape_result = self._analyze_talisay_shape_mobile(fruit_mask)
        size_result = self._analyze_size(fruit_mask, h, w)
        texture_result = self._analyze_texture_mobile(img, fruit_mask)
        
        # Compute validation score
        validation_score = self._compute_validation_score_mobile(
            color_result, shape_result, size_result, texture_result, coin_result
        )
        
        # Determine result
        result_type, is_talisay, message = self._determine_result_mobile(
            validation_score, color_result, shape_result, coin_result
        )
        
        response = {
            "is_talisay": is_talisay,
            "result": result_type.value,
            "confidence": round(validation_score, 3),
            "message": message,
            "mobile_optimized": True
        }
        
        if return_details:
            response["details"] = {
                "coin_detection": coin_result,
                "color_analysis": color_result,
                "shape_analysis": shape_result,
                "size_analysis": size_result,
                "texture_analysis": texture_result,
                "validation_score": validation_score
            }
        
        return response
    
    def _preprocess_mobile_image(self, img: np.ndarray) -> np.ndarray:
        """
        Preprocess image to normalize mobile camera variations.
        
        - Adjusts lighting
        - Reduces noise
        - Normalizes white balance
        """
        # Convert to LAB color space for lighting normalization
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel (adaptive lighting equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # Merge back
        lab = cv2.merge([l, a, b])
        img_normalized = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        # Slight denoising (helps with compression artifacts)
        img_normalized = cv2.fastNlMeansDenoisingColored(
            img_normalized, None, 5, 5, 7, 21
        )
        
        return img_normalized
    
    def _detect_coin_mobile(self, img: np.ndarray) -> Dict:
        """
        Enhanced coin detection for mobile images.
        
        Improvements:
        - Multiple detection passes with different parameters
        - Better handling of shadows and lighting
        - More robust to camera angles
        """
        h, w = img.shape[:2]
        image_area = h * w
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        result = {
            "is_coin": False,
            "coin_type": None,
            "coin_center": None,
            "coin_radius": None,
            "coin_area_ratio": 0.0,
            "confidence": 0.0,
            "detection_method": None
        }
        
        # Check for excessive silver-like coverage (sandy background)
        silver_mask_loose = cv2.inRange(hsv, np.array([0, 0, 90]), np.array([180, 110, 240]))
        silver_coverage = np.sum(silver_mask_loose > 0) / image_area
        
        if silver_coverage > 0.35:
            result["detection_method"] = "rejected_background_too_silver"
            return result
        
        # Multi-pass circle detection with different parameters
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)
        
        # Pass 1: Standard detection
        min_radius_1 = int(min(h, w) * 0.025)
        max_radius_1 = int(min(h, w) * 0.15)
        
        circles_1 = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT, 
            dp=1.2, minDist=80,
            param1=100, param2=40,
            minRadius=min_radius_1, maxRadius=max_radius_1
        )
        
        # Pass 2: More lenient (for shadows)
        circles_2 = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT,
            dp=1.5, minDist=80,
            param1=80, param2=35,
            minRadius=min_radius_1, maxRadius=max_radius_1
        )
        
        # Combine results
        all_circles = []
        if circles_1 is not None:
            all_circles.extend(np.uint16(np.around(circles_1))[0])
        if circles_2 is not None:
            all_circles.extend(np.uint16(np.around(circles_2))[0])
        
        if not all_circles:
            result["detection_method"] = "no_circles_found"
            return result
        
        # Validate each circle
        best_coin = None
        best_score = 0
        
        for circle in all_circles:
            cx, cy, radius = int(circle[0]), int(circle[1]), int(circle[2])
            
            # Skip edge circles
            if cx - radius < 10 or cy - radius < 10 or cx + radius > w - 10 or cy + radius > h - 10:
                continue
            
            # Validate area
            coin_area = np.pi * radius * radius
            area_ratio = coin_area / image_area
            
            if area_ratio < 0.003 or area_ratio > 0.08:  # More lenient for mobile
                continue
            
            # Create mask
            circle_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(circle_mask, (cx, cy), radius, 255, -1)
            
            # Validate properties
            coin_score = self._validate_coin_properties_mobile(
                img, hsv, gray, circle_mask, cx, cy, radius
            )
            
            if coin_score > best_score and coin_score > 0.38:  # More lenient (was 0.45)
                best_score = coin_score
                best_coin = (cx, cy, radius, coin_score)
        
        if best_coin:
            cx, cy, radius, score = best_coin
            coin_area = np.pi * radius * radius
            
            result["is_coin"] = True
            result["coin_type"] = "silver"
            result["coin_center"] = (cx, cy)
            result["coin_radius"] = radius
            result["coin_area_ratio"] = coin_area / image_area
            result["confidence"] = score
            result["detection_method"] = "mobile_multi_pass"
        else:
            result["detection_method"] = "no_valid_coin"
        
        return result
    
    def _validate_coin_properties_mobile(
        self, img: np.ndarray, hsv: np.ndarray, gray: np.ndarray,
        mask: np.ndarray, cx: int, cy: int, radius: int
    ) -> float:
        """Mobile-optimized coin property validation."""
        score = 0.0
        
        coin_hsv = hsv[mask > 0]
        coin_gray = gray[mask > 0]
        
        if len(coin_hsv) < 50:
            return 0.0
        
        # Check 1: Low saturation (more lenient for mobile)
        mean_saturation = np.mean(coin_hsv[:, 1])
        if mean_saturation < 70:
            score += 0.25
        elif mean_saturation < 110:
            score += 0.12
        
        # Check 2: Color uniformity (more lenient)
        hue_std = np.std(coin_hsv[:, 0])
        if hue_std < 20:
            score += 0.20
        elif hue_std < 35:
            score += 0.10
        
        # Check 3: Brightness (more lenient range)
        mean_value = np.mean(coin_hsv[:, 2])
        value_std = np.std(coin_hsv[:, 2])
        
        if 100 < mean_value < 230 and 10 < value_std < 70:
            score += 0.25
        elif 80 < mean_value < 240:
            score += 0.10
        
        # Check 4: Circularity
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(contour)
            perimeter = cv2.arcLength(contour, True)
            
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter * perimeter)
                if circularity > 0.75:
                    score += 0.30
                elif circularity > 0.65:
                    score += 0.15
        
        return min(1.0, score)
    
    def _detect_fruit_regions_mobile(
        self, img: np.ndarray, provided_mask: Optional[np.ndarray], coin_result: Dict
    ) -> Tuple[Optional[np.ndarray], Dict]:
        """Mobile-optimized fruit region detection."""
        h, w = img.shape[:2]
        info = {}
        
        if provided_mask is not None:
            if coin_result["is_coin"] and coin_result["coin_center"]:
                coin_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.circle(
                    coin_mask, coin_result["coin_center"],
                    int(coin_result["coin_radius"] * 1.2), 255, -1
                )
                provided_mask = cv2.bitwise_and(provided_mask, cv2.bitwise_not(coin_mask))
            return provided_mask, {"source": "provided"}
        
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        fruit_mask = np.zeros((h, w), dtype=np.uint8)
        
        # Use mobile-adapted color ranges
        for color_name, ranges in self.talisay_colors_mobile.items():
            color_mask = cv2.inRange(hsv, ranges["lower"], ranges["upper"])
            fruit_mask = cv2.bitwise_or(fruit_mask, color_mask)
        
        # Exclude coin if detected
        if coin_result["is_coin"] and coin_result["coin_center"]:
            coin_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(
                coin_mask, coin_result["coin_center"],
                int(coin_result["coin_radius"] * 1.2), 255, -1
            )
            fruit_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(coin_mask))
            info["coin_excluded"] = True
        
        # More aggressive morphology for mobile blur
        kernel = np.ones((9, 9), np.uint8)
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_CLOSE, kernel)
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(fruit_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            min_area = h * w * 0.008  # More lenient minimum
            valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]
            
            if valid_contours:
                clean_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(clean_mask, valid_contours, -1, 255, -1)
                info["source"] = "mobile_color_detection"
                info["num_regions"] = len(valid_contours)
                return clean_mask, info
        
        return None, {"source": "failed"}
    
    def _check_non_talisay_fruit_mobile(self, img: np.ndarray, mask: np.ndarray) -> Dict:
        """Mobile-optimized non-Talisay fruit detection."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        fruit_pixels = hsv[mask > 0]
        
        if len(fruit_pixels) == 0:
            return {"is_non_talisay": False, "detected_type": None, "confidence": 0.0}
        
        total_pixels = len(fruit_pixels)
        max_coverage = 0.0
        detected_type = None
        
        # Check non-Talisay colors with mobile tolerance
        for color_name, ranges in self.non_talisay_colors.items():
            if "lower1" in ranges:
                in_range1 = np.all(
                    (fruit_pixels >= ranges["lower1"]) & (fruit_pixels <= ranges["upper1"]),
                    axis=1
                )
                in_range2 = np.all(
                    (fruit_pixels >= ranges["lower2"]) & (fruit_pixels <= ranges["upper2"]),
                    axis=1
                )
                matching = np.sum(in_range1 | in_range2)
            else:
                in_range = np.all(
                    (fruit_pixels >= ranges["lower"]) & (fruit_pixels <= ranges["upper"]),
                    axis=1
                )
                matching = np.sum(in_range)
            
            coverage = matching / total_pixels
            
            if coverage > max_coverage:
                max_coverage = coverage
                detected_type = color_name
        
        # More lenient threshold for mobile but still strict
        if max_coverage > 0.22:  # 22% instead of 25%
            return {
                "is_non_talisay": True,
                "detected_type": detected_type,
                "confidence": min(0.95, max_coverage + 0.15),
                "coverage": max_coverage
            }
        
        return {"is_non_talisay": False, "detected_type": None, "confidence": 0.0}
    
    def _analyze_talisay_color_mobile(self, img: np.ndarray, mask: np.ndarray) -> Dict:
        """Mobile-optimized Talisay color analysis."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        fruit_pixels = hsv[mask > 0]
        
        if len(fruit_pixels) == 0:
            return {"has_talisay_color": False, "dominant_color": None, "confidence": 0.0}
        
        total_pixels = len(fruit_pixels)
        color_scores = {}
        
        # Check against mobile color ranges
        for color_name, ranges in self.talisay_colors_mobile.items():
            in_range = np.all(
                (fruit_pixels >= ranges["lower"]) & (fruit_pixels <= ranges["upper"]),
                axis=1
            )
            coverage = np.sum(in_range) / total_pixels
            color_scores[color_name] = coverage
        
        if not color_scores:
            return {"has_talisay_color": False, "dominant_color": None, "confidence": 0.0}
        
        dominant = max(color_scores, key=color_scores.get)
        confidence = color_scores[dominant]
        
        return {
            "has_talisay_color": confidence > 0.15,  # More lenient (was 0.20)
            "dominant_color": dominant,
            "confidence": confidence,
            "color_scores": color_scores
        }
    
    def _analyze_talisay_shape_mobile(self, mask: np.ndarray) -> Dict:
        """Mobile-optimized shape analysis."""
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return {"is_valid_shape": False, "confidence": 0.0}
        
        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        perimeter = cv2.arcLength(largest, True)
        
        if area < 100 or perimeter == 0:
            return {"is_valid_shape": False, "confidence": 0.0}
        
        # Use mobile shape parameters (more lenient)
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        
        x, y, w, h = cv2.boundingRect(largest)
        aspect_ratio = max(w, h) / max(min(w, h), 1)
        
        hull = cv2.convexHull(largest)
        hull_area = cv2.contourArea(hull)
        convexity = area / hull_area if hull_area > 0 else 0
        
        # Check against mobile parameters
        shape_valid = (
            self.talisay_shape_mobile["min_circularity"] <= circularity <= self.talisay_shape_mobile["max_circularity"] and
            self.talisay_shape_mobile["min_aspect_ratio"] <= aspect_ratio <= self.talisay_shape_mobile["max_aspect_ratio"] and
            convexity >= self.talisay_shape_mobile["min_convexity"]
        )
        
        # Calculate confidence
        confidence = 0.0
        if shape_valid:
            confidence = 0.8
        elif circularity < 0.85 and aspect_ratio > 1.1:  # At least elongated
            confidence = 0.5
        
        return {
            "is_valid_shape": shape_valid,
            "confidence": confidence,
            "circularity": circularity,
            "aspect_ratio": aspect_ratio,
            "convexity": convexity
        }
    
    def _analyze_texture_mobile(self, img: np.ndarray, mask: np.ndarray) -> Dict:
        """Mobile-optimized texture analysis."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        fruit_region = gray[mask > 0]
        
        if len(fruit_region) == 0:
            return {"is_organic": False, "confidence": 0.0}
        
        # Calculate texture variance (more lenient for compression)
        texture_variance = np.std(fruit_region)
        
        # Organic fruits have moderate texture (not too uniform, not too noisy)
        is_organic = 15 < texture_variance < 80  # Wider range for mobile
        confidence = 0.7 if is_organic else 0.3
        
        return {
            "is_organic": is_organic,
            "confidence": confidence,
            "texture_variance": float(texture_variance)
        }
    
    def _compute_validation_score_mobile(
        self, color_result: Dict, shape_result: Dict, size_result: Dict,
        texture_result: Dict, coin_result: Dict
    ) -> float:
        """Compute validation score with mobile-adjusted weights."""
        weights = {
            "color": 0.40,      # Color most important
            "shape": 0.25,      # Shape less strict for mobile
            "size": 0.15,       # Size reasonable
            "texture": 0.20,    # Texture helpful
        }
        
        scores = {
            "color": color_result.get("confidence", 0.0),
            "shape": shape_result.get("confidence", 0.0),
            "size": 1.0 if size_result.get("is_valid_size", False) else 0.3,
            "texture": texture_result.get("confidence", 0.5)
        }
        
        total = sum(weights[k] * scores[k] for k in weights)
        
        # Boost if coin detected (indicates proper setup)
        if coin_result.get("is_coin"):
            total = min(1.0, total * 1.1)
        
        return total
    
    def _determine_result_mobile(
        self, score: float, color_result: Dict, shape_result: Dict, coin_result: Dict
    ) -> Tuple[FruitDetectionResult, bool, str]:
        """Determine final result with mobile-adjusted thresholds."""
        if score >= 0.50:  # Raised from 0.45 — more strict
            return (
                FruitDetectionResult.TALISAY_FRUIT,
                True,
                "Talisay fruit detected successfully."
            )
        elif score >= 0.35:  # Raised from 0.30
            if color_result.get("has_talisay_color"):
                return (
                    FruitDetectionResult.TALISAY_FRUIT,
                    True,
                    "Likely a Talisay fruit (moderate confidence)."
                )
            else:
                return (
                    FruitDetectionResult.UNCERTAIN,
                    False,
                    "Object detected but unclear if it's a Talisay fruit. Try better lighting."
                )
        else:
            return (
                FruitDetectionResult.UNKNOWN_OBJECT,
                False,
                "Object doesn't appear to be a Talisay fruit. Please ensure good lighting and clear photo."
            )
