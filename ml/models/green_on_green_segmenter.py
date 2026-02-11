"""
Green-on-Green Segmentation Strategy
For difficult cases where fruit and background are both green
"""
import cv2
import numpy as np
from typing import Tuple, Optional


def segment_green_on_green(img: np.ndarray) -> Tuple[Optional[np.ndarray], float, dict]:
    """
    Specialized segmentation for green fruit on green background.
    
    Strategy:
    1. Use VALUE (brightness) contrast - fruit is usually brighter/darker than grass
    2. Look for compact, smooth regions (not fragmented grass)
    3. Use local contrast and histogram analysis
    4. Prefer regions near image center
    
    Returns:
        (mask, confidence, debug_info)
    """
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h_ch, s_ch, v_ch = cv2.split(hsv)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    debug_info = {}
    
    # ──────────────────────────────────────────────────────────────────────
    # STEP 1: Local brightness contrast
    # Fruit tends to have different brightness than surrounding grass
    # ──────────────────────────────────────────────────────────────────────
    
    # Calculate local mean brightness
    local_mean = cv2.blur(v_ch.astype(np.float32), (31, 31))
    
    # Calculate absolute deviation from local mean
    deviation = np.abs(v_ch.astype(np.float32) - local_mean)
    
    # Regions with high deviation are candidate fruit regions
    _, deviation_mask = cv2.threshold(deviation.astype(np.uint8), 0, 255, 
                                       cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    debug_info["deviation_mask"] = deviation_mask
    
    # ──────────────────────────────────────────────────────────────────────
    # STEP 2: Look for compact regions using morphological operations
    # ──────────────────────────────────────────────────────────────────────
    
    # Close small gaps
    kernel_large = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
    compact = cv2.morphologyEx(deviation_mask, cv2.MORPH_CLOSE, kernel_large)
    
    # Remove small fragments
    kernel_med = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    compact = cv2.morphologyEx(compact, cv2.MORPH_OPEN, kernel_med)
    
    debug_info["compact_mask"] = compact
    
    # ──────────────────────────────────────────────────────────────────────
    # STEP 3: Find candidate regions
    # ──────────────────────────────────────────────────────────────────────
    
    contours, _ = cv2.findContours(compact, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    debug_info["contours_found"] = len(contours)
    
    if not contours:
        return None, 0.0, debug_info
    
    # Filter and score candidates
    candidates = []
    rejected_reasons = []
    
    for idx, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        area_ratio = area / (h * w)
        
        # Must be 1.5% - 70% of image
        if not (0.015 < area_ratio < 0.70):
            rejected_reasons.append(f"Contour {idx}: area_ratio {area_ratio:.1%} out of range")
            continue
        
        # Calculate compactness (how circular/elliptical)
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            rejected_reasons.append(f"Contour {idx}: zero perimeter")
            continue
        
        circularity = 4 * np.pi * area / (perimeter ** 2)
        
        # Must be reasonably compact (0.2 - 0.95)
        if not (0.20 < circularity < 0.95):
            rejected_reasons.append(f"Contour {idx}: circularity {circularity:.2f} out of range")
            continue
        
        # Check if elliptical
        if len(cnt) >= 5:
            try:
                ellipse = cv2.fitEllipse(cnt)
                (cx, cy), (minor, major), angle = ellipse
                if minor > major:
                    minor, major = major, minor
                aspect_ratio = major / max(1, minor)
                
                # Almond/elliptical shape: 1.1 - 2.8
                if not (1.1 <= aspect_ratio <= 2.8):
                    rejected_reasons.append(f"Contour {idx}: aspect_ratio {aspect_ratio:.2f} out of range")
                    continue
                
            except cv2.error:
                rejected_reasons.append(f"Contour {idx}: couldn't fit ellipse")
                continue
        else:
            rejected_reasons.append(f"Contour {idx}: too few points ({len(cnt)})")
            continue
        
        # ──────────────────────────────────────────────────────────────────
        # STEP 4: Score this candidate
        # ──────────────────────────────────────────────────────────────────
        
        # Create mask for this region
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.drawContours(mask, [cnt], -1, 255, -1)
        
        # Score: Brightness uniformity within region
        region_values = v_ch[mask > 0]
        if len(region_values) < 10:
            continue
        
        brightness_std = np.std(region_values)
        uniformity_score = max(0, 1 - brightness_std / 50)  # Lower std = more uniform
        
        # Score: Color consistency
        region_hues = h_ch[mask > 0]
        hue_std = np.std(region_hues)
        color_score = max(0, 1 - hue_std / 25)
        
        # Score: Compactness
        compactness_score = circularity
        
        # Score: Position (prefer center)
        x, y, bw, bh = cv2.boundingRect(cnt)
        cx_region = x + bw / 2
        cy_region = y + bh / 2
        dist_from_center = np.sqrt((cx_region - w/2)**2 + (cy_region - h/2)**2)
        max_dist = np.sqrt((w/2)**2 + (h/2)**2)
        position_score = 1 - (dist_from_center / max_dist)
        
        # Score: Texture smoothness
        region_gray = gray[mask > 0]
        texture_std = np.std(region_gray)
        smoothness_score = max(0, 1 - texture_std / 40)
        
        # Combined confidence
        confidence = (
            uniformity_score * 0.25 +
            color_score * 0.20 +
            compactness_score * 0.20 +
            position_score * 0.15 +
            smoothness_score * 0.20
        )
        
        candidates.append({
            "contour": cnt,
            "mask": mask,
            "area_ratio": area_ratio,
            "circularity": circularity,
            "aspect_ratio": aspect_ratio,
            "confidence": confidence,
            "scores": {
                "uniformity": uniformity_score,
                "color": color_score,
                "compactness": compactness_score,
                "position": position_score,
                "smoothness": smoothness_score
            }
        })
    
    if not candidates:
        debug_info["rejected_reasons"] = rejected_reasons[:20]  # Limit to first 20
        return None, 0.0, debug_info
    
    # Select best candidate
    best = max(candidates, key=lambda x: x["confidence"])
    
    # Minimum confidence threshold
    if best["confidence"] < 0.35:
        return None, 0.0, debug_info
    
    # Refine the mask
    final_mask = best["mask"].copy()
    
    # Smooth edges
    final_mask = cv2.GaussianBlur(final_mask, (7, 7), 0)
    _, final_mask = cv2.threshold(final_mask, 127, 255, cv2.THRESH_BINARY)
    
    debug_info["best_candidate"] = best
    debug_info["candidates_count"] = len(candidates)
    
    return final_mask, best["confidence"], debug_info
