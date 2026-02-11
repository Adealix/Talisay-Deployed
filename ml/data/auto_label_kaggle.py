"""
Auto-Label Kaggle Images for Training

This script uses our improved color classifier to automatically label
the Kaggle dataset images, then creates a visual review interface.

The auto-labels can be manually corrected before training.
"""

import os
import sys
import json
import shutil
from pathlib import Path
from typing import List, Dict
import numpy as np

sys.path.append(str(Path(__file__).parent.parent))

# Paths
DATA_DIR = Path(__file__).parent
KAGGLE_DIR = DATA_DIR / "kaggle_talisay"
OUTPUT_DIR = KAGGLE_DIR / "auto_labeled"
LABELS_FILE = KAGGLE_DIR / "auto_labels.json"


def find_images(search_dir: Path) -> List[Path]:
    """Find all image files in a directory."""
    extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
    images = []
    
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            if Path(file).suffix.lower() in extensions:
                images.append(Path(root) / file)
    
    return sorted(images)


def auto_label_images(images: List[Path], save_results: bool = True) -> Dict:
    """
    Automatically label images using our classifier.
    
    Returns dict mapping filename to predicted label.
    """
    from models.color_classifier import SimpleColorClassifier
    
    classifier = SimpleColorClassifier()
    results = {}
    
    print(f"\nAuto-labeling {len(images)} images...")
    
    for i, img_path in enumerate(images, 1):
        if i % 10 == 0:
            print(f"  Processing {i}/{len(images)}...")
        
        try:
            prediction = classifier.predict(str(img_path))
            
            results[str(img_path)] = {
                "filename": img_path.name,
                "path": str(img_path),
                "predicted_color": prediction["predicted_color"],
                "confidence": float(prediction["confidence"]),
                "probabilities": {k: float(v) for k, v in prediction["probabilities"].items()},
                "has_spots": bool(prediction.get("has_spots", False)),
                "spot_coverage": float(prediction.get("spot_coverage_percent", 0)),
                "verified": False,  # Not yet manually verified
                "corrected_label": None  # Will be set if user corrects
            }
        except Exception as e:
            results[str(img_path)] = {
                "filename": img_path.name,
                "path": str(img_path),
                "error": str(e)
            }
    
    if save_results:
        LABELS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LABELS_FILE, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✓ Labels saved to: {LABELS_FILE}")
    
    # Summary
    colors = {"green": 0, "yellow": 0, "brown": 0, "error": 0}
    for data in results.values():
        if "error" in data:
            colors["error"] += 1
        else:
            colors[data["predicted_color"]] += 1
    
    print("\n--- Auto-Label Summary ---")
    for color, count in colors.items():
        pct = count / len(results) * 100
        print(f"  {color}: {count} ({pct:.1f}%)")
    
    return results


def organize_by_label(
    labels: Dict = None,
    output_dir: Path = None,
    use_corrected: bool = True
):
    """
    Organize images into folders by their labels.
    
    Args:
        labels: Label dictionary (loads from file if None)
        output_dir: Output directory
        use_corrected: Use corrected labels if available
    """
    if labels is None:
        if not LABELS_FILE.exists():
            print(f"No labels file found: {LABELS_FILE}")
            print("Run auto-labeling first.")
            return
        with open(LABELS_FILE, 'r') as f:
            labels = json.load(f)
    
    if output_dir is None:
        output_dir = OUTPUT_DIR
    
    # Create output directories
    for color in ["green", "yellow", "brown"]:
        (output_dir / color).mkdir(parents=True, exist_ok=True)
    
    copied = {"green": 0, "yellow": 0, "brown": 0}
    skipped = 0
    
    for path, data in labels.items():
        if "error" in data:
            skipped += 1
            continue
        
        # Use corrected label if available, otherwise predicted
        if use_corrected and data.get("corrected_label"):
            color = data["corrected_label"]
        else:
            color = data["predicted_color"]
        
        if color not in ["green", "yellow", "brown"]:
            skipped += 1
            continue
        
        src = Path(data["path"])
        dst = output_dir / color / data["filename"]
        
        if src.exists():
            shutil.copy2(src, dst)
            copied[color] += 1
    
    print(f"\n✓ Organized images into: {output_dir}")
    for color, count in copied.items():
        print(f"  {color}: {count}")
    if skipped:
        print(f"  skipped: {skipped}")


