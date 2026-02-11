"""
Enhanced Shape-Based Segmentation for Talisay Fruits v2.0
=========================================================

Major improvements over v1:
1. Elliptical mask fitting (pear/mango/almond shape)
2. Aggressive shadow exclusion - dark/black colors outside mask are ignored
3. Talisay-color-aware candidate detection
4. Multi-scale detection for different image sizes
5. Better mask refinement with ellipse prior
"""

import cv2
import numpy as np
from typing import Tuple, Optional, Dict


class ShapeBasedSegmenter:
    """
    Enhanced segmentation focusing on:
    1. Elliptical/almond shape detection (like pear/mango)
    2. Aggressive shadow detection and exclusion
    3. Texture analysis (smooth fruit vs. grass/leaves)
    4. Edge-based boundary detection
    5. Talisay-color-aware candidate scoring
    """
    
    def __init__(self):
        # Expected fruit aspect ratio (length/width): typically 1.3 - 2.0
        self.min_aspect_ratio = 1.1
        self.max_aspect_ratio = 2.8
        
        # Expected fruit circularity (4*pi*area/perimeter^2): 0.4-0.8 for ellipse
        self.min_circularity = 0.25
        self.max_circularity = 0.95
        
        # Fruit should be at least 1.5% but not more than 75% of image
        self.min_area_ratio = 0.015
        self.max_area_ratio = 0.75
        
        # Shadow detection thresholds (AGGRESSIVE)
        self.shadow_v_percentile = 25
        self.shadow_max_saturation = 50
        self.dark_absolute_threshold = 40
    
    def segment_fruit_by_shape(
        self,
        img: np.ndarray,
        return_debug: bool = False
    ) -> Dict:
        """
        Main segmentation method focusing on shape detection.
        """
        h, w = img.shape[:2]
        
        result = {
            "success": False,
            "mask": None,
            "contour": None,
            "bbox": None,
            "shadow_mask": None,
            "confidence": 0.0,
            "method": "shape_based"
        }
        
        # Step 1: Detect and exclude shadows AGGRESSIVELY
        shadow_mask = self._detect_shadows(img)
        result["shadow_mask"] = shadow_mask
        
        # Step 2: Get initial fruit candidates
        candidates = self._get_fruit_candidates(img, shadow_mask)
        
        if not candidates:
            return result
        
        # Step 3: Filter candidates by elliptical shape
        valid_candidates = self._filter_by_shape(candidates, img)
        
        if not valid_candidates:
            return result
        
        # Step 4: Score and select best
        best_candidate = self._select_best_fruit(valid_candidates, img, shadow_mask)
        
        if best_candidate is None:
            return result
        
        # Step 5: Refine mask with ellipse fitting + shadow exclusion
        refined_mask = self._refine_fruit_mask(
            img, best_candidate["mask"], best_candidate["contour"], shadow_mask,
            ellipse=best_candidate.get("ellipse")
        )
        
        result.update({
            "success": True,
            "mask": refined_mask,
            "contour": best_candidate["contour"],
            "bbox": best_candidate["bbox"],
            "confidence": best_candidate["confidence"],
            "shape_score": best_candidate.get("shape_score", 0.5),
            "texture_score": best_candidate.get("texture_score", 0.5)
        })
        
        if return_debug:
            result["debug"] = self._create_debug_info(img, result)
        
        return result
    
    def _detect_shadows(self, img: np.ndarray) -> np.ndarray:
        """
        AGGRESSIVELY detect shadows, dark regions, and black areas.
        
        Any dark/black color outside the fruit is treated as shadow.
        This prevents dark backgrounds from being included in the fruit mask.
        """
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h_ch, s_ch, v_ch = cv2.split(hsv)
        
        # Method 1: Absolute dark - V < 40 is definitely shadow
        absolute_dark = v_ch < self.dark_absolute_threshold
        
        # Method 2: Relative dark + low saturation
        dark_threshold = np.percentile(v_ch, self.shadow_v_percentile)
        relative_dark = v_ch < dark_threshold
        low_sat = s_ch < self.shadow_max_saturation
        relative_shadow = relative_dark & low_sat
        
        # Method 3: Near-black (sum of all channels < 120)
        b, g, r = cv2.split(img)
        near_black = (r.astype(int) + g.astype(int) + b.astype(int)) < 120
        
        # Method 4: Dark gray (low sat + low value)
        dark_gray = (s_ch < 40) & (v_ch < 100)
        
        # Combine all
        shadow_mask = (absolute_dark | relative_shadow | near_black | dark_gray).astype(np.uint8) * 255
        
        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_CLOSE, kernel)
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_OPEN, kernel)
        
        return shadow_mask
    
    def _get_fruit_candidates(self, img: np.ndarray, shadow_mask: np.ndarray) -> list:
        """Get initial fruit candidates using multiple methods."""
        candidates = []
        
        # Method 1: Edge-based
        candidates.extend(self._detect_by_edges(img, shadow_mask))
        
        # Method 2: Saturation-based
        candidates.extend(self._detect_by_saturation(img, shadow_mask))
        
        # Method 3: Talisay-color-based (NEW - looks for green/yellow/brown)
        candidates.extend(self._detect_by_talisay_colors(img, shadow_mask))
        
        # Deduplicate
        return self._remove_duplicate_candidates(candidates)
    
    def _detect_by_edges(self, img, shadow_mask) -> list:
        """Detect fruit using edge detection."""
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        smooth = cv2.bilateralFilter(gray, 9, 75, 75)
        edges = cv2.Canny(smooth, 30, 100)
        edges = cv2.bitwise_and(edges, cv2.bitwise_not(shadow_mask))
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        edges = cv2.dilate(edges, kernel, iterations=2)
        
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / (h * w)
            if self.min_area_ratio < area_ratio < self.max_area_ratio:
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(mask, [cnt], -1, 255, -1)
                mask = cv2.bitwise_and(mask, cv2.bitwise_not(shadow_mask))
                candidates.append({
                    "contour": cnt, "mask": mask, "area": area,
                    "bbox": cv2.boundingRect(cnt), "method": "edges"
                })
        return candidates
    
    def _detect_by_saturation(self, img, shadow_mask) -> list:
        """Detect fruit by saturation (fruits are more colorful)."""
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]
        
        _, sat_thresh = cv2.threshold(s_channel, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        brightness_mask = ((v_channel > 50) & (v_channel < 240)).astype(np.uint8) * 255
        combined = cv2.bitwise_and(sat_thresh, brightness_mask)
        combined = cv2.bitwise_and(combined, cv2.bitwise_not(shadow_mask))
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
        combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / (h * w)
            if self.min_area_ratio < area_ratio < self.max_area_ratio:
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(mask, [cnt], -1, 255, -1)
                mask = cv2.bitwise_and(mask, cv2.bitwise_not(shadow_mask))
                candidates.append({
                    "contour": cnt, "mask": mask, "area": area,
                    "bbox": cv2.boundingRect(cnt), "method": "saturation"
                })
        return candidates
    
    def _detect_by_talisay_colors(self, img, shadow_mask) -> list:
        """
        NEW: Detect fruit specifically by Talisay color ranges (green/yellow/brown).
        """
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        color_ranges = {
            "green": (np.array([25, 30, 30]), np.array([90, 255, 255])),
            "yellow": (np.array([15, 60, 60]), np.array([35, 255, 255])),
            "brown": (np.array([5, 30, 30]), np.array([25, 200, 200])),
        }
        
        full_mask = np.zeros((h, w), dtype=np.uint8)
        for _, (lower, upper) in color_ranges.items():
            full_mask = cv2.bitwise_or(full_mask, cv2.inRange(hsv, lower, upper))
        
        full_mask = cv2.bitwise_and(full_mask, cv2.bitwise_not(shadow_mask))
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        full_mask = cv2.morphologyEx(full_mask, cv2.MORPH_CLOSE, kernel)
        full_mask = cv2.morphologyEx(full_mask, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(full_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / (h * w)
            if self.min_area_ratio < area_ratio < self.max_area_ratio:
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(mask, [cnt], -1, 255, -1)
                mask = cv2.bitwise_and(mask, cv2.bitwise_not(shadow_mask))
                candidates.append({
                    "contour": cnt, "mask": mask, "area": area,
                    "bbox": cv2.boundingRect(cnt), "method": "talisay_color"
                })
        return candidates
    
    def _remove_duplicate_candidates(self, candidates: list) -> list:
        """Remove overlapping candidates."""
        if len(candidates) <= 1:
            return candidates
        
        candidates.sort(key=lambda x: x["area"], reverse=True)
        unique = []
        for cand in candidates:
            is_dup = False
            for existing in unique:
                intersection = cv2.bitwise_and(cand["mask"], existing["mask"])
                union = cv2.bitwise_or(cand["mask"], existing["mask"])
                iou = cv2.countNonZero(intersection) / max(1, cv2.countNonZero(union))
                if iou > 0.5:
                    is_dup = True
                    break
            if not is_dup:
                unique.append(cand)
        return unique
    
    def _filter_by_shape(self, candidates: list, img: np.ndarray) -> list:
        """Filter candidates by elliptical shape (pear/mango/almond)."""
        valid = []
        for cand in candidates:
            cnt = cand["contour"]
            if len(cnt) < 5:
                continue
            try:
                ellipse = cv2.fitEllipse(cnt)
                (cx, cy), (minor, major), angle = ellipse
                if minor > major:
                    minor, major = major, minor
                
                aspect_ratio = major / max(1, minor)
                if not (self.min_aspect_ratio <= aspect_ratio <= self.max_aspect_ratio):
                    continue
                
                perimeter = cv2.arcLength(cnt, True)
                area = cv2.contourArea(cnt)
                circularity = 4 * np.pi * area / (perimeter ** 2)
                if not (self.min_circularity <= circularity <= self.max_circularity):
                    continue
                
                # Ellipse fit score
                ellipse_mask = np.zeros(img.shape[:2], dtype=np.uint8)
                cv2.ellipse(ellipse_mask, ellipse, 255, -1)
                
                intersection = cv2.bitwise_and(cand["mask"], ellipse_mask)
                union = cv2.bitwise_or(cand["mask"], ellipse_mask)
                fit_score = cv2.countNonZero(intersection) / max(1, cv2.countNonZero(union))
                
                if fit_score < 0.50:
                    continue
                
                cand["ellipse"] = ellipse
                cand["aspect_ratio"] = aspect_ratio
                cand["circularity"] = circularity
                cand["shape_score"] = fit_score
                valid.append(cand)
            except cv2.error:
                continue
        return valid
    
    def _select_best_fruit(self, candidates, img, shadow_mask):
        """Select the best fruit candidate using weighted scoring."""
        if not candidates:
            return None
        
        for cand in candidates:
            scores = []
            
            shape_score = cand.get("shape_score", 0.5)
            scores.append(shape_score * 0.35)
            
            texture_score = self._calculate_texture_score(img, cand["mask"])
            cand["texture_score"] = texture_score
            scores.append(texture_score * 0.25)
            
            color_score = self._calculate_color_consistency(img, cand["mask"])
            cand["color_score"] = color_score
            scores.append(color_score * 0.10)
            
            position_score = self._calculate_position_score(cand["bbox"], img.shape[:2])
            cand["position_score"] = position_score
            scores.append(position_score * 0.10)
            
            # Talisay color match (is this green/yellow/brown?)
            talisay_score = self._calculate_talisay_color_score(img, cand["mask"])
            cand["talisay_color_score"] = talisay_score
            scores.append(talisay_score * 0.20)
            
            cand["confidence"] = sum(scores)
        
        best = max(candidates, key=lambda x: x["confidence"])
        return best if best["confidence"] >= 0.30 else None
    
    def _calculate_talisay_color_score(self, img, mask) -> float:
        """How well does the masked region match Talisay colors?"""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        pixels = hsv[mask > 0]
        if len(pixels) < 10:
            return 0.0
        
        h_v, s_v, v_v = pixels[:, 0], pixels[:, 1], pixels[:, 2]
        green = (h_v >= 25) & (h_v <= 90) & (s_v >= 25) & (v_v >= 30)
        yellow = (h_v >= 15) & (h_v <= 35) & (s_v >= 50) & (v_v >= 50)
        brown = (h_v >= 5) & (h_v <= 25) & (s_v >= 30) & (v_v >= 30)
        
        return np.sum(green | yellow | brown) / len(pixels)
    
    def _calculate_texture_score(self, img, mask) -> float:
        """Fruits are smooth."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        pixels = gray[mask > 0]
        if len(pixels) < 10:
            return 0.0
        return max(0, 1 - np.std(pixels) / 50)
    
    def _calculate_color_consistency(self, img, mask) -> float:
        """Fruits are uniformly colored."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hue = hsv[:, :, 0][mask > 0]
        if len(hue) < 10:
            return 0.0
        return max(0, 1 - np.std(hue) / 20)
    
    def _calculate_position_score(self, bbox, img_shape) -> float:
        """Fruits often near center."""
        ht, wt = img_shape
        x, y, bw, bh = bbox
        cx, cy = x + bw / 2, y + bh / 2
        dist = np.sqrt((cx - wt/2)**2 + (cy - ht/2)**2)
        max_dist = np.sqrt((wt/2)**2 + (ht/2)**2)
        return 1 - (dist / max_dist)
    
    def _refine_fruit_mask(self, img, mask, contour, shadow_mask, ellipse=None):
        """
        Refine mask by:
        1. Fitting an ellipse for clean pear/mango shape
        2. Removing ALL shadow/dark regions
        3. Smoothing edges, filling holes
        """
        h, w = img.shape[:2]
        
        # Use fitted ellipse as primary shape (clean boundary)
        if ellipse is not None:
            (cx, cy), (minor, major), angle = ellipse
            shrunk = ((cx, cy), (minor * 0.95, major * 0.95), angle)
            
            ellipse_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.ellipse(ellipse_mask, shrunk, 255, -1)
            
            refined = cv2.bitwise_and(ellipse_mask, mask)
            if cv2.countNonZero(refined) < cv2.countNonZero(ellipse_mask) * 0.5:
                refined = ellipse_mask
        else:
            refined = mask.copy()
        
        # AGGRESSIVELY remove shadows
        refined = cv2.bitwise_and(refined, cv2.bitwise_not(shadow_mask))
        
        # Remove dark pixels inside mask
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        v_ch = hsv[:, :, 2]
        s_ch = hsv[:, :, 1]
        
        dark_inside = (v_ch < 35) & (refined > 0)
        refined[dark_inside] = 0
        
        dark_gray_inside = (s_ch < 30) & (v_ch < 80) & (refined > 0)
        refined[dark_gray_inside] = 0
        
        # Fill holes, smooth edges
        kernel_large = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        refined = cv2.morphologyEx(refined, cv2.MORPH_CLOSE, kernel_large)
        
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel_small)
        
        refined = cv2.GaussianBlur(refined, (5, 5), 0)
        _, refined = cv2.threshold(refined, 127, 255, cv2.THRESH_BINARY)
        
        return refined
    
    def _create_debug_info(self, img, result):
        """Create debug visualizations."""
        debug = {}
        if result.get("mask") is not None:
            overlay = img.copy()
            mask_colored = np.zeros_like(img)
            mask_colored[:, :, 1] = result["mask"]
            overlay = cv2.addWeighted(overlay, 0.7, mask_colored, 0.3, 0)
            if result.get("contour") is not None:
                cv2.drawContours(overlay, [result["contour"]], -1, (0, 255, 0), 3)
            if result.get("bbox"):
                x, y, bw, bh = result["bbox"]
                cv2.rectangle(overlay, (x, y), (x+bw, y+bh), (255, 255, 0), 2)
            debug["overlay"] = overlay
        if result.get("shadow_mask") is not None:
            debug["shadows"] = result["shadow_mask"]
        return debug
