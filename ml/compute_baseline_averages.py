"""
Compute averaged baseline metrics from ALL existing dataset images.
Run this ONCE after training to pre-compute baseline statistics.
Results are saved to averaged_baselines.json for instant retrieval.

Usage:
    python compute_baseline_averages.py
    python compute_baseline_averages.py --colors green yellow brown
"""

import os
import json
import statistics
from pathlib import Path
from PIL import Image
import base64
from io import BytesIO
import argparse

# Import predictor from existing code
from predict import TalisayPredictor

def safe_mean(values):
    """Compute mean, filtering out None values and converting numpy types"""
    import numpy as np
    # Convert numpy types to Python types and filter None
    filtered = []
    for v in values:
        if v is not None:
            # Convert numpy types to Python types
            if isinstance(v, (np.integer, np.floating)):
                filtered.append(float(v))
            elif isinstance(v, np.ndarray):
                filtered.append(float(v.item()))
            else:
                filtered.append(float(v))
    return statistics.mean(filtered) if filtered else None

def safe_mode(values):
    """Compute mode, filtering out None values"""
    filtered = [v for v in values if v is not None]
    if not filtered:
        return None
    try:
        return statistics.mode(filtered)
    except statistics.StatisticsError:
        # Multiple modes - return most frequent
        from collections import Counter
        return Counter(filtered).most_common(1)[0][0]

