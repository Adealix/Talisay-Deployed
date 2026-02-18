"""
Advanced Background Separation for Talisay Fruit
Supports multiple scenarios: white background, natural background, complex scenes
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Optional, Union, List
from PIL import Image
from enum import Enum

# Import shape-based segmenter
try:
    from models.shape_based_segmenter import ShapeBasedSegmenter
    SHAPE_SEGMENTER_AVAILABLE = True
except ImportError:
    SHAPE_SEGMENTER_AVAILABLE = False

# Import green-on-green segmenter
try:
    from models.green_on_green_segmenter import segment_green_on_green
    GREEN_ON_GREEN_AVAILABLE = True
except ImportError:
    GREEN_ON_GREEN_AVAILABLE = False


class BackgroundType(Enum):
    """Types of backgrounds the system can handle."""
    WHITE = "white"
    BLACK = "black"
    SOLID_COLOR = "solid_color"
    NATURAL = "natural"  # Leaves, branches, ground
    COMPLEX = "complex"  # Multiple objects, busy background
    UNKNOWN = "unknown"


class SegmentationMethod(Enum):
    """Available segmentation methods."""
    COLOR_BASED = "color_based"
    EDGE_BASED = "edge_based"
    GRABCUT = "grabcut"
    WATERSHED = "watershed"
    DEEP_LEARNING = "deep_learning"
    SHAPE_BASED = "shape_based"  # NEW: Focus on elliptical fruit shape
    ENSEMBLE = "ensemble"


class AdvancedSegmenter:
    """
    Advanced fruit segmentation supporting multiple background scenarios.
    
    Features:
    - Automatic background type detection
    - Multiple segmentation algorithms
    - Ensemble method for best results
    - Handles spots, shadows, and reflections
    - Coin reference exclusion from fruit mask
    - Enhanced fruit-only masking
    """
    
    def __init__(self, use_deep_learning: bool = False, exclude_coin: bool = True, use_shape_based: bool = True):
        """
        Initialize the segmenter.
        
        Args:
            use_deep_learning: Use deep learning model for segmentation
                              (requires additional model download)
            exclude_coin: Automatically detect and exclude coin from fruit mask
            use_shape_based: Use enhanced shape-based segmentation (recommended)
        """
        self.use_deep_learning = use_deep_learning
        self.exclude_coin = exclude_coin
        self.use_shape_based = use_shape_based
        self.dl_model = None
        
        # Initialize shape-based segmenter if available and requested
        self.shape_segmenter = None
        if use_shape_based and SHAPE_SEGMENTER_AVAILABLE:
            self.shape_segmenter = ShapeBasedSegmenter()
            print("✓ Shape-based segmenter initialized (focusing on almond/elliptical shapes)")
        
        # Color ranges for Talisay fruit (HSV)
        self.fruit_color_ranges = {
            "green": {"lower": (25, 30, 30), "upper": (90, 255, 255)},
            "yellow": {"lower": (15, 40, 40), "upper": (35, 255, 255)},
            "brown": {"lower": (5, 30, 30), "upper": (25, 200, 200)},
        }
        
        # Common background colors to exclude (HSV)
        self.background_exclusions = {
            "white": {"lower": (0, 0, 200), "upper": (180, 30, 255)},
            "black": {"lower": (0, 0, 0), "upper": (180, 255, 50)},
            "gray": {"lower": (0, 0, 50), "upper": (180, 30, 200)},
            "blue_sky": {"lower": (100, 50, 50), "upper": (130, 255, 255)},
            "silver_metallic": {"lower": (0, 0, 100), "upper": (180, 60, 180)},  # Exclude coin
        }
        
        if use_deep_learning:
            self._load_dl_model()
    
    def _load_dl_model(self):
        """Load deep learning segmentation model."""
        try:
            import tensorflow as tf
            # Could use U-Net, DeepLabV3, or SAM (Segment Anything)
            # For now, we'll implement traditional methods
            print("Note: Deep learning segmentation requires model download")
            print("Using ensemble of traditional methods instead")
        except ImportError:
            print("TensorFlow not available, using traditional methods")
    
    def segment(
        self,
        image: Union[str, Path, np.ndarray, Image.Image],
        method: SegmentationMethod = SegmentationMethod.ENSEMBLE,
        return_debug: bool = False,
        coin_info: Optional[Dict] = None
    ) -> Dict:
        """
        Segment fruit from background.
        
        Args:
            image: Input image
            method: Segmentation method to use
            return_debug: Include debug visualizations
            coin_info: Optional coin detection result with center/radius
                      If provided, coin region is excluded from fruit mask
            
        Returns:
            Dictionary with:
            - mask: Binary mask of fruit region (coin excluded if detected)
            - coin_mask: Binary mask of coin region (if detected)
            - contour: Fruit contour points
            - bbox: Bounding box (x, y, w, h)
            - background_type: Detected background type
            - confidence: Segmentation confidence
            - cropped_fruit: Cropped fruit image with transparent background
        """
        # Load image
        img = self._load_image(image)
        if img is None:
            return {"error": "Could not load image", "success": False}
        
        result = {
            "success": False,
            "mask": None,
            "coin_mask": None,
            "contour": None,
            "bbox": None,
            "background_type": None,
            "confidence": 0.0,
            "cropped_fruit": None,
            "method_used": method.value
        }
        
        # Detect background type
        bg_type, bg_confidence = self._detect_background_type(img)
        result["background_type"] = bg_type.value
        result["bg_detection_confidence"] = bg_confidence
        
        # Check if this is a low-saturation green scene (green-on-green challenge)
        is_green_on_green = self._detect_green_on_green_scene(img)
        result["is_green_on_green_scene"] = is_green_on_green
        
        # Create coin mask if coin detected
        coin_mask = None
        if coin_info and coin_info.get("detected"):
            coin_mask = self._create_coin_mask(img, coin_info)
            result["coin_mask"] = coin_mask
            result["coin_detected"] = True
        else:
            result["coin_detected"] = False
        
        # Select best method based on background
        if method == SegmentationMethod.ENSEMBLE:
            # PRIORITY 1: Check for green-on-green scene (most challenging)
            if is_green_on_green and GREEN_ON_GREEN_AVAILABLE:
                gg_mask, gg_conf, gg_debug = segment_green_on_green(img)
                if gg_mask is not None and gg_conf > 0.4:
                    mask = gg_mask
                    confidence = gg_conf
                    result["segmentation_method_used"] = "green_on_green (auto-selected)"
                    result["green_on_green_debug"] = gg_debug
                else:
                    # Green-on-green failed, try shape-based
                    if self.shape_segmenter and bg_type in [BackgroundType.NATURAL, BackgroundType.COMPLEX]:
                        shape_result = self.shape_segmenter.segment_fruit_by_shape(img, return_debug=False)
                        if shape_result.get("success") and shape_result.get("confidence", 0) > 0.5:
                            mask = shape_result["mask"]
                            confidence = shape_result["confidence"]
                            result["segmentation_method_used"] = "shape_based (green-on-green failed)"
                        else:
                            # Both failed, use ensemble
                            mask, confidence = self._ensemble_segmentation(img, bg_type)
                            result["segmentation_method_used"] = "ensemble (both specialized methods failed)"
                    else:
                        mask, confidence = self._ensemble_segmentation(img, bg_type)
                        result["segmentation_method_used"] = "ensemble (shape_based unavailable)"
            # PRIORITY 2: Try shape-based for natural/complex backgrounds
            elif self.shape_segmenter and bg_type in [BackgroundType.NATURAL, BackgroundType.COMPLEX]:
                shape_result = self.shape_segmenter.segment_fruit_by_shape(img, return_debug=False)
                if shape_result.get("success") and shape_result.get("confidence", 0) > 0.5:
                    mask = shape_result["mask"]
                    confidence = shape_result["confidence"]
                    result["segmentation_method_used"] = "shape_based (auto-selected)"
                else:
                    # Fallback to ensemble
                    mask, confidence = self._ensemble_segmentation(img, bg_type)
                    result["segmentation_method_used"] = "ensemble (shape_based failed)"
            else:
                mask, confidence = self._ensemble_segmentation(img, bg_type)
                result["segmentation_method_used"] = "ensemble"
        elif method == SegmentationMethod.SHAPE_BASED:
            if self.shape_segmenter:
                shape_result = self.shape_segmenter.segment_fruit_by_shape(img, return_debug=False)
                mask = shape_result.get("mask")
                confidence = shape_result.get("confidence", 0)
                result["shape_analysis"] = {
                    "shape_score": shape_result.get("shape_score", 0),
                    "texture_score": shape_result.get("texture_score", 0),
                    "shadow_detected": shape_result.get("shadow_mask") is not None
                }
            else:
                # Fallback to color-based
                mask, confidence = self._color_based_segmentation(img, bg_type)
        elif method == SegmentationMethod.COLOR_BASED:
            mask, confidence = self._color_based_segmentation(img, bg_type)
        elif method == SegmentationMethod.EDGE_BASED:
            mask, confidence = self._edge_based_segmentation(img)
        elif method == SegmentationMethod.GRABCUT:
            mask, confidence = self._grabcut_segmentation(img)
        elif method == SegmentationMethod.WATERSHED:
            mask, confidence = self._watershed_segmentation(img)
        else:
            mask, confidence = self._ensemble_segmentation(img, bg_type)
        
        if mask is not None:
            # Post-process mask
            mask = self._postprocess_mask(mask)
            
            # Exclude coin region from fruit mask (coin is NOT fruit)
            if coin_mask is not None and self.exclude_coin:
                mask = cv2.bitwise_and(mask, cv2.bitwise_not(coin_mask))
            
            # Find contour
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                # Get largest contour
                largest_contour = max(contours, key=cv2.contourArea)
                
                # Get bounding box
                x, y, w, h = cv2.boundingRect(largest_contour)
                
                # Create cropped fruit with alpha channel
                cropped = self._create_transparent_crop(img, mask, (x, y, w, h))
                
                result["success"] = True
                result["mask"] = mask
                result["contour"] = largest_contour
                result["bbox"] = (x, y, w, h)
                result["confidence"] = confidence
                result["cropped_fruit"] = cropped
                result["fruit_area_pixels"] = cv2.contourArea(largest_contour)
                result["fruit_area_ratio"] = cv2.contourArea(largest_contour) / (img.shape[0] * img.shape[1])
        
        if return_debug:
            result["debug"] = self._create_debug_visualization(img, result)
        
        return result
    
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
    
    def _create_coin_mask(self, img: np.ndarray, coin_info: Dict) -> np.ndarray:
        """
        Create a simple circle mask for the detected coin.
        
        Since the coin is always a circle (₱5 silver coin, 25mm),
        we create a clean circular mask for:
        1. Visualizing the coin reference
        2. Excluding coin from fruit analysis
        3. Quick identification of coin position
        
        Args:
            img: Source image (for dimensions)
            coin_info: Dict with 'coin_center' and 'coin_radius'
            
        Returns:
            Binary mask with coin region as white (255)
        """
        h, w = img.shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        
        center = coin_info.get("coin_center")
        radius = coin_info.get("coin_radius")
        
        if center and radius:
            # Expand slightly to fully cover coin edge
            expanded_radius = int(radius * 1.05)
            cv2.circle(mask, center, expanded_radius, 255, -1)
        
        return mask
    
    def _detect_background_type(self, img: np.ndarray) -> Tuple[BackgroundType, float]:
        """
        Detect the type of background in the image.
        
        Returns:
            Tuple of (BackgroundType, confidence)
        """
        h, w = img.shape[:2]
        
        # Sample border pixels (edges of image)
        border_width = max(10, min(h, w) // 20)
        
        # Get border regions
        top = img[:border_width, :]
        bottom = img[-border_width:, :]
        left = img[:, :border_width]
        right = img[:, -border_width:]
        
        # Combine border pixels
        border_pixels = np.vstack([
            top.reshape(-1, 3),
            bottom.reshape(-1, 3),
            left.reshape(-1, 3),
            right.reshape(-1, 3)
        ])
        
        # Analyze border color distribution
        mean_color = np.mean(border_pixels, axis=0)
        std_color = np.std(border_pixels, axis=0)
        
        # Check for white background
        if np.all(mean_color > 200) and np.all(std_color < 30):
            return BackgroundType.WHITE, 0.9
        
        # Check for black background
        if np.all(mean_color < 50) and np.all(std_color < 30):
            return BackgroundType.BLACK, 0.9
        
        # Check for solid color background
        if np.all(std_color < 40):
            return BackgroundType.SOLID_COLOR, 0.8
        
        # Check for natural background (greens, browns)
        hsv_border = cv2.cvtColor(border_pixels.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_BGR2HSV)
        hues = hsv_border[0, :, 0]
        
        # Natural backgrounds often have green/brown hues
        green_ratio = np.sum((hues > 30) & (hues < 90)) / len(hues)
        brown_ratio = np.sum((hues > 5) & (hues < 30)) / len(hues)
        
        if green_ratio + brown_ratio > 0.4:
            return BackgroundType.NATURAL, 0.7
        
        # Complex background
        return BackgroundType.COMPLEX, 0.5
    
    def _detect_green_on_green_scene(self, img: np.ndarray) -> bool:
        """
        Detect if this is a challenging green-on-green scene.
        
        Characteristics:
        - High percentage of green hues
        - Low overall saturation (< 50)
        - Both fruit and background are greenish
        
        Returns:
            True if green-on-green scene detected
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h_ch = hsv[:, :, 0]
        s_ch = hsv[:, :, 1]
        
        # Check for high green hue percentage
        green_hue = (h_ch >= 30) & (h_ch <= 95)  # Expanded green range
        green_pct = np.sum(green_hue) / (img.shape[0] * img.shape[1])
        
        # Check for low saturation
        mean_sat = np.mean(s_ch)
        low_sat_pixels = np.sum(s_ch < 55) / (img.shape[0] * img.shape[1])
        
        # Green-on-green if:
        # - At least 15% of pixels are green hue
        # - Mean saturation < 60 OR > 60% of pixels have low saturation
        is_green_dominant = green_pct > 0.15
        is_low_saturation = (mean_sat < 60) or (low_sat_pixels > 0.60)
        
        return is_green_dominant and is_low_saturation
    
    def _color_based_segmentation(
        self,
        img: np.ndarray,
        bg_type: BackgroundType
    ) -> Tuple[Optional[np.ndarray], float]:
        """Color-based segmentation optimized for detected background type."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h, w = img.shape[:2]
        
        # Create fruit color mask
        fruit_mask = np.zeros((h, w), dtype=np.uint8)
        
        for color_name, ranges in self.fruit_color_ranges.items():
            mask = cv2.inRange(hsv, ranges["lower"], ranges["upper"])
            fruit_mask = cv2.bitwise_or(fruit_mask, mask)
        
        # Handle different background types
        if bg_type == BackgroundType.WHITE:
            # Exclude white pixels more aggressively
            white_mask = cv2.inRange(hsv, (0, 0, 220), (180, 25, 255))
            fruit_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(white_mask))
            
            # Also check for light gray/cream colors that might be sandy
            light_mask = cv2.inRange(hsv, (0, 0, 180), (180, 40, 255))
            fruit_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(light_mask))
            
        elif bg_type == BackgroundType.BLACK:
            # Exclude dark pixels
            black_mask = cv2.inRange(hsv, (0, 0, 0), (180, 255, 40))
            fruit_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(black_mask))
            
        elif bg_type == BackgroundType.NATURAL:
            # For natural backgrounds, use saturation to distinguish fruit
            # Fruits tend to have more saturation than background leaves
            sat_mask = hsv[:, :, 1] > 50
            fruit_mask = cv2.bitwise_and(fruit_mask, sat_mask.astype(np.uint8) * 255)
            
            # Exclude very dark (shadows) and very bright (sky)
            val_mask = (hsv[:, :, 2] > 40) & (hsv[:, :, 2] < 240)
            fruit_mask = cv2.bitwise_and(fruit_mask, val_mask.astype(np.uint8) * 255)
        
        # Calculate confidence based on mask quality
        if np.sum(fruit_mask) > 0:
            fruit_ratio = np.sum(fruit_mask > 0) / (h * w)
            # Good fruit should be 5-50% of image
            if 0.05 < fruit_ratio < 0.5:
                confidence = 0.7
            else:
                confidence = 0.4
        else:
            confidence = 0.0
        
        return fruit_mask, confidence
    
    def _edge_based_segmentation(self, img: np.ndarray) -> Tuple[Optional[np.ndarray], float]:
        """Edge-based segmentation using Canny and morphology."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Adaptive thresholding for edges
        edges = cv2.Canny(blurred, 30, 100)
        
        # Close gaps in edges
        kernel = np.ones((5, 5), np.uint8)
        edges_closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        
        # Fill enclosed regions
        contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        mask = np.zeros(gray.shape, dtype=np.uint8)
        
        if contours:
            # Find contours that look like fruits (elliptical, certain size)
            h, w = gray.shape
            min_area = h * w * 0.01
            max_area = h * w * 0.8
            
            fruit_contours = []
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if min_area < area < max_area:
                    # Check circularity
                    perimeter = cv2.arcLength(cnt, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter ** 2)
                        if circularity > 0.3:  # Reasonably round
                            fruit_contours.append(cnt)
            
            if fruit_contours:
                # Fill the largest suitable contour
                largest = max(fruit_contours, key=cv2.contourArea)
                cv2.drawContours(mask, [largest], -1, 255, -1)
                return mask, 0.6
        
        return None, 0.0
    
    def _grabcut_segmentation(self, img: np.ndarray) -> Tuple[Optional[np.ndarray], float]:
        """GrabCut segmentation with automatic initialization."""
        h, w = img.shape[:2]
        
        # Initialize mask
        mask = np.zeros((h, w), np.uint8)
        
        # Define probable foreground region (center of image)
        margin_x = w // 6
        margin_y = h // 6
        rect = (margin_x, margin_y, w - 2*margin_x, h - 2*margin_y)
        
        # Background/foreground models
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        
        try:
            # Run GrabCut
            cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
            
            # Create binary mask
            binary_mask = np.where((mask == 2) | (mask == 0), 0, 255).astype(np.uint8)
            
            # Refine with color-based hints
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            # Create hint mask for fruit colors
            fruit_hint = np.zeros((h, w), np.uint8)
            for ranges in self.fruit_color_ranges.values():
                hint = cv2.inRange(hsv, ranges["lower"], ranges["upper"])
                fruit_hint = cv2.bitwise_or(fruit_hint, hint)
            
            # Combine GrabCut result with color hints
            refined_mask = cv2.bitwise_and(binary_mask, fruit_hint)
            
            # If refined mask is too small, use original GrabCut result
            if np.sum(refined_mask) < np.sum(binary_mask) * 0.3:
                refined_mask = binary_mask
            
            return refined_mask, 0.75
            
        except Exception as e:
            print(f"GrabCut failed: {e}")
            return None, 0.0
    
    def _watershed_segmentation(self, img: np.ndarray) -> Tuple[Optional[np.ndarray], float]:
        """Watershed segmentation."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Threshold
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Noise removal
        kernel = np.ones((3, 3), np.uint8)
        opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
        
        # Sure background
        sure_bg = cv2.dilate(opening, kernel, iterations=3)
        
        # Sure foreground
        dist_transform = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
        _, sure_fg = cv2.threshold(dist_transform, 0.5 * dist_transform.max(), 255, 0)
        sure_fg = np.uint8(sure_fg)
        
        # Unknown region
        unknown = cv2.subtract(sure_bg, sure_fg)
        
        # Marker labeling
        _, markers = cv2.connectedComponents(sure_fg)
        markers = markers + 1
        markers[unknown == 255] = 0
        
        # Watershed
        markers = cv2.watershed(img, markers)
        
        # Create mask from markers
        mask = np.zeros(gray.shape, dtype=np.uint8)
        mask[markers > 1] = 255
        
        return mask, 0.65
    
    def _ensemble_segmentation(
        self,
        img: np.ndarray,
        bg_type: BackgroundType
    ) -> Tuple[Optional[np.ndarray], float]:
        """Combine multiple segmentation methods for best results."""
        h, w = img.shape[:2]
        
        # Collect masks from different methods
        masks = []
        weights = []
        
        # Color-based (adjusted weight based on background type)
        color_mask, color_conf = self._color_based_segmentation(img, bg_type)
        if color_mask is not None:
            masks.append(color_mask)
            weight = color_conf * (1.2 if bg_type in [BackgroundType.WHITE, BackgroundType.BLACK] else 0.8)
            weights.append(weight)
        
        # Edge-based
        edge_mask, edge_conf = self._edge_based_segmentation(img)
        if edge_mask is not None:
            masks.append(edge_mask)
            weights.append(edge_conf * 0.7)
        
        # GrabCut (good for complex backgrounds)
        if bg_type in [BackgroundType.NATURAL, BackgroundType.COMPLEX]:
            grabcut_mask, grabcut_conf = self._grabcut_segmentation(img)
            if grabcut_mask is not None:
                masks.append(grabcut_mask)
                weights.append(grabcut_conf * 1.1)
        
        if not masks:
            return None, 0.0
        
        # Weighted combination
        combined = np.zeros((h, w), dtype=np.float32)
        total_weight = sum(weights)
        
        for mask, weight in zip(masks, weights):
            combined += mask.astype(np.float32) * (weight / total_weight)
        
        # Threshold combined result
        final_mask = (combined > 127).astype(np.uint8) * 255
        
        # Calculate confidence
        confidence = min(0.9, total_weight / len(masks))
        
        return final_mask, confidence
    
    def _postprocess_mask(self, mask: np.ndarray) -> np.ndarray:
        """Post-process segmentation mask."""
        # Fill holes
        kernel_close = np.ones((15, 15), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close)
        
        # Remove small noise
        kernel_open = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_open)
        
        # Find largest connected component
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest = max(contours, key=cv2.contourArea)
            
            # Create clean mask with only largest component
            clean_mask = np.zeros_like(mask)
            cv2.drawContours(clean_mask, [largest], -1, 255, -1)
            
            # Smooth edges
            clean_mask = cv2.GaussianBlur(clean_mask, (5, 5), 0)
            _, clean_mask = cv2.threshold(clean_mask, 127, 255, cv2.THRESH_BINARY)
            
            return clean_mask
        
        return mask
    
    def _create_transparent_crop(
        self,
        img: np.ndarray,
        mask: np.ndarray,
        bbox: Tuple[int, int, int, int]
    ) -> np.ndarray:
        """Create cropped fruit image with transparent background."""
        x, y, w, h = bbox
        
        # Add padding
        pad = 10
        x = max(0, x - pad)
        y = max(0, y - pad)
        w = min(img.shape[1] - x, w + 2*pad)
        h = min(img.shape[0] - y, h + 2*pad)
        
        # Crop image and mask
        cropped_img = img[y:y+h, x:x+w]
        cropped_mask = mask[y:y+h, x:x+w]
        
        # Create BGRA image with alpha channel
        bgra = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2BGRA)
        bgra[:, :, 3] = cropped_mask
        
        return bgra
    
    def _create_debug_visualization(self, img: np.ndarray, result: Dict) -> Dict:
        """Create debug visualizations."""
        debug = {}
        
        h, w = img.shape[:2]
        
        # Original with overlay
        if result.get("mask") is not None:
            overlay = img.copy()
            mask_colored = np.zeros_like(img)
            mask_colored[:, :, 1] = result["mask"]  # Green overlay
            overlay = cv2.addWeighted(overlay, 0.7, mask_colored, 0.3, 0)
            
            if result.get("contour") is not None:
                cv2.drawContours(overlay, [result["contour"]], -1, (0, 255, 0), 2)
            
            if result.get("bbox"):
                x, y, bw, bh = result["bbox"]
                cv2.rectangle(overlay, (x, y), (x+bw, y+bh), (255, 0, 0), 2)
            
            debug["overlay"] = overlay
        
        # Mask only
        if result.get("mask") is not None:
            debug["mask"] = result["mask"]
        
        # Cropped with transparency shown as checkerboard
        if result.get("cropped_fruit") is not None:
            cropped = result["cropped_fruit"]
            ch, cw = cropped.shape[:2]
            
            # Create checkerboard pattern
            checker_size = 10
            checker = np.zeros((ch, cw, 3), dtype=np.uint8)
            for i in range(0, ch, checker_size):
                for j in range(0, cw, checker_size):
                    if (i // checker_size + j // checker_size) % 2:
                        checker[i:i+checker_size, j:j+checker_size] = [200, 200, 200]
                    else:
                        checker[i:i+checker_size, j:j+checker_size] = [255, 255, 255]
            
            # Blend based on alpha
            alpha = cropped[:, :, 3:4] / 255.0
            rgb = cropped[:, :, :3]
            blended = (rgb * alpha + checker * (1 - alpha)).astype(np.uint8)
            debug["cropped_with_transparency"] = blended
        
        return debug
    
    def segment_multiple(
        self,
        image: Union[str, Path, np.ndarray],
        max_fruits: int = 10
    ) -> List[Dict]:
        """
        Segment multiple fruits in a single image.
        
        Args:
            image: Input image
            max_fruits: Maximum number of fruits to detect
            
        Returns:
            List of segmentation results, one per fruit
        """
        img = self._load_image(image)
        if img is None:
            return [{"error": "Could not load image", "success": False}]
        
        # Get full mask
        result = self.segment(img, method=SegmentationMethod.ENSEMBLE)
        
        if not result.get("success"):
            return [result]
        
        # Find all contours
        contours, _ = cv2.findContours(
            result["mask"], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        # Sort by area (largest first)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        
        results = []
        h, w = img.shape[:2]
        min_area = h * w * 0.005  # Minimum 0.5% of image
        
        for i, contour in enumerate(contours[:max_fruits]):
            area = cv2.contourArea(contour)
            
            if area < min_area:
                continue
            
            # Create individual mask
            individual_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.drawContours(individual_mask, [contour], -1, 255, -1)
            
            # Get bounding box
            x, y, bw, bh = cv2.boundingRect(contour)
            
            # Create crop
            cropped = self._create_transparent_crop(img, individual_mask, (x, y, bw, bh))
            
            results.append({
                "success": True,
                "fruit_index": i,
                "mask": individual_mask,
                "contour": contour,
                "bbox": (x, y, bw, bh),
                "area_pixels": area,
                "cropped_fruit": cropped
            })
        
        return results if results else [{"success": False, "error": "No fruits detected"}]


def save_transparent_png(
    image: np.ndarray,
    output_path: str
) -> None:
    """Save BGRA image as PNG with transparency."""
    if image.shape[2] == 4:
        # Convert BGRA to RGBA for PIL
        rgba = cv2.cvtColor(image, cv2.COLOR_BGRA2RGBA)
        pil_img = Image.fromarray(rgba)
        pil_img.save(output_path, "PNG")
    else:
        cv2.imwrite(output_path, image)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Segment Talisay fruit from background")
    parser.add_argument("image", help="Path to fruit image")
    parser.add_argument("--method", default="ensemble",
                       choices=["color_based", "edge_based", "grabcut", "watershed", "ensemble"],
                       help="Segmentation method")
    parser.add_argument("--output", help="Output path for cropped fruit")
    parser.add_argument("--debug", action="store_true", help="Save debug visualizations")
    parser.add_argument("--multiple", action="store_true", help="Detect multiple fruits")
    
    args = parser.parse_args()
    
    segmenter = AdvancedSegmenter()
    
    method_map = {
        "color_based": SegmentationMethod.COLOR_BASED,
        "edge_based": SegmentationMethod.EDGE_BASED,
        "grabcut": SegmentationMethod.GRABCUT,
        "watershed": SegmentationMethod.WATERSHED,
        "ensemble": SegmentationMethod.ENSEMBLE,
    }
    
    if args.multiple:
        results = segmenter.segment_multiple(args.image)
        print(f"Detected {len(results)} fruit(s)")
        
        for i, result in enumerate(results):
            if result.get("success"):
                print(f"\nFruit {i + 1}:")
                print(f"  Bounding box: {result['bbox']}")
                print(f"  Area: {result['area_pixels']} pixels")
                
                if args.output and result.get("cropped_fruit") is not None:
                    output_path = args.output.replace(".", f"_{i+1}.")
                    save_transparent_png(result["cropped_fruit"], output_path)
                    print(f"  Saved to: {output_path}")
    else:
        result = segmenter.segment(
            args.image,
            method=method_map[args.method],
            return_debug=args.debug
        )
        
        print("\n=== Segmentation Results ===")
        print(f"Success: {result.get('success', False)}")
        print(f"Method: {result.get('method_used', 'N/A')}")
        print(f"Background Type: {result.get('background_type', 'N/A')}")
        print(f"Confidence: {result.get('confidence', 0)*100:.1f}%")
        
        if result.get("success"):
            print(f"Bounding Box: {result['bbox']}")
            print(f"Fruit Area: {result.get('fruit_area_ratio', 0)*100:.1f}% of image")
            
            if args.output and result.get("cropped_fruit") is not None:
                save_transparent_png(result["cropped_fruit"], args.output)
                print(f"\nCropped fruit saved to: {args.output}")
            
            if args.debug and "debug" in result:
                base_path = Path(args.image)
                
                if "overlay" in result["debug"]:
                    overlay_path = base_path.parent / f"{base_path.stem}_overlay.jpg"
                    cv2.imwrite(str(overlay_path), result["debug"]["overlay"])
                    print(f"Debug overlay saved to: {overlay_path}")
                
                if "mask" in result["debug"]:
                    mask_path = base_path.parent / f"{base_path.stem}_mask.png"
                    cv2.imwrite(str(mask_path), result["debug"]["mask"])
                    print(f"Debug mask saved to: {mask_path}")
