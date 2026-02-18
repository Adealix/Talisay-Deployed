"""
YOLOv8-Based Object Detector for Talisay Oil Analysis
=====================================================

Uses YOLO (You Only Look Once) for real-time detection of:
1. Talisay fruits (green, yellow, brown)
2. Philippine ₱5 Peso coins (silver reference)

YOLO advantages over previous HoughCircles approach:
- Trained on actual coin + fruit images (not hand-tuned heuristics)
- Robust to lighting variations, angles, partial occlusion
- Simultaneously detects multiple objects with bounding boxes
- Provides confidence scores per detection
- Works at real-time speed even on mobile devices

Architecture: YOLOv8n (nano) for mobile compatibility
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from PIL import Image
import json

# YOLO model paths
MODELS_DIR = Path(__file__).parent
YOLO_MODEL_PATH = MODELS_DIR / "yolo_talisay.pt"
YOLO_MODEL_ONNX_PATH = MODELS_DIR / "yolo_talisay.onnx"

# Detection classes
DETECTION_CLASSES = {
    0: "talisay_fruit",
    1: "peso_5_coin",
}

CLASS_TO_IDX = {v: k for k, v in DETECTION_CLASSES.items()}

# Known reference dimensions
COIN_DIMENSIONS = {
    "peso_5_coin": {"diameter_cm": 2.5, "diameter_mm": 25.0}
}


class YOLODetector:
    """
    YOLOv8-based detector for Talisay fruits and reference coins.
    
    This replaces the HoughCircles-based coin detection and HSV-based
    fruit detection with a unified deep learning approach.
    
    Usage:
        detector = YOLODetector()
        results = detector.detect(image_path)
        # results contains bounding boxes, classes, and confidences
    """
    
    def __init__(
        self,
        model_path: str = None,
        confidence_threshold: float = 0.35,
        iou_threshold: float = 0.45,
        device: str = "auto"
    ):
        """
        Initialize YOLO detector.
        
        Args:
            model_path: Path to trained YOLO model (.pt file)
            confidence_threshold: Minimum confidence for detections
            iou_threshold: IoU threshold for NMS
            device: Device to use ('cpu', 'cuda', 'auto')
        """
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.model = None
        self.model_loaded = False
        self.device = device
        
        # Determine model path
        if model_path:
            self.model_path = Path(model_path)
        elif YOLO_MODEL_PATH.exists():
            self.model_path = YOLO_MODEL_PATH
        else:
            self.model_path = YOLO_MODEL_PATH  # Will use pretrained as base
        
        self._load_model()
    
    def _load_model(self):
        """Load the YOLO model."""
        try:
            from ultralytics import YOLO
            
            if self.model_path.exists():
                self.model = YOLO(str(self.model_path))
                print(f"✓ YOLO detector loaded from: {self.model_path}")
                self.model_loaded = True
            else:
                # Use pretrained YOLOv8n as base (will need fine-tuning)
                self.model = YOLO("yolov8n.pt")
                print("ℹ YOLO: Using pretrained YOLOv8n base model")
                print("  → Run train_yolo_cnn.py to fine-tune on Talisay data")
                self.model_loaded = True
                
        except ImportError:
            print("⚠ ultralytics not installed. YOLO detection unavailable.")
            print("  Install with: pip install ultralytics")
            self.model_loaded = False
        except Exception as e:
            print(f"⚠ Error loading YOLO model: {e}")
            self.model_loaded = False
    
    def detect(
        self,
        image: Union[str, Path, np.ndarray, Image.Image],
        return_visualization: bool = False
    ) -> Dict:
        """
        Detect objects (fruits and coins) in image.
        
        Args:
            image: Input image (path, numpy array, or PIL Image)
            return_visualization: Include annotated image in results
            
        Returns:
            Dictionary with detection results:
            {
                "detections": [
                    {
                        "class": "talisay_fruit" | "peso_5_coin",
                        "confidence": float,
                        "bbox": [x1, y1, x2, y2],
                        "center": [cx, cy],
                        "size": [width, height]
                    }
                ],
                "fruits_detected": int,
                "coins_detected": int,
                "has_coin_reference": bool,
                "coin_info": {...} | None,
                "fruit_info": {...} | None
            }
        """
        result = {
            "detections": [],
            "fruits_detected": 0,
            "coins_detected": 0,
            "has_coin_reference": False,
            "coin_info": None,
            "fruit_info": None,
            "success": False
        }
        
        if not self.model_loaded:
            result["error"] = "YOLO model not loaded"
            return result
        
        try:
            # Load image
            img_array = self._load_image(image)
            if img_array is None:
                result["error"] = "Could not load image"
                return result
            
            h, w = img_array.shape[:2]
            
            # Run YOLO inference
            predictions = self.model.predict(
                img_array,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                device=self.device if self.device != "auto" else None,
                verbose=False
            )
            
            # Process predictions
            if predictions and len(predictions) > 0:
                pred = predictions[0]
                
                if pred.boxes is not None and len(pred.boxes) > 0:
                    boxes = pred.boxes.xyxy.cpu().numpy()
                    confidences = pred.boxes.conf.cpu().numpy()
                    class_ids = pred.boxes.cls.cpu().numpy().astype(int)
                    
                    for i in range(len(boxes)):
                        x1, y1, x2, y2 = boxes[i]
                        conf = float(confidences[i])
                        cls_id = int(class_ids[i])
                        
                        # Map class name
                        cls_name = DETECTION_CLASSES.get(cls_id, f"class_{cls_id}")
                        
                        # For base pretrained model, map COCO classes
                        if not self.model_path.exists() or "yolov8n" in str(self.model_path):
                            cls_name = self._map_coco_to_talisay(cls_id, img_array, boxes[i])
                            if cls_name is None:
                                continue
                        
                        cx = (x1 + x2) / 2
                        cy = (y1 + y2) / 2
                        bw = x2 - x1
                        bh = y2 - y1
                        
                        detection = {
                            "class": cls_name,
                            "confidence": conf,
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "center": [float(cx), float(cy)],
                            "size": [float(bw), float(bh)]
                        }
                        
                        result["detections"].append(detection)
                        
                        if cls_name == "talisay_fruit":
                            result["fruits_detected"] += 1
                        elif cls_name == "peso_5_coin":
                            result["coins_detected"] += 1
            
            # Extract best coin and fruit info
            coins = [d for d in result["detections"] if d["class"] == "peso_5_coin"]
            fruits = [d for d in result["detections"] if d["class"] == "talisay_fruit"]
            
            if coins:
                best_coin = max(coins, key=lambda d: d["confidence"])
                coin_w = best_coin["size"][0]
                coin_h = best_coin["size"][1]
                coin_diameter_px = (coin_w + coin_h) / 2  # Average for circular coin
                coin_diameter_cm = COIN_DIMENSIONS["peso_5_coin"]["diameter_cm"]
                pixels_per_cm = coin_diameter_px / coin_diameter_cm
                
                result["has_coin_reference"] = True
                result["coin_info"] = {
                    "detected": True,
                    "confidence": best_coin["confidence"],
                    "bbox": best_coin["bbox"],
                    "center": best_coin["center"],
                    "coin_center": (int(best_coin["center"][0]), int(best_coin["center"][1])),
                    "coin_radius": int(coin_diameter_px / 2),
                    "coin_diameter_px": coin_diameter_px,
                    "coin_diameter_cm": coin_diameter_cm,
                    "pixels_per_cm": pixels_per_cm,
                    "coin_name": "₱5 Coin (Silver, 25mm)"
                }
            
            if fruits:
                best_fruit = max(fruits, key=lambda d: d["confidence"])
                result["fruit_info"] = {
                    "detected": True,
                    "confidence": best_fruit["confidence"],
                    "bbox": best_fruit["bbox"],
                    "center": best_fruit["center"],
                    "size": best_fruit["size"]
                }
                
                # If we have coin reference, estimate fruit dimensions
                if result["coin_info"]:
                    ppc = result["coin_info"]["pixels_per_cm"]
                    fruit_w_cm = best_fruit["size"][0] / ppc
                    fruit_h_cm = best_fruit["size"][1] / ppc
                    
                    # Length = max dimension, width = min dimension
                    length_cm = max(fruit_w_cm, fruit_h_cm)
                    width_cm = min(fruit_w_cm, fruit_h_cm)
                    
                    result["fruit_info"]["estimated_length_cm"] = round(length_cm, 2)
                    result["fruit_info"]["estimated_width_cm"] = round(width_cm, 2)
                    result["fruit_info"]["measurement_method"] = "yolo_coin_reference"
            
            result["success"] = True
            
            # Generate visualization if requested
            if return_visualization:
                result["visualization"] = self._draw_detections(img_array, result["detections"])
            
        except Exception as e:
            import traceback
            result["error"] = str(e)
            result["traceback"] = traceback.format_exc()
        
        return result
    
    def detect_coin_for_reference(self, image) -> Dict:
        """
        Specifically detect a ₱5 coin for dimension reference.
        Returns coin info compatible with the existing DimensionEstimator.
        
        This is the YOLO replacement for _detect_coin_reference() in
        dimension_estimator.py.
        """
        detection = self.detect(image)
        
        if detection.get("has_coin_reference") and detection.get("coin_info"):
            coin = detection["coin_info"]
            return {
                "detected": True,
                "pixels_per_cm": coin["pixels_per_cm"],
                "coin_center": coin["coin_center"],
                "coin_radius": coin["coin_radius"],
                "coin_diameter_px": coin["coin_diameter_px"],
                "coin_type": "peso_5",
                "coin_name": coin["coin_name"],
                "coin_diameter_cm": coin["coin_diameter_cm"],
                "detection_score": coin["confidence"],
                "confidence": coin["confidence"],
                "detection_method": "yolo_v8"
            }
        
        return {"detected": False, "detection_method": "yolo_v8"}
    
    def _map_coco_to_talisay(
        self, 
        coco_class_id: int, 
        img: np.ndarray,
        bbox: np.ndarray
    ) -> Optional[str]:
        """
        Map COCO detection classes to our Talisay classes.
        Used when running with base pretrained model before fine-tuning.
        
        Uses additional heuristics on the detected region to classify.
        """
        # COCO class mappings that could be relevant
        FRUIT_LIKE_CLASSES = {46: "banana", 47: "apple", 49: "orange", 51: "carrot"}
        ROUND_CLASSES = {75: "clock", 32: "sports ball"}
        
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(img.shape[1], x2)
        y2 = min(img.shape[0], y2)
        
        roi = img[y1:y2, x1:x2]
        if roi.size == 0:
            return None
        
        # Analyze the ROI to determine if it's a coin or fruit
        hsv_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        mean_h = np.mean(hsv_roi[:, :, 0])
        mean_s = np.mean(hsv_roi[:, :, 1])
        mean_v = np.mean(hsv_roi[:, :, 2])
        
        w = x2 - x1
        h = y2 - y1
        aspect = max(w, h) / max(1, min(w, h))
        
        # Silver coin: low saturation, medium-high value, roughly circular
        if mean_s < 60 and mean_v > 100 and aspect < 1.3:
            return "peso_5_coin"
        
        # Fruit: higher saturation, elongated shape
        if coco_class_id in FRUIT_LIKE_CLASSES:
            return "talisay_fruit"
        
        # Round metallic object
        if coco_class_id in ROUND_CLASSES and mean_s < 80:
            return "peso_5_coin"
        
        return None
    
    def _load_image(self, image) -> Optional[np.ndarray]:
        """Load image from various sources."""
        if isinstance(image, (str, Path)):
            img = cv2.imread(str(image))
            return img
        elif isinstance(image, Image.Image):
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        elif isinstance(image, np.ndarray):
            if len(image.shape) == 3 and image.shape[2] == 3:
                return image.copy()
            elif len(image.shape) == 2:
                return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        return None
    
    def _draw_detections(
        self, 
        img: np.ndarray, 
        detections: List[Dict]
    ) -> np.ndarray:
        """Draw bounding boxes and labels on image."""
        vis = img.copy()
        
        colors = {
            "talisay_fruit": (0, 255, 0),    # Green box
            "peso_5_coin": (0, 255, 255),     # Yellow box
        }
        
        for det in detections:
            x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
            cls = det["class"]
            conf = det["confidence"]
            color = colors.get(cls, (255, 255, 255))
            
            # Draw box
            cv2.rectangle(vis, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{cls}: {conf:.2f}"
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            cv2.rectangle(vis, (x1, y1 - lh - 10), (x1 + lw, y1), color, -1)
            cv2.putText(vis, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
        
        return vis


def get_detector(model_path: str = None) -> YOLODetector:
    """Factory function to get YOLO detector instance."""
    return YOLODetector(model_path=model_path)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="YOLO Talisay Detector")
    parser.add_argument("image", help="Path to image")
    parser.add_argument("--model", default=None, help="Path to YOLO model")
    parser.add_argument("--conf", type=float, default=0.35, help="Confidence threshold")
    parser.add_argument("--output", help="Output visualization path")
    
    args = parser.parse_args()
    
    detector = YOLODetector(model_path=args.model, confidence_threshold=args.conf)
    result = detector.detect(args.image, return_visualization=bool(args.output))
    
    print("\n=== YOLO Detection Results ===")
    print(f"Fruits detected: {result['fruits_detected']}")
    print(f"Coins detected: {result['coins_detected']}")
    print(f"Coin reference: {result['has_coin_reference']}")
    
    for det in result["detections"]:
        print(f"\n  {det['class']}:")
        print(f"    Confidence: {det['confidence']:.3f}")
        print(f"    BBox: {det['bbox']}")
    
    if result.get("coin_info"):
        print(f"\nCoin pixels/cm: {result['coin_info']['pixels_per_cm']:.1f}")
    
    if result.get("fruit_info") and "estimated_length_cm" in result["fruit_info"]:
        print(f"Fruit length: {result['fruit_info']['estimated_length_cm']:.2f} cm")
        print(f"Fruit width: {result['fruit_info']['estimated_width_cm']:.2f} cm")
    
    if args.output and "visualization" in result:
        cv2.imwrite(args.output, result["visualization"])
        print(f"\nVisualization saved: {args.output}")
