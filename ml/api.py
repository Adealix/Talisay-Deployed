"""
Flask API Server for Talisay Oil Yield Prediction
Provides REST endpoints for the mobile/web application
"""

import os
import sys

# Configure environment BEFORE any imports
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow warnings
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN custom operations
os.environ['YOLO_VERBOSE'] = 'False'  # Suppress YOLO verbose output
os.environ['ULTRALYTICS_OFFLINE'] = '1'  # Prevent YOLO from downloading models
os.environ['MPLBACKEND'] = 'Agg'  # Use non-interactive matplotlib backend (headless server)

from pathlib import Path
from flask import Flask, request, jsonify
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
import base64
import io
import numpy as np

sys.path.append(str(Path(__file__).parent))

from config import API_CONFIG

# Import predictor with detailed error handling
try:
    from predict import TalisayPredictor
    PREDICTOR_IMPORT_ERROR = None
except Exception as e:
    TalisayPredictor = None
    PREDICTOR_IMPORT_ERROR = str(e)
    print(f"⚠️  Failed to import TalisayPredictor: {e}")
    import traceback
    traceback.print_exc()


# Custom JSON provider to handle NumPy types
class NumpyJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


# Initialize Flask app
app = Flask(__name__)
app.json = NumpyJSONProvider(app)  # Use custom JSON provider

# Enable CORS with proper configuration for ngrok and local development
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins (ngrok, localhost, Expo)
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False,
        "max_age": 3600
    }
})

# Set max content length
app.config["MAX_CONTENT_LENGTH"] = API_CONFIG["max_content_length"]

# Lazy predictor initialization — defer heavy model loading so Flask can
# bind to the PORT immediately (required by Render's port-scan health check).
predictor = None
predictor_error = None
_predictor_initialized = False  # guard flag


def _ensure_predictor():
    """Initialize the predictor on first use (lazy loading)."""
    global predictor, predictor_error, _predictor_initialized
    if _predictor_initialized:
        return
    _predictor_initialized = True

    if TalisayPredictor is None:
        predictor_error = f"Failed to import TalisayPredictor: {PREDICTOR_IMPORT_ERROR}"
        print(f"⚠️  {predictor_error}")
        return

    try:
        print("=" * 60)
        print("Initializing TalisayPredictor (lazy)...")
        print("=" * 60)
        predictor = TalisayPredictor(
            use_simple_color=True,           # HSV-based (always available, fast)
            use_deep_learning_color=True,    # Deep learning (mobile-optimized if available)
            enable_segmentation=True,        # Advanced background removal
            reference_coin="peso_5",         # Default coin reference
            use_yolo=True,                   # YOLOv8 object detection (coin + fruit)
            use_cnn=True                     # Enhanced CNN color classification
        )
        print("=" * 60)
        print("✓ TalisayPredictor initialized successfully")
        print("=" * 60)
    except Exception as e:
        predictor_error = str(e)
        print("=" * 60)
        print(f"⚠️  Failed to initialize predictor: {e}")
        print("⚠️  API will start in limited mode (health check only)")
        print("=" * 60)
        import traceback
        traceback.print_exc()


@app.route("/", methods=["GET"])
def health_check():
    """Health check endpoint."""
    _ensure_predictor()
    if predictor is None:
        return jsonify({
            "status": "limited",
            "service": "Talisay Oil Yield Prediction API",
            "version": "3.0.0 (YOLO + CNN)",
            "error": "Predictor initialization failed",
            "details": predictor_error,
            "note": "API is running but predictions are unavailable"
        }), 503
    
    return jsonify({
        "status": "healthy",
        "service": "Talisay Oil Yield Prediction API",
        "version": "3.0.0 (YOLO + CNN)",
        "models": {
            "yolo_detector": predictor.yolo_detector is not None,
            "cnn_classifier": predictor.cnn_classifier is not None,
            "hsv_classifier": True,
            "segmentation": predictor.enable_segmentation
        }
    })


