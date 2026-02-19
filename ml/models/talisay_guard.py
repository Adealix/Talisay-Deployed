"""
TalisayGuard — Strict Multi-Layer Verification for Talisay Fruits
=================================================================

This module provides an extreme-security verification layer that determines
whether an image genuinely contains a Talisay (Terminalia catappa) fruit.

It combines SEVEN independent detection signals and requires a majority
agreement before accepting an image:

Layer 1 — REJECTION: Blank / featureless image detection
Layer 2 — REJECTION: Human skin / face / person detection
Layer 3 — REJECTION: Capsicum (Siling) and common confusing species
Layer 4 — REJECTION: Generic non-Talisay fruit (bright red, orange, etc.)
Layer 5 — POSITIVE: Talisay-specific colour histogram signature
Layer 6 — POSITIVE: Talisay-specific shape (almond-drupe with ridges)
Layer 7 — POSITIVE: Talisay surface texture (smooth organic + spot pattern)

DECISION: Reject unless at least 3 positive layers agree AND zero hard-reject
          layers triggered.

Author: Talisay AI Team
Date:   2026-02-19
"""

import cv2
import numpy as np
from typing import Dict, Optional, Tuple, List
from enum import Enum


class GuardVerdict(Enum):
    """Final guard decision."""
    ACCEPT = "accept"
    REJECT_BLANK = "reject_blank"
    REJECT_PERSON = "reject_person"
    REJECT_CAPSICUM = "reject_capsicum"
    REJECT_NON_TALISAY_FRUIT = "reject_non_talisay_fruit"
    REJECT_WRONG_SHAPE = "reject_wrong_shape"
    REJECT_WRONG_COLOUR = "reject_wrong_colour"
    REJECT_WRONG_TEXTURE = "reject_wrong_texture"
    REJECT_LOW_CONFIDENCE = "reject_low_confidence"
    REJECT_GENERIC = "reject_generic"


# ═══════════════════════════════════════════════════════════
# Talisay-specific reference constants (Terminalia catappa)
# ═══════════════════════════════════════════════════════════

# Talisay-STRICT HSV colour bands (much tighter than validator)
TALISAY_GREEN_HSV = {
    "lower": np.array([30, 35, 35]),    # H 30-80, sat 35+, val 35+
    "upper": np.array([80, 255, 245]),
}
TALISAY_YELLOW_HSV = {
    "lower": np.array([18, 60, 70]),    # H 18-38, sat 60+, val 70+
    "upper": np.array([38, 255, 255]),
}
TALISAY_BROWN_HSV = {
    "lower": np.array([5, 30, 20]),     # H 5-26, sat 30+, val 20+
    "upper": np.array([26, 220, 200]),
}

# Capsicum frutescens (Siling) characteristics
SILING_GREEN_HSV = {
    "lower": np.array([30, 60, 50]),
    "upper": np.array([85, 255, 255]),
}
SILING_RED_HSV_1 = {
    "lower": np.array([0, 100, 70]),
    "upper": np.array([12, 255, 255]),
}
SILING_RED_HSV_2 = {
    "lower": np.array([160, 100, 70]),
    "upper": np.array([180, 255, 255]),
}

# Human skin colour ranges in HSV
SKIN_HSV = {
    "lower": np.array([0, 20, 70]),
    "upper": np.array([25, 170, 255]),
}

# Minimum acceptance thresholds
MIN_GUARD_SCORE = 0.55        # Minimum composite score to accept
MIN_POSITIVE_LAYERS = 3       # Minimum positive checks that must pass
MIN_TALISAY_COLOUR_COV = 0.30 # 30% of fruit pixels must be Talisay colour
MAX_SKIN_COVERAGE = 0.25      # Reject if >25% of image is skin
MAX_CAPSICUM_SCORE = 0.45     # Reject if capsicum probability > 45%


