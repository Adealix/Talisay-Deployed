"""
Diagnostic tool to analyze why segmentation is failing
"""
import sys
from pathlib import Path
import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))


def diagnose_image(image_path: str):
    """Analyze an image to understand segmentation challenges."""
    print(f"\n{'='*70}")
    print(f"  IMAGE DIAGNOSTICS: {Path(image_path).name}")
    print(f"{'='*70}\n")
    
    img = cv2.imread(image_path)
    if img is None:
        print(f" Could not load image")
        return
    
    h, w = img.shape[:2]
    out_dir = Path(image_path).parent
    base_name = Path(image_path).stem
    
    # Convert to different color spaces
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h_ch, s_ch, v_ch = cv2.split(hsv)
    
    print(f"1. IMAGE PROPERTIES")
    print(f"   Size: {w} x {h} pixels")
    print(f"   Total pixels: {h*w:,}")
    
    # Analyze color distribution
    print(f"\n2. COLOR ANALYSIS (HSV)")
    print(f"   Hue:        mean={np.mean(h_ch):.1f}, std={np.std(h_ch):.1f}, range=[{h_ch.min()}, {h_ch.max()}]")
    print(f"   Saturation: mean={np.mean(s_ch):.1f}, std={np.std(s_ch):.1f}, range=[{s_ch.min()}, {s_ch.max()}]")
    print(f"   Value:      mean={np.mean(v_ch):.1f}, std={np.std(v_ch):.1f}, range=[{v_ch.min()}, {v_ch.max()}]")
    
    # Check for green dominance
    green_hue = (h_ch >= 35) & (h_ch <= 90)
    green_pixels = np.sum(green_hue)
    green_pct = green_pixels / (h * w) * 100
    print(f"\n3. GREEN DETECTION")
    print(f"   Pixels in green hue range (35-90): {green_pixels:,} ({green_pct:.1f}%)")
    
    # Saturation analysis
    low_sat = s_ch < 50
    med_sat = (s_ch >= 50) & (s_ch < 100)
    high_sat = s_ch >= 100
    print(f"\n4. SATURATION DISTRIBUTION")
    print(f"   Low (<50):    {np.sum(low_sat):,} pixels ({np.sum(low_sat)/(h*w)*100:.1f}%)")
    print(f"   Medium (50-100): {np.sum(med_sat):,} pixels ({np.sum(med_sat)/(h*w)*100:.1f}%)")
    print(f"   High (>100):  {np.sum(high_sat):,} pixels ({np.sum(high_sat)/(h*w)*100:.1f}%)")
    
    # Edge detection
    edges = cv2.Canny(gray, 30, 100)
    edge_pixels = np.sum(edges > 0)
    print(f"\n5. EDGE DETECTION")
    print(f"   Edge pixels: {edge_pixels:,} ({edge_pixels/(h*w)*100:.1f}%)")
    
    # Texture analysis
    kernel_size = 15
    mean = cv2.blur(gray, (kernel_size, kernel_size))
    mean_sq = cv2.blur(gray.astype(np.float32) ** 2, (kernel_size, kernel_size))
    std = np.sqrt(np.abs(mean_sq - mean.astype(np.float32) ** 2))
    print(f"\n6. TEXTURE ANALYSIS (Local Std Dev)")
    print(f"   Mean local std: {np.mean(std):.1f}")
    print(f"   Std dev range: [{std.min():.1f}, {std.max():.1f}]")
    
    # Shadow detection
    dark_regions = v_ch < np.percentile(v_ch, 30)
    low_sat_regions = s_ch < 60
    shadows = dark_regions & low_sat_regions
    shadow_pixels = np.sum(shadows)
    print(f"\n7. SHADOW DETECTION")
    print(f"   Shadow pixels: {shadow_pixels:,} ({shadow_pixels/(h*w)*100:.1f}%)")
    
    # Find contours using different methods
    print(f"\n8. CONTOUR DETECTION")
    
    # Method 1: Simple thresholding on saturation
    _, sat_thresh = cv2.threshold(s_ch, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours_sat, _ = cv2.findContours(sat_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    print(f"   Saturation + Otsu: {len(contours_sat)} contours")
    
    # Analyze largest contours
    if contours_sat:
        areas = [cv2.contourArea(c) for c in contours_sat]
        areas.sort(reverse=True)
        top_5 = areas[:5]
        print(f"   Top 5 areas: {[f'{a/(h*w)*100:.1f}%' for a in top_5]}")
        
        # Check shape of largest
        largest = max(contours_sat, key=cv2.contourArea)
        if len(largest) >= 5:
            ellipse = cv2.fitEllipse(largest)
            (cx, cy), (minor, major), angle = ellipse
            if minor > major:
                minor, major = major, minor
            aspect_ratio = major / max(1, minor)
            perimeter = cv2.arcLength(largest, True)
            area = cv2.contourArea(largest)
            circularity = 4 * np.pi * area / (perimeter ** 2) if perimeter > 0 else 0
            print(f"   Largest contour shape:")
            print(f"      Aspect ratio: {aspect_ratio:.2f}")
            print(f"      Circularity: {circularity:.2f}")
    
    # Save diagnostic images
    print(f"\n9. SAVING DIAGNOSTIC IMAGES")
        
    # Save saturation channel
    sat_vis_path = out_dir / f"{base_name}_diag_saturation.png"
    cv2.imwrite(str(sat_vis_path), s_ch)
    print(f"   Saved: {sat_vis_path.name}")
    
    # Save value channel
    val_vis_path = out_dir / f"{base_name}_diag_value.png"
    cv2.imwrite(str(val_vis_path), v_ch)
    print(f"   Saved: {val_vis_path.name}")
    
    # Save edges
    edge_vis_path = out_dir / f"{base_name}_diag_edges.png"
    cv2.imwrite(str(edge_vis_path), edges)
    print(f"   Saved: {edge_vis_path.name}")
    
    # Save texture (std dev)
    std_norm = (std / std.max() * 255).astype(np.uint8)
    texture_vis_path = out_dir / f"{base_name}_diag_texture.png"
    cv2.imwrite(str(texture_vis_path), std_norm)
    print(f"   Saved: {texture_vis_path.name}")
    
    # Save shadows
    shadow_mask = (shadows.astype(np.uint8) * 255)
    shadow_vis_path = out_dir / f"{base_name}_diag_shadows.png"
    cv2.imwrite(str(shadow_vis_path), shadow_mask)
    print(f"   Saved: {shadow_vis_path.name}")
    
    # Save contours overlay
    contour_overlay = img.copy()
    cv2.drawContours(contour_overlay, contours_sat, -1, (0, 255, 0), 2)
    contour_vis_path = out_dir / f"{base_name}_diag_contours.png"
    cv2.imwrite(str(contour_vis_path), contour_overlay)
    print(f"   Saved: {contour_vis_path.name}")
    
    print(f"\n{'='*70}")
    print(f"  DIAGNOSIS COMPLETE")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Diagnose segmentation issues")
    parser.add_argument("image", help="Path to the image to analyze")
    
    args = parser.parse_args()
    diagnose_image(args.image)
