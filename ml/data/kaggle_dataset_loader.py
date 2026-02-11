"""
Kaggle Dataset Loader for Biome Azuero 2022
Downloads and processes Terminalia catappa (Talisay) images from Kaggle

Dataset: https://www.kaggle.com/datasets/earthshot/azuero-trees-1024/
Paper: BiomeAzuero2022: A Fine-Grained Dataset and Baselines For Tree Species Classification

This script:
1. Helps download the Terminalia catappa folder from Kaggle
2. Analyzes images for color distribution
3. Creates labeled training data for the color classifier
4. Supports manual labeling interface for accuracy
"""

import os
import sys
import json
import shutil
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import numpy as np

# Add parent to path
sys.path.append(str(Path(__file__).parent.parent))

# Dataset configuration
KAGGLE_DATASET = "earthshot/azuero-trees-1024"
TALISAY_FOLDER = "harvard_azuero_1024/Terminalia catappa"
LOCAL_DATASET_DIR = Path(__file__).parent / "kaggle_talisay"
LABELED_DATA_FILE = LOCAL_DATASET_DIR / "labeled_images.json"


def check_kaggle_api():
    """Check if Kaggle API is installed and configured."""
    try:
        import kaggle
        print("✓ Kaggle API is installed")
        return True
    except ImportError:
        print("✗ Kaggle API not installed")
        print("  Install with: pip install kaggle")
        return False
    except Exception as e:
        print(f"✗ Kaggle API error: {e}")
        print("  Make sure your kaggle.json credentials are set up")
        print("  See: https://www.kaggle.com/docs/api")
        return False


def download_dataset():
    """
    Download the Terminalia catappa images from Kaggle.
    
    Note: Requires Kaggle API credentials (~/.kaggle/kaggle.json)
    """
    if not check_kaggle_api():
        print("\n--- Manual Download Instructions ---")
        print(f"1. Go to: https://www.kaggle.com/datasets/{KAGGLE_DATASET}")
        print("2. Click 'Download' and extract the ZIP")
        print(f"3. Copy the '{TALISAY_FOLDER}' folder to:")
        print(f"   {LOCAL_DATASET_DIR}")
        return False
    
    import kaggle
    
    LOCAL_DATASET_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"\nDownloading dataset: {KAGGLE_DATASET}")
    print("This may take a while (dataset is ~6.5 GB total)...")
    
    try:
        # Download only the Terminalia catappa folder
        kaggle.api.dataset_download_files(
            KAGGLE_DATASET,
            path=str(LOCAL_DATASET_DIR),
            unzip=True
        )
        print(f"✓ Dataset downloaded to: {LOCAL_DATASET_DIR}")
        return True
    except Exception as e:
        print(f"✗ Download failed: {e}")
        return False


def find_talisay_images(base_path: Path = None) -> List[Path]:
    """
    Find all Talisay fruit images in the dataset.
    
    Returns:
        List of paths to fruit images
    """
    if base_path is None:
        base_path = LOCAL_DATASET_DIR
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    images = []
    
    # Look for Terminalia catappa folder
    talisay_paths = [
        base_path / "harvard_azuero_1024" / "Terminalia catappa",
        base_path / "Terminalia catappa",
        base_path / "terminalia_catappa",
        base_path,  # Direct path if already in correct folder
    ]
    
    for search_path in talisay_paths:
        if search_path.exists():
            for root, dirs, files in os.walk(search_path):
                for file in files:
                    if Path(file).suffix.lower() in image_extensions:
                        images.append(Path(root) / file)
    
    # Remove duplicates
    images = list(set(images))
    
    print(f"Found {len(images)} Talisay fruit images")
    return sorted(images)


def analyze_image_colors(image_path: Path) -> Dict:
    """
    Analyze an image to determine fruit color characteristics.
    
    Returns:
        Dictionary with color analysis results
    """
    import cv2
    
    img = cv2.imread(str(image_path))
    if img is None:
        return {"error": f"Could not load image: {image_path}"}
    
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Use our classifier's methods for consistency
    from models.color_classifier import SimpleColorClassifier
    classifier = SimpleColorClassifier()
    
    try:
        result = classifier.predict(str(image_path))
        
        return {
            "path": str(image_path),
            "filename": image_path.name,
            "size": f"{w}x{h}",
            "predicted_color": result["predicted_color"],
            "confidence": result["confidence"],
            "probabilities": result["probabilities"],
            "has_spots": result.get("has_spots", False),
            "spot_coverage": result.get("spot_coverage_percent", 0),
            "debug_info": result.get("debug_info", {})
        }
    except Exception as e:
        return {
            "path": str(image_path),
            "filename": image_path.name,
            "error": str(e)
        }


