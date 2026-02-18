"""
Color Classification Model for Talisay Fruit
Classifies fruit into: Green (Immature), Yellow (Mature), Brown (Fully Ripe)
"""

import numpy as np
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from config import (
    FRUIT_COLORS,
    COLOR_MODEL_CONFIG,
    IMAGE_SIZE,
    TRAINING_CONFIG
)


class ColorClassifier:
    """
    Deep learning model to classify Talisay fruit color/ripeness stage.
    
    Uses transfer learning with MobileNetV2 for efficient inference,
    suitable for mobile and edge deployment.
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize the color classifier.
        
        Args:
            model_path: Path to pre-trained model weights
        """
        self.model = None
        self.classes = FRUIT_COLORS
        self.input_size = IMAGE_SIZE
        self.model_path = model_path
        
        if model_path and Path(model_path).exists():
            self.load_model(model_path)
    
    def build_model(self):
        """Build the MobileNetV2-based classification model."""
        try:
            import tensorflow as tf
            from tensorflow.keras import layers, Model
            from tensorflow.keras.applications import MobileNetV2
        except ImportError:
            print("TensorFlow not installed. Install with: pip install tensorflow")
            return None
        
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            input_shape=(*self.input_size, 3),
            include_top=False,
            weights="imagenet"
        )
        
        # Freeze base model layers for transfer learning
        base_model.trainable = False
        
        # Add custom classification head
        inputs = tf.keras.Input(shape=(*self.input_size, 3))
        x = base_model(inputs, training=False)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dropout(COLOR_MODEL_CONFIG["dropout_rate"])(x)
        x = layers.Dense(128, activation="relu")(x)
        x = layers.Dropout(COLOR_MODEL_CONFIG["dropout_rate"])(x)
        outputs = layers.Dense(
            COLOR_MODEL_CONFIG["num_classes"],
            activation="softmax",
            name="color_output"
        )(x)
        
        self.model = Model(inputs, outputs, name="TalisayColorClassifier")
        
        # Compile model
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(
                learning_rate=COLOR_MODEL_CONFIG["learning_rate"]
            ),
            loss="categorical_crossentropy",
            metrics=["accuracy"]
        )
        
        print("Model built successfully!")
        self.model.summary()
        
        return self.model
    
    def preprocess_image(self, image):
        """
        Preprocess image for model input.
        
        Args:
            image: PIL Image, numpy array, or file path
            
        Returns:
            Preprocessed numpy array
        """
        import numpy as np
        from PIL import Image
        
        # Load image if path provided
        if isinstance(image, (str, Path)):
            image = Image.open(image)
        
        # Convert to PIL if numpy
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)
        
        # Resize and convert to RGB
        image = image.convert("RGB")
        image = image.resize(self.input_size)
        
        # Convert to numpy and normalize
        img_array = np.array(image) / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def predict(self, image) -> dict:
        """
        Predict fruit color/ripeness from image.
        
        Args:
            image: PIL Image, numpy array, or file path
            
        Returns:
            Dictionary with predicted class and confidence scores
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call build_model() or load_model() first.")
        
        # Preprocess
        img_array = self.preprocess_image(image)
        
        # Predict
        predictions = self.model.predict(img_array, verbose=0)[0]
        
        # Get predicted class
        predicted_idx = np.argmax(predictions)
        predicted_class = self.classes[predicted_idx]
        confidence = float(predictions[predicted_idx])
        
        # Build result
        result = {
            "predicted_color": predicted_class,
            "confidence": round(confidence, 4),
            "probabilities": {
                color: round(float(prob), 4)
                for color, prob in zip(self.classes, predictions)
            },
            "maturity_stage": self._color_to_maturity(predicted_class)
        }
        
        return result
    
    def _color_to_maturity(self, color: str) -> str:
        """Map color to maturity stage."""
        mapping = {
            "green": "Immature",
            "yellow": "Mature (Optimal for oil extraction)",
            "brown": "Fully Ripe"
        }
        return mapping.get(color, "Unknown")
    
    def train(
        self,
        train_data,
        val_data,
        epochs: int = None,
        callbacks: list = None
    ):
        """
        Train the color classification model.
        
        Args:
            train_data: Training data generator or (X, y) tuple
            val_data: Validation data generator or (X, y) tuple
            epochs: Number of training epochs
            callbacks: List of Keras callbacks
        """
        import tensorflow as tf
        
        if self.model is None:
            self.build_model()
        
        epochs = epochs or TRAINING_CONFIG["epochs"]
        
        # Default callbacks
        if callbacks is None:
            callbacks = [
                tf.keras.callbacks.EarlyStopping(
                    monitor="val_loss",
                    patience=TRAINING_CONFIG["early_stopping_patience"],
                    restore_best_weights=True
                ),
                tf.keras.callbacks.ReduceLROnPlateau(
                    monitor="val_loss",
                    factor=0.5,
                    patience=TRAINING_CONFIG["reduce_lr_patience"],
                    min_lr=1e-7
                ),
                tf.keras.callbacks.ModelCheckpoint(
                    "color_classifier_best.keras",
                    monitor="val_accuracy",
                    save_best_only=True
                )
            ]
        
        # Train
        history = self.model.fit(
            train_data,
            validation_data=val_data,
            epochs=epochs,
            callbacks=callbacks
        )
        
        return history
    
    def save_model(self, path: str):
        """Save model weights."""
        if self.model is not None:
            self.model.save(path)
            print(f"Model saved to: {path}")
    
    def load_model(self, path: str):
        """Load model weights."""
        import tensorflow as tf
        self.model = tf.keras.models.load_model(path)
        print(f"Model loaded from: {path}")


# Fallback classifier using traditional ML (no deep learning required)
class SimpleColorClassifier:
    """
    Advanced color classifier for real-world Talisay fruits that handles:
    - Fruits with spots (brown/black spots on green/yellow fruits)
    - Mixed color patterns (transitional ripening)
    - Various backgrounds (sand, soil, white paper)
    - Segmentation to isolate fruit from background
    - Spot detection and exclusion for accurate base color detection
    - K-means clustering with intelligent color filtering
    - Multi-method analysis (RGB, HSV, histogram)
    """
    
    def __init__(self):
        # Talisay-specific HSV ranges (calibrated for actual fruits)
        # Note: OpenCV uses H: 0-180, S: 0-255, V: 0-255
        self.color_ranges = {
            "green": {
                "h_min": 35, "h_max": 90,    # Green hue range
                "s_min": 30, "s_max": 255,   # Allow lower saturation
                "v_min": 30, "v_max": 255    # Allow darker greens
            },
            "yellow": {
                "h_min": 15, "h_max": 35,    # Yellow-orange hue
                "s_min": 80, "s_max": 255,   # Higher saturation
                "v_min": 100, "v_max": 255   # Brighter values
            },
            "brown": {
                "h_min": 5, "h_max": 20,     # Brown/reddish hue
                "s_min": 40, "s_max": 200,   # Medium saturation
                "v_min": 30, "v_max": 180    # Darker values
            }
        }
        
        # Colors to exclude (background colors)
        self.background_ranges = {
            "gray_sand": {
                "s_min": 0, "s_max": 40,     # Low saturation = gray
                "v_min": 50, "v_max": 200
            },
            "dark": {
                "v_min": 0, "v_max": 30      # Very dark pixels
            },
            "white": {
                "s_min": 0, "s_max": 30,
                "v_min": 200, "v_max": 255   # Very bright, low sat
            }
        }
        
        # White background detection thresholds
        self.white_threshold = {
            "rgb_min": 200,          # Minimum RGB value for white
            "rgb_max_diff": 30,      # Max difference between R, G, B channels
            "coverage_min": 0.15,    # Minimum % of image that should be white
            "hsv_s_max": 35,         # Maximum saturation for white
            "hsv_v_min": 200         # Minimum value for white
        }
    
    def _detect_white_background(self, img):
        """
        Detect if the image has a white background (like bond paper).
        
        Returns:
            Tuple (is_white_bg: bool, white_mask: ndarray, coverage: float)
        """
        import cv2
        import numpy as np
        
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Method 1: RGB-based white detection
        # White pixels have high values in all channels and similar values
        b, g, r = cv2.split(img)
        
        # All channels should be high (>200 typically for white)
        high_values = (r >= self.white_threshold["rgb_min"]) & \
                      (g >= self.white_threshold["rgb_min"]) & \
                      (b >= self.white_threshold["rgb_min"])
        
        # Channels should be similar (not too different)
        max_channel = np.maximum(np.maximum(r, g), b)
        min_channel = np.minimum(np.minimum(r, g), b)
        similar_values = (max_channel - min_channel) <= self.white_threshold["rgb_max_diff"]
        
        rgb_white_mask = (high_values & similar_values).astype(np.uint8) * 255
        
        # Method 2: HSV-based white detection
        # White = low saturation, high value
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]
        
        low_saturation = s_channel <= self.white_threshold["hsv_s_max"]
        high_value = v_channel >= self.white_threshold["hsv_v_min"]
        
        hsv_white_mask = (low_saturation & high_value).astype(np.uint8) * 255
        
        # Combine both methods (intersection for higher precision)
        combined_white_mask = cv2.bitwise_and(rgb_white_mask, hsv_white_mask)
        
        # Apply slight morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined_white_mask = cv2.morphologyEx(combined_white_mask, cv2.MORPH_CLOSE, kernel)
        
        # Calculate white coverage
        white_pixels = cv2.countNonZero(combined_white_mask)
        total_pixels = h * w
        coverage = white_pixels / total_pixels
        
        # Determine if this is a white background image
        is_white_bg = coverage >= self.white_threshold["coverage_min"]
        
        return is_white_bg, combined_white_mask, coverage
    
    def _detect_spots(self, img, fruit_mask):
        """
        Detect spots (brown, black, dark patches) on the fruit surface.
        
        IMPROVED v2: Context-aware spot detection
        - Black spots: only very dark pixels (V<45) within fruit
        - Brown spots: only if they contrast with surrounding green/yellow base
        - Excludes white/bright background pixels (from mask fill)
        - Dark patches: relative to fruit median, not absolute
        
        Brown spots should only be flagged on GREEN or YELLOW fruits.
        On BROWN fruits, brown is the base color, not spots.
        
        Returns:
            Tuple (spots_mask, spot_coverage_percent, spot_info)
        """
        import cv2
        import numpy as np
        
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        b, g, r = cv2.split(img)
        
        spots_mask = np.zeros((h, w), dtype=np.uint8)
        fruit_pixels = fruit_mask > 0
        
        if not np.any(fruit_pixels):
            return spots_mask, 0.0, {"black_spots": 0, "brown_spots": 0, "dark_patches": 0}
        
        v_channel = hsv[:, :, 2]
        s_channel = hsv[:, :, 1]
        h_channel = hsv[:, :, 0]
        
        # Exclude white background pixels (from mask fill = 255)
        not_white_bg = ~((v_channel > 240) & (s_channel < 30))
        fruit_valid = fruit_pixels & not_white_bg
        
        # === First, determine the BASE color of the fruit ===
        # This tells us whether brown spots should be flagged
        fruit_hues = h_channel[fruit_valid]
        fruit_vals = v_channel[fruit_valid]
        if len(fruit_hues) < 50:
            return spots_mask, 0.0, {"black_spots": 0, "brown_spots": 0, "dark_patches": 0}
        
        median_hue = np.median(fruit_hues)
        median_v = np.median(fruit_vals)
        
        # Determine if fruit is primarily green/yellow (H > 25) or brown (H < 25)
        is_green_yellow_base = median_hue >= 25
        
        # === 1. Detect BLACK spots (very dark, any color) ===
        # Tighter threshold: V < 45 (was V < 60)
        black_spots = (v_channel < 45) & fruit_valid
        
        # === 2. Detect BROWN spots (only on green/yellow fruits) ===
        brown_spots = np.zeros((h, w), dtype=bool)
        if is_green_yellow_base:
            # Brown spots on green fruit: hue significantly different from green base
            brown_hue = (h_channel <= 18) | (h_channel >= 165)
            moderate_saturation = (s_channel >= 25) & (s_channel <= 180)
            not_too_dark = v_channel >= 45  # Not already caught by black spots
            not_too_bright = v_channel < 200
            
            brown_spots = brown_hue & moderate_saturation & not_too_dark & not_too_bright & fruit_valid
        # If fruit is brown-based, don't flag brown as spots
        
        # === 3. Detect DARK PATCHES (significantly darker than surroundings) ===
        # More conservative: must be 70 points below median (was 60)
        dark_patches = np.zeros((h, w), dtype=bool)
        if median_v > 80:  # Only check if fruit is bright enough to have dark patches
            dark_patches = (v_channel < median_v - 70) & fruit_valid
        
        # === 4. Detect PURPLE/MAROON spots ===
        purple_hue = (h_channel >= 125) & (h_channel <= 165)
        purple_spots = purple_hue & (s_channel >= 30) & fruit_valid
        
        # === Combine ===
        all_spots = black_spots | brown_spots | dark_patches | purple_spots
        spots_mask = all_spots.astype(np.uint8) * 255
        
        # Clean up - remove tiny noise
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        spots_mask = cv2.morphologyEx(spots_mask, cv2.MORPH_CLOSE, kernel_small)
        spots_mask = cv2.morphologyEx(spots_mask, cv2.MORPH_OPEN, kernel_small)
        
        # Calculate stats
        total_fruit_pixels = np.sum(fruit_valid)
        spot_pixels = cv2.countNonZero(spots_mask)
        spot_coverage = spot_pixels / total_fruit_pixels if total_fruit_pixels > 0 else 0
        
        spot_info = {
            "black_spots": int(np.sum(black_spots)),
            "brown_spots": int(np.sum(brown_spots)),
            "dark_patches": int(np.sum(dark_patches)),
            "purple_spots": int(np.sum(purple_spots)),
            "total_spot_pixels": spot_pixels,
            "spot_coverage_percent": round(spot_coverage * 100, 1),
            "base_hue_median": float(median_hue),
            "is_green_yellow_base": bool(is_green_yellow_base)
        }
        
        return spots_mask, spot_coverage, spot_info
    
    def _create_clean_fruit_mask(self, fruit_mask, spots_mask):
        """
        Create a mask of fruit pixels excluding spots.
        This gives us the clean base color region.
        """
        import cv2
        import numpy as np
        
        # Subtract spots from fruit mask
        clean_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(spots_mask))
        
        # Ensure we still have enough pixels
        clean_pixels = cv2.countNonZero(clean_mask)
        fruit_pixels = cv2.countNonZero(fruit_mask)
        
        # If spots cover too much (>60%), fall back to full fruit mask
        # Some color info is better than none
        if clean_pixels < fruit_pixels * 0.4:
            # Too many spots detected, reduce spot mask sensitivity
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
            spots_mask_eroded = cv2.erode(spots_mask, kernel)
            clean_mask = cv2.bitwise_and(fruit_mask, cv2.bitwise_not(spots_mask_eroded))
            
            clean_pixels = cv2.countNonZero(clean_mask)
            if clean_pixels < fruit_pixels * 0.3:
                # Still too few, use original fruit mask
                return fruit_mask
        
        return clean_mask
    
    def _analyze_color_distribution(self, img, clean_mask, fruit_mask, spots_mask):
        """
        Analyze color distribution with spot-aware processing.
        
        Returns detailed color breakdown:
        - Base color (excluding spots)
        - Spot color analysis
        - Color transition indicators
        """
        import cv2
        import numpy as np
        
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        result = {
            "base_color_analysis": {},
            "spot_analysis": {},
            "transition_indicator": 0.0,
            "color_uniformity": 0.0
        }
        
        # === 1. Analyze clean (non-spot) regions for base color ===
        clean_pixels = hsv[clean_mask > 0]
        if len(clean_pixels) < 10:
            clean_pixels = hsv[fruit_mask > 0]
        
        if len(clean_pixels) > 0:
            h_clean = clean_pixels[:, 0]
            s_clean = clean_pixels[:, 1]
            v_clean = clean_pixels[:, 2]
            
            result["base_color_analysis"] = {
                "h_mean": float(np.mean(h_clean)),
                "h_std": float(np.std(h_clean)),
                "h_median": float(np.median(h_clean)),
                "s_mean": float(np.mean(s_clean)),
                "v_mean": float(np.mean(v_clean)),
                "pixel_count": len(clean_pixels)
            }
            
            # Color uniformity: low std = uniform color
            result["color_uniformity"] = max(0, 1 - (np.std(h_clean) / 30))
        
        # === 2. Analyze spot regions ===
        spot_pixels = hsv[spots_mask > 0]
        if len(spot_pixels) > 10:
            result["spot_analysis"] = {
                "h_mean": float(np.mean(spot_pixels[:, 0])),
                "s_mean": float(np.mean(spot_pixels[:, 1])),
                "v_mean": float(np.mean(spot_pixels[:, 2])),
                "pixel_count": len(spot_pixels)
            }
        
        # === 3. Transition indicator (fruit ripening from green to yellow/brown) ===
        if len(clean_pixels) > 100:
            # Count pixels in each color zone
            # Talisay-specific ranges: "green" talisay has olive/muted green with H=15-25
            # Green: H from 18 to 90 (expanded for olive/muted talisay green)
            # Yellow: H from 10 to 18 (warm yellow, transitioning fruit)
            # Brown: H < 10 or H > 160 (red/brown tones)
            
            # Also consider saturation - true greens have moderate to high saturation
            s_clean = clean_pixels[:, 1]
            
            # Extended green zone: covers olive-green (H=18+) and vivid green
            # Also include H=15-18 if saturation is moderate+ (not washed out)
            green_zone = ((h_clean >= 18) & (h_clean <= 90)) | \
                        ((h_clean >= 15) & (h_clean < 18) & (s_clean >= 35))  # Light olive green
            
            # True yellow (warm yellow, not greenish-yellow)
            yellow_zone = (h_clean >= 10) & (h_clean < 18) & ~green_zone
            
            # Brown/red zone
            brown_zone = (h_clean < 10) | (h_clean > 160)
            
            green_pct = np.sum(green_zone) / len(h_clean)
            yellow_pct = np.sum(yellow_zone) / len(h_clean)
            brown_pct = np.sum(brown_zone) / len(h_clean)
            
            # Normalize to 100%
            total_pct = green_pct + yellow_pct + brown_pct
            if total_pct > 0:
                green_pct /= total_pct
                yellow_pct /= total_pct
                brown_pct /= total_pct
            
            # Transition = having significant portions of multiple colors
            max_pct = max(green_pct, yellow_pct, brown_pct)
            result["transition_indicator"] = 1 - max_pct  # Higher = more transitional
            
            result["zone_distribution"] = {
                "green_percent": round(green_pct * 100, 1),
                "yellow_percent": round(yellow_pct * 100, 1),
                "brown_percent": round(brown_pct * 100, 1)
            }
        
        return result
    
    def _create_fruit_mask_from_white_bg(self, img, white_mask):
        """
        Create a fruit mask by excluding white background pixels.
        When the fruit is on white background, the fruit is everything that's NOT white.
        
        Args:
            img: BGR image
            white_mask: Mask of white background pixels
            
        Returns:
            Mask of fruit pixels (inverted white mask, cleaned up)
        """
        import cv2
        import numpy as np
        
        h, w = img.shape[:2]
        
        # Invert the white mask to get non-white (fruit) pixels
        fruit_mask = cv2.bitwise_not(white_mask)
        
        # Also exclude very dark pixels (shadows)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        v_channel = hsv[:, :, 2]
        not_dark = (v_channel > 30).astype(np.uint8) * 255
        fruit_mask = cv2.bitwise_and(fruit_mask, not_dark)
        
        # Exclude very light gray pixels (near-white)
        s_channel = hsv[:, :, 1]
        has_color = (s_channel > 15).astype(np.uint8) * 255
        # Only apply color filter in high-value areas
        high_value_low_sat = (v_channel > 180) & (s_channel < 20)
        gray_mask = (~high_value_low_sat).astype(np.uint8) * 255
        fruit_mask = cv2.bitwise_and(fruit_mask, gray_mask)
        
        # Morphological operations to clean up the mask
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        kernel_medium = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        kernel_large = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        
        # Remove small noise
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_OPEN, kernel_small)
        # Fill small holes
        fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_CLOSE, kernel_medium)
        
        # Find contours and keep only significant ones
        contours, _ = cv2.findContours(fruit_mask, cv2.RETR_EXTERNAL, 
                                        cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Filter contours by size - fruit should be significant portion
            min_area = h * w * 0.01  # At least 1% of image
            max_area = h * w * 0.90  # At most 90% of image
            
            valid_contours = [cnt for cnt in contours 
                             if min_area < cv2.contourArea(cnt) < max_area]
            
            if valid_contours:
                # Create clean mask from valid contours
                clean_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(clean_mask, valid_contours, -1, 255, -1)
                return clean_mask
        
        # If no valid contours, return the cleaned fruit mask
        return fruit_mask
    
    def _segment_fruit(self, img):
        """
        Segment the fruit from the background using multiple techniques.
        Returns a mask where the fruit region is white.
        
        Improved algorithm:
        1. First check if image has white background - if so, use simple inversion
        2. Detect green regions specifically (green channel > red and blue)
        3. Use saturation to filter out gray/sandy backgrounds
        4. Exclude sandy/gray areas aggressively
        5. Find contours and select the most fruit-like one
        """
        import cv2
        import numpy as np
        
        h, w = img.shape[:2]
        
        # STEP 0: Check for white background first
        is_white_bg, white_mask, white_coverage = self._detect_white_background(img)
        
        if is_white_bg:
            # White background detected - use simple inversion for segmentation
            fruit_mask = self._create_fruit_mask_from_white_bg(img, white_mask)
            fruit_pixels = cv2.countNonZero(fruit_mask)
            
            # If we got a reasonable fruit mask, use it
            if fruit_pixels > (h * w * 0.02):  # At least 2% of image
                self._white_bg_detected = True
                self._white_coverage = white_coverage
                return fruit_mask
        
        # Not a white background, use standard segmentation
        self._white_bg_detected = False
        self._white_coverage = 0.0
        
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Get BGR channels
        b, g, r = cv2.split(img)
        
        # === STEP 1: Detect sandy/gray backgrounds to EXCLUDE ===
        # Sandy background characteristics:
        # - Low saturation (grayish)
        # - Similar R, G, B values
        # - Medium brightness
        
        h_channel = hsv[:, :, 0]
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]
        
        # Calculate RGB differences
        rg_diff = np.abs(r.astype(np.int16) - g.astype(np.int16))
        gb_diff = np.abs(g.astype(np.int16) - b.astype(np.int16))
        rb_diff = np.abs(r.astype(np.int16) - b.astype(np.int16))
        max_rgb_diff = np.maximum(np.maximum(rg_diff, gb_diff), rb_diff)
        
        # Sandy/gray detection: low saturation AND similar RGB values
        is_sandy_gray = (s_channel < 45) & (max_rgb_diff < 40)
        
        # Also exclude brownish-gray (common in sand)
        is_brownish_gray = (s_channel < 55) & (h_channel < 25) & (max_rgb_diff < 30)
        
        # Combined background mask
        background_mask = is_sandy_gray | is_brownish_gray
        not_background = ~background_mask
        
        # === STEP 2: Green detection - where green channel is dominant ===
        # For green fruits: G > R and G > B (relaxed for light green)
        green_dominant_strict = (g.astype(np.int16) > r.astype(np.int16) + 10) & \
                               (g.astype(np.int16) > b.astype(np.int16) + 10)
        green_dominant_relaxed = (g.astype(np.int16) >= r.astype(np.int16)) & \
                                (g.astype(np.int16) > b.astype(np.int16))
        
        # === STEP 3: HSV-based color detection ===
        # Green in HSV (expanded range for light green)
        green_hue = (h_channel >= 25) & (h_channel <= 90)
        
        # Yellow in HSV (true yellow, not greenish-yellow)
        yellow_hue = (h_channel >= 15) & (h_channel < 30) & (s_channel >= 60)
        
        # Good saturation for fruit (higher threshold than before)
        good_saturation = s_channel >= 35
        
        # Value should be reasonable (not too dark or too bright)
        good_value = (v_channel >= 25) & (v_channel <= 235)
        
        # === STEP 4: Combine fruit detection ===
        # Green fruit mask (strict or relaxed green with saturation)
        green_mask = ((green_dominant_strict | (green_dominant_relaxed & green_hue)) & 
                     good_saturation & good_value & not_background)
        green_mask = green_mask.astype(np.uint8) * 255
        
        # Yellow fruit mask
        yellow_mask = (yellow_hue & good_saturation & good_value & not_background)
        yellow_mask = yellow_mask.astype(np.uint8) * 255
        
        # Also detect fruit by higher saturation (fruits are more colorful than sand)
        colorful_mask = ((s_channel >= 50) & good_value & not_background)
        colorful_mask = colorful_mask.astype(np.uint8) * 255
        
        # Combine all fruit color masks
        combined_mask = cv2.bitwise_or(cv2.bitwise_or(green_mask, yellow_mask), colorful_mask)
        
        # Apply morphological operations to clean up
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        kernel_large = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        
        # Close small gaps, then remove noise
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel_large)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel_small)
        
        # Find contours
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, 
                                        cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Filter contours by size and shape
            valid_contours = []
            for cnt in contours:
                area = cv2.contourArea(cnt)
                # Should be at least 2% of image and not more than 80%
                if (h * w * 0.02) < area < (h * w * 0.80):
                    # Check if reasonably compact (not too elongated)
                    perimeter = cv2.arcLength(cnt, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                        # Talisay fruits are elliptical, circularity > 0.3
                        if circularity > 0.2:
                            valid_contours.append((cnt, area))
            
            if valid_contours:
                # Get the largest valid contour
                largest_contour = max(valid_contours, key=lambda x: x[1])[0]
                
                fruit_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(fruit_mask, [largest_contour], -1, 255, -1)
                
                return fruit_mask
        
        # Fallback: use the combined mask directly if we have enough pixels
        if cv2.countNonZero(combined_mask) > (h * w * 0.05):
            return combined_mask
        
        # Final fallback: center crop with green priority
        fallback_mask = np.zeros((h, w), dtype=np.uint8)
        margin_y, margin_x = h // 4, w // 4
        center_region = fallback_mask.copy()
        center_region[margin_y:h-margin_y, margin_x:w-margin_x] = 255
        
        # Combine with any green detection
        if cv2.countNonZero(green_mask) > 100:
            fallback_mask = cv2.bitwise_and(green_mask, center_region)
            if cv2.countNonZero(fallback_mask) > (h * w * 0.01):
                return fallback_mask
        
        return center_region
    
    def _get_dominant_color_kmeans(self, img, mask, n_clusters=5):
        """
        Find dominant colors using K-means clustering on masked region.
        Enhanced to better separate green from brown/yellow.
        Uses subsampling for speed on large images.
        """
        import cv2
        import numpy as np
        
        # Extract pixels from the masked region
        masked_pixels = img[mask > 0]
        
        if len(masked_pixels) < 100:
            # Not enough pixels, use center crop
            h, w = img.shape[:2]
            margin = min(h, w) // 4
            center_crop = img[margin:h-margin, margin:w-margin]
            masked_pixels = center_crop.reshape(-1, 3)
        
        # Subsample for speed: 10K pixels is more than enough for K-means
        max_pixels = 10000
        if len(masked_pixels) > max_pixels:
            indices = np.random.choice(len(masked_pixels), max_pixels, replace=False)
            masked_pixels = masked_pixels[indices]
        
        # Convert to float32 for k-means
        pixels = np.float32(masked_pixels)
        
        # K-means clustering with more clusters for better separation
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.5)
        _, labels, centers = cv2.kmeans(pixels, n_clusters, None, criteria, 
                                         3, cv2.KMEANS_RANDOM_CENTERS)
        
        # Count pixels in each cluster
        unique, counts = np.unique(labels, return_counts=True)
        
        # Analyze each cluster for "greenness"
        cluster_info = []
        for idx, center in enumerate(centers):
            b, g, r = center
            count = counts[list(unique).index(idx)] if idx in unique else 0
            
            # Calculate how "green" this cluster is
            # Green = G channel significantly higher than R and B
            greenness = (g - max(r, b)) / 255.0
            
            # Convert to HSV for additional analysis
            center_hsv = cv2.cvtColor(
                np.uint8([[center]]), cv2.COLOR_BGR2HSV
            )[0][0]
            h, s, v = center_hsv
            
            # Check if this is in the green hue range (35-90 in OpenCV)
            is_green_hue = 35 <= h <= 90
            
            cluster_info.append({
                'idx': idx,
                'center_bgr': center,
                'center_hsv': center_hsv,
                'count': count,
                'greenness': greenness,
                'is_green_hue': is_green_hue
            })
        
        # Sort by count (most common first)
        cluster_info.sort(key=lambda x: x['count'], reverse=True)
        
        # Check if any significant cluster is green
        total_pixels = sum(c['count'] for c in cluster_info)
        
        for cluster in cluster_info:
            pct = cluster['count'] / total_pixels if total_pixels > 0 else 0
            
            # If this cluster is clearly green and significant (>10%)
            if cluster['greenness'] > 0.05 and pct > 0.10:
                return cluster['center_bgr'].astype(np.uint8), centers.astype(np.uint8), counts
            
            # If green hue and significant
            if cluster['is_green_hue'] and pct > 0.10:
                return cluster['center_bgr'].astype(np.uint8), centers.astype(np.uint8), counts
        
        # No clear green, return the most common cluster
        dominant_idx = unique[np.argmax(counts)]
        dominant_color_bgr = centers[dominant_idx].astype(np.uint8)
        
        return dominant_color_bgr, centers.astype(np.uint8), counts
    
    def _classify_hsv_color(self, hsv_color):
        """
        Classify a single HSV color value into green/yellow/brown.
        """
        h, s, v = hsv_color
        
        scores = {"green": 0, "yellow": 0, "brown": 0}
        
        # Check each color range and calculate match score
        for color, ranges in self.color_ranges.items():
            h_match = ranges["h_min"] <= h <= ranges["h_max"]
            s_match = ranges["s_min"] <= s <= ranges["s_max"]
            v_match = ranges["v_min"] <= v <= ranges["v_max"]
            
            if h_match and s_match and v_match:
                # Calculate how well it matches the center of the range
                h_center = (ranges["h_min"] + ranges["h_max"]) / 2
                s_center = (ranges["s_min"] + ranges["s_max"]) / 2
                v_center = (ranges["v_min"] + ranges["v_max"]) / 2
                
                h_diff = abs(h - h_center) / (ranges["h_max"] - ranges["h_min"])
                s_diff = abs(s - s_center) / (ranges["s_max"] - ranges["s_min"])
                v_diff = abs(v - v_center) / (ranges["v_max"] - ranges["v_min"])
                
                # Higher score = better match (closer to center)
                scores[color] = 1 - (h_diff * 0.5 + s_diff * 0.25 + v_diff * 0.25)
            else:
                # Partial match - check hue primarily
                if h_match:
                    scores[color] = 0.3
        
        return scores
    
    def predict(self, image) -> dict:
        """
        Predict fruit color using advanced analysis with:
        - Fruit segmentation to isolate from background
        - Spot detection to exclude brown/black spots
        - Multi-method color analysis (RGB, HSV, K-means)
        - Color distribution analysis for transitional fruits
        
        Args:
            image: Image path or numpy array
            
        Returns:
            Prediction result dictionary with color, confidence, and detailed analysis
        """
        import cv2
        import numpy as np
        from PIL import Image as PILImage
        
        # Load image
        if isinstance(image, str):
            img = cv2.imread(image)
            if img is None:
                raise ValueError(f"Could not load image: {image}")
        elif isinstance(image, PILImage.Image):
            img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        else:
            img = image
        
        # ================================================================
        # STEP 1: Segment the fruit from background
        # ================================================================
        fruit_mask = self._segment_fruit(img)
        
        # ================================================================
        # STEP 2: Detect spots (brown/black patches) on the fruit
        # ================================================================
        spots_mask, spot_coverage, spot_info = self._detect_spots(img, fruit_mask)
        
        # ================================================================
        # STEP 3: Create clean mask (fruit minus spots) for base color analysis
        # ================================================================
        clean_mask = self._create_clean_fruit_mask(fruit_mask, spots_mask)
        
        # ================================================================
        # STEP 4: Analyze color distribution (base color + spots separately)
        # ================================================================
        color_distribution = self._analyze_color_distribution(img, clean_mask, fruit_mask, spots_mask)
        
        # ================================================================
        # STEP 5: Direct RGB channel analysis on CLEAN region (no spots)
        # ================================================================
        rgb_scores = self._analyze_rgb_channels(img, clean_mask)
        
        # ================================================================
        # STEP 6: Get dominant color using K-means on CLEAN region
        # ================================================================
        dominant_bgr, all_centers, cluster_counts = self._get_dominant_color_kmeans(
            img, clean_mask, n_clusters=5
        )
        
        # Convert dominant color to HSV
        dominant_hsv = cv2.cvtColor(
            np.uint8([[dominant_bgr]]), cv2.COLOR_BGR2HSV
        )[0][0]
        
        # ================================================================
        # STEP 7: Classify using multiple methods and combine
        # ================================================================
        hsv_scores = self._classify_hsv_color(dominant_hsv)
        
        # Also analyze all cluster centers
        for i, center in enumerate(all_centers):
            center_hsv = cv2.cvtColor(
                np.uint8([[center]]), cv2.COLOR_BGR2HSV
            )[0][0]
            
            cluster_scores = self._classify_hsv_color(center_hsv)
            weight = cluster_counts[i] / sum(cluster_counts) if sum(cluster_counts) > 0 else 0
            
            for color in hsv_scores:
                hsv_scores[color] += cluster_scores[color] * weight * 0.3
        
        # ================================================================
        # STEP 8: Use zone distribution from color analysis if available
        # ================================================================
        zone_scores = {"green": 0.33, "yellow": 0.33, "brown": 0.34}
        if "zone_distribution" in color_distribution:
            zone = color_distribution["zone_distribution"]
            total = zone["green_percent"] + zone["yellow_percent"] + zone["brown_percent"]
            if total > 0:
                zone_scores = {
                    "green": zone["green_percent"] / total,
                    "yellow": zone["yellow_percent"] / total,
                    "brown": zone["brown_percent"] / total
                }
        
        # ================================================================
        # STEP 9: Combine all analysis methods with weighted scoring
        # ================================================================
        combined_scores = {}
        for color in ["green", "yellow", "brown"]:
            # Weight different methods:
            # - HSV analysis: 40% (dominant K-means color - most reliable for talisay)
            # - Zone distribution: 35% (pixel hue counting)
            # - RGB analysis: 25% (RGB channel ratios)
            combined_scores[color] = (
                hsv_scores.get(color, 0) * 0.40 +
                zone_scores.get(color, 0) * 0.35 +
                rgb_scores.get(color, 0) * 0.25
            )
        
        # ================================================================
        # STEP 10: Apply spot-based adjustments and heuristics
        # ================================================================
        base_analysis = color_distribution.get("base_color_analysis", {})
        h_mean = base_analysis.get("h_mean", 0)
        
        # If base hue is clearly in green range (H: 30-90), boost green score
        if 30 <= h_mean <= 90:
            # Stronger boost for clearer green hues
            if h_mean >= 40:
                combined_scores["green"] *= 1.4
            else:
                combined_scores["green"] *= 1.2
        
        # If fruit has significant spots but zone shows mostly green,
        # the spots are likely just natural blemishes on a green fruit
        if spot_coverage > 0.10:  # More than 10% spots
            if zone_scores.get("green", 0) > 0.5:  # Zone is majority green
                combined_scores["green"] *= 1.2
            
            # Reduce brown score if it's mostly coming from spots, not base color
            if zone_scores.get("green", 0) > zone_scores.get("brown", 0):
                combined_scores["brown"] *= 0.7
        
        # Handle borderline green/yellow cases using dominant hue
        # H=25-40 is the transition zone
        if 25 <= h_mean <= 40:
            # In transition zone, use zone distribution as tiebreaker
            if zone_scores.get("green", 0) > zone_scores.get("yellow", 0) * 1.1:
                # Zone clearly says green
                combined_scores["green"] *= 1.15
            elif zone_scores.get("yellow", 0) > zone_scores.get("green", 0) * 1.5:
                # Zone clearly says yellow (needs stronger signal)
                combined_scores["yellow"] *= 1.1
        
        # ================================================================
        # STEP 11: Normalize and get final prediction
        # ================================================================
        total_score = sum(combined_scores.values())
        if total_score > 0:
            combined_scores = {k: v / total_score for k, v in combined_scores.items()}
        else:
            combined_scores = self._fallback_analysis(img, fruit_mask)
        
        predicted_color = max(combined_scores, key=combined_scores.get)
        confidence = combined_scores[predicted_color]
        
        # ================================================================
        # STEP 12: Build comprehensive debug info
        # ================================================================
        white_bg_detected = getattr(self, '_white_bg_detected', False)
        white_coverage = getattr(self, '_white_coverage', 0.0)
        
        debug_info = {
            "dominant_hsv": dominant_hsv.tolist(),
            "dominant_bgr": dominant_bgr.tolist(),
            "fruit_pixels": int(np.sum(fruit_mask > 0)),
            "clean_pixels": int(np.sum(clean_mask > 0)),
            "total_pixels": int(img.shape[0] * img.shape[1]),
            "rgb_scores": rgb_scores,
            "hsv_scores": {k: round(v, 4) for k, v in hsv_scores.items()},
            "zone_scores": {k: round(v, 4) for k, v in zone_scores.items()},
            "white_background_detected": white_bg_detected,
            "white_coverage_percent": round(white_coverage * 100, 1) if white_bg_detected else 0,
            "spot_detection": {
                "spots_detected": spot_coverage > 0.02,
                "spot_coverage_percent": round(spot_coverage * 100, 1),
                "spot_details": spot_info
            },
            "color_distribution": color_distribution
        }
        
        return {
            "predicted_color": predicted_color,
            "confidence": round(confidence, 4),
            "probabilities": {k: round(v, 4) for k, v in combined_scores.items()},
            "maturity_stage": self._color_to_maturity(predicted_color),
            "has_spots": spot_coverage > 0.05,
            "spot_coverage_percent": round(spot_coverage * 100, 1),
            "debug_info": debug_info
        }
    
    def _analyze_rgb_channels(self, img, mask):
        """
        Analyze RGB channels directly to detect greenness.
        Enhanced for Talisay fruits which can be light green with spots.
        """
        import numpy as np
        import cv2
        
        # Extract masked pixels
        masked_pixels = img[mask > 0] if np.any(mask > 0) else img.reshape(-1, 3)
        
        if len(masked_pixels) < 10:
            return {"green": 0.33, "yellow": 0.33, "brown": 0.34}
        
        # Get average BGR values
        b_mean = np.mean(masked_pixels[:, 0])
        g_mean = np.mean(masked_pixels[:, 1])
        r_mean = np.mean(masked_pixels[:, 2])
        
        scores = {"green": 0, "yellow": 0, "brown": 0}
        
        # === GREEN DETECTION (more sensitive) ===
        # 1. Check if G channel is dominant (even slightly)
        green_dominance = g_mean - max(r_mean, b_mean)
        if green_dominance > 0:  # Any green dominance counts
            scores["green"] = min(1.0, 0.3 + (green_dominance / 25))
        
        # 2. Per-pixel green analysis with varying thresholds
        # Strict green: G > R and G > B
        strict_green = (masked_pixels[:, 1] > masked_pixels[:, 2]) & \
                       (masked_pixels[:, 1] > masked_pixels[:, 0])
        strict_green_ratio = np.sum(strict_green) / len(masked_pixels)
        
        # Relaxed green: G >= R (allowing for yellow-green)
        relaxed_green = (masked_pixels[:, 1] >= masked_pixels[:, 2] - 5) & \
                        (masked_pixels[:, 1] > masked_pixels[:, 0])
        relaxed_green_ratio = np.sum(relaxed_green) / len(masked_pixels)
        
        # Weight strict green more but include relaxed
        scores["green"] += strict_green_ratio * 0.4 + relaxed_green_ratio * 0.2
        
        # 3. Check green-to-red ratio (important for Talisay)
        # Immature Talisay: G/R > 1.0
        # Transitioning: G/R ≈ 1.0
        # Mature yellow: G/R < 1.0
        if r_mean > 0:
            gr_ratio = g_mean / r_mean
            if gr_ratio > 1.05:  # Clearly more green
                scores["green"] += 0.3
            elif gr_ratio > 0.98:  # Almost equal (greenish-yellow)
                scores["green"] += 0.15
        
        # === YELLOW DETECTION ===
        # Yellow: R and G are similar and both higher than B
        # True yellow has R slightly higher or equal to G
        rg_similar = abs(r_mean - g_mean) < 30
        both_high = r_mean > b_mean and g_mean > b_mean
        r_slightly_higher = r_mean >= g_mean - 5
        
        if rg_similar and both_high and r_slightly_higher:
            yellow_score = 1 - abs(r_mean - g_mean) / 60
            scores["yellow"] = max(0, yellow_score * 0.6)
            
            # Strong yellow signal if R clearly > G
            if r_mean > g_mean + 10:
                scores["yellow"] += 0.3
        
        # === BROWN DETECTION ===
        # Brown: R > G > B with lower saturation/value
        if r_mean > g_mean > b_mean:
            # Brightness check - brown is typically darker
            avg_brightness = (r_mean + g_mean + b_mean) / 3
            saturation_proxy = (max(r_mean, g_mean, b_mean) - min(r_mean, g_mean, b_mean)) / 255
            
            if saturation_proxy < 0.4 and avg_brightness < 180:
                brown_score = (r_mean - g_mean) / 50
                scores["brown"] = min(1.0, max(0, brown_score * 0.8))
        
        # === Normalize scores ===
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        else:
            scores = {"green": 0.33, "yellow": 0.33, "brown": 0.34}
        
        return scores
    
    def _fallback_analysis(self, img, mask):
        """
        Fallback color analysis using direct HSV range matching on masked pixels.
        """
        import cv2
        import numpy as np
        
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        scores = {}
        masked_hsv = hsv[mask > 0] if np.any(mask > 0) else hsv.reshape(-1, 3)
        total_pixels = len(masked_hsv)
        
        for color, ranges in self.color_ranges.items():
            lower = np.array([ranges["h_min"], ranges["s_min"], ranges["v_min"]])
            upper = np.array([ranges["h_max"], ranges["s_max"], ranges["v_max"]])
            
            # Count pixels in range
            in_range = np.all((masked_hsv >= lower) & (masked_hsv <= upper), axis=1)
            scores[color] = np.sum(in_range) / max(total_pixels, 1)
        
        # Normalize
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        else:
            scores = {"green": 0.34, "yellow": 0.33, "brown": 0.33}
        
        return scores
    
    def _color_to_maturity(self, color: str) -> str:
        mapping = {
            "green": "Immature",
            "yellow": "Mature (Optimal)",
            "brown": "Fully Ripe"
        }
        return mapping.get(color, "Unknown")


if __name__ == "__main__":
    # Test simple classifier
    print("Testing Simple Color Classifier...")
    classifier = SimpleColorClassifier()
    
    # Create test image (yellow-ish)
    import numpy as np
    test_img = np.full((100, 100, 3), [40, 180, 200], dtype=np.uint8)  # Yellow in BGR
    
    result = classifier.predict(test_img)
    print(f"Prediction: {result}")