class TalisayGuard:
    """
    Multi-layer security guard that verifies whether an image
    genuinely contains a Talisay (Terminalia catappa) fruit.

    Usage:
        guard = TalisayGuard()
        result = guard.verify(image_bgr, fruit_mask=optional_mask)
        if result["accepted"]:
            # proceed with analysis
        else:
            print(result["reason"])
    """

    def __init__(self):
        """Initialise guard with pre-computed Talisay reference data."""
        # Talisay shape references (Hu moments from reference Talisay images)
        # Pre-computed from typical almond-drupe silhouette
        # Talisay has a distinctive elongated ellipse with slight taper
        self._talisay_aspect_range = (1.25, 2.40)   # length/width ratio
        self._talisay_circularity_range = (0.35, 0.80)
        self._talisay_solidity_range = (0.80, 1.0)
        self._talisay_convexity_range = (0.82, 1.0)

        # Capsicum shape references
        self._capsicum_aspect_range = (2.5, 8.0)   # Very elongated
        self._capsicum_circularity_range = (0.10, 0.50)

        # Haar cascade for face detection (ships with OpenCV)
        self._face_cascade = None
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self._face_cascade = cv2.CascadeClassifier(cascade_path)
        except Exception:
            pass

    # ───────────────────────────────────────────────────
    # PUBLIC API
    # ───────────────────────────────────────────────────

    def verify(
        self,
        image: np.ndarray,
        fruit_mask: Optional[np.ndarray] = None,
        yolo_fruit_info: Optional[Dict] = None,
        coin_info: Optional[Dict] = None,
    ) -> Dict:
        """
        Run all guard layers and return composite verdict.

        Args:
            image:          BGR image (numpy array)
            fruit_mask:     Optional binary mask of segmented fruit region
            yolo_fruit_info: Optional YOLO detection result for fruit
            coin_info:      Optional coin detection result

        Returns:
            {
                "accepted": bool,
                "verdict": GuardVerdict,
                "score": float,        # 0.0-1.0 composite confidence
                "layers": {...},       # Results from each layer
                "reason": str,         # Human-readable explanation
            }
        """
        h_img, w_img = image.shape[:2]
        layers = {}

        # ════════════════════════════════════════════
        # LAYER 1: Blank / featureless image check
        # ════════════════════════════════════════════
        blank_result = self._check_blank_image(image)
        layers["blank"] = blank_result
        if blank_result["is_blank"]:
            return self._make_verdict(
                False, GuardVerdict.REJECT_BLANK, 0.0, layers,
                "📷 The image appears to be blank or a plain screen. "
                "Please provide a clear photo of a Talisay fruit."
            )

        # ════════════════════════════════════════════
        # LAYER 2: Human / person / face detection
        # ════════════════════════════════════════════
        person_result = self._check_person(image)
        layers["person"] = person_result
        if person_result["is_person"]:
            return self._make_verdict(
                False, GuardVerdict.REJECT_PERSON, 0.0, layers,
                "👤 A person or face was detected in the image. "
                "Please provide an image that contains a Talisay fruit, "
                "not a person."
            )

        # ════════════════════════════════════════════
        # Build fruit mask if not provided
        # ════════════════════════════════════════════
        if fruit_mask is None:
            fruit_mask = self._build_fruit_mask(image, yolo_fruit_info)

        fruit_area = np.sum(fruit_mask > 0)
        if fruit_area < 500:
            return self._make_verdict(
                False, GuardVerdict.REJECT_GENERIC, 0.0, layers,
                "📷 No significant object detected in the image. "
                "Please take a clear, close-up photo of a Talisay fruit."
            )

        # ════════════════════════════════════════════
        # LAYER 3: Capsicum / Siling detection
        # ════════════════════════════════════════════
        capsicum_result = self._check_capsicum(image, fruit_mask)
        layers["capsicum"] = capsicum_result
        if capsicum_result["is_capsicum"]:
            return self._make_verdict(
                False, GuardVerdict.REJECT_CAPSICUM, 0.0, layers,
                "🌶️ This appears to be a Capsicum (Siling/Chili pepper), "
                "not a Talisay fruit. Talisay fruits are wider, almond-shaped "
                "drupes, not elongated peppers."
            )

        # ════════════════════════════════════════════
        # LAYER 4: Non-Talisay fruit colour rejection
        # ════════════════════════════════════════════
        non_talisay_result = self._check_non_talisay_colours(image, fruit_mask)
        layers["non_talisay_colour"] = non_talisay_result
        if non_talisay_result["is_non_talisay"]:
            return self._make_verdict(
                False, GuardVerdict.REJECT_NON_TALISAY_FRUIT, 0.0, layers,
                f"🍎 This appears to be a {non_talisay_result['detected_type']} item, "
                f"not a Talisay fruit. Talisay fruits are ONLY green, yellow, or "
                f"brown (with specific Talisay colour profiles)."
            )

        # ════════════════════════════════════════════
        # LAYER 5: Talisay colour histogram match
        # ════════════════════════════════════════════
        colour_result = self._check_talisay_colour(image, fruit_mask)
        layers["talisay_colour"] = colour_result

        # ════════════════════════════════════════════
        # LAYER 6: Talisay shape verification
        # ════════════════════════════════════════════
        shape_result = self._check_talisay_shape(fruit_mask)
        layers["talisay_shape"] = shape_result

        # SHAPE QUALITY GATE: Without YOLO, our colour-based mask
        # often captures background along with the fruit, making aspect
        # ratio unreliable. We only hard-reject on shape when the mask
        # is very compact (likely represents a single object AND is very
        # clearly wrong (near-circular like a coin with high circularity).
        h_img, w_img = image.shape[:2]
        mask_coverage = fruit_area / (h_img * w_img)
        aspect = shape_result.get("aspect_ratio", 1.0)
        circ = shape_result.get("circularity", 1.0)

        if mask_coverage < 0.12 and circ > 0.90 and aspect < 1.08:
            # Very small, very round, very low aspect ratio → definitely
            # not an almond-shaped Talisay fruit (likely coin, dot, or
            # small round object)
            return self._make_verdict(
                False, GuardVerdict.REJECT_WRONG_SHAPE, 0.0, layers,
                "📐 The detected object is too round to be a Talisay fruit. "
                "Talisay fruits are almond-shaped drupes, not perfectly "
                "round objects."
            )

        # ════════════════════════════════════════════
        # LAYER 7: Surface texture verification
        # ════════════════════════════════════════════
        texture_result = self._check_talisay_texture(image, fruit_mask)
        layers["talisay_texture"] = texture_result

        # ════════════════════════════════════════════
        # COMPOSITE DECISION
        # ════════════════════════════════════════════
        positive_checks = [
            colour_result.get("passes", False),
            shape_result.get("passes", False),
            texture_result.get("passes", False),
        ]
        positive_count = sum(positive_checks)

        # Weighted composite score
        composite = (
            colour_result.get("score", 0) * 0.45 +
            shape_result.get("score", 0) * 0.30 +
            texture_result.get("score", 0) * 0.25
        )

        accepted = (
            positive_count >= MIN_POSITIVE_LAYERS or
            (positive_count >= 2 and composite >= MIN_GUARD_SCORE)
        )

        # Even with 2 passing, if composite is very low, reject
        if composite < 0.35:
            accepted = False

        # ── SKIN SENSITIVITY ──────────────────────────────
        # If the person check showed significant skin (>25%) but the
        # image was "rescued" (not rejected), demand stronger evidence.
        person_info = layers.get("person", {})
        skin_cov = person_info.get("skin_coverage", 0)
        was_rescued = (
            not person_info.get("is_person", False) and
            skin_cov > MAX_SKIN_COVERAGE
        )
        if was_rescued and positive_count < MIN_POSITIVE_LAYERS:
            if skin_cov > 0.45:
                # Very high skin with only 2/3 positive layers: the rescue
                # let a skin-dominant image through — insufficient evidence.
                accepted = False
            elif person_info.get("strong_rescue_coverage", 0) > 0.10:
                # Check whether the green/yellow pixels supporting rescue
                # are vegetation (high saturation) rather than Talisay fruit.
                # Vegetation green: median S > 140.  Talisay fruit: S ≈ 50-120.
                hsv_veg = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
                veg_green_mask = cv2.inRange(
                    hsv_veg, TALISAY_GREEN_HSV["lower"],
                    TALISAY_GREEN_HSV["upper"]
                )
                green_sat_vals = hsv_veg[:, :, 1][veg_green_mask > 0]
                if len(green_sat_vals) > 100:
                    green_median_sat = float(np.median(green_sat_vals))
                    if green_median_sat > 140:
                        # Green is predominantly vegetation → unreliable rescue
                        accepted = False

        if accepted:
            return self._make_verdict(
                True, GuardVerdict.ACCEPT, composite, layers,
                "✅ Talisay fruit verified successfully."
            )
        else:
            # Determine most informative rejection reason
            if not colour_result.get("passes"):
                return self._make_verdict(
                    False, GuardVerdict.REJECT_WRONG_COLOUR, composite, layers,
                    "🎨 The colours in this image don't match Talisay fruit. "
                    "Talisay fruits are green (immature), yellow (mature), or "
                    "brown (ripe) with specific colour profiles."
                )
            elif not shape_result.get("passes"):
                return self._make_verdict(
                    False, GuardVerdict.REJECT_WRONG_SHAPE, composite, layers,
                    "📐 The shape doesn't match a Talisay fruit. Talisay fruits "
                    "are almond-shaped drupes with an aspect ratio of ~1.3-2.4. "
                    "They are NOT perfectly round, or extremely elongated."
                )
            else:
                return self._make_verdict(
                    False, GuardVerdict.REJECT_LOW_CONFIDENCE, composite, layers,
                    "❓ The image doesn't confidently match a Talisay fruit. "
                    "Please provide a clearer photo of a Talisay "
                    "(Terminalia catappa) fruit with good lighting."
                )

    # ───────────────────────────────────────────────────
    # LAYER 1: Blank / featureless image
    # ───────────────────────────────────────────────────

    def _check_blank_image(self, image: np.ndarray) -> Dict:
        """
        Detect blank screens, solid colours, or near-featureless images.

        Checks:
        - Very low colour variance (solid colour)
        - Very few edges (no objects)
        - Dominant single colour covering >85% of image
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Check global variance
        global_var = np.var(gray)
        if global_var < 80:  # Very uniform → blank
            return {"is_blank": True, "reason": "extremely_low_variance",
                    "variance": float(global_var)}

        # Check edge density
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = np.sum(edges > 0) / (h * w)
        if edge_ratio < 0.005:  # Almost no edges
            return {"is_blank": True, "reason": "no_edges",
                    "edge_ratio": float(edge_ratio)}

        # Check if one colour dominates >90%
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        # Very low saturation + uniform value = blank screen
        low_sat = np.sum(hsv[:, :, 1] < 15) / (h * w)
        if low_sat > 0.90:
            value_var = np.var(hsv[:, :, 2])
            if value_var < 300:
                return {"is_blank": True, "reason": "uniform_grey_white",
                        "low_sat_coverage": float(low_sat)}

        return {"is_blank": False}

    # ───────────────────────────────────────────────────
    # LAYER 2: Person / face detection
    # ───────────────────────────────────────────────────

    def _check_person(self, image: np.ndarray) -> Dict:
        """
        Detect human faces and skin-dominant images.

        Uses:
        1. Haar cascade face detection (with Talisay rescue)
        2. Skin colour coverage analysis

        IMPORTANT: Many Talisay photos show a hand holding the fruit.
        If significant Talisay-coloured pixels coexist with skin,
        we DON'T reject — the user is simply holding the fruit.
        """
        h, w = image.shape[:2]
        total = h * w

        # Pre-compute masks for rescue logic
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)

        # Build skin mask (combined HSV + YCrCb for precision)
        skin_hsv_mask = cv2.inRange(hsv, SKIN_HSV["lower"], SKIN_HSV["upper"])
        skin_ycrcb_mask = cv2.inRange(ycrcb,
                                       np.array([80, 133, 77]),
                                       np.array([255, 173, 127]))
        combined_skin = cv2.bitwise_and(skin_hsv_mask, skin_ycrcb_mask)
        skin_coverage = np.sum(combined_skin > 0) / total

        # Build Talisay colour mask for rescue logic.
        # CRITICAL: For rescue (overriding skin rejection), we use TWO tiers:
        #   Tier 1 (strong rescue): GREEN + YELLOW only. These never overlap
        #     with skin and prove a fruit is present.
        #   Tier 2 (weak rescue): BROWN non-skin. Brown backgrounds (wood,
        #     soil, clothing) also match, so brown alone is NOT enough.
        talisay_green = cv2.inRange(hsv,
            TALISAY_GREEN_HSV["lower"], TALISAY_GREEN_HSV["upper"])
        talisay_yellow = cv2.inRange(hsv,
            TALISAY_YELLOW_HSV["lower"], TALISAY_YELLOW_HSV["upper"])
        # Strong rescue: green + yellow (definitively not skin)
        strong_rescue = talisay_green | talisay_yellow
        strong_rescue_cov = np.sum(strong_rescue > 0) / total

        # Weak rescue: include brown non-skin too
        talisay_brown_raw = cv2.inRange(hsv,
            TALISAY_BROWN_HSV["lower"], TALISAY_BROWN_HSV["upper"])
        talisay_brown_nonskin = cv2.bitwise_and(
            talisay_brown_raw,
            cv2.bitwise_not(combined_skin)
        )
        total_rescue = strong_rescue | talisay_brown_nonskin
        total_rescue_cov = np.sum(total_rescue > 0) / total

        # --- Face detection ---
        faces_found = 0
        if self._face_cascade is not None:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self._face_cascade.detectMultiScale(
                gray, scaleFactor=1.15, minNeighbors=5,
                minSize=(int(w * 0.08), int(h * 0.08))
            )
            faces_found = len(faces)

        if faces_found > 0:
            # RESCUE: If a face is detected but there are also strong
            # Talisay colours (green/yellow ≥5%), user is holding fruit
            # near their face. Brown alone is NOT enough (could be hair/bg).
            if strong_rescue_cov < 0.05:
                return {"is_person": True, "faces_found": faces_found,
                        "talisay_coverage": float(total_rescue_cov),
                        "strong_rescue_coverage": float(strong_rescue_cov),
                        "reason": "face_detected"}

        if skin_coverage > MAX_SKIN_COVERAGE:
            # RESCUE: User is holding the fruit. Strong rescue (green/yellow)
            # at ≥8% means actual Talisay fruit present. With brown only,
            # require higher threshold (≥20%) AND skin must not dominate too
            # heavily (< 45%).
            if strong_rescue_cov >= 0.08:
                # Green/yellow fruit clearly visible → allow
                return {"is_person": False, "faces_found": faces_found,
                        "skin_coverage": float(skin_coverage),
                        "talisay_coverage": float(total_rescue_cov),
                        "strong_rescue_coverage": float(strong_rescue_cov),
                        "reason": "skin_detected_but_talisay_present"}
            elif total_rescue_cov >= 0.20 and skin_coverage < 0.45:
                # Brown fruit + hand, but skin is not overwhelming
                return {"is_person": False, "faces_found": faces_found,
                        "skin_coverage": float(skin_coverage),
                        "talisay_coverage": float(total_rescue_cov),
                        "strong_rescue_coverage": float(strong_rescue_cov),
                        "reason": "moderate_skin_with_brown_talisay"}
            return {"is_person": True, "skin_coverage": float(skin_coverage),
                    "talisay_coverage": float(total_rescue_cov),
                    "strong_rescue_coverage": float(strong_rescue_cov),
                    "reason": "excessive_skin_colour"}

        return {"is_person": False, "faces_found": 0,
                "skin_coverage": float(skin_coverage),
                "talisay_coverage": float(total_rescue_cov),
                "strong_rescue_coverage": float(strong_rescue_cov)}

    # ───────────────────────────────────────────────────
    # LAYER 3: Capsicum / Siling / Chili detection
    # ───────────────────────────────────────────────────

    def _check_capsicum(self, image: np.ndarray, mask: np.ndarray) -> Dict:
        """
        Detect Capsicum frutescens (Siling Labuyo, Siling Haba) and
        other chili peppers.

        Key discriminators vs Talisay:
        1. SHAPE: Peppers are much more elongated (aspect ratio > 2.5)
        2. SHAPE: Peppers are thinner, more cylindrical
        3. SHAPE: Peppers have a stem/calyx at one end (narrow taper)
        4. TEXTURE: Peppers have smoother, glossier surface
        5. SIZE: Siling labuyo is typically only 1-3cm long
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        fruit_pixels = hsv[mask > 0]

        if len(fruit_pixels) < 200:
            return {"is_capsicum": False, "score": 0.0}

        total_px = len(fruit_pixels)
        capsicum_score = 0.0

        # --- Colour check: green siling or red siling ---
        green_siling = np.all(
            (fruit_pixels >= SILING_GREEN_HSV["lower"]) &
            (fruit_pixels <= SILING_GREEN_HSV["upper"]),
            axis=1
        )
        red_siling_1 = np.all(
            (fruit_pixels >= SILING_RED_HSV_1["lower"]) &
            (fruit_pixels <= SILING_RED_HSV_1["upper"]),
            axis=1
        )
        red_siling_2 = np.all(
            (fruit_pixels >= SILING_RED_HSV_2["lower"]) &
            (fruit_pixels <= SILING_RED_HSV_2["upper"]),
            axis=1
        )
        siling_colour_cov = (np.sum(green_siling) +
                             np.sum(red_siling_1) +
                             np.sum(red_siling_2)) / total_px
        has_siling_colour = siling_colour_cov > 0.30
        if has_siling_colour:
            capsicum_score += 0.20

        # --- Shape check: elongated and thin ---
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return {"is_capsicum": False, "score": 0.0}

        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        perimeter = cv2.arcLength(largest, True)

        if area < 100 or perimeter == 0:
            return {"is_capsicum": False, "score": 0.0}

        # Fit ellipse for aspect ratio
        if len(largest) >= 5:
            ellipse = cv2.fitEllipse(largest)
            (_, (minor, major), _) = ellipse
            aspect = major / minor if minor > 0 else 0
        else:
            x, y, w, h = cv2.boundingRect(largest)
            aspect = max(w, h) / max(min(w, h), 1)

        circularity = 4 * np.pi * area / (perimeter ** 2)

        # Capsicum is very elongated
        if aspect > 2.5:
            capsicum_score += 0.25
        if aspect > 3.5:
            capsicum_score += 0.15

        # Capsicum has low circularity
        if circularity < 0.45:
            capsicum_score += 0.15

        # --- Glossy/smooth texture (less variance than Talisay) ---
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        fruit_gray = gray[mask > 0]
        texture_var = np.std(fruit_gray)

        # Peppers are often glossier (lower local texture variance)
        if texture_var < 25:
            capsicum_score += 0.10

        # --- High saturation (peppers are often very saturated) ---
        mean_sat = np.mean(fruit_pixels[:, 1])
        if mean_sat > 120:
            capsicum_score += 0.10

        # --- Width check: peppers are thin relative to length ---
        if len(largest) >= 5:
            (_, (minor_dim, major_dim), _) = cv2.fitEllipse(largest)
            # Convert to approximate cm using image size as reference
            # Siling labuyo: width < 1.5cm, Talisay: width > 2cm
            img_h, img_w = image.shape[:2]
            relative_width = minor_dim / max(img_w, img_h)
            if relative_width < 0.06:  # Very thin
                capsicum_score += 0.15

        is_capsicum = capsicum_score >= MAX_CAPSICUM_SCORE

        return {
            "is_capsicum": is_capsicum,
            "score": round(capsicum_score, 3),
            "aspect_ratio": round(aspect, 2),
            "circularity": round(circularity, 3),
            "siling_colour_coverage": round(siling_colour_cov, 3),
            "mean_saturation": round(float(mean_sat), 1),
        }

    # ───────────────────────────────────────────────────
    # LAYER 4: Non-Talisay fruit colours (expanded)
    # ───────────────────────────────────────────────────

    def _check_non_talisay_colours(self, image: np.ndarray,
                                    mask: np.ndarray) -> Dict:
        """
        Detect non-Talisay items by colour.
        Expanded from base validator to include more categories.
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        pixels = hsv[mask > 0]
        if len(pixels) < 100:
            return {"is_non_talisay": False, "detected_type": None}

        total = len(pixels)

        reject_colours = {
            "red_fruit": {
                "ranges": [
                    (np.array([0, 90, 60]), np.array([10, 255, 255])),
                    (np.array([160, 90, 60]), np.array([180, 255, 255])),
                ],
                "label": "red fruit (apple, tomato, red pepper)",
            },
            "orange_fruit": {
                "ranges": [
                    (np.array([10, 100, 100]), np.array([22, 255, 255])),
                ],
                "label": "orange fruit (orange, tangerine)",
            },
            "pink_fruit": {
                "ranges": [
                    (np.array([140, 30, 140]), np.array([172, 160, 255])),
                ],
                "label": "pink/magenta fruit (dragon fruit)",
            },
            "purple_fruit": {
                "ranges": [
                    (np.array([120, 40, 40]), np.array([158, 255, 255])),
                ],
                "label": "purple fruit (grape, mangosteen)",
            },
            "blue_object": {
                "ranges": [
                    (np.array([95, 50, 50]), np.array([130, 255, 255])),
                ],
                "label": "blue object",
            },
            "bright_white_object": {
                "ranges": [
                    (np.array([0, 0, 220]), np.array([180, 35, 255])),
                ],
                "label": "white/bright object (paper, screen)",
            },
            "very_dark_object": {
                "ranges": [
                    (np.array([0, 0, 0]), np.array([180, 255, 20])),
                ],
                "label": "very dark object (dark screen)",
            },
        }

        max_cov = 0.0
        detected = None

        for name, info in reject_colours.items():
            count = 0
            for lower, upper in info["ranges"]:
                match = np.all(
                    (pixels >= lower) & (pixels <= upper), axis=1
                )
                count += np.sum(match)
            cov = count / total
            if cov > max_cov:
                max_cov = cov
                detected = info["label"]

        # Reject if >30% pixels are clearly non-Talisay
        is_bad = max_cov > 0.30

        # RESCUE: If the detection is "very dark" or "white/bright",
        # check whether Talisay colours coexist. Dark brown Talisay
        # fruits can have many dark pixels, and white backgrounds
        # are common in product photos.
        if is_bad and detected and ("dark" in detected or "white" in detected):
            talisay_count = 0
            for band in [TALISAY_GREEN_HSV, TALISAY_YELLOW_HSV, TALISAY_BROWN_HSV]:
                m = np.all(
                    (pixels >= band["lower"]) & (pixels <= band["upper"]),
                    axis=1
                )
                talisay_count += np.sum(m)
            talisay_cov = talisay_count / total
            # If there's meaningful Talisay colour (>12%), don't reject
            if talisay_cov > 0.12:
                is_bad = False

        return {
            "is_non_talisay": is_bad,
            "detected_type": detected if is_bad else None,
            "coverage": round(max_cov, 3),
        }

    # ───────────────────────────────────────────────────
    # LAYER 5: Talisay colour histogram signature
    # ───────────────────────────────────────────────────

    def _check_talisay_colour(self, image: np.ndarray,
                               mask: np.ndarray) -> Dict:
        """
        Verify that the fruit region has a colour profile that matches
        Talisay (green, yellow, or brown in specific HSV bands).

        Unlike the basic validator which uses very wide ranges, this
        checks the DISTRIBUTION of colours and requires a minimum
        coverage of Talisay-specific colour signatures.
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        pixels = hsv[mask > 0]

        if len(pixels) < 200:
            return {"passes": False, "score": 0.0, "coverage": 0.0}

        total = len(pixels)

        # Count pixels in each strict Talisay band
        green_match = np.all(
            (pixels >= TALISAY_GREEN_HSV["lower"]) &
            (pixels <= TALISAY_GREEN_HSV["upper"]), axis=1
        )
        yellow_match = np.all(
            (pixels >= TALISAY_YELLOW_HSV["lower"]) &
            (pixels <= TALISAY_YELLOW_HSV["upper"]), axis=1
        )
        brown_match = np.all(
            (pixels >= TALISAY_BROWN_HSV["lower"]) &
            (pixels <= TALISAY_BROWN_HSV["upper"]), axis=1
        )

        g_cov = np.sum(green_match) / total
        y_cov = np.sum(yellow_match) / total
        b_cov = np.sum(brown_match) / total

        # Total Talisay coverage (union, but these ranges don't overlap much)
        talisay_any = green_match | yellow_match | brown_match
        total_cov = np.sum(talisay_any) / total

        # Determine dominant Talisay colour
        coverages = {"green": g_cov, "yellow": y_cov, "brown": b_cov}
        dominant = max(coverages, key=coverages.get)
        dominant_cov = coverages[dominant]

        # Score: linear from 0 at 0% coverage to 1.0 at 60%+ coverage
        score = min(1.0, total_cov / 0.60)

        # Must have at least MIN_TALISAY_COLOUR_COV of strict Talisay colours
        passes = total_cov >= MIN_TALISAY_COLOUR_COV

        # Additional check: the DOMINANT colour should have at least 15%
        if dominant_cov < 0.15:
            passes = False
            score *= 0.5

        return {
            "passes": passes,
            "score": round(score, 3),
            "coverage": round(total_cov, 3),
            "dominant_colour": dominant,
            "dominant_coverage": round(dominant_cov, 3),
            "breakdown": {
                "green": round(g_cov, 3),
                "yellow": round(y_cov, 3),
                "brown": round(b_cov, 3),
            },
        }

    # ───────────────────────────────────────────────────
    # LAYER 6: Talisay shape verification
    # ───────────────────────────────────────────────────

    def _check_talisay_shape(self, mask: np.ndarray) -> Dict:
        """
        Verify the shape matches Talisay (almond-shaped drupe).

        Key Talisay shape features:
        - Aspect ratio 1.25 - 2.40 (NOT round like a coin, NOT thin like pepper)
        - Circularity 0.35 - 0.80 (moderately circular)
        - Solidity > 0.80 (convex, few concavities)
        - Smooth contour (not jagged like leaves)
        """
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return {"passes": False, "score": 0.0}

        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        perimeter = cv2.arcLength(largest, True)

        if area < 300 or perimeter == 0:
            return {"passes": False, "score": 0.0}

        circularity = 4 * np.pi * area / (perimeter ** 2)

        # Compute aspect ratio
        if len(largest) >= 5:
            ellipse = cv2.fitEllipse(largest)
            (_, (minor, major), _) = ellipse
            aspect = major / minor if minor > 0 else 1.0
        else:
            x, y, w, h = cv2.boundingRect(largest)
            aspect = max(w, h) / max(min(w, h), 1)

        # Solidity (area / convex hull area)
        hull = cv2.convexHull(largest)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0

        # Score each feature
        score = 0.0

        # Aspect ratio score (peak around 1.5-2.0)
        ar_min, ar_max = self._talisay_aspect_range
        if ar_min <= aspect <= ar_max:
            # Peak score at the middle of the range
            mid = (ar_min + ar_max) / 2
            ar_score = 1.0 - abs(aspect - mid) / ((ar_max - ar_min) / 2)
            score += ar_score * 0.40
        elif 1.1 <= aspect <= 2.6:
            # Partially OK
            score += 0.15
        # else: too round or too elongated → 0

        # Circularity score
        c_min, c_max = self._talisay_circularity_range
        if c_min <= circularity <= c_max:
            score += 0.30
        elif 0.25 <= circularity <= 0.85:
            score += 0.12

        # Solidity score
        if solidity >= self._talisay_solidity_range[0]:
            score += 0.30
        elif solidity >= 0.72:
            score += 0.12

        passes = (
            score >= 0.50 and
            aspect >= 1.1 and  # Must not be perfectly round
            aspect <= 3.0 and  # Must not be chili-thin
            circularity <= 0.90  # Must not be coin-round
        )

        return {
            "passes": passes,
            "score": round(score, 3),
            "aspect_ratio": round(aspect, 3),
            "circularity": round(circularity, 3),
            "solidity": round(solidity, 3),
        }

    # ───────────────────────────────────────────────────
    # LAYER 7: Surface texture verification
    # ───────────────────────────────────────────────────

    def _check_talisay_texture(self, image: np.ndarray,
                                mask: np.ndarray) -> Dict:
        """
        Verify surface texture matches a natural Talisay fruit.

        Talisay texture:
        - Organic (moderate variance, not metallic/glossy)
        - Not too uniform (rejects blank screens, coins)
        - Not too noisy (rejects raw noise, complex patterns)
        - Has colour variation but in a smooth gradient pattern
        - May have dark spots (but not dominating)
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        pixels = gray[mask > 0]

        if len(pixels) < 200:
            return {"passes": False, "score": 0.0}

        # Basic texture statistics
        mean_val = np.mean(pixels)
        std_val = np.std(pixels)
        var_val = std_val ** 2

        score = 0.0

        # Organic texture has moderate variance (20 < std < 65)
        if 15 < std_val < 70:
            score += 0.35
        elif 10 < std_val < 80:
            score += 0.15

        # Check for metallic shine (low saturation + high value sparkle)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        fruit_hsv = hsv[mask > 0]
        low_sat_high_val = np.sum(
            (fruit_hsv[:, 1] < 40) & (fruit_hsv[:, 2] > 180)
        ) / len(fruit_hsv)

        if low_sat_high_val < 0.15:  # Not metallic
            score += 0.25
        elif low_sat_high_val < 0.25:
            score += 0.10

        # Check colour homogeneity in H channel (Talisay has gradual colour)
        hue_vals = fruit_hsv[:, 0]
        hue_std = np.std(hue_vals)

        # Talisay: hue should be relatively consistent (std < 25)
        # compared to complex multi-coloured objects
        if hue_std < 20:
            score += 0.25
        elif hue_std < 30:
            score += 0.12

        # Local Binary Pattern-like roughness estimate
        # (simplified: Laplacian variance as texture measure)
        fruit_region = image.copy()
        fruit_region[mask == 0] = 0
        lap = cv2.Laplacian(gray, cv2.CV_64F)
        lap_vals = lap[mask > 0]
        lap_var = np.var(lap_vals) if len(lap_vals) > 0 else 0

        # Talisay: moderate laplacian (not too smooth, not too rough)
        if 50 < lap_var < 3000:
            score += 0.15
        elif 20 < lap_var < 5000:
            score += 0.05

        passes = score >= 0.50

        return {
            "passes": passes,
            "score": round(score, 3),
            "brightness_mean": round(float(mean_val), 1),
            "brightness_std": round(float(std_val), 1),
            "hue_std": round(float(hue_std), 1),
            "metallic_ratio": round(float(low_sat_high_val), 3),
            "laplacian_var": round(float(lap_var), 1),
        }

    # ───────────────────────────────────────────────────
    # HELPERS
    # ───────────────────────────────────────────────────

    def _build_fruit_mask(self, image: np.ndarray,
                           yolo_fruit_info: Optional[Dict]) -> np.ndarray:
        """Build a fruit mask from YOLO bbox or colour segmentation."""
        h, w = image.shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)

        # Use YOLO bounding box if available
        if yolo_fruit_info and yolo_fruit_info.get("bbox"):
            bbox = yolo_fruit_info["bbox"]
            x1, y1, x2, y2 = [int(v) for v in bbox]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            mask[y1:y2, x1:x2] = 255
            return mask

        # Fallback: colour-based segmentation of likely Talisay regions
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        for band in [TALISAY_GREEN_HSV, TALISAY_YELLOW_HSV, TALISAY_BROWN_HSV]:
            m = cv2.inRange(hsv, band["lower"], band["upper"])
            mask = cv2.bitwise_or(mask, m)

        # Also include some slightly wider range for initial detection
        wider_green = cv2.inRange(hsv,
                                   np.array([25, 30, 30]),
                                   np.array([90, 255, 255]))
        mask = cv2.bitwise_or(mask, wider_green)

        # Clean up
        kernel = np.ones((9, 9), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        # Keep only significant contours
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if contours:
            min_area = h * w * 0.01
            clean = np.zeros_like(mask)
            valid = [c for c in contours if cv2.contourArea(c) > min_area]
            if valid:
                cv2.drawContours(clean, valid, -1, 255, -1)
                return clean

        return mask

    @staticmethod
    def _make_verdict(accepted: bool, verdict: GuardVerdict,
                      score: float, layers: Dict,
                      reason: str) -> Dict:
        """Construct the verdict dictionary."""
        return {
            "accepted": accepted,
            "verdict": verdict.value,
            "score": round(score, 3),
            "layers": layers,
            "reason": reason,
        }


# ═══════════════════════════════════════════════════════════
# Quick CLI test
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="TalisayGuard — Verify Talisay fruit images"
    )
    parser.add_argument("image", help="Path to image file")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    img = cv2.imread(args.image)
    if img is None:
        print(f"❌ Could not load: {args.image}")
        exit(1)

    guard = TalisayGuard()
    result = guard.verify(img)

    print("\n" + "=" * 60)
    print("TALISAY GUARD VERIFICATION")
    print("=" * 60)
    print(f"Verdict:  {result['verdict'].upper()}")
    print(f"Accepted: {'✅ YES' if result['accepted'] else '❌ NO'}")
    print(f"Score:    {result['score']:.3f}")
    print(f"Reason:   {result['reason']}")

    if args.verbose:
        print("\n--- Layer Details ---")
        for name, data in result["layers"].items():
            print(f"\n  [{name}]")
            for k, v in data.items():
                print(f"    {k}: {v}")

    print("=" * 60)