def batch_analyze_images(images: List[Path], output_file: Path = None) -> List[Dict]:
    """
    Analyze multiple images and save results.
    
    Args:
        images: List of image paths
        output_file: Optional JSON file to save results
        
    Returns:
        List of analysis results
    """
    results = []
    total = len(images)
    
    print(f"\nAnalyzing {total} images...")
    
    for i, img_path in enumerate(images, 1):
        if i % 10 == 0 or i == 1:
            print(f"  Processing {i}/{total}: {img_path.name}")
        
        result = analyze_image_colors(img_path)
        results.append(result)
    
    # Save results
    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✓ Results saved to: {output_file}")
    
    # Summary
    colors = {}
    errors = 0
    for r in results:
        if "error" in r:
            errors += 1
        else:
            color = r.get("predicted_color", "unknown")
            colors[color] = colors.get(color, 0) + 1
    
    print(f"\n--- Analysis Summary ---")
    print(f"Total images: {total}")
    print(f"Errors: {errors}")
    print("Predicted colors:")
    for color, count in sorted(colors.items()):
        print(f"  {color}: {count} ({count/total*100:.1f}%)")
    
    return results


def create_manual_labeling_interface(images: List[Path]) -> Dict:
    """
    Interactive interface for manually labeling fruit colors.
    
    This creates ground truth labels for training.
    """
    print("\n" + "=" * 60)
    print("MANUAL IMAGE LABELING INTERFACE")
    print("=" * 60)
    print("\nThis will help create accurate training labels.")
    print("For each image, you'll specify the fruit color.")
    print("\nCommands:")
    print("  g - Green (immature)")
    print("  y - Yellow (mature)")
    print("  b - Brown (fully ripe)")
    print("  t - Transitional (mixed colors)")
    print("  s - Skip (not a fruit/unclear)")
    print("  q - Quit and save progress")
    print("=" * 60)
    
    labels = {}
    
    # Load existing labels if any
    if LABELED_DATA_FILE.exists():
        with open(LABELED_DATA_FILE, 'r') as f:
            labels = json.load(f)
        print(f"\nLoaded {len(labels)} existing labels")
    
    try:
        for i, img_path in enumerate(images, 1):
            filename = img_path.name
            
            # Skip if already labeled
            if filename in labels:
                continue
            
            print(f"\n[{i}/{len(images)}] Image: {filename}")
            
            # Show auto-prediction
            result = analyze_image_colors(img_path)
            if "predicted_color" in result:
                pred = result["predicted_color"]
                conf = result["confidence"]
                print(f"  Auto-prediction: {pred.upper()} ({conf*100:.1f}%)")
                if result.get("has_spots"):
                    print(f"  Spots detected: {result.get('spot_coverage', 0):.1f}%")
            
            # Get user input
            while True:
                choice = input("  Your label (g/y/b/t/s/q): ").strip().lower()
                
                if choice == 'q':
                    raise KeyboardInterrupt
                elif choice == 'g':
                    labels[filename] = {"color": "green", "path": str(img_path)}
                    break
                elif choice == 'y':
                    labels[filename] = {"color": "yellow", "path": str(img_path)}
                    break
                elif choice == 'b':
                    labels[filename] = {"color": "brown", "path": str(img_path)}
                    break
                elif choice == 't':
                    labels[filename] = {"color": "transitional", "path": str(img_path)}
                    break
                elif choice == 's':
                    labels[filename] = {"color": "skip", "path": str(img_path)}
                    break
                else:
                    print("  Invalid choice. Use g/y/b/t/s/q")
    
    except KeyboardInterrupt:
        print("\n\nLabeling interrupted. Saving progress...")
    
    # Save labels
    LABELED_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LABELED_DATA_FILE, 'w') as f:
        json.dump(labels, f, indent=2)
    
    print(f"\n✓ Saved {len(labels)} labels to: {LABELED_DATA_FILE}")
    
    # Summary
    color_counts = {}
    for data in labels.values():
        color = data.get("color", "unknown")
        color_counts[color] = color_counts.get(color, 0) + 1
    
    print("\nLabel summary:")
    for color, count in sorted(color_counts.items()):
        print(f"  {color}: {count}")
    
    return labels


