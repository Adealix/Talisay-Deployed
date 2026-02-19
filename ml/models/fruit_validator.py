"""
Talisay Fruit Validator v2.0
Validates whether an image contains a Talisay (Terminalia catappa) fruit

MAJOR IMPROVEMENTS in v2.0:
1. Explicit coin detection and rejection
2. Non-Talisay fruit detection (red, pink, orange fruits)
3. Enhanced shape analysis (coin vs fruit discrimination)
4. Texture analysis for organic vs metallic surfaces
5. Multi-stage validation pipeline

This module handles:
1. Detection: Is there any object in the image?
2. Coin Detection: Is the object a reference coin? (REJECT)
3. Non-Talisay Detection: Is it a non-Talisay fruit? (REJECT)
4. Identification: Is the detected fruit a Talisay fruit?
5. Validation: Does it match expected Talisay characteristics?

Talisay Fruit Characteristics:
- Colors: ONLY Green (immature), Yellow (mature), Brown (fully ripe)
- NOT red, orange, pink, purple, blue, or white fruits
- Shape: Almond-shaped / elliptical with pointed ends (NOT circular like coins)
- Size: Typically 3.5-7.0 cm in length
- Surface: Organic texture, relatively smooth with possible dark spots
- NOT metallic, shiny, or reflective like coins
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Optional, Tuple, Union, List
from PIL import Image
from enum import Enum


class FruitDetectionResult(Enum):
    """Result of fruit detection."""
    NO_OBJECT = "no_object"             # No significant object detected
    COIN_ONLY = "coin_only"             # Only coin detected, no fruit
    NON_TALISAY_FRUIT = "non_talisay"   # Fruit detected but wrong type (red, orange, etc.)
    TALISAY_FRUIT = "talisay"           # Valid Talisay fruit
    UNKNOWN_OBJECT = "unknown"          # Object detected but not identifiable
    UNCERTAIN = "uncertain"              # Cannot determine with confidence


class TalisayValidator:
    """
    Enhanced Talisay fruit validator with coin rejection and non-Talisay detection.
    
    Uses multiple detection strategies:
    1. Coin detection (silver/metallic, circular shape) - REJECT if only coin
    2. Non-Talisay fruit detection (red, orange, pink) - REJECT
    3. Color analysis (Talisay-specific HSV ranges)
    4. Shape analysis (elliptical, not circular)
    5. Texture analysis (organic vs metallic)
    6. Size ratio analysis (reasonable fruit proportions)
    """
    
    def __init__(self):
        """Initialize the Talisay validator."""
        
        # === COIN DETECTION (to reject coin-only images) ===
        self.coin_colors = {
            "silver": {
                "lower": np.array([0, 0, 120]),      # Low saturation, medium-high value
                "upper": np.array([180, 80, 220]),
                "description": "Silver ₱5 coin"
            },
            "gold": {
                "lower": np.array([15, 60, 120]),    # Yellowish metallic
                "upper": np.array([35, 180, 255]),
                "description": "Gold/brass coin"
            },
            "copper": {
                "lower": np.array([8, 80, 80]),
                "upper": np.array([25, 200, 200]),
                "description": "Copper coin"
            }
        }
        
        # Coin shape parameters (coins are CIRCULAR)
        self.coin_shape = {
            "min_circularity": 0.80,    # Coins are very circular
            "max_circularity": 1.0,
            "min_aspect_ratio": 0.85,   # Nearly 1:1 ratio
            "max_aspect_ratio": 1.15,
        }
        
        # === NON-TALISAY FRUIT COLORS (to reject other fruits) ===
        self.non_talisay_colors = {
            "red": {
                "lower1": np.array([0, 90, 60]),     # Red wraps around 0
                "upper1": np.array([10, 255, 255]),
                "lower2": np.array([160, 90, 60]),
                "upper2": np.array([180, 255, 255]),
                "fruits": ["apple", "cherry", "strawberry", "tomato", "red pepper", "siling labuyo"]
            },
            "orange": {
                "lower": np.array([10, 100, 100]),
                "upper": np.array([22, 255, 255]),
                "fruits": ["orange", "tangerine", "persimmon"]
            },
            "pink": {
                "lower": np.array([140, 30, 140]),
                "upper": np.array([172, 160, 255]),
                "fruits": ["dragon fruit", "peach", "guava"]
            },
            "purple": {
                "lower": np.array([120, 40, 40]),
                "upper": np.array([158, 255, 255]),
                "fruits": ["grape", "plum", "mangosteen"]
            },
            "blue": {
                "lower": np.array([95, 50, 50]),
                "upper": np.array([130, 255, 255]),
                "fruits": ["blueberry"]
            }
        }
        
        # === TALISAY-SPECIFIC COLORS (STRICT) ===
        self.talisay_colors = {
            "green": {
                "lower": np.array([30, 35, 35]),     # Strict green range
                "upper": np.array([80, 255, 245]),
                "description": "Immature Talisay"
            },
            "yellow": {
                "lower": np.array([18, 60, 70]),     # Strict yellow (high sat needed)
                "upper": np.array([38, 255, 255]),
                "description": "Mature Talisay"
            },
            "brown": {
                "lower": np.array([6, 40, 30]),
                "upper": np.array([25, 210, 195]),
                "description": "Fully Ripe Talisay"
            }
        }
        
        # === TALISAY SHAPE PARAMETERS (elliptical, NOT circular) ===
        self.talisay_shape = {
            "min_circularity": 0.40,    # Almond shape is less circular
            "max_circularity": 0.78,    # NOT as circular as a coin
            "min_aspect_ratio": 1.2,    # Clearly elongated
            "max_aspect_ratio": 2.5,    # Not too stretched
            "min_convexity": 0.82,      # Relatively convex
        }
        
        # Size constraints (relative to image)
        self.size_constraints = {
            "min_area_ratio": 0.02,     # At least 2% of image
            "max_area_ratio": 0.70,     # At most 70% of image
        }
        
        # Texture thresholds
        self.texture_thresholds = {
            "max_metallic_shine": 0.35,  # Reject if too shiny/metallic
            "min_organic_texture": 0.15, # Minimum texture variance for organic
        }
    
    def validate(
        self, 
        image: Union[str, Path, np.ndarray, Image.Image],
        segmentation_mask: Optional[np.ndarray] = None,
        return_details: bool = True,
        coin_info: Optional[Dict] = None
    ) -> Dict:
        """
        Validate whether the image contains a Talisay fruit.
        
        Pipeline:
        1. Detect objects in image
        2. Check if object is a coin (REJECT if coin-only)
        3. Check if object is a non-Talisay fruit (REJECT)
        4. Validate Talisay characteristics
        
        Args:
            image: Input image
            segmentation_mask: Optional pre-computed mask
            return_details: Include detailed analysis in result
            coin_info: Pre-computed coin detection result (skips internal coin detection)
            
        Returns:
            Dictionary with validation result
        """
        # Load image
        img = self._load_image(image)
        if img is None:
            return self._make_result(
                FruitDetectionResult.NO_OBJECT,
                0.0,
                "Could not load image"
            )
        
        h, w = img.shape[:2]
        
        # ========== STEP 1: COIN DETECTION ==========
        # Use pre-computed coin info if available (from YOLO / fast_coin_search)
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
                # Caller already searched and found no coin — skip internal detection
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
            coin_result = self._detect_coin(img)
        
        # ========== STEP 2: DETECT POTENTIAL FRUIT REGIONS ==========
        fruit_mask, fruit_info = self._detect_fruit_regions(img, segmentation_mask, coin_result)
        
        # Check if we only found a coin (no fruit)
        if fruit_mask is None or np.sum(fruit_mask) < 500:
            if coin_result["is_coin"]:
                return self._make_result(
                    FruitDetectionResult.COIN_ONLY,
                    0.95,
                    "Only a coin was detected in the image. Please include a Talisay fruit in the photo.",
                    details={
                        "coin_detected": True,
                        "coin_info": coin_result,
                        "fruit_detected": False
                    }
                )
            else:
                return self._make_result(
                    FruitDetectionResult.NO_OBJECT,
                    0.90,
                    "No fruit detected in image. Please take a clear photo of a Talisay fruit.",
                    details={"detection_step": "no_regions_found"}
                )
        
        # ========== STEP 3: NON-TALISAY FRUIT CHECK ==========
        non_talisay_result = self._check_non_talisay_fruit(img, fruit_mask)
        
        if non_talisay_result["is_non_talisay"]:
            return self._make_result(
                FruitDetectionResult.NON_TALISAY_FRUIT,
                non_talisay_result["confidence"],
                f"This appears to be a {non_talisay_result['detected_type']} fruit, not a Talisay. "
                f"Talisay fruits are green (immature), yellow (mature), or brown (ripe).",
                details=non_talisay_result
            )
        
        # ========== STEP 4: TALISAY VALIDATION ==========
        color_result = self._analyze_talisay_color(img, fruit_mask)
        shape_result = self._analyze_talisay_shape(fruit_mask)
        size_result = self._analyze_size(fruit_mask, h, w)
        texture_result = self._analyze_texture(img, fruit_mask)
        
        # ========== STEP 5: COMPUTE FINAL SCORE ==========
        validation_score = self._compute_validation_score(
            color_result, shape_result, size_result, texture_result, coin_result
        )
        
        # Determine final result
        result_type, is_talisay, message = self._determine_result(
            validation_score, color_result, shape_result, coin_result
        )
        
        response = {
            "is_talisay": is_talisay,
            "result": result_type.value,
            "confidence": round(validation_score, 3),
            "message": message
        }
        
        if return_details:
            response["details"] = {
                "coin_detection": coin_result,
                "non_talisay_check": non_talisay_result,
                "color_analysis": color_result,
                "shape_analysis": shape_result,
                "size_analysis": size_result,
                "texture_analysis": texture_result,
                "validation_score": validation_score,
                "fruit_mask_area": int(np.sum(fruit_mask > 0))
            }
        
        return response
    
    def _make_result(
        self, 
        result_type: FruitDetectionResult, 
        confidence: float, 
        message: str,
        details: Dict = None
    ) -> Dict:
        """Helper to create result dictionary."""
        return {
            "is_talisay": result_type == FruitDetectionResult.TALISAY_FRUIT,
            "result": result_type.value,
            "confidence": confidence,
            "message": message,
            "details": details or {}
        }
    
    def _load_image(self, image) -> Optional[np.ndarray]:
        """Load image from various sources."""
        if isinstance(image, (str, Path)):
            return cv2.imread(str(image))
        elif isinstance(image, Image.Image):
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        elif isinstance(image, np.ndarray):
            if len(image.shape) == 3 and image.shape[2] == 3:
                return image.copy()
            elif len(image.shape) == 2:
                return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        return None
    
    def _detect_coin(self, img: np.ndarray) -> Dict:
        """
        Detect if there's a coin in the image using robust multi-stage detection.
        
        IMPROVED v2.1: Much stricter detection to avoid false positives from
        sandy/light backgrounds.
        
        Detection Strategy:
        1. Use Hough Circle detection as PRIMARY method (coins have sharp circular edges)
        2. Validate size (coins are small: 3-15% of image area)
        3. Check for metallic properties (gradient, shine, uniform texture)
        4. Reject if "silver-like" color covers too much of image (likely background)
        
        Returns information about detected coins.
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
        
        # === STEP 1: Check if silver-like color covers too much of image ===
        # Only reject if nearly the ENTIRE image is silver (true silver background
        # like in own_datasets images should NOT cause rejection — coins are still present)
        silver_mask_loose = cv2.inRange(hsv, np.array([0, 0, 100]), np.array([180, 100, 230]))
        silver_coverage = np.sum(silver_mask_loose > 0) / image_area
        
        if silver_coverage > 0.95:
            # Entire image is silver/gray — can't distinguish coin
            result["detection_method"] = "rejected_background_too_silver"
            return result
        
        # === STEP 2: Primary Detection - Hough Circle Transform ===
        # This is the most reliable method for detecting coins
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)
        
        # Use Canny edge detection first for better circle detection
        edges = cv2.Canny(blurred, 50, 150)
        
        # Strict size constraints for coins (3-12% of image dimension)
        min_radius = int(min(h, w) * 0.03)  # Min 3% of image
        max_radius = int(min(h, w) * 0.12)  # Max 12% of image
        
        circles = cv2.HoughCircles(
            blurred, 
            cv2.HOUGH_GRADIENT, 
            dp=1.2, 
            minDist=100,  # Coins are usually alone or far apart
            param1=100, 
            param2=50,    # Higher threshold = stricter detection
            minRadius=min_radius,
            maxRadius=max_radius
        )
        
        if circles is None:
            result["detection_method"] = "no_circles_found"
            return result
        
        # === STEP 3: Validate Each Circle Candidate ===
        circles = np.uint16(np.around(circles))
        best_coin = None
        best_score = 0
        
        for circle in circles[0, :]:
            cx, cy, radius = int(circle[0]), int(circle[1]), int(circle[2])
            
            # Skip if circle is too close to edge
            if cx - radius < 10 or cy - radius < 10 or cx + radius > w - 10 or cy + radius > h - 10:
                continue
            
            # Calculate coin area ratio
            coin_area = np.pi * radius * radius
            area_ratio = coin_area / image_area
            
            # Coins should be 0.5% to 5% of image area
            if area_ratio < 0.005 or area_ratio > 0.05:
                continue
            
            # Create mask for this circle
            circle_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(circle_mask, (cx, cy), radius, 255, -1)
            
            # === STEP 4: Validate Metallic Properties ===
            coin_score = self._validate_coin_properties(img, hsv, gray, circle_mask, cx, cy, radius)
            
            if coin_score > best_score and coin_score > 0.5:
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
            result["detection_method"] = "hough_circles_validated"
        else:
            result["detection_method"] = "no_valid_coin"
        
        return result
    
    def _validate_coin_properties(
        self, 
        img: np.ndarray, 
        hsv: np.ndarray, 
        gray: np.ndarray,
        mask: np.ndarray,
        cx: int, cy: int, radius: int
    ) -> float:
        """
        Validate that a circular region has coin-like properties.
        
        Checks:
        1. Color uniformity (coins are metallic, uniform color)
        2. Edge sharpness (coins have defined edges)
        3. Saturation (metallic surfaces have low saturation)
        4. Value/brightness pattern (metallic shine)
        
        Returns a score from 0.0 to 1.0
        """
        score = 0.0
        
        # Get pixels within the coin mask
        coin_hsv = hsv[mask > 0]
        coin_gray = gray[mask > 0]
        
        if len(coin_hsv) < 100:
            return 0.0
        
        # === Check 1: Low saturation (metallic surfaces) ===
        mean_saturation = np.mean(coin_hsv[:, 1])
        if mean_saturation < 60:  # Very low saturation = metallic
            score += 0.3
        elif mean_saturation < 100:
            score += 0.15
        
        # === Check 2: Color uniformity (low hue variance) ===
        hue_std = np.std(coin_hsv[:, 0])
        if hue_std < 15:  # Very uniform hue
            score += 0.2
        elif hue_std < 30:
            score += 0.1
        
        # === Check 3: Check for metallic value (brightness) pattern ===
        # Coins often have highlights (high brightness areas)
        mean_value = np.mean(coin_hsv[:, 2])
        value_std = np.std(coin_hsv[:, 2])
        
        # Metallic: medium-high brightness with some variance (reflections)
        if 120 < mean_value < 220 and 15 < value_std < 60:
            score += 0.25
        
        # === Check 4: Edge strength around the circle ===
        # Create a ring mask around the coin edge
        outer_radius = int(radius * 1.1)
        inner_radius = int(radius * 0.9)
        
        ring_mask = np.zeros_like(mask)
        cv2.circle(ring_mask, (cx, cy), outer_radius, 255, -1)
        inner_mask = np.zeros_like(mask)
        cv2.circle(inner_mask, (cx, cy), inner_radius, 255, -1)
        ring_mask = cv2.bitwise_and(ring_mask, cv2.bitwise_not(inner_mask))
        
        # Check edge strength using Sobel
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        edge_magnitude = np.sqrt(sobelx**2 + sobely**2)
        
        edge_values = edge_magnitude[ring_mask > 0]
        if len(edge_values) > 0:
            mean_edge = np.mean(edge_values)
            if mean_edge > 30:  # Strong edges
                score += 0.25
            elif mean_edge > 15:
                score += 0.1
        
        return min(1.0, score)
    
    def _detect_fruit_regions(
        self, 
        img: np.ndarray, 
        provided_mask: Optional[np.ndarray],
        coin_result: Dict
    ) -> Tuple[Optional[np.ndarray], Dict]:
        """
        Detect potential fruit regions, EXCLUDING the coin area if detected.
        
        IMPROVED v2.1: Better background exclusion without over-excluding sandy areas.
        """
        h, w = img.shape[:2]
        info = {}
        
        if provided_mask is not None:
            # Exclude coin from provided mask
            if coin_result["is_coin"] and coin_result["coin_center"]:
                coin_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.circle(
                    coin_mask, 
                    coin_result["coin_center"], 
                    int(coin_result["coin_radius"] * 1.1),
                    255, -1
                )
                provided_mask = cv2.bitwise_and(provided_mask, cv2.bitwise_not(coin_mask))
            return provided_mask, {"source": "provided"}
        
        # Convert to HSV for color analysis
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Create mask for all potential fruit colors (including non-Talisay)
        fruit_mask = np.zeros((h, w), dtype=np.uint8)
        
        # Add Talisay colors
        for color_name, ranges in self.talisay_colors.items():
            color_mask = cv2.inRange(hsv, ranges["lower"], ranges["upper"])
            fruit_mask = cv2.bitwise_or(fruit_mask, color_mask)
        
        # Add non-Talisay colors (to detect them for rejection)
        for color_name, ranges in self.non_talisay_colors.items():
            if "lower1" in ranges:  # Red wraps around
                mask1 = cv2.inRange(hsv, ranges["lower1"], ranges["upper1"])
                mask2 = cv2.inRange(hsv, ranges["lower2"], ranges["upper2"])
                fruit_mask = cv2.bitwise_or(fruit_mask, mask1)
                fruit_mask = cv2.bitwise_or(fruit_mask, mask2)
            else:
                color_mask = cv2.inRange(hsv, ranges["lower"], ranges["upper"])
                fruit_mask = cv2.bitwise_or(fruit_mask, color_mask)
        
        # ONLY exclude coin region if a coin was actually detected
        # (Don't use broad color ranges that catch sandy backgrounds)
        if coin_result["is_coin"] and coin_result["coin_center"]:
            coin_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(
                coin_mask, 
                coin_result["coin_center"], 
                int(coin_result["coin_radius"] * 1.15),
                255, -1
            )
            fruit_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(coin_mask))
            info["coin_excluded"] = True
        
        # Exclude very bright/white regions (likely highlights or white background)
        white_mask = cv2.inRange(hsv, np.array([0, 0, 240]), np.array([180, 30, 255]))
        fruit_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(white_mask))
        
        # Exclude very dark regions (shadows)
        black_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 30]))
        fruit_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(black_mask))
        
        # Morphological operations to clean up
        kernel = np.ones((7, 7), np.uint8)
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_CLOSE, kernel)
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_OPEN, kernel)
        
        # Find largest contour (main fruit)
        contours, _ = cv2.findContours(fruit_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            min_area = h * w * 0.01
            valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]
            
            if valid_contours:
                clean_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(clean_mask, valid_contours, -1, 255, -1)
                info["source"] = "color_detection"
                info["num_regions"] = len(valid_contours)
                return clean_mask, info
        
        return None, {"source": "failed"}
    
    def _check_non_talisay_fruit(self, img: np.ndarray, mask: np.ndarray) -> Dict:
        """
        Check if the detected fruit is a non-Talisay fruit (red, orange, pink, etc.)
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        fruit_pixels = hsv[mask > 0]
        
        if len(fruit_pixels) == 0:
            return {"is_non_talisay": False, "detected_type": None, "confidence": 0.0}
        
        total_pixels = len(fruit_pixels)
        
        # Check each non-Talisay color
        max_coverage = 0.0
        detected_type = None
        
        for color_name, ranges in self.non_talisay_colors.items():
            if "lower1" in ranges:  # Red wraps around
                in_range1 = np.all(
                    (fruit_pixels >= ranges["lower1"]) & (fruit_pixels <= ranges["upper1"]),
                    axis=1
                )
                in_range2 = np.all(
                    (fruit_pixels >= ranges["lower2"]) & (fruit_pixels <= ranges["upper2"]),
                    axis=1
                )
                count = np.sum(in_range1) + np.sum(in_range2)
            else:
                in_range = np.all(
                    (fruit_pixels >= ranges["lower"]) & (fruit_pixels <= ranges["upper"]),
                    axis=1
                )
                count = np.sum(in_range)
            
            coverage = count / total_pixels
            
            if coverage > max_coverage:
                max_coverage = coverage
                detected_type = color_name
        
        # If more than 25% of pixels are non-Talisay colors, reject (was 35%)
        is_non_talisay = max_coverage > 0.25
        
        fruit_name = detected_type
        if is_non_talisay and detected_type in self.non_talisay_colors:
            possible_fruits = self.non_talisay_colors[detected_type].get("fruits", [])
            if possible_fruits:
                fruit_name = f"{detected_type} ({', '.join(possible_fruits[:2])})"
        
        return {
            "is_non_talisay": is_non_talisay,
            "detected_type": fruit_name,
            "confidence": round(max_coverage, 3),
            "color_coverage": {
                detected_type: round(max_coverage * 100, 1) if detected_type else 0
            }
        }
    
    def _analyze_talisay_color(self, img: np.ndarray, mask: np.ndarray) -> Dict:
        """Analyze if colors match Talisay fruit."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        fruit_pixels = hsv[mask > 0]
        
        if len(fruit_pixels) == 0:
            return {
                "has_fruit_colors": False,
                "is_talisay_color": False,
                "dominant_color": "unknown",
                "maturity": "unknown",
                "color_confidence": 0.0,
                "color_distribution": {}
            }
        
        # Count pixels matching each Talisay color
        color_counts = {}
        for color_name, ranges in self.talisay_colors.items():
            in_range = np.all(
                (fruit_pixels >= ranges["lower"]) & (fruit_pixels <= ranges["upper"]),
                axis=1
            )
            color_counts[color_name] = np.sum(in_range)
        
        total_pixels = len(fruit_pixels)
        total_talisay_pixels = sum(color_counts.values())
        
        # Calculate percentages
        color_distribution = {
            color: round(count / total_pixels * 100, 1)
            for color, count in color_counts.items()
        }
        
        talisay_coverage = total_talisay_pixels / total_pixels if total_pixels > 0 else 0
        
        # Determine dominant color
        if total_talisay_pixels > 0:
            dominant_color = max(color_counts, key=color_counts.get)
            maturity_map = {
                "green": "Immature",
                "yellow": "Mature (Optimal)",
                "brown": "Fully Ripe"
            }
            maturity = maturity_map.get(dominant_color, "Unknown")
        else:
            dominant_color = "unknown"
            maturity = "Unknown"
        
        # Stricter threshold: at least 30% Talisay colors (strict bands)
        is_talisay_color = talisay_coverage >= 0.30
        has_fruit_colors = talisay_coverage >= 0.15
        
        return {
            "has_fruit_colors": has_fruit_colors,
            "is_talisay_color": is_talisay_color,
            "dominant_color": dominant_color,
            "maturity": maturity,
            "color_confidence": round(talisay_coverage, 3),
            "color_distribution": color_distribution,
            "talisay_coverage_percent": round(talisay_coverage * 100, 1)
        }
    
    def _analyze_talisay_shape(self, mask: np.ndarray) -> Dict:
        """
        Analyze shape to confirm it's a Talisay fruit (elliptical, NOT circular like a coin).
        """
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return {
                "is_valid_shape": False,
                "is_too_circular": False,
                "shape_confidence": 0.0,
                "circularity": 0.0,
                "aspect_ratio": 0.0,
                "convexity": 0.0
            }
        
        # Get largest contour
        contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        
        # Calculate circularity
        circularity = (4 * np.pi * area) / (perimeter ** 2) if perimeter > 0 else 0
        
        # Calculate aspect ratio from fitted ellipse
        if len(contour) >= 5:
            ellipse = cv2.fitEllipse(contour)
            (_, (minor, major), _) = ellipse
            aspect_ratio = major / minor if minor > 0 else 0
        else:
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 0
        
        # Calculate convexity
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        convexity = area / hull_area if hull_area > 0 else 0
        
        # Check if TOO CIRCULAR (like a coin)
        is_too_circular = (
            circularity > self.coin_shape["min_circularity"] and
            self.coin_shape["min_aspect_ratio"] <= aspect_ratio <= self.coin_shape["max_aspect_ratio"]
        )
        
        # Validate shape parameters for Talisay
        is_valid_shape = (
            self.talisay_shape["min_circularity"] <= circularity <= self.talisay_shape["max_circularity"]
            and self.talisay_shape["min_aspect_ratio"] <= aspect_ratio <= self.talisay_shape["max_aspect_ratio"]
            and convexity >= self.talisay_shape["min_convexity"]
            and not is_too_circular
        )
        
        # Calculate shape confidence
        shape_score = 0.0
        
        # Circularity score (Talisay should NOT be too circular)
        if self.talisay_shape["min_circularity"] <= circularity <= self.talisay_shape["max_circularity"]:
            shape_score += 0.35
        elif circularity < self.coin_shape["min_circularity"]:
            shape_score += 0.25  # Still okay if not coin-like
        
        # Aspect ratio score (should be elongated)
        if self.talisay_shape["min_aspect_ratio"] <= aspect_ratio <= self.talisay_shape["max_aspect_ratio"]:
            shape_score += 0.40
        elif aspect_ratio > 1.1:
            shape_score += 0.20
        
        # Convexity score
        if convexity >= self.talisay_shape["min_convexity"]:
            shape_score += 0.25
        elif convexity >= 0.7:
            shape_score += 0.10
        
        # Penalty for being too circular (coin-like)
        if is_too_circular:
            shape_score *= 0.3  # Heavy penalty
        
        return {
            "is_valid_shape": is_valid_shape,
            "is_too_circular": is_too_circular,
            "shape_confidence": round(shape_score, 3),
            "circularity": round(circularity, 3),
            "aspect_ratio": round(aspect_ratio, 3),
            "convexity": round(convexity, 3)
        }
    
    def _analyze_size(self, mask: np.ndarray, h: int, w: int) -> Dict:
        """Analyze the size of the fruit relative to image."""
        total_pixels = h * w
        fruit_pixels = np.sum(mask > 0)
        area_ratio = fruit_pixels / total_pixels if total_pixels > 0 else 0
        
        is_valid_size = (
            self.size_constraints["min_area_ratio"] <= area_ratio <= self.size_constraints["max_area_ratio"]
        )
        
        if is_valid_size:
            if 0.05 <= area_ratio <= 0.40:
                size_confidence = 1.0
            else:
                size_confidence = 0.7
        else:
            size_confidence = 0.3 if area_ratio > 0.01 else 0.0
        
        return {
            "is_valid_size": is_valid_size,
            "size_confidence": round(size_confidence, 3),
            "area_ratio": round(area_ratio, 4),
            "area_percent": round(area_ratio * 100, 2)
        }
    
    def _analyze_texture(self, img: np.ndarray, mask: np.ndarray) -> Dict:
        """
        Analyze texture to distinguish organic fruit from metallic coin.
        
        Coins have: uniform color, low texture variance, high reflection
        Fruits have: color variation, organic texture, matte surface
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Get pixels in mask
        masked_gray = gray.copy()
        masked_gray[mask == 0] = 0
        
        if np.sum(mask > 0) < 100:
            return {
                "is_organic": False,
                "is_metallic": False,
                "texture_score": 0.0,
                "variance": 0.0,
                "metallic_ratio": 0.0
            }
        
        # Calculate texture variance (organic surfaces have more variation)
        fruit_values = gray[mask > 0]
        variance = np.var(fruit_values)
        
        # Check for metallic shine (high brightness regions with low saturation)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        fruit_hsv = hsv[mask > 0]
        
        # Metallic: low saturation + high value
        low_sat = fruit_hsv[:, 1] < 50
        high_val = fruit_hsv[:, 2] > 180
        metallic_pixels = np.sum(low_sat & high_val)
        metallic_ratio = metallic_pixels / len(fruit_hsv) if len(fruit_hsv) > 0 else 0
        
        # Determine texture type
        is_metallic = metallic_ratio > self.texture_thresholds["max_metallic_shine"]
        is_organic = variance > self.texture_thresholds["min_organic_texture"] * 1000 and not is_metallic
        
        texture_score = 0.0
        if is_organic:
            texture_score = min(1.0, variance / 2000)  # Higher variance = more organic
        elif not is_metallic:
            texture_score = 0.5
        
        return {
            "is_organic": is_organic,
            "is_metallic": is_metallic,
            "texture_score": round(texture_score, 3),
            "variance": round(variance, 2),
            "metallic_ratio": round(metallic_ratio, 3)
        }
    
    def _compute_validation_score(
        self, 
        color_result: Dict, 
        shape_result: Dict, 
        size_result: Dict,
        texture_result: Dict,
        coin_result: Dict
    ) -> float:
        """Compute overall validation score."""
        
        # If object is too circular (coin-like), heavy penalty
        if shape_result.get("is_too_circular"):
            return 0.15
        
        # If texture is metallic, heavy penalty
        if texture_result.get("is_metallic"):
            return 0.10
        
        weights = {
            "color": 0.40,
            "shape": 0.30,
            "texture": 0.15,
            "size": 0.15
        }
        
        color_score = color_result["color_confidence"] if color_result["is_talisay_color"] else 0.0
        shape_score = shape_result["shape_confidence"]
        texture_score = texture_result["texture_score"]
        size_score = size_result["size_confidence"] if size_result["is_valid_size"] else 0.0
        
        total = (
            weights["color"] * color_score +
            weights["shape"] * shape_score +
            weights["texture"] * texture_score +
            weights["size"] * size_score
        )
        
        return round(total, 3)
    
    def _determine_result(
        self,
        score: float,
        color_result: Dict,
        shape_result: Dict,
        coin_result: Dict
    ) -> Tuple[FruitDetectionResult, bool, str]:
        """Determine final validation result."""
        
        # Check for coin-like shape
        if shape_result.get("is_too_circular"):
            if coin_result.get("is_coin"):
                return (
                    FruitDetectionResult.COIN_ONLY,
                    False,
                    "The detected object appears to be a coin, not a fruit. Please include a Talisay fruit in your photo."
                )
            else:
                return (
                    FruitDetectionResult.UNKNOWN_OBJECT,
                    False,
                    "The detected object is too circular to be a Talisay fruit. Talisay fruits have an elongated, almond shape."
                )
        
        if score >= 0.55:
            return (
                FruitDetectionResult.TALISAY_FRUIT,
                True,
                f"Talisay fruit detected ({color_result['dominant_color']} - {color_result['maturity']})"
            )
        elif score >= 0.40:
            return (
                FruitDetectionResult.UNCERTAIN,
                False,
                "Object detected but uncertain if it's a Talisay fruit. Please ensure the fruit is clearly visible with good lighting."
            )
        elif color_result["has_fruit_colors"] and not color_result["is_talisay_color"]:
            return (
                FruitDetectionResult.UNKNOWN_OBJECT,
                False,
                "A fruit-like object was detected but it doesn't match Talisay characteristics. Talisay should be green, yellow, or brown."
            )
        else:
            return (
                FruitDetectionResult.NO_OBJECT,
                False,
                "No valid Talisay fruit found. Please provide an image with a clearly visible Talisay fruit."
            )


def get_coin_mask(
    image: np.ndarray,
    coin_center: Tuple[int, int],
    coin_radius: int,
    expand_ratio: float = 1.05
) -> np.ndarray:
    """Create a circle mask for detected coin."""
    h, w = image.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    expanded_radius = int(coin_radius * expand_ratio)
    cv2.circle(mask, coin_center, expanded_radius, 255, -1)
    return mask


def exclude_coin_from_mask(
    fruit_mask: np.ndarray,
    coin_mask: np.ndarray
) -> np.ndarray:
    """Remove coin region from fruit segmentation mask."""
    return cv2.bitwise_and(fruit_mask, cv2.bitwise_not(coin_mask))


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate Talisay fruit in image")
    parser.add_argument("image", help="Path to image")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    
    args = parser.parse_args()
    
    validator = TalisayValidator()
    result = validator.validate(args.image, return_details=args.verbose)
    
    print("\n" + "=" * 60)
    print("TALISAY FRUIT VALIDATION v2.0")
    print("=" * 60)
    print(f"Result: {result['result'].upper()}")
    print(f"Is Talisay: {'Yes ✓' if result['is_talisay'] else 'No ✗'}")
    print(f"Confidence: {result['confidence']*100:.1f}%")
    print(f"Message: {result['message']}")
    
    if args.verbose and "details" in result:
        details = result["details"]
        
        print("\n--- Coin Detection ---")
        coin = details.get("coin_detection", {})
        print(f"Coin Detected: {'Yes' if coin.get('is_coin') else 'No'}")
        if coin.get("is_coin"):
            print(f"Coin Type: {coin.get('coin_type', 'N/A')}")
            print(f"Coin Confidence: {coin.get('confidence', 0)*100:.1f}%")
        
        print("\n--- Non-Talisay Check ---")
        non_tal = details.get("non_talisay_check", {})
        print(f"Non-Talisay Detected: {'Yes' if non_tal.get('is_non_talisay') else 'No'}")
        if non_tal.get("is_non_talisay"):
            print(f"Detected Type: {non_tal.get('detected_type', 'N/A')}")
        
        print("\n--- Color Analysis ---")
        color = details.get("color_analysis", {})
        print(f"Dominant Color: {color.get('dominant_color', 'N/A')}")
        print(f"Maturity Stage: {color.get('maturity', 'N/A')}")
        print(f"Talisay Coverage: {color.get('talisay_coverage_percent', 0):.1f}%")
        print(f"Color Distribution: {color.get('color_distribution', {})}")
        
        print("\n--- Shape Analysis ---")
        shape = details.get("shape_analysis", {})
        print(f"Circularity: {shape.get('circularity', 0):.3f}")
        print(f"Aspect Ratio: {shape.get('aspect_ratio', 0):.2f}")
        print(f"Too Circular (coin-like): {'Yes ⚠' if shape.get('is_too_circular') else 'No ✓'}")
        
        print("\n--- Texture Analysis ---")
        texture = details.get("texture_analysis", {})
        print(f"Is Organic: {'Yes ✓' if texture.get('is_organic') else 'No'}")
        print(f"Is Metallic: {'Yes ⚠' if texture.get('is_metallic') else 'No ✓'}")
        print(f"Variance: {texture.get('variance', 0):.1f}")
        
        print("\n--- Size Analysis ---")
        size = details.get("size_analysis", {})
        print(f"Area: {size.get('area_percent', 0):.2f}% of image")
    
    print("=" * 60)