def create_visual_review_html(labels: Dict = None, output_file: Path = None):
    """
    Create an HTML file for visual review of auto-labels.
    
    This allows you to quickly review and correct labels.
    """
    if labels is None:
        if not LABELS_FILE.exists():
            print("No labels file found. Run auto-labeling first.")
            return
        with open(LABELS_FILE, 'r') as f:
            labels = json.load(f)
    
    if output_file is None:
        output_file = KAGGLE_DIR / "review_labels.html"
    
    # Group by predicted color
    by_color = {"green": [], "yellow": [], "brown": []}
    for path, data in labels.items():
        if "error" not in data:
            by_color[data["predicted_color"]].append(data)
    
    # Sort by confidence within each color
    for color in by_color:
        by_color[color].sort(key=lambda x: x["confidence"], reverse=True)
    
    html = """<!DOCTYPE html>
<html>
<head>
    <title>Talisay Fruit Label Review</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #2c3e50; }
        h2 { color: #34495e; margin-top: 30px; border-bottom: 2px solid #3498db; }
        .container { display: flex; flex-wrap: wrap; gap: 15px; }
        .card {
            background: white;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            width: 220px;
        }
        .card img {
            width: 200px;
            height: 200px;
            object-fit: cover;
            border-radius: 4px;
        }
        .card .info { margin-top: 8px; font-size: 12px; }
        .card .filename { font-weight: bold; word-break: break-all; }
        .card .confidence { color: #27ae60; }
        .card .spots { color: #e67e22; }
        .low-confidence { border: 3px solid #e74c3c; }
        .green-section h2 { color: #27ae60; border-color: #27ae60; }
        .yellow-section h2 { color: #f1c40f; border-color: #f1c40f; }
        .brown-section h2 { color: #8b4513; border-color: #8b4513; }
        .summary { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>🌰 Talisay Fruit Label Review</h1>
    
    <div class="summary">
        <h3>Summary</h3>
        <p>Total images: """ + str(len(labels)) + """</p>
        <ul>
            <li><span style="color:#27ae60">Green:</span> """ + str(len(by_color["green"])) + """</li>
            <li><span style="color:#f1c40f">Yellow:</span> """ + str(len(by_color["yellow"])) + """</li>
            <li><span style="color:#8b4513">Brown:</span> """ + str(len(by_color["brown"])) + """</li>
        </ul>
        <p><em>Images with red border have low confidence (&lt;70%) - review carefully!</em></p>
    </div>
"""
    
    for color in ["green", "yellow", "brown"]:
        html += f"""
    <div class="{color}-section">
        <h2>{color.upper()} ({len(by_color[color])} images)</h2>
        <div class="container">
"""
        for data in by_color[color]:
            confidence = data["confidence"]
            low_conf_class = "low-confidence" if confidence < 0.7 else ""
            spots_info = f"<br><span class='spots'>Spots: {data['spot_coverage']:.1f}%</span>" if data.get("has_spots") else ""
            
            html += f"""
            <div class="card {low_conf_class}">
                <img src="file:///{data['path'].replace(os.sep, '/')}" alt="{data['filename']}">
                <div class="info">
                    <div class="filename">{data['filename']}</div>
                    <div class="confidence">Confidence: {confidence*100:.1f}%</div>
                    {spots_info}
                </div>
            </div>
"""
        html += """
        </div>
    </div>
"""
    
    html += """
</body>
</html>
"""
    
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\n✓ Visual review HTML created: {output_file}")
    print("  Open this file in a web browser to review labels.")
    print("  Images with red borders have low confidence - review carefully!")


def create_training_split(
    labels: Dict = None,
    output_dir: Path = None,
    train_ratio: float = 0.8
):
    """
    Create train/val split from labeled data.
    """
    if labels is None:
        if not LABELS_FILE.exists():
            print("No labels file found.")
            return
        with open(LABELS_FILE, 'r') as f:
            labels = json.load(f)
    
    if output_dir is None:
        output_dir = KAGGLE_DIR / "prepared"
    
    # Group by color
    by_color = {"green": [], "yellow": [], "brown": []}
    for path, data in labels.items():
        if "error" not in data:
            color = data.get("corrected_label") or data["predicted_color"]
            if color in by_color:
                by_color[color].append(data)
    
    # Create directories
    for split in ["train", "val"]:
        for color in ["green", "yellow", "brown"]:
            (output_dir / split / color).mkdir(parents=True, exist_ok=True)
    
    # Split and copy
    np.random.seed(42)
    stats = {"train": {}, "val": {}}
    
    for color, items in by_color.items():
        np.random.shuffle(items)
        split_idx = int(len(items) * train_ratio)
        
        train_items = items[:split_idx]
        val_items = items[split_idx:]
        
        for data in train_items:
            src = Path(data["path"])
            dst = output_dir / "train" / color / data["filename"]
            if src.exists():
                shutil.copy2(src, dst)
        
        for data in val_items:
            src = Path(data["path"])
            dst = output_dir / "val" / color / data["filename"]
            if src.exists():
                shutil.copy2(src, dst)
        
        stats["train"][color] = len(train_items)
        stats["val"][color] = len(val_items)
    
    print(f"\n✓ Training data prepared in: {output_dir}")
    print("\nTraining set:")
    for color, count in stats["train"].items():
        print(f"  {color}: {count}")
    print("\nValidation set:")
    for color, count in stats["val"].items():
        print(f"  {color}: {count}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Auto-label Kaggle images for training"
    )
    parser.add_argument(
        "command",
        choices=["label", "organize", "review", "split"],
        help="Command to run"
    )
    parser.add_argument(
        "--path",
        type=str,
        help="Path to images directory"
    )
    
    args = parser.parse_args()
    
    if args.command == "label":
        search_dir = Path(args.path) if args.path else KAGGLE_DIR
        images = find_images(search_dir)
        
        if images:
            auto_label_images(images)
        else:
            print(f"No images found in: {search_dir}")
    
    elif args.command == "organize":
        organize_by_label()
    
    elif args.command == "review":
        create_visual_review_html()
    
    elif args.command == "split":
        create_training_split()
