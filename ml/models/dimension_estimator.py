"""
Advanced Dimension Estimation for Talisay Fruit
Uses reference object detection for accurate real-world measurements
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Optional, Union
from PIL import Image


# Known reference object sizes (in cm)
REFERENCE_OBJECTS = {
    # Philippine Peso Coins - New Generation Currency (NGC) Series 2017-present
    "peso_1_new": {"diameter": 2.0, "name": "₱1 Coin (Silver, New)", "color": "silver"},
    "peso_5_new": {"diameter": 2.4, "name": "₱5 Coin (Silver, New)", "color": "silver"},  # RECOMMENDED
    "peso_10_new": {"diameter": 2.45, "name": "₱10 Coin (Silver/Gold, New)", "color": "bimetallic"},
    "peso_20_new": {"diameter": 2.8, "name": "₱20 Coin (Silver/Gold, New)", "color": "bimetallic"},
    
    # Philippine Peso Coins - Old Series (pre-2017)
    "peso_1_old": {"diameter": 2.4, "name": "₱1 Coin (Brass, Old)", "color": "gold"},
    "peso_5_old": {"diameter": 2.5, "name": "₱5 Coin (Brass, Old)", "color": "gold"},
    "peso_10_old": {"diameter": 2.7, "name": "₱10 Coin (Bimetallic, Old)", "color": "bimetallic"},
    
    # Aliases for convenience
    "peso_1": {"diameter": 2.0, "name": "₱1 Coin (New Silver)", "color": "silver"},
    "peso_5": {"diameter": 2.4, "name": "₱5 Coin (New Silver)", "color": "silver"},
    "peso_10": {"diameter": 2.45, "name": "₱10 Coin (New)", "color": "bimetallic"},
    "peso_20": {"diameter": 2.8, "name": "₱20 Coin (New)", "color": "bimetallic"},
    
    # Other reference objects
    "credit_card": {"width": 8.56, "height": 5.398, "name": "Credit/ID Card"},
    "a4_paper": {"width": 21.0, "height": 29.7, "name": "A4 Paper"},
    "aruco_4x4": {"size": 5.0, "name": "ArUco Marker 5cm"},  # Default ArUco size
}


class DimensionEstimator:
    """
    Estimates real-world dimensions of Talisay fruit from images.
    
    Methods:
    1. Reference Object Method - Uses known-size object (coin, card) in image
    2. ArUco Marker Method - Uses printed ArUco marker for precise calibration
    3. Contour Analysis Method - Estimates relative size (less accurate)
    4. ML-Based Method - Trained regression model (requires training data)
    """
    
    def __init__(self, reference_type: str = "peso_5"):
        """
        Initialize the dimension estimator.
        
        Args:
            reference_type: Type of reference object used
                           ("peso_1", "peso_5", "peso_10", "peso_20", 
                            "credit_card", "aruco_4x4")
        """
        self.reference_type = reference_type
        self.reference_info = REFERENCE_OBJECTS.get(reference_type, REFERENCE_OBJECTS["peso_5"])
        self.pixels_per_cm = None
        self.aruco_dict = None
        self.aruco_params = None
        
        # Initialize ArUco detector if available
        try:
            self.aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
            self.aruco_params = cv2.aruco.DetectorParameters()
        except:
            pass
    
    def estimate_from_image(
        self,
        image: Union[str, Path, np.ndarray, Image.Image],
        reference_method: str = "auto"
    ) -> Dict:
        """
        Estimate fruit dimensions from an image.
        
        Args:
            image: Input image (path, numpy array, or PIL Image)
            reference_method: Detection method
                             "auto" - Try all methods
                             "coin" - Look for circular reference (coin)
                             "card" - Look for rectangular reference (card)
                             "aruco" - Look for ArUco markers
                             "contour" - Contour-based estimation (no reference)
        
        Returns:
            Dictionary with estimated dimensions
        """
        # Load image
        img = self._load_image(image)
        if img is None:
            return {"error": "Could not load image", "success": False}
        
        result = {
            "success": False,
            "method_used": None,
            "pixels_per_cm": None,
            "length_cm": None,
            "width_cm": None,
            "area_cm2": None,
            "fruit_contour": None,
            "reference_detected": False,
            "confidence": 0.0
        }
        
        # Try different methods based on preference
        if reference_method == "auto":
            # Try ArUco first (most accurate)
            aruco_result = self._detect_aruco(img)
            if aruco_result["detected"]:
                result.update(aruco_result)
                result["method_used"] = "aruco"
                result["reference_detected"] = True
            else:
                # Try coin detection
                coin_result = self._detect_coin_reference(img)
                if coin_result["detected"]:
                    result.update(coin_result)
                    result["method_used"] = "coin"
                    result["reference_detected"] = True
                else:
                    # Try card detection
                    card_result = self._detect_card_reference(img)
                    if card_result["detected"]:
                        result.update(card_result)
                        result["method_used"] = "card"
                        result["reference_detected"] = True
                    else:
                        # Fall back to contour estimation
                        contour_result = self._estimate_from_contour(img)
                        result.update(contour_result)
                        result["method_used"] = "contour_estimation"
        
        elif reference_method == "aruco":
            aruco_result = self._detect_aruco(img)
            result.update(aruco_result)
            result["method_used"] = "aruco"
            result["reference_detected"] = aruco_result["detected"]
            
        elif reference_method == "coin":
            coin_result = self._detect_coin_reference(img)
            result.update(coin_result)
            result["method_used"] = "coin"
            result["reference_detected"] = coin_result["detected"]
            
        elif reference_method == "card":
            card_result = self._detect_card_reference(img)
            result.update(card_result)
            result["method_used"] = "card"
            result["reference_detected"] = card_result["detected"]
            
        else:  # contour
            contour_result = self._estimate_from_contour(img)
            result.update(contour_result)
            result["method_used"] = "contour_estimation"
        
        # Estimate fruit dimensions if we have pixels_per_cm
        if result.get("pixels_per_cm"):
            fruit_dims = self._measure_fruit(img, result["pixels_per_cm"])
            result.update(fruit_dims)
            result["success"] = True
        
        return result
    
    def _load_image(self, image) -> Optional[np.ndarray]:
        """Load image from various sources."""
        if isinstance(image, (str, Path)):
            img = cv2.imread(str(image))
            return img
        elif isinstance(image, Image.Image):
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        elif isinstance(image, np.ndarray):
            if len(image.shape) == 3 and image.shape[2] == 3:
                return image
            return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        return None
    
    def _detect_aruco(self, img: np.ndarray) -> Dict:
        """Detect ArUco markers for precise calibration."""
        result = {"detected": False}
        
        if self.aruco_dict is None:
            return result
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        try:
            detector = cv2.aruco.ArucoDetector(self.aruco_dict, self.aruco_params)
            corners, ids, rejected = detector.detectMarkers(gray)
        except:
            # Fallback for older OpenCV versions
            corners, ids, rejected = cv2.aruco.detectMarkers(
                gray, self.aruco_dict, parameters=self.aruco_params
            )
        
        if ids is not None and len(ids) > 0:
            # Get marker size in pixels
            marker_corners = corners[0][0]
            marker_width_px = np.linalg.norm(marker_corners[0] - marker_corners[1])
            marker_height_px = np.linalg.norm(marker_corners[1] - marker_corners[2])
            marker_size_px = (marker_width_px + marker_height_px) / 2
            
            # Calculate pixels per cm
            marker_size_cm = self.reference_info.get("size", 5.0)
            pixels_per_cm = marker_size_px / marker_size_cm
            
            result["detected"] = True
            result["pixels_per_cm"] = pixels_per_cm
            result["marker_id"] = int(ids[0][0])
            result["marker_corners"] = marker_corners
            result["confidence"] = 0.95  # ArUco is very accurate
        
        return result
    
    def _detect_coin_reference(self, img: np.ndarray) -> Dict:
        """
        Detect Philippine Peso coin (P5, 25mm diameter) as size reference.
        
        Works for both gold (old P5) and silver (new P5) coins under
        any lighting including blue/warm/fluorescent color casts.
        
        Strategy:
        - If image width > MAX_DETECTION_WIDTH (1200px), downscale first
          for faster and more accurate HoughCircles detection
        - Score by: metallic indicator, rim strength, uniformity,
          contrast, position, size
        - Scale results back to original image coordinates
        """
        result = {"detected": False, "coin_type": None}
        
        h, w = img.shape[:2]
        
        # Auto-downscale large images for better detection accuracy and speed
        # HoughCircles works best on images around 600-1200px wide
        MAX_DETECTION_WIDTH = 1200
        scale = 1.0
        work_img = img
        
        if w > MAX_DETECTION_WIDTH:
            scale = MAX_DETECTION_WIDTH / w
            new_w = MAX_DETECTION_WIDTH
            new_h = int(h * scale)
            work_img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        best_circle, best_score = self._detect_coin_single_pass(work_img)
        
        if best_circle is not None and best_score >= 0.40:
            x, y, r = best_circle
            
            # Scale back to original image coordinates
            if scale != 1.0:
                x = int(x / scale)
                y = int(y / scale)
                r = int(r / scale)
            
            diameter_px = 2 * r
            
            # P5 Coin: 25mm diameter
            coin_diameter_mm = 25
            coin_diameter_cm = 2.5
            
            pixels_per_mm = diameter_px / coin_diameter_mm
            pixels_per_cm = pixels_per_mm * 10
            
            result["detected"] = True
            result["pixels_per_cm"] = pixels_per_cm
            result["coin_center"] = (x, y)
            result["coin_radius"] = r
            result["coin_diameter_px"] = diameter_px
            result["coin_type"] = "peso_5"
            result["coin_name"] = "P5 Coin (25mm)"
            result["coin_diameter_cm"] = coin_diameter_cm
            result["detection_score"] = best_score
            result["confidence"] = min(0.95, 0.5 + best_score * 0.5)
            result["detection_method"] = "edge_ring"
        
        return result
    
    def _detect_coin_single_pass(self, img: np.ndarray) -> tuple:
        """
        Detect coin using rim-continuity-primary scoring.
        
        Key insight: Real coins have a nearly complete circle of edge
        pixels at their boundary (the physical rim). This distinguishes
        them from background circles and from smaller circles inside
        the coin area.
        
        Scoring factors (max ~1.0):
          1. Rim continuity  (0.30) - fraction of circumference with edges
          2. Metallic ratio  (0.18) - V/(S+1), high for silver/metallic
          3. Rim edge density (0.10) - edge pixels in annular band
          4. Contrast         (0.15) - interior vs exterior brightness
          5. Uniformity       (0.10) - low interior std deviation
          6. Position         (0.07) - prefer left half of image
          7. Size             (0.10) - prefer mid-range circle sizes
        
        Returns:
            (best_circle_tuple_or_None, best_score)
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        h, w = img.shape[:2]
        
        blur_size = 5 if w < 2000 else 7
        blurred = cv2.GaussianBlur(gray, (blur_size, blur_size), 0)
        
        # CLAHE gray for better edge detection  
        clahe_gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        blurred_clahe = cv2.GaussianBlur(clahe_gray, (blur_size, blur_size), 0)
        
        # Coin should be 5-20% of image width
        min_radius = max(20, int(w * 0.025))
        max_radius = min(int(w * 0.12), int(h * 0.20))
        min_dist = max(40, int(w * 0.02))
        
        # HoughCircles: 2 gray versions × 3 param2 values = 6 calls
        all_circles = []
        for gray_ver in [blurred, blurred_clahe]:
            for param2 in [20, 28, 35]:
                circles = cv2.HoughCircles(
                    gray_ver, cv2.HOUGH_GRADIENT, dp=1.2,
                    minDist=min_dist, param1=60, param2=param2,
                    minRadius=min_radius, maxRadius=max_radius
                )
                if circles is not None:
                    for c in circles[0]:
                        all_circles.append(c)
        
        if not all_circles:
            return None, 0
        
        # Smart dedup: keep overlapping circles if radii differ significantly
        dedup_thr = max(20, min_radius // 2)
        unique = []
        for c in all_circles:
            keep = True
            for u in unique:
                dist = np.sqrt((c[0]-u[0])**2 + (c[1]-u[1])**2)
                if dist < dedup_thr:
                    r_ratio = max(c[2], u[2]) / max(1, min(c[2], u[2]))
                    if r_ratio < 1.25:
                        keep = False
                    break
            if keep:
                unique.append(c)
        
        # Precompute edge maps (both normal and CLAHE for robustness)
        edges = cv2.Canny(blurred, 50, 150)
        edges_clahe = cv2.Canny(blurred_clahe, 50, 150)
        # Combined edges: use whichever finds more
        edges_combined = cv2.bitwise_or(edges, edges_clahe)
        
        scored_circles = []
        
        N_SECTORS = 36  # 10 degrees per sector for rim continuity
        
        for circle in unique:
            x, y, r = int(circle[0]), int(circle[1]), int(circle[2])
            
            margin = max(5, r // 10)
            if x-r < margin or x+r >= w-margin or y-r < margin or y+r >= h-margin:
                continue
            
            pos_x = x / w
            if pos_x > 0.55:
                continue
            
            size_ratio = (2 * r) / w
            if not (0.04 < size_ratio < 0.25):
                continue
            
            # Extract interior
            inner_mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.circle(inner_mask, (x, y), r, 255, -1)
            inner_gray = gray[inner_mask > 0]
            inner_hsv = hsv[inner_mask > 0]
            
            if len(inner_gray) < 200:
                continue
            
            mean_hue = np.mean(inner_hsv[:, 0])
            mean_sat = np.mean(inner_hsv[:, 1])
            mean_val = np.mean(inner_hsv[:, 2])
            std_gray = np.std(inner_gray)
            
            # === HARD REJECTIONS ===
            if (35 < mean_hue < 85) and (mean_sat > 35):
                continue  # Green fruit
            if std_gray > 55:
                continue  # Too variable
            if mean_val > 240 or mean_val < 15:
                continue  # Washed out or black
            
            # === SCORING (max ~1.0) ===
            score = 0.0
            
            # --- 1. RIM CONTINUITY (0-0.30) PRIMARY ---
            # Check how many angular sectors have edge pixels on circumference.
            # Real coins have >70% continuity; random circles have <50%.
            neighborhood = max(2, r // 15)
            sector_hits = 0
            for i in range(N_SECTORS):
                angle = 2 * np.pi * i / N_SECTORS
                px = int(x + r * np.cos(angle))
                py = int(y + r * np.sin(angle))
                y1 = max(0, py - neighborhood)
                y2 = min(h, py + neighborhood + 1)
                x1 = max(0, px - neighborhood)
                x2 = min(w, px + neighborhood + 1)
                if y2 > y1 and x2 > x1 and np.any(edges_combined[y1:y2, x1:x2] > 0):
                    sector_hits += 1
            
            rim_continuity = sector_hits / N_SECTORS
            
            if rim_continuity > 0.85:
                score += 0.30
            elif rim_continuity > 0.75:
                score += 0.26
            elif rim_continuity > 0.65:
                score += 0.21
            elif rim_continuity > 0.50:
                score += 0.15
            elif rim_continuity > 0.35:
                score += 0.08
            else:
                score += 0.02
            
            # --- 2. METALLIC INDICATOR (0-0.18) ---
            metallic_ratio = mean_val / (mean_sat + 1)
            if metallic_ratio > 4.0:
                score += 0.18
            elif metallic_ratio > 3.0:
                score += 0.15
            elif metallic_ratio > 2.5:
                score += 0.12
            elif metallic_ratio > 2.0:
                score += 0.09
            elif metallic_ratio > 1.5:
                score += 0.06
            elif metallic_ratio > 1.0:
                score += 0.05 if (mean_hue < 30 and std_gray < 35) else 0.03
            else:
                score += 0.04 if (mean_hue < 25 and std_gray < 30) else 0.01
            
            # --- 3. RIM EDGE DENSITY (0-0.10) ---
            thickness = max(2, r // 12)
            ring_outer = np.zeros(gray.shape, dtype=np.uint8)
            cv2.circle(ring_outer, (x, y), r + thickness, 255, -1)
            ring_inner = np.zeros(gray.shape, dtype=np.uint8)
            cv2.circle(ring_inner, (x, y), max(1, r - thickness), 255, -1)
            ring_mask = ring_outer - ring_inner
            ring_area = np.sum(ring_mask > 0)
            edge_on_ring = np.sum((edges_combined > 0) & (ring_mask > 0))
            rim_ratio = edge_on_ring / max(1, ring_area)
            
            if rim_ratio > 0.15:
                score += 0.10
            elif rim_ratio > 0.10:
                score += 0.08
            elif rim_ratio > 0.06:
                score += 0.06
            elif rim_ratio > 0.03:
                score += 0.04
            elif rim_ratio > 0.01:
                score += 0.02
            
            # --- 4. INTERIOR-EXTERIOR CONTRAST (0-0.15) ---
            outer_mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.circle(outer_mask, (x, y), int(r * 1.4), 255, -1)
            cv2.circle(outer_mask, (x, y), r, 0, -1)
            outer_gray = gray[outer_mask > 0]
            if len(outer_gray) > 50:
                contrast = abs(np.mean(outer_gray) - np.mean(inner_gray)) / max(1, (np.mean(outer_gray) + np.mean(inner_gray)) / 2)
                if contrast > 0.20:
                    score += 0.15
                elif contrast > 0.10:
                    score += 0.12
                elif contrast > 0.05:
                    score += 0.08
                elif contrast > 0.02:
                    score += 0.04
            
            # --- 5. INTERIOR UNIFORMITY (0-0.10) ---
            if std_gray < 22:
                score += 0.10
            elif std_gray < 30:
                score += 0.08
            elif std_gray < 38:
                score += 0.06
            elif std_gray < 45:
                score += 0.03
            elif std_gray < 52:
                score += 0.01
            
            # --- 6. POSITION (0-0.07) ---
            score += max(0, (0.55 - pos_x) / 0.55) * 0.07
            
            # --- 7. SIZE PREFERENCE (0-0.10) ---
            # Prefer circles that are a reasonable coin size (6-16% of width)
            if 0.06 < size_ratio < 0.16:
                score += 0.10
            elif 0.05 < size_ratio < 0.20:
                score += 0.07
            else:
                score += 0.03
            
            scored_circles.append((x, y, r, score, rim_continuity))
        
        if not scored_circles:
            return None, 0
        
        # Sort by score descending
        scored_circles.sort(key=lambda c: -c[3])
        
        # Post-processing: prefer larger circles when smaller ones are inside them.
        # If the top circle is small and a larger circle at a similar position
        # has good score, prefer the larger (more likely to be the full coin).
        best = scored_circles[0]
        for candidate in scored_circles[1:min(10, len(scored_circles))]:
            if candidate[2] > best[2] * 1.3:  # Candidate is significantly larger
                dist = np.sqrt((candidate[0]-best[0])**2 + (candidate[1]-best[1])**2)
                if dist < best[2] * 1.5:  # Similar position (small is inside large)
                    if candidate[3] > best[3] * 0.85:  # Score is reasonably close
                        best = candidate
        
        return (best[0], best[1], best[2]), best[3]
    
    def _detect_card_reference(self, img: np.ndarray) -> Dict:
        """
        Detect rectangular reference object (credit card, ID card).
        
        DISABLED: Card detection causes too many false positives on fruit images.
        Users should use coins for reference instead.
        """
        result = {"detected": False}
        
        # Card detection is disabled to prevent false positives
        # The algorithm was detecting random rectangular shapes in fruit images
        # as "cards". Since we're focused on coin-based reference, this is disabled.
        return result
    
    def fast_coin_search(self, img: np.ndarray, fruit_bbox=None) -> Dict:
        """
        Fast size-aware circle-first coin detection.
        
        Key insight: The ₱5 coin is placed on a WHITE/LIGHT surface next to
        the fruit in reference photos. Outdoor photos (on trees) will NOT
        have a white surface. So:
        0. Pre-check: if image has no bright/white border → skip immediately
        1. Downscale to 512px (HoughCircles: 0.01s vs 16s at 1024px)
        2. Search for circles sized ~4-11% of image width (coin-sized)
        3. Reject circles centered inside the YOLO-detected fruit bbox
        4. Score for metallic/edge/contrast properties
        5. If nothing passes → no coin → skip to segmentation
        
        Args:
            img: BGR image (any resolution)
            fruit_bbox: Optional YOLO fruit info dict with 'bbox' [x1,y1,x2,y2]
                        and/or 'size' [w,h]. Used to exclude fruit-overlapping circles.
        """
        h_orig, w_orig = img.shape[:2]
        
        # === STEP 0: Quick background check ===
        # Reference coin photos have the fruit + coin on a light surface,
        # so border pixels are bright (avg > 165). Outdoor tree photos have
        # darker borders (avg < 165). Skip coin search for outdoor photos.
        gray_full = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        bw = max(20, int(w_orig * 0.10))
        bh = max(20, int(h_orig * 0.10))
        border = np.concatenate([
            gray_full[:bh, :].ravel(),
            gray_full[-bh:, :].ravel(),
            gray_full[:, :bw].ravel(),
            gray_full[:, -bw:].ravel()
        ])
        border_brightness = float(np.mean(border))
        if border_brightness < 165:
            # Dark border → outdoor/natural photo → no reference coin
            return {"detected": False}
        
        # === STEP 1: Downscale to 512px for speed ===
        coin_search_dim = 512
        if max(h_orig, w_orig) > coin_search_dim:
            scale = coin_search_dim / max(h_orig, w_orig)
            small = cv2.resize(img, (int(w_orig * scale), int(h_orig * scale)),
                               interpolation=cv2.INTER_AREA)
        else:
            scale = 1.0
            small = img
        
        h, w = small.shape[:2]
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 1.5)
        
        # === STEP 2: Coin-sized radius range ===
        # ₱5 coin at typical phone photos: 4-11% of image width
        # At 512px: r=8 to r=56 (real coins observed: r=35-56)
        # Larger circles (r>56) are fruit edges, not coins
        min_r = max(8, int(w * 0.03))
        max_r = int(w * 0.11)
        min_dist = max(15, int(w * 0.04))
        
        # === STEP 3: HoughCircles with tight coin-sized constraint ===
        circles = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT, dp=1.2,
            minDist=min_dist,
            param1=80, param2=40,
            minRadius=min_r, maxRadius=max_r
        )
        
        if circles is None:
            return {"detected": False}
        
        # Cap at 10 candidates
        circle_list = circles[0][:10]
        
        # Precompute shared data on small image
        edges = cv2.Canny(blurred, 50, 150)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        
        # Scale fruit bbox to small image coords for exclusion
        fruit_rect = None
        if fruit_bbox is not None and "bbox" in fruit_bbox:
            bx = fruit_bbox["bbox"]
            # Shrink fruit bbox by 15% on each side to allow coins near the edge
            fw = (bx[2] - bx[0]) * scale
            fh = (bx[3] - bx[1]) * scale
            margin_x = fw * 0.15
            margin_y = fh * 0.15
            fruit_rect = (
                bx[0] * scale + margin_x,
                bx[1] * scale + margin_y,
                bx[2] * scale - margin_x,
                bx[3] * scale - margin_y
            )
        
        # Precompute ring angles (vectorized)
        n_ring = 24
        ring_angles = np.linspace(0, 2 * np.pi, n_ring, endpoint=False)
        cos_a = np.cos(ring_angles)
        sin_a = np.sin(ring_angles)
        
        candidates = []
        
        for circle in circle_list:
            cx, cy, r = int(circle[0]), int(circle[1]), int(circle[2])
            r = max(1, r)
            
            # Bounds check
            if cx - r < 2 or cy - r < 2 or cx + r >= w - 2 or cy + r >= h - 2:
                continue
            
            # === Reject circles centered inside the fruit ===
            # The coin is placed NEXT TO the fruit, not on it
            if fruit_rect is not None:
                if (fruit_rect[0] < cx < fruit_rect[2] and
                    fruit_rect[1] < cy < fruit_rect[3]):
                    continue
            
            score = 0.0
            
            # === CRITERION 1: Edge ring continuity (0-0.25) ===
            px = (cx + r * cos_a).astype(int)
            py = (cy + r * sin_a).astype(int)
            valid = (px >= 1) & (px < w - 1) & (py >= 1) & (py < h - 1)
            edge_hits = 0
            for i in range(n_ring):
                if valid[i]:
                    if np.any(edges[py[i]-1:py[i]+2, px[i]-1:px[i]+2]):
                        edge_hits += 1
            edge_ratio = edge_hits / max(1, int(np.sum(valid)))
            score += min(0.25, edge_ratio * 0.42)
            
            if edge_ratio < 0.15:
                continue
            
            # === Shared ROI computation ===
            inner_r = max(1, int(r * 0.55))
            y1i = max(0, cy - inner_r)
            y2i = min(h, cy + inner_r)
            x1i = max(0, cx - inner_r)
            x2i = min(w, cx + inner_r)
            interior = gray[y1i:y2i, x1i:x2i]
            roi_hsv = hsv[y1i:y2i, x1i:x2i]
            
            outer_r = r + max(5, int(r * 0.15))
            ex = (cx + outer_r * cos_a).astype(int)
            ey = (cy + outer_r * sin_a).astype(int)
            ext_valid = (ex >= 0) & (ex < w) & (ey >= 0) & (ey < h)
            ext_pixels = gray[ey[ext_valid], ex[ext_valid]] if np.any(ext_valid) else np.array([])
            ext_hsv_s = hsv[ey[ext_valid], ex[ext_valid], 1] if np.any(ext_valid) else np.array([])
            
            # === CRITERION 2: Interior vs exterior contrast (0-0.20) ===
            if interior.size > 4 and len(ext_pixels) > 4:
                int_mean = float(np.mean(interior))
                ext_mean = float(np.mean(ext_pixels))
                contrast = abs(int_mean - ext_mean)
                if contrast > 30:
                    score += 0.20
                elif contrast > 20:
                    score += 0.15
                elif contrast > 12:
                    score += 0.08
            
            # === CRITERION 3: Texture (0-0.15) ===
            if interior.size > 16:
                int_std = float(np.std(interior))
                if 12 < int_std < 55:
                    score += 0.15
                elif 8 < int_std < 60:
                    score += 0.08
            
            # === CRITERION 4: Low interior saturation — metallic (0-0.15) ===
            if roi_hsv.size > 0:
                mean_s = float(np.mean(roi_hsv[:, :, 1]))
                high_sat_ratio = float(np.mean(roi_hsv[:, :, 1] > 80))
                if mean_s < 45 and high_sat_ratio < 0.10:
                    score += 0.15
                elif mean_s < 65 and high_sat_ratio < 0.25:
                    score += 0.08
            
            # === CRITERION 5: Bright neutral surroundings (0-0.20) ===
            # KEY discriminator: The coin is placed on a WHITE/LIGHT surface
            # in reference photos. Outdoor photos have green/dark surroundings.
            if len(ext_pixels) > 4 and len(ext_hsv_s) > 4:
                ext_brightness = float(np.mean(ext_pixels))
                ext_sat = float(np.mean(ext_hsv_s))
                if ext_brightness > 190 and ext_sat < 40:
                    score += 0.20  # White/light neutral surface
                elif ext_brightness > 170 and ext_sat < 55:
                    score += 0.12  # Light-ish surface
                elif ext_brightness > 150 and ext_sat < 40:
                    score += 0.06  # Gray neutral surface
                # Dark or colorful exterior → 0 points (likely outdoor)
            
            # === CRITERION 6: Reasonable size ratio (0-0.05) ===
            size_ratio = (2 * r) / w
            if 0.04 < size_ratio < 0.12:
                score += 0.05
            
            candidates.append((score, cx, cy, r))
        
        if not candidates:
            return {"detected": False}
        
        candidates.sort(key=lambda x: x[0], reverse=True)
        
        # Validate top candidates against fruit dimensions
        coin_diameter_cm = self.reference_info.get("diameter", 2.4)
        
        for score, cx, cy, r in candidates:
            if score < 0.55:
                break
            
            # Map back to original image coordinates
            cx_orig = int(cx / scale)
            cy_orig = int(cy / scale)
            r_orig = int(r / scale)
            
            ppcm = (r_orig * 2) / coin_diameter_cm
            
            # Sanity: if fruit was detected, check dimensions make sense
            if fruit_bbox and "size" in fruit_bbox:
                fw_cm = fruit_bbox["size"][0] / ppcm
                fh_cm = fruit_bbox["size"][1] / ppcm
                fruit_len = max(fw_cm, fh_cm)
                fruit_wid = min(fw_cm, fh_cm)
                if fruit_len > 9.0 or fruit_len < 2.5 or fruit_wid > 7.0 or fruit_wid < 1.5:
                    continue
            
            return {
                "detected": True,
                "coin_center": (cx_orig, cy_orig),
                "coin_radius": r_orig,
                "coin_diameter_px": r_orig * 2,
                "coin_diameter_cm": coin_diameter_cm,
                "pixels_per_cm": ppcm,
                "confidence": min(0.90, score),
                "coin_name": self.reference_info.get("name", "₱5 Coin"),
                "method": "size_aware_circle"
            }
        
        return {"detected": False}
    
    def _estimate_from_contour(self, img: np.ndarray) -> Dict:
        """
        Estimate dimensions without reference object.
        Uses contour analysis + statistical priors for Talisay fruit.
        Returns length_cm, width_cm, weight, kernel mass.
        """
        result = {
            "detected": False,
            "warning": "No reference object detected. Using contour-based estimation."
        }
        
        # Segment the fruit
        fruit_contour, fruit_mask = self._segment_fruit(img)
        
        if fruit_contour is not None and len(fruit_contour) >= 5:
            ellipse = cv2.fitEllipse(fruit_contour)
            (cx, cy), (minor_axis, major_axis), angle = ellipse
            
            # Ensure major > minor
            if major_axis < minor_axis:
                major_axis, minor_axis = minor_axis, major_axis
            
            # Fruit typically fills 30-70% of a well-framed phone photo
            img_diagonal = np.sqrt(img.shape[0]**2 + img.shape[1]**2)
            fruit_major_ratio = major_axis / img_diagonal
            
            # Estimate length using photo framing heuristic
            # Talisay fruit: 3.5-7.0 cm length; typical photo → fruit is ~40% of diagonal
            # Without a coin reference, use conservative estimates matching
            # coin-measured averages (L≈4.5, W≈3.0) to avoid overestimation
            if 0.2 < fruit_major_ratio < 0.8:
                estimated_length = 4.5 * (fruit_major_ratio / 0.4)
                estimated_length = np.clip(estimated_length, 3.5, 5.5)
            else:
                estimated_length = 4.5
            
            # Compute aspect ratio from ellipse to derive width
            aspect_ratio = minor_axis / major_axis if major_axis > 0 else 0.7
            estimated_width = estimated_length * aspect_ratio
            estimated_width = np.clip(estimated_width, 2.0, 4.0)
            
            # Estimate pixels per cm
            pixels_per_cm = major_axis / estimated_length
            
            # Compute weight from ellipsoid volume (density ~0.85 g/cm³)
            volume_cm3 = (4/3) * np.pi * (estimated_length/2) * (estimated_width/2) * (estimated_width/2 * 0.8)
            estimated_weight = volume_cm3 * 0.85
            estimated_weight = np.clip(estimated_weight, 15.0, 60.0)
            
            # Kernel mass correlates with fruit size
            kernel_mass = 0.1 + (estimated_length * estimated_width / 35) * 0.6
            kernel_mass = np.clip(kernel_mass, 0.1, 0.9)
            
            result["detected"] = True
            result["pixels_per_cm"] = pixels_per_cm
            result["fruit_contour"] = fruit_contour
            result["confidence"] = 0.40
            result["estimation_method"] = "statistical_prior"
            result["note"] = "For accurate measurements, include a coin or reference object"
            # Return actual computed values instead of hardcoded defaults
            result["length_cm"] = round(estimated_length, 2)
            result["width_cm"] = round(estimated_width, 2)
            result["estimated_weight_g"] = round(estimated_weight, 1)
            result["estimated_kernel_mass_g"] = round(kernel_mass, 3)
            result["ellipse"] = ellipse
        
        return result
    
    def _segment_fruit(self, img: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """Segment the fruit from background."""
        # Convert to HSV
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Create mask for green/yellow/brown colors (fruit colors)
        # Green range
        mask_green = cv2.inRange(hsv, (25, 30, 30), (90, 255, 255))
        # Yellow range
        mask_yellow = cv2.inRange(hsv, (15, 50, 50), (35, 255, 255))
        # Brown range
        mask_brown = cv2.inRange(hsv, (5, 30, 30), (25, 200, 200))
        
        # Combine masks
        fruit_mask = mask_green | mask_yellow | mask_brown
        
        # Morphological operations
        kernel = np.ones((7, 7), np.uint8)
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_CLOSE, kernel)
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(fruit_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get largest contour (likely the fruit)
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Minimum area threshold
            min_area = img.shape[0] * img.shape[1] * 0.01  # At least 1% of image
            
            if cv2.contourArea(largest_contour) > min_area:
                return largest_contour, fruit_mask
        
        return None, None
    
    def _measure_fruit(self, img: np.ndarray, pixels_per_cm: float) -> Dict:
        """Measure fruit dimensions using the calibrated scale."""
        result = {}
        
        # Segment fruit
        fruit_contour, fruit_mask = self._segment_fruit(img)
        
        if fruit_contour is not None and len(fruit_contour) >= 5:
            # Fit ellipse to get major/minor axes
            ellipse = cv2.fitEllipse(fruit_contour)
            (cx, cy), (minor_axis_px, major_axis_px), angle = ellipse
            
            # Ensure major > minor
            if major_axis_px < minor_axis_px:
                major_axis_px, minor_axis_px = minor_axis_px, major_axis_px
            
            # Convert to cm
            length_cm = major_axis_px / pixels_per_cm
            width_cm = minor_axis_px / pixels_per_cm
            
            # Clip to valid Talisay ranges
            length_cm = np.clip(length_cm, 3.0, 8.0)
            width_cm = np.clip(width_cm, 1.5, 6.0)
            
            # Calculate area
            area_cm2 = np.pi * (length_cm / 2) * (width_cm / 2)
            
            # Estimate weight from dimensions (empirical formula)
            # Talisay fruits are roughly ellipsoidal
            volume_cm3 = (4/3) * np.pi * (length_cm/2) * (width_cm/2) * (width_cm/2 * 0.8)
            estimated_weight_g = volume_cm3 * 0.85  # Approximate density
            estimated_weight_g = np.clip(estimated_weight_g, 15.0, 60.0)
            
            # Estimate kernel mass (correlates with fruit size)
            kernel_mass_g = 0.1 + (length_cm * width_cm / 35) * 0.6
            kernel_mass_g = np.clip(kernel_mass_g, 0.1, 0.9)
            
            result["length_cm"] = round(length_cm, 2)
            result["width_cm"] = round(width_cm, 2)
            result["area_cm2"] = round(area_cm2, 2)
            result["estimated_weight_g"] = round(estimated_weight_g, 1)
            result["estimated_kernel_mass_g"] = round(kernel_mass_g, 3)
            result["fruit_contour"] = fruit_contour
            result["ellipse"] = ellipse
        
        return result
    
    def visualize_measurement(
        self,
        image: Union[str, Path, np.ndarray],
        result: Dict,
        output_path: str = None
    ) -> np.ndarray:
        """
        Create visualization of the measurement.
        
        Args:
            image: Input image
            result: Result from estimate_from_image()
            output_path: Optional path to save visualization
            
        Returns:
            Annotated image as numpy array
        """
        img = self._load_image(image)
        if img is None:
            return None
        
        vis = img.copy()
        
        # Draw reference object if detected
        if result.get("method_used") == "coin" and "coin_center" in result:
            x, y = result["coin_center"]
            r = result["coin_radius"]
            cv2.circle(vis, (x, y), r, (0, 255, 255), 3)
            cv2.putText(vis, f"Reference: {self.reference_info['name']}", 
                       (x - r, y - r - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        elif result.get("method_used") == "aruco" and "marker_corners" in result:
            corners = result["marker_corners"].astype(int)
            cv2.polylines(vis, [corners], True, (0, 255, 255), 3)
            cv2.putText(vis, f"ArUco #{result.get('marker_id', '?')}", 
                       (corners[0][0], corners[0][1] - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        # Draw fruit contour and measurements
        if "fruit_contour" in result and result["fruit_contour"] is not None:
            cv2.drawContours(vis, [result["fruit_contour"]], -1, (0, 255, 0), 2)
            
            if "ellipse" in result:
                cv2.ellipse(vis, result["ellipse"], (255, 0, 255), 2)
        
        # Add measurement text
        y_offset = 30
        texts = []
        
        if result.get("length_cm"):
            texts.append(f"Length: {result['length_cm']:.2f} cm")
        if result.get("width_cm"):
            texts.append(f"Width: {result['width_cm']:.2f} cm")
        if result.get("estimated_weight_g"):
            texts.append(f"Est. Weight: {result['estimated_weight_g']:.1f} g")
        if result.get("confidence"):
            texts.append(f"Confidence: {result['confidence']*100:.0f}%")
        if result.get("method_used"):
            texts.append(f"Method: {result['method_used']}")
        
        for text in texts:
            cv2.putText(vis, text, (10, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            y_offset += 30
        
        if output_path:
            cv2.imwrite(output_path, vis)
        
        return vis


def create_aruco_reference(
    marker_id: int = 0,
    marker_size_cm: float = 5.0,
    output_path: str = "aruco_reference.png",
    dpi: int = 300
) -> str:
    """
    Generate a printable ArUco marker for reference.
    
    Args:
        marker_id: ArUco marker ID (0-49 for 4x4_50 dictionary)
        marker_size_cm: Physical size of marker in cm
        output_path: Where to save the marker image
        dpi: Print resolution
        
    Returns:
        Path to generated marker image
    """
    # Calculate pixel size for given cm and dpi
    inches = marker_size_cm / 2.54
    pixels = int(inches * dpi)
    
    # Generate marker
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, marker_id, pixels)
    
    # Add white border
    border = pixels // 10
    marker_with_border = cv2.copyMakeBorder(
        marker_img, border, border, border, border,
        cv2.BORDER_CONSTANT, value=255
    )
    
    # Add size label
    label = f"{marker_size_cm}cm ArUco Marker (ID: {marker_id})"
    cv2.putText(marker_with_border, label,
               (border, marker_with_border.shape[0] - border // 2),
               cv2.FONT_HERSHEY_SIMPLEX, 0.5 * (pixels / 300), 0, 2)
    
    cv2.imwrite(output_path, marker_with_border)
    print(f"ArUco reference marker saved to: {output_path}")
    print(f"Print at 100% scale for {marker_size_cm}cm marker")
    
    return output_path


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Estimate Talisay fruit dimensions")
    parser.add_argument("image", help="Path to fruit image")
    parser.add_argument("--reference", default="peso_5", 
                       choices=list(REFERENCE_OBJECTS.keys()),
                       help="Type of reference object in image")
    parser.add_argument("--method", default="auto",
                       choices=["auto", "coin", "card", "aruco", "contour"],
                       help="Detection method")
    parser.add_argument("--output", help="Output visualization path")
    parser.add_argument("--generate-aruco", action="store_true",
                       help="Generate printable ArUco marker")
    
    args = parser.parse_args()
    
    if args.generate_aruco:
        create_aruco_reference(marker_id=0, marker_size_cm=5.0)
    else:
        estimator = DimensionEstimator(reference_type=args.reference)
        result = estimator.estimate_from_image(args.image, reference_method=args.method)
        
        print("\n=== Dimension Estimation Results ===")
        print(f"Method: {result.get('method_used', 'N/A')}")
        print(f"Reference Detected: {result.get('reference_detected', False)}")
        print(f"Confidence: {result.get('confidence', 0)*100:.1f}%")
        print()
        
        if result.get("success"):
            print(f"Length: {result.get('length_cm', 'N/A')} cm")
            print(f"Width: {result.get('width_cm', 'N/A')} cm")
            print(f"Area: {result.get('area_cm2', 'N/A')} cm²")
            print(f"Est. Weight: {result.get('estimated_weight_g', 'N/A')} g")
            print(f"Est. Kernel Mass: {result.get('estimated_kernel_mass_g', 'N/A')} g")
        else:
            print("Could not estimate dimensions")
            if "warning" in result:
                print(f"Warning: {result['warning']}")
        
        if args.output:
            vis = estimator.visualize_measurement(args.image, result, args.output)
            print(f"\nVisualization saved to: {args.output}")