def analyze_all_images(color, predictor, max_images=None):
    """
    Analyze ALL images from existing_datasets/{color} folder.
    Returns aggregated statistics and representative image.
    
    Args:
        color: 'green', 'yellow', or 'brown'
        predictor: TalisayPredictor instance
        max_images: Optional limit on number of images to process (None = all)
    """
    dataset_dir = Path(__file__).parent / "data" / "training" / "existing_datasets" / color
    
    if not dataset_dir.exists():
        print(f"❌ Directory not found: {dataset_dir}")
        return None
    
    # Get all image files
    image_files = [f for f in dataset_dir.glob("*.jpg")] + [f for f in dataset_dir.glob("*.png")]
    
    if not image_files:
        print(f"❌ No images found in {dataset_dir}")
        return None
    
    total_images = len(image_files)
    
    # Limit number of images if specified
    if max_images and max_images < total_images:
        print(f"📊 Analyzing {max_images} images (limited from {total_images}) from existing_datasets/{color}...")
        image_files = image_files[:max_images]
    else:
        print(f"\n📊 Analyzing {total_images} images from existing_datasets/{color}...")
    
    # Analyze each image
    results = []
    failures = 0
    for i, img_path in enumerate(image_files, 1):
        try:
            # Load and analyze image
            img = Image.open(img_path).convert('RGB')
            
            # Analyze with individual error handling
            result = predictor.analyze_image(img)
            
            if result and not result.get('error'):  # Check if error is None/False, not if key exists
                results.append({
                    'path': str(img_path.name),
                    'result': result
                })
            else:
                failures += 1
                
            # Close image to free memory
            img.close()
                
            # Progress indicator
            if i % 10 == 0:
                print(f"  ✓ Processed {i}/{total_images} images ({len(results)} successful, {failures} failed)...")
                
        except KeyboardInterrupt:
            print(f"\n⚠ Interrupted by user at {i}/{total_images} images")
            if len(results) < 10:
                print("❌ Not enough successful analyses to compute baseline")
                return None
            print(f"✓ Using {len(results)} successfully analyzed images")
            break
        except Exception as e:
            failures += 1
            if i % 50 == 0:
                print(f"  ⚠ Failed to analyze {img_path.name}: {str(e)[:50]}...")
            continue
    
    if not results:
        print(f"❌ No successful analyses for {color}")
        return None
    
    print(f"✓ Successfully analyzed {len(results)}/{total_images} images")
    
    # Compute aggregated statistics
    oil_yields = [r['result'].get('oil_yield_percent') for r in results]
    categories = [r['result'].get('color') for r in results]
    maturities = [r['result'].get('maturity_stage') for r in results]
    confidences = [r['result'].get('overall_confidence') for r in results]
    
    # Dimensions
    lengths = [r['result']['dimensions'].get('length_cm') for r in results if 'dimensions' in r['result']]
    widths = [r['result']['dimensions'].get('width_cm') for r in results if 'dimensions' in r['result']]
    weights = [r['result']['dimensions'].get('kernel_mass_g') for r in results if 'dimensions' in r['result']]
    
    # Detection rates
    spots_detected = sum(1 for r in results if r['result'].get('has_spots', False))
    reference_detected = sum(1 for r in results if r['result'].get('reference_detected', False))
    
    # Pick median oil yield image as representative (avoids outliers)
    oil_yields_with_idx = [(i, oy) for i, oy in enumerate(oil_yields) if oy is not None]
    if oil_yields_with_idx:
        oil_yields_with_idx.sort(key=lambda x: x[1])
        median_idx = oil_yields_with_idx[len(oil_yields_with_idx) // 2][0]
        representative_path = dataset_dir / results[median_idx]['path']
        
        # Convert to base64
        with Image.open(representative_path) as img:
            buffered = BytesIO()
            img.save(buffered, format="JPEG", quality=85)
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    else:
        img_base64 = None
    
    # Aggregate results
    averaged_result = {
        'color': color,
        'totalImages': total_images,
        'analyzedImages': len(results),
        'oilYieldPercent': safe_mean(oil_yields),
        'colorCategory': safe_mode(categories),
        'maturityStage': safe_mode(maturities),
        'confidence': safe_mean(confidences),
        'dimensions': {
            'length': safe_mean(lengths),
            'width': safe_mean(widths),
            'weight': safe_mean(weights),
        },
        'seedSpotsDetectionRate': (spots_detected / len(results) * 100) if results else 0,
        'referenceDetectionRate': (reference_detected / len(results) * 100) if results else 0,
        'representativeImage': img_base64,
        'yieldCategory': results[median_idx]['result'].get('yield_category') if oil_yields_with_idx else None,
    }
    
    return averaged_result


def main():
    parser = argparse.ArgumentParser(description='Pre-compute averaged baselines from existing dataset')
    parser.add_argument('--colors', nargs='+', default=['green', 'yellow', 'brown'],
                        help='Color categories to process (default: green yellow brown)')
    parser.add_argument('--limit', type=int, default=None,
                        help='Limit number of images per color (default: None = process all)')
    args = parser.parse_args()
    
    print("=" * 60)
    print("Computing Averaged Baselines for Existing Dataset")
    print("=" * 60)
    
    # Initialize predictor
    print("\n🔧 Initializing ML predictor...")
    predictor = TalisayPredictor()
    print("✓ Predictor initialized")
    
    # Compute averages for each color
    baselines = {}
    
    for color in args.colors:
        result = analyze_all_images(color, predictor, max_images=args.limit)
        if result:
            baselines[color] = result
            print(f"\n✓ {color.upper()} baseline computed:")
            print(f"  Oil Yield: {result['oilYieldPercent']:.1f}%")
            print(f"  Category: {result['colorCategory']}")
            print(f"  Maturity: {result['maturityStage']}")
            print(f"  Images: {result['analyzedImages']}/{result['totalImages']}")
        else:
            print(f"\n⚠ Failed to compute baseline for {color}")
    
    # Save to JSON file
    output_file = Path(__file__).parent / "averaged_baselines.json"
    
    # Don't include base64 images in JSON (too large) - will load on demand
    baselines_to_save = {}
    for color, data in baselines.items():
        baselines_to_save[color] = {k: v for k, v in data.items() if k != 'representativeImage'}
        # Save representative image separately
        if data.get('representativeImage'):
            img_file = Path(__file__).parent / f"baseline_{color}.jpg"
            img_data = base64.b64decode(data['representativeImage'])
            with open(img_file, 'wb') as f:
                f.write(img_data)
            baselines_to_save[color]['representativeImageFile'] = f"baseline_{color}.jpg"
    
    with open(output_file, 'w') as f:
        json.dump(baselines_to_save, f, indent=2)
    
    print(f"\n" + "=" * 60)
    print(f"✓ Averaged baselines saved to: {output_file}")
    print(f"✓ Representative images saved as: baseline_{{color}}.jpg")
    print("=" * 60)
    print("\n💡 These pre-computed baselines will be used for instant comparison!")


if __name__ == "__main__":
    main()
