"""
Enhanced Shape-Based Segmentation for Talisay Fruits
Focuses on almond/elliptical shape detection to better separate fruit from background
"""

import cv2
import numpy as np
from typing import Tuple, Optional, Dict


class ShapeBasedSegmenter:
    """
    Enhanced segmentation focusing on:
    1. Elliptical/almond shape detection (like lemon/mango)
    2. Shadow detection and exclusion
    3. Texture analysis (smooth fruit vs. grass/leaves)
    4. Edge-based boundary detection
    """
    
    def __init__(self):
        # Expected fruit aspect ratio (length/width): typically 1.3 - 2.0
        self.min_aspect_ratio = 1.1  # Relaxed from 1.2
        self.max_aspect_ratio = 2.8  # Relaxed from 2.5
        
        # Expected fruit circularity (4π×area/perimeter²): 0.4-0.8 for ellipse
        self.min_circularity = 0.25  # Relaxed from 0.30
        self.max_circularity = 0.95  # Relaxed from 0.90
        
        # Fruit should be at least 2% but not more than 70% of image
        self.min_area_ratio = 0.015  # Relaxed from 0.02
        self.max_area_ratio = 0.75   # Slightly increased from 0.70
    
    def segment_fruit_by_shape(
        self,
        img: np.ndarray,
        return_debug: bool = False
    ) -> Dict:
        """
        Main segmentation method focusing on shape detection.
        
        Returns dict with:
            - success: bool
            - mask: binary mask of fruit
            - contour: fruit contour
            - bbox: bounding box
            - shadow_mask: detected shadow regions
            - confidence: segmentation confidence
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
        
        # Step 1: Detect and exclude shadows
        shadow_mask = self._detect_shadows(img)
        result["shadow_mask"] = shadow_mask
        
        # Step 2: Get initial fruit candidates using multiple methods
        candidates = self._get_fruit_candidates(img, shadow_mask)
        
        if not candidates:
            return result
        
        # Step 3: Filter candidates by shape (elliptical/almond)
        valid_candidates = self._filter_by_shape(candidates, img)
        
        if not valid_candidates:
            return result
        
        # Step 4: Score candidates by texture and select best
        best_candidate = self._select_best_fruit(valid_candidates, img, shadow_mask)
        
        if best_candidate is None:
            return result
        
        # Step 5: Refine the mask
        refined_mask = self._refine_fruit_mask(
            img, best_candidate["mask"], best_candidate["contour"], shadow_mask
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
        Detect shadows in the image.
        Shadows typically have:
        - Lower brightness (V channel)
        - Similar hue to surrounding but darker
        - Lower saturation
        """
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h_ch, s_ch, v_ch = cv2.split(hsv)
        
        # Shadow detection criteria:
        # 1. Low brightness (darker regions)
        # 2. Low saturation (shadows are less colorful)
        dark_regions = v_ch < np.percentile(v_ch, 30)
        low_sat = s_ch < 60
        
        # Shadows are dark AND low saturation
        shadow_mask = (dark_regions & low_sat).astype(np.uint8) * 255
        
        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_CLOSE, kernel)
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_OPEN, kernel)
        
        return shadow_mask
    
    def _get_fruit_candidates(
        self,
        img: np.ndarray,
        shadow_mask: np.ndarray
    ) -> list:
        """
        Get initial fruit candidates using multiple detection methods.
        """
        h, w = img.shape[:2]
        candidates = []
        
        # Method 1: Edge-based detection
        edge_candidates = self._detect_by_edges(img, shadow_mask)
        candidates.extend(edge_candidates)
        
        # Method 2: Saturation-based detection (fruits are more saturated)
        sat_candidates = self._detect_by_saturation(img, shadow_mask)
        candidates.extend(sat_candidates)
        
        # Method 3: Texture-based detection (smooth vs. grass)
        texture_candidates = self._detect_by_texture(img, shadow_mask)
        candidates.extend(texture_candidates)
        
        # Remove duplicates (overlapping contours)
        candidates = self._remove_duplicate_candidates(candidates)
        
        return candidates
    
    def _detect_by_edges(
        self,
        img: np.ndarray,
        shadow_mask: np.ndarray
    ) -> list:
        """
        Detect fruit using edge detection.
        Focuses on strong, continuous edges forming closed shapes.
        """
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Bilateral filter to preserve edges while smoothing texture
        smooth = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Canny edge detection
        edges = cv2.Canny(smooth, 30, 100)
        
        # Exclude shadow edges
        edges = cv2.bitwise_and(edges, cv2.bitwise_not(shadow_mask))
        
        # Dilate to connect nearby edges
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        edges = cv2.dilate(edges, kernel, iterations=2)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / (h * w)
            
            # Filter by size
            if self.min_area_ratio < area_ratio < self.max_area_ratio:
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(mask, [cnt], -1, 255, -1)
                
                candidates.append({
                    "contour": cnt,
                    "mask": mask,
                    "area": area,
                    "bbox": cv2.boundingRect(cnt),
                    "method": "edges"
                })
        
        return candidates
    
    def _detect_by_saturation(
        self,
        img: np.ndarray,
        shadow_mask: np.ndarray
    ) -> list:
        """
        Detect fruit by higher saturation.
        Fruits are typically more saturated than background grass/leaves.
        """
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]
        
        # Fruits have higher saturation than most backgrounds
        # Use Otsu's thresholding on saturation
        _, sat_thresh = cv2.threshold(s_channel, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Also require reasonable brightness (not too dark, not too bright)
        brightness_mask = (v_channel > 40) & (v_channel < 240)
        
        # Combine
        combined = cv2.bitwise_and(sat_thresh, brightness_mask.astype(np.uint8) * 255)
        
        # Exclude shadows
        combined = cv2.bitwise_and(combined, cv2.bitwise_not(shadow_mask))
        
        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
        combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / (h * w)
            
            if self.min_area_ratio < area_ratio < self.max_area_ratio:
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(mask, [cnt], -1, 255, -1)
                
                candidates.append({
                    "contour": cnt,
                    "mask": mask,
                    "area": area,
                    "bbox": cv2.boundingRect(cnt),
                    "method": "saturation"
                })
        
        return candidates
    
    def _detect_by_texture(
        self,
        img: np.ndarray,
        shadow_mask: np.ndarray
    ) -> list:
        """
        Detect fruit by texture analysis.
        Fruit skin is relatively smooth, grass/leaves are textured.
        """
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate local standard deviation (texture measure)
        # Smooth regions = low std, textured regions = high std
        kernel_size = 15
        mean = cv2.blur(gray, (kernel_size, kernel_size))
        mean_sq = cv2.blur(gray ** 2, (kernel_size, kernel_size))
        std = np.sqrt(np.abs(mean_sq - mean ** 2))
        
        # Fruits are smoother (lower std)
        # Use Otsu to find threshold
        std_norm = (std / std.max() * 255).astype(np.uint8)
        _, smooth_mask = cv2.threshold(std_norm, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Exclude shadows
        smooth_mask = cv2.bitwise_and(smooth_mask, cv2.bitwise_not(shadow_mask))
        
        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        smooth_mask = cv2.morphologyEx(smooth_mask, cv2.MORPH_CLOSE, kernel)
        smooth_mask = cv2.morphologyEx(smooth_mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(smooth_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / (h * w)
            
            if self.min_area_ratio < area_ratio < self.max_area_ratio:
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(mask, [cnt], -1, 255, -1)
                
                candidates.append({
                    "contour": cnt,
                    "mask": mask,
                    "area": area,
                    "bbox": cv2.boundingRect(cnt),
                    "method": "texture"
                })
        
        return candidates
    
    def _remove_duplicate_candidates(self, candidates: list) -> list:
        """Remove overlapping candidates, keeping the best one."""
        if len(candidates) <= 1:
            return candidates
        
        # Sort by area (largest first)
        candidates.sort(key=lambda x: x["area"], reverse=True)
        
        unique = []
        for cand in candidates:
            # Check if this overlaps significantly with any already accepted
            is_duplicate = False
            for existing in unique:
                # Calculate IoU (Intersection over Union)
                intersection = cv2.bitwise_and(cand["mask"], existing["mask"])
                union = cv2.bitwise_or(cand["mask"], existing["mask"])
                
                iou = cv2.countNonZero(intersection) / max(1, cv2.countNonZero(union))
                
                # If IoU > 0.5, consider it a duplicate
                if iou > 0.5:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique.append(cand)
        
        return unique
    
    def _filter_by_shape(self, candidates: list, img: np.ndarray) -> list:
        """
        Filter candidates by shape characteristics.
        Talisay fruits are almond/elliptical shaped (like lemon/mango).
        """
        valid = []
        
        for cand in candidates:
            cnt = cand["contour"]
            
            # Fit ellipse (needs at least 5 points)
            if len(cnt) < 5:
                continue
            
            try:
                ellipse = cv2.fitEllipse(cnt)
                (cx, cy), (minor, major), angle = ellipse
                
                # Ensure major > minor
                if minor > major:
                    minor, major = major, minor
                
                # Calculate aspect ratio
                aspect_ratio = major / max(1, minor)
                
                # Check if aspect ratio is in expected range
                if not (self.min_aspect_ratio <= aspect_ratio <= self.max_aspect_ratio):
                    continue
                
                # Calculate circularity (how close to perfect ellipse)
                perimeter = cv2.arcLength(cnt, True)
                area = cv2.contourArea(cnt)
                circularity = 4 * np.pi * area / (perimeter ** 2)
                
                if not (self.min_circularity <= circularity <= self.max_circularity):
                    continue
                
                # Calculate ellipse fit score (how well contour matches ellipse)
                ellipse_mask = np.zeros(img.shape[:2], dtype=np.uint8)
                cv2.ellipse(ellipse_mask, ellipse, 255, -1)
                
                # Calculate overlap between contour and fitted ellipse
                intersection = cv2.bitwise_and(cand["mask"], ellipse_mask)
                union = cv2.bitwise_or(cand["mask"], ellipse_mask)
                
                fit_score = cv2.countNonZero(intersection) / max(1, cv2.countNonZero(union))
                
                # Good ellipse fit should be > 0.6 (relaxed from 0.65)
                if fit_score < 0.55:
                    continue
                
                # This is a valid fruit-shaped candidate
                cand["ellipse"] = ellipse
                cand["aspect_ratio"] = aspect_ratio
                cand["circularity"] = circularity
                cand["shape_score"] = fit_score
                
                valid.append(cand)
                
            except cv2.error:
                # Could not fit ellipse
                continue
        
        return valid
    
    def _select_best_fruit(
        self,
        candidates: list,
        img: np.ndarray,
        shadow_mask: np.ndarray
    ) -> Optional[Dict]:
        """
        Select the best fruit candidate based on multiple criteria.
        """
        if not candidates:
            return None
        
        # Score each candidate
        for cand in candidates:
            scores = []
            
            # Shape score (already calculated)
            shape_score = cand.get("shape_score", 0.5)
            scores.append(shape_score * 0.4)  # 40% weight
            
            # Texture score (smoothness)
            texture_score = self._calculate_texture_score(img, cand["mask"])
            cand["texture_score"] = texture_score
            scores.append(texture_score * 0.3)  # 30% weight
            
            # Color consistency score
            color_score = self._calculate_color_consistency(img, cand["mask"])
            cand["color_score"] = color_score
            scores.append(color_score * 0.2)  # 20% weight
            
            # Position score (fruits often near center)
            position_score = self._calculate_position_score(cand["bbox"], img.shape[:2])
            cand["position_score"] = position_score
            scores.append(position_score * 0.1)  # 10% weight
            
            # Combined confidence
            cand["confidence"] = sum(scores)
        
        # Return candidate with highest confidence
        best = max(candidates, key=lambda x: x["confidence"])
        
        # Only accept if confidence > 0.35 (relaxed from 0.4)
        if best["confidence"] < 0.35:
            return None
        
        return best
    
    def _calculate_texture_score(self, img: np.ndarray, mask: np.ndarray) -> float:
        """Calculate how smooth/uniform the texture is (fruits are smooth)."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Get pixels within mask
        masked_pixels = gray[mask > 0]
        
        if len(masked_pixels) < 10:
            return 0.0
        
        # Calculate standard deviation (lower = smoother)
        std = np.std(masked_pixels)
        
        # Normalize: smooth fruits have std < 30, textured backgrounds > 50
        score = max(0, 1 - std / 50)
        
        return score
    
    def _calculate_color_consistency(self, img: np.ndarray, mask: np.ndarray) -> float:
        """Calculate color consistency (fruits are uniformly colored)."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Get hue values within mask
        hue_values = hsv[:, :, 0][mask > 0]
        
        if len(hue_values) < 10:
            return 0.0
        
        # Calculate hue consistency (lower std = more consistent)
        hue_std = np.std(hue_values)
        
        # Good fruits have hue_std < 15
        score = max(0, 1 - hue_std / 20)
        
        return score
    
    def _calculate_position_score(self, bbox: Tuple, img_shape: Tuple) -> float:
        """Score based on position (fruits often near center)."""
        h, w = img_shape
        x, y, bw, bh = bbox
        
        # Calculate center of bbox
        cx = x + bw / 2
        cy = y + bh / 2
        
        # Calculate distance from image center
        img_cx = w / 2
        img_cy = h / 2
        
        dist = np.sqrt((cx - img_cx)**2 + (cy - img_cy)**2)
        max_dist = np.sqrt(img_cx**2 + img_cy**2)
        
        # Closer to center = higher score
        score = 1 - (dist / max_dist)
        
        return score
    
    def _refine_fruit_mask(
        self,
        img: np.ndarray,
        mask: np.ndarray,
        contour: np.ndarray,
        shadow_mask: np.ndarray
    ) -> np.ndarray:
        """
        Refine the fruit mask by:
        1. Removing any shadow regions
        2. Smoothing edges
        3. Filling holes
        """
        # Remove shadows from fruit mask
        refined = cv2.bitwise_and(mask, cv2.bitwise_not(shadow_mask))
        
        # Fill small holes
        kernel_large = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        refined = cv2.morphologyEx(refined, cv2.MORPH_CLOSE, kernel_large)
        
        # Smooth edges
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel_small)
        
        # Smooth with Gaussian
        refined = cv2.GaussianBlur(refined, (5, 5), 0)
        _, refined = cv2.threshold(refined, 127, 255, cv2.THRESH_BINARY)
        
        return refined
    
    def _create_debug_info(self, img: np.ndarray, result: Dict) -> Dict:
        """Create debug visualizations."""
        debug = {}
        
        # Create overlay
        if result.get("mask") is not None:
            overlay = img.copy()
            mask_colored = np.zeros_like(img)
            mask_colored[:, :, 1] = result["mask"]  # Green channel
            overlay = cv2.addWeighted(overlay, 0.7, mask_colored, 0.3, 0)
            
            # Draw contour
            if result.get("contour") is not None:
                cv2.drawContours(overlay, [result["contour"]], -1, (0, 255, 0), 3)
            
            # Draw ellipse if available
            if result.get("ellipse") is not None:
                cv2.ellipse(overlay, result["ellipse"], (255, 0, 0), 2)
            
            # Draw bbox
            if result.get("bbox"):
                x, y, w, h = result["bbox"]
                cv2.rectangle(overlay, (x, y), (x+w, y+h), (255, 255, 0), 2)
            
            debug["overlay"] = overlay
        
        # Shadow mask visualization
        if result.get("shadow_mask") is not None:
            debug["shadows"] = result["shadow_mask"]
        
        return debug
