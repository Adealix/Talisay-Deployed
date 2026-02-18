"""Generate report from saved test results"""
import json
import numpy as np
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Load results
results_file = Path(__file__).parent / "test_results" / "green_full_pipeline_results_20260216_115652.json"

with open(results_file, 'r') as f:
    data = json.load(f)

results = data["results"]
stats = data["statistics"]

# Generate report
report = []
report.append("=" * 100)
report.append("COMPREHENSIVE GREEN TALISAY FRUIT MODEL TESTING REPORT")
report.append("=" * 100)
report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
report.append(f"Testing: Full Model Pipeline (All Components)")
report.append("")

for dataset_name in ["existing_datasets_green", "own_datasets_green", "own_datasets_green_nocoin"]:
    report.append("\n" + "=" * 100)
    report.append(f"DATASET: {dataset_name}")
    report.append("=" * 100)
    
    dataset_results = results[dataset_name]
    dataset_stats = stats[dataset_name]
    
    if not dataset_results:
        report.append("No results for this dataset.")
        continue
    
    # Basic stats
    total_tested = len(dataset_results)
    valid_talisay = sum(1 for r in dataset_results if r["is_talisay"] and r["analysis_complete"])
    rejected = total_tested - valid_talisay
    
    report.append(f"\nTotal Images Tested: {total_tested}")
    report.append(f"Valid Talisay Fruits: {valid_talisay}")
    report.append(f"Rejected/Failed: {rejected}")
    
    if valid_talisay == 0:
        report.append("\nNo valid Talisay fruits detected.")
        continue
    
    # Color Classification Results
    report.append("\n" + "-" * 100)
    report.append("COLOR CLASSIFICATION")
    report.append("-" * 100)
    
    color_counts = defaultdict(int)
    for color in dataset_stats["colors"]:
        color_counts[color] += 1
    
    report.append(f"\nColor Distribution:")
    for color, count in sorted(color_counts.items()):
        percentage = (count / valid_talisay) * 100
        report.append(f"  {color.capitalize():10s}: {count:4d} ({percentage:5.1f}%)")
    
    if dataset_stats.get("color_confidences"):
        confidences = dataset_stats["color_confidences"]
        report.append(f"\nColor Confidence:")
        report.append(f"  Average: {np.mean(confidences):.2%}")
        report.append(f"  Min:     {np.min(confidences):.2%}")
        report.append(f"  Max:     {np.max(confidences):.2%}")
    
    # Spot Detection
    if dataset_stats.get("has_spots"):
        spots_detected = sum(dataset_stats["has_spots"])
        spots_percentage = (spots_detected / valid_talisay) * 100
        report.append(f"\nSpot Detection:")
        report.append(f"  Fruits with spots: {spots_detected}/{valid_talisay} ({spots_percentage:.1f}%)")
        if dataset_stats.get("spot_coverage"):
            avg_coverage = np.mean(dataset_stats["spot_coverage"])
            report.append(f"  Average spot coverage: {avg_coverage:.1f}%")
    
    # Dimension Estimation Results
    report.append("\n" + "-" * 100)
    report.append("DIMENSION ESTIMATION")
    report.append("-" * 100)
    
    if dataset_stats.get("coin_detected"):
        coins_found = sum(dataset_stats["coin_detected"])
        coin_percentage = (coins_found / valid_talisay) * 100
        report.append(f"\nCoin Reference Detection:")
        report.append(f"  Coins detected: {coins_found}/{valid_talisay} ({coin_percentage:.1f}%)")
    
    if dataset_stats.get("lengths"):
        lengths = dataset_stats["lengths"]
        report.append(f"\nFruit Length (cm):")
        report.append(f"  Average: {np.mean(lengths):.2f} cm")
        report.append(f"  Min:     {np.min(lengths):.2f} cm")
        report.append(f"  Max:     {np.max(lengths):.2f} cm")
        report.append(f"  Std Dev: {np.std(lengths):.2f} cm")
    
    if dataset_stats.get("widths"):
        widths = dataset_stats["widths"]
        report.append(f"\nFruit Width (cm):")
        report.append(f"  Average: {np.mean(widths):.2f} cm")
        report.append(f"  Min:     {np.min(widths):.2f} cm")
        report.append(f"  Max:     {np.max(widths):.2f} cm")
        report.append(f"  Std Dev: {np.std(widths):.2f} cm")
    
    if dataset_stats.get("kernel_masses"):
        kernel_masses = dataset_stats["kernel_masses"]
        report.append(f"\nKernel Mass (g):")
        report.append(f"  Average: {np.mean(kernel_masses):.2f} g")
        report.append(f"  Min:     {np.min(kernel_masses):.2f} g")
        report.append(f"  Max:     {np.max(kernel_masses):.2f} g")
    
    if dataset_stats.get("fruit_weights"):
        fruit_weights = dataset_stats["fruit_weights"]
        report.append(f"\nWhole Fruit Weight (g):")
        report.append(f"  Average: {np.mean(fruit_weights):.2f} g")
        report.append(f"  Min:     {np.min(fruit_weights):.2f} g")
        report.append(f"  Max:     {np.max(fruit_weights):.2f} g")
    
    # Oil Yield Prediction Results
    report.append("\n" + "-" * 100)
    report.append("OIL YIELD PREDICTION")
    report.append("-" * 100)
    
    if dataset_stats.get("oil_yields"):
        oil_yields = dataset_stats["oil_yields"]
        report.append(f"\nOil Yield (%):")
        report.append(f"  Average: {np.mean(oil_yields):.2f}%")
        report.append(f"  Min:     {np.min(oil_yields):.2f}%")
        report.append(f"  Max:     {np.max(oil_yields):.2f}%")
        report.append(f"  Std Dev: {np.std(oil_yields):.2f}%")
    
    if dataset_stats.get("oil_confidences"):
        oil_confidences = dataset_stats["oil_confidences"]
        report.append(f"\nOil Yield Confidence:")
        report.append(f"  Average: {np.mean(oil_confidences):.2%}")
        report.append(f"  Min:     {np.min(oil_confidences):.2%}")
        report.append(f"  Max:     {np.max(oil_confidences):.2%}")
    
    # Yield Category Distribution
    yield_categories = defaultdict(int)
    for r in dataset_results:
        if r["is_talisay"] and r["analysis_complete"]:
            yield_categories[r["yield_category"]] += 1
    
    if yield_categories:
        report.append(f"\nYield Categories:")
        for category, count in sorted(yield_categories.items()):
            percentage = (count / valid_talisay) * 100
            report.append(f"  {category.capitalize():15s}: {count:4d} ({percentage:5.1f}%)")
    
    # Overall Confidence
    report.append("\n" + "-" * 100)
    report.append("OVERALL PERFORMANCE")
    report.append("-" * 100)
    
    if dataset_stats.get("overall_confidences"):
        overall_confidences = dataset_stats["overall_confidences"]
        report.append(f"\nOverall Confidence:")
        report.append(f"  Average: {np.mean(overall_confidences):.2%}")
        report.append(f"  Min:     {np.min(overall_confidences):.2%}")
        report.append(f"  Max:     {np.max(overall_confidences):.2%}")
    
    # Success Rate
    success_rate = (valid_talisay / total_tested) * 100 if total_tested > 0 else 0
    report.append(f"\nSuccess Rate: {success_rate:.1f}% ({valid_talisay}/{total_tested})")

# Summary
report.append("\n" + "=" * 100)
report.append("OVERALL SUMMARY")
report.append("=" * 100)

total_tested = sum(len(results[ds]) for ds in results)
total_valid = sum(
    sum(1 for r in results[ds] if r["is_talisay"] and r["analysis_complete"])
    for ds in results
)

report.append(f"\nTotal Images Tested: {total_tested}")
report.append(f"Total Valid Talisay Fruits: {total_valid}")
report.append(f"Overall Success Rate: {(total_valid/total_tested)*100:.1f}%")

# Print and save report
report_text = "\n".join(report)
print(report_text)

# Save to file
output_file = Path(__file__).parent / "test_results" / "green_full_pipeline_report.txt"
with open(output_file, 'w') as f:
    f.write(report_text)

print(f"\n\n✓ Report saved to: {output_file}")