@app.route("/api/predict/image", methods=["POST"])
def predict_from_image():
    """
    Predict oil yield from uploaded image.
    
    Request body (JSON):
        - image: Base64 encoded image string
        - dimensions (optional): Known fruit dimensions
            - length_cm: float
            - width_cm: float
            - kernel_mass_g: float
            - whole_fruit_weight_g: float
    
    Returns:
        JSON with prediction results
    """
    _ensure_predictor()
    if predictor is None:
        return jsonify({
            "error": "Predictor not available",
            "details": predictor_error,
            "message": "Model initialization failed. Please check server logs."
        }), 503
    
    try:
        data = request.get_json()
        
        if not data or "image" not in data:
            return jsonify({"error": "No image provided"}), 400
        
        # Decode base64 image
        try:
            from PIL import Image
            
            image_data = data["image"]
            # Remove data URL prefix if present
            if "," in image_data:
                image_data = image_data.split(",")[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
        except Exception as e:
            return jsonify({"error": f"Invalid image data: {str(e)}"}), 400
        
        # Get optional dimensions
        known_dimensions = data.get("dimensions")
        
        # Analyze image
        result = predictor.analyze_image(image, known_dimensions)
        
        if not result["analysis_complete"]:
            return jsonify({
                "error": result.get("error", "Analysis failed"),
                "partial_result": result
            }), 500
        
        return jsonify({
            "success": True,
            "result": result
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict/measurements", methods=["POST"])
def predict_from_measurements():
    """
    Predict oil yield from manual measurements.
    
    Request body (JSON):
        - color: "green", "yellow", or "brown"
        - length_cm: float
        - width_cm: float
        - kernel_mass_g: float (optional)
        - whole_fruit_weight_g: float (optional)
    
    Returns:
        JSON with prediction results
    """
    _ensure_predictor()
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        required = ["color", "length_cm", "width_cm"]
        missing = [f for f in required if f not in data]
        
        if missing:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing)}"
            }), 400
        
        # Validate color
        color = data["color"].lower()
        if color not in ["green", "yellow", "brown"]:
            return jsonify({
                "error": "Invalid color. Must be 'green', 'yellow', or 'brown'"
            }), 400
        
        # Analyze
        result = predictor.analyze_measurements(
            color=color,
            length_cm=float(data["length_cm"]),
            width_cm=float(data["width_cm"]),
            kernel_mass_g=data.get("kernel_mass_g"),
            whole_fruit_weight_g=data.get("whole_fruit_weight_g")
        )
        
        return jsonify({
            "success": True,
            "result": result
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/research", methods=["GET"])
def get_research_data():
    """
    Get scientific research data used for predictions.
    
    Returns:
        JSON with research parameters and references
    """
    _ensure_predictor()
    try:
        research = predictor.get_research_summary()
        return jsonify({
            "success": True,
            "data": research
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/color-guide", methods=["GET"])
def get_color_guide():
    """
    Get color classification guide for users.
    
    Returns:
        JSON with color descriptions and oil yield expectations
    """
    from config import OIL_YIELD_BY_COLOR
    
    guide = {
        "colors": [
            {
                "name": "green",
                "display_name": "Green (Immature)",
                "description": "The fruit is not yet ripe. The skin is predominantly green.",
                "oil_yield_range": f"{OIL_YIELD_BY_COLOR['green']['min']}-{OIL_YIELD_BY_COLOR['green']['max']}%",
                "recommendation": "Wait for the fruit to mature for higher oil yield.",
                "hex_color": "#4CAF50"
            },
            {
                "name": "yellow",
                "display_name": "Yellow (Mature)",
                "description": "The fruit is ripe and at optimal stage for oil extraction.",
                "oil_yield_range": f"{OIL_YIELD_BY_COLOR['yellow']['min']}-{OIL_YIELD_BY_COLOR['yellow']['max']}%",
                "recommendation": "Best time to harvest for maximum oil yield!",
                "hex_color": "#FFC107"
            },
            {
                "name": "brown",
                "display_name": "Brown (Fully Ripe)",
                "description": "The fruit is fully ripe or overripe with brownish skin.",
                "oil_yield_range": f"{OIL_YIELD_BY_COLOR['brown']['min']}-{OIL_YIELD_BY_COLOR['brown']['max']}%",
                "recommendation": "Still good for extraction, but yellow stage is optimal.",
                "hex_color": "#795548"
            }
        ],
        "summary": {
            "best_color": "yellow",
            "reason": "Yellow (mature) fruits have the highest oil content based on scientific research."
        }
    }
    
    return jsonify({
        "success": True,
        "data": guide
    })


@app.route("/api/dimensions-guide", methods=["GET"])
def get_dimensions_guide():
    """
    Get guide for measuring fruit dimensions.
    
    Returns:
        JSON with measurement instructions and typical ranges
    """
    from config import DIMENSION_RANGES
    
    guide = {
        "measurements": [
            {
                "name": "length_cm",
                "display_name": "Fruit Length",
                "unit": "centimeters (cm)",
                "typical_range": f"{DIMENSION_RANGES['length']['min']} - {DIMENSION_RANGES['length']['max']} cm",
                "how_to_measure": "Measure from the stem end to the tip of the fruit along the longest axis.",
                "importance": "Length correlates moderately with oil yield."
            },
            {
                "name": "width_cm",
                "display_name": "Fruit Width",
                "unit": "centimeters (cm)",
                "typical_range": f"{DIMENSION_RANGES['width']['min']} - {DIMENSION_RANGES['width']['max']} cm",
                "how_to_measure": "Measure the widest point of the fruit perpendicular to the length.",
                "importance": "Width helps estimate fruit volume and weight."
            },
            {
                "name": "kernel_mass_g",
                "display_name": "Kernel Mass",
                "unit": "grams (g)",
                "typical_range": f"{DIMENSION_RANGES['kernel_mass']['min']} - {DIMENSION_RANGES['kernel_mass']['max']} g",
                "how_to_measure": "Remove the outer flesh and weigh the inner kernel/seed.",
                "importance": "MOST IMPORTANT - kernel mass is the strongest predictor of oil yield!"
            },
            {
                "name": "whole_fruit_weight_g",
                "display_name": "Whole Fruit Weight",
                "unit": "grams (g)",
                "typical_range": f"{DIMENSION_RANGES['whole_fruit_weight']['min']} - {DIMENSION_RANGES['whole_fruit_weight']['max']} g",
                "how_to_measure": "Weigh the entire fruit including flesh and kernel.",
                "importance": "Helps calculate kernel-to-fruit ratio."
            }
        ],
        "tips": [
            "Use a digital caliper or ruler for length and width",
            "Use a kitchen scale for accurate weight measurements",
            "Kernel mass has the highest correlation with oil yield",
            "If you can't measure kernel mass, the app will estimate it"
        ]
    }
    
    return jsonify({
        "success": True,
        "data": guide
    })


@app.route("/api/existing-dataset/average", methods=["GET"])
def get_average_existing_dataset():
    """
    Get pre-computed average baseline metrics from averaged_baselines.json.
    Falls back to computing on-the-fly if pre-computed data not available.

    Query params:
        color – 'green' (default), 'yellow', or 'brown'
        sample_size – number of images to analyze if computing (default 30, max 100)
    """
    import random as _random
    from PIL import Image as _PILImage
    import statistics
    import json

    color = request.args.get("color", "green").lower()
    sample_size = min(int(request.args.get("sample_size", 30)), 100)
    
    if color not in ("green", "yellow", "brown"):
        return jsonify({"error": "Invalid color. Must be green, yellow or brown"}), 400

    # TRY TO LOAD PRE-COMPUTED BASELINE (FAST PATH)
    baseline_file = Path(__file__).parent / "averaged_baselines.json"
    if baseline_file.exists():
        try:
            with open(baseline_file, 'r') as f:
                baselines = json.load(f)
            
            if color in baselines:
                baseline_data = baselines[color]
                
                # Load representative image file and encode to base64
                img_filename = baseline_data.get("representativeImageFile")
                if img_filename:
                    img_path = Path(__file__).parent / img_filename
                    if img_path.exists():
                        with open(img_path, 'rb') as img_file:
                            img_b64 = base64.b64encode(img_file.read()).decode()
                    else:
                        # Fallback: use first image from dataset
                        dataset_dir = Path(__file__).parent / "data" / "training" / "existing_datasets" / color
                        all_images = [f for f in dataset_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
                        if all_images:
                            with open(all_images[0], 'rb') as img_file:
                                img_b64 = base64.b64encode(img_file.read()).decode()
                        else:
                            img_b64 = ""
                else:
                    img_b64 = ""
                
                # Remap dimensions to standard keys expected by frontend
                raw_dims = baseline_data.get("dimensions", {})
                mapped_dims = {}
                if "length" in raw_dims or "length_cm" in raw_dims:
                    mapped_dims["length_cm"] = raw_dims.get("length_cm", raw_dims.get("length", 0))
                if "width" in raw_dims or "width_cm" in raw_dims:
                    mapped_dims["width_cm"] = raw_dims.get("width_cm", raw_dims.get("width", 0))
                if "weight" in raw_dims or "kernel_mass_g" in raw_dims:
                    mapped_dims["kernel_mass_g"] = raw_dims.get("kernel_mass_g", raw_dims.get("weight", 0))
                if "whole_fruit_weight_g" in raw_dims:
                    mapped_dims["whole_fruit_weight_g"] = raw_dims["whole_fruit_weight_g"]

                # Return pre-computed data in expected format
                return jsonify({
                    "success": True,
                    "imageName": f"Averaged Baseline ({color.capitalize()})",
                    "representativeImage": img_b64,  # Frontend expects this key
                    "representativeImageName": img_filename or f"baseline_{color}.jpg",
                    "totalImages": baseline_data.get("totalImages", 0),
                    "analyzedImages": baseline_data.get("analyzedImages", 0),
                    "color": color,
                    "oilYieldPercent": baseline_data.get("oilYieldPercent", 0),
                    "colorCategory": baseline_data.get("colorCategory", color),
                    "maturityStage": baseline_data.get("maturityStage", "Unknown"),
                    "confidence": baseline_data.get("confidence", 0),
                    "dimensions": mapped_dims,
                    "yieldCategory": baseline_data.get("yieldCategory", "Unknown"),
                    "seedSpotsDetectionRate": baseline_data.get("seedSpotsDetectionRate", 0),
                    "referenceDetectionRate": baseline_data.get("referenceDetectionRate", 0),
                })
        except Exception as e:
            print(f"[Warning] Failed to load pre-computed baseline: {e}")
            # Fall through to on-the-fly computation
    
    # FALLBACK: COMPUTE ON-THE-FLY (SLOW PATH)
    dataset_dir = Path(__file__).parent / "data" / "training" / "existing_datasets" / color
    if not dataset_dir.exists():
        return jsonify({"error": f"No existing dataset folder for '{color}'"}), 404

    all_images = [
        f for f in dataset_dir.iterdir()
        if f.suffix.lower() in (".jpg", ".jpeg", ".png")
    ]
    if not all_images:
        return jsonify({"error": f"No images found in existing_datasets/{color}"}), 404

    # Sample images for analysis (or use all if fewer than sample_size)
    images_to_analyze = _random.sample(all_images, min(sample_size, len(all_images)))
    
    try:
        # Analyze all sampled images
        results = []
        for img_path in images_to_analyze:
            try:
                pil_img = _PILImage.open(img_path).convert("RGB")
                result = predictor.analyze_image(pil_img)
                results.append(result)
            except Exception as e:
                print(f"[Warning] Failed to analyze {img_path.name}: {e}")
                continue
        
        if not results:
            return jsonify({"error": "Failed to analyze any images"}), 500
        
        # Compute averages
        def safe_mean(values):
            """Compute mean, filtering out None values"""
            filtered = [v for v in values if v is not None]
            return statistics.mean(filtered) if filtered else None
        
        def safe_mode(values):
            """Get most common value, filtering out None"""
            filtered = [v for v in values if v is not None]
            if not filtered:
                return None
            try:
                return statistics.mode(filtered)
            except statistics.StatisticsError:
                # No unique mode, return most frequent or first
                return max(set(filtered), key=filtered.count)
        
        # Aggregate numeric metrics
        avg_result = {
            "category": safe_mode([r.get("category") for r in results]),
            "color": color.upper(),
            "maturity_stage": safe_mode([r.get("maturity_stage") for r in results]),
            "color_confidence": safe_mean([r.get("color_confidence") for r in results]),
            "fruit_confidence": safe_mean([r.get("fruit_confidence") for r in results]),
            "oil_yield_percent": safe_mean([r.get("oil_yield_percent") for r in results]),
            "yield_category": safe_mode([r.get("yield_category") for r in results]),
            "oil_confidence": safe_mean([r.get("oil_confidence") for r in results]),
            "overall_confidence": safe_mean([r.get("overall_confidence") for r in results]),
            "has_spots": any(r.get("has_spots", False) for r in results),
            "spot_coverage": safe_mean([r.get("spot_coverage") for r in results if r.get("has_spots")]),
            "reference_detected": sum(1 for r in results if r.get("reference_detected")) / len(results),
        }
        
        # Aggregate dimensions (if available)
        dims = {}
        dim_keys = ["length_cm", "width_cm", "kernel_mass_g", "whole_fruit_weight_g"]
        for key in dim_keys:
            values = [r.get("dimensions", {}).get(key) for r in results if r.get("dimensions")]
            avg = safe_mean(values)
            if avg is not None:
                dims[key] = round(avg, 3)
        
        if dims:
            avg_result["dimensions"] = dims
            avg_result["dimensions_source"] = "averaged"
        
        # Build interpretation
        sample_interps = [r.get("interpretation") for r in results if r.get("interpretation")]
        if sample_interps:
            avg_result["interpretation"] = (
                f"Averaged baseline from {len(results)} {color} dataset images. "
                f"Average oil yield: {avg_result['oil_yield_percent']:.1f}%. "
                f"Most common maturity: {avg_result.get('maturity_stage', 'unknown')}."
            )
        
        # Pick a representative image (middle of sorted oil yields)
        sorted_results = sorted(
            [(r, r.get("oil_yield_percent", 0)) for r in results],
            key=lambda x: x[1]
        )
        median_idx = len(sorted_results) // 2
        representative_path = images_to_analyze[results.index(sorted_results[median_idx][0])]
        
        # Load representative image as base64
        pil_img = _PILImage.open(representative_path).convert("RGB")
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=80)
        img_b64 = base64.b64encode(buf.getvalue()).decode()
        
        return jsonify({
            "success": True,
            "imageName": f"Averaged Baseline ({color.capitalize()})",
            "representativeImage": img_b64,  # Frontend expects this key, not imageBase64
            "representativeImageName": representative_path.name,
            "totalImages": len(all_images),
            "analyzedImages": len(results),
            "color": color,
            "oilYieldPercent": avg_result.get("oil_yield_percent", 0),
            "colorCategory": avg_result.get("category", color.upper()),
            "maturityStage": avg_result.get("maturity_stage", "Unknown"),
            "confidence": avg_result.get("overall_confidence", 0),
            "dimensions": avg_result.get("dimensions", {}),
            "yieldCategory": avg_result.get("yield_category", "Unknown"),
        })
        
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to compute average baseline: {exc}"}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error."""
    return jsonify({
        "error": "File too large. Maximum size is 16MB."
    }), 413


@app.errorhandler(500)
def internal_error(error):
    """Handle internal server error."""
    return jsonify({
        "error": "Internal server error"
    }), 500


if __name__ == "__main__":
    print("="*60)
    print("Starting Talisay Oil Yield Prediction API...")
    print(f"Server will bind to: http://{API_CONFIG['host']}:{API_CONFIG['port']}")
    print(f"PORT env variable: {os.environ.get('PORT', 'not set')}")
    print(f"Predictor status: {'✓ Ready' if predictor else '✗ Failed'}")
    if predictor_error:
        print(f"Predictor error: {predictor_error}")
    print("="*60)
    print("\nEndpoints:")
    print("  GET  /                     - Health check")
    print("  POST /api/predict/image    - Predict from image")
    print("  POST /api/predict/measurements - Predict from measurements")
    print("  GET  /api/research         - Get research data")
    print("  GET  /api/color-guide      - Get color classification guide")
    print("  GET  /api/dimensions-guide - Get measurement guide")
    print("  GET  /api/existing-dataset/average - Get pre-computed baseline averages")
    print("="*60)
    print(f"Starting Flask server now...")
    
    port = int(os.environ.get("PORT", API_CONFIG["port"]))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=API_CONFIG["debug"],
        threaded=True
    )