def prepare_training_data(
    labels_file: Path = None,
    output_dir: Path = None
) -> Tuple[List[Dict], List[Dict]]:
    """
    Prepare training and validation data from labeled images.
    
    Returns:
        Tuple of (training_data, validation_data)
    """
    if labels_file is None:
        labels_file = LABELED_DATA_FILE
    
    if output_dir is None:
        output_dir = LOCAL_DATASET_DIR / "prepared"
    
    if not labels_file.exists():
        print(f"No labels file found at: {labels_file}")
        print("Run manual labeling first or provide labels.")
        return [], []
    
    with open(labels_file, 'r') as f:
        labels = json.load(f)
    
    # Filter valid labels (exclude skip and transitional for now)
    valid_colors = {"green", "yellow", "brown"}
    valid_labels = {
        k: v for k, v in labels.items() 
        if v.get("color") in valid_colors
    }
    
    print(f"\nPreparing training data from {len(valid_labels)} labeled images")
    
    # Create train/val split
    from sklearn.model_selection import train_test_split
    
    items = list(valid_labels.items())
    np.random.seed(42)
    np.random.shuffle(items)
    
    train_items, val_items = train_test_split(
        items, 
        test_size=0.2, 
        random_state=42,
        stratify=[v["color"] for _, v in items]
    )
    
    # Create directories
    for split in ["train", "val"]:
        for color in valid_colors:
            (output_dir / split / color).mkdir(parents=True, exist_ok=True)
    
    # Copy images to organized structure
    def copy_items(items, split_name):
        data = []
        for filename, info in items:
            src_path = Path(info["path"])
            color = info["color"]
            dst_path = output_dir / split_name / color / filename
            
            if src_path.exists():
                shutil.copy2(src_path, dst_path)
                data.append({
                    "filename": filename,
                    "color": color,
                    "path": str(dst_path)
                })
        return data
    
    train_data = copy_items(train_items, "train")
    val_data = copy_items(val_items, "val")
    
    print(f"✓ Training set: {len(train_data)} images")
    print(f"✓ Validation set: {len(val_data)} images")
    print(f"✓ Output directory: {output_dir}")
    
    return train_data, val_data


def print_usage():
    """Print usage instructions."""
    print("""
Kaggle Dataset Loader for Talisay Fruit Images
==============================================

This script helps you use the Biome Azuero 2022 dataset for training.

STEP 1: Download the dataset
-----------------------------
Option A (with Kaggle API):
    pip install kaggle
    # Set up ~/.kaggle/kaggle.json with your credentials
    python kaggle_dataset_loader.py download

Option B (manual download):
    1. Go to: https://www.kaggle.com/datasets/earthshot/azuero-trees-1024/
    2. Download and extract the ZIP
    3. Copy the 'Terminalia catappa' folder to:
       {local_dir}

STEP 2: Analyze images
-----------------------
    python kaggle_dataset_loader.py analyze

STEP 3: Label images (for ground truth)
----------------------------------------
    python kaggle_dataset_loader.py label

STEP 4: Prepare training data
------------------------------
    python kaggle_dataset_loader.py prepare

    """.format(local_dir=LOCAL_DATASET_DIR))


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Kaggle Dataset Loader for Talisay Fruit Images"
    )
    parser.add_argument(
        "command",
        nargs="?",
        choices=["download", "analyze", "label", "prepare", "help"],
        default="help",
        help="Command to run"
    )
    parser.add_argument(
        "--path",
        type=str,
        help="Custom path to dataset directory"
    )
    
    args = parser.parse_args()
    
    if args.command == "help":
        print_usage()
    
    elif args.command == "download":
        download_dataset()
    
    elif args.command == "analyze":
        search_path = Path(args.path) if args.path else LOCAL_DATASET_DIR
        images = find_talisay_images(search_path)
        
        if images:
            output_file = LOCAL_DATASET_DIR / "analysis_results.json"
            batch_analyze_images(images, output_file)
        else:
            print("No images found. Please download the dataset first.")
    
    elif args.command == "label":
        search_path = Path(args.path) if args.path else LOCAL_DATASET_DIR
        images = find_talisay_images(search_path)
        
        if images:
            create_manual_labeling_interface(images)
        else:
            print("No images found. Please download the dataset first.")
    
    elif args.command == "prepare":
        train_data, val_data = prepare_training_data()
        if train_data:
            print("\nTraining data is ready!")
            print("Run the training script to train on real images.")
