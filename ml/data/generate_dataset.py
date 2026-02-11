"""
Synthetic Dataset Generator for Talisay Oil Yield Prediction
Generates training data based on scientific research parameters
"""

import numpy as np
import pandas as pd
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from config import (
    OIL_YIELD_BY_COLOR,
    DIMENSION_RANGES,
    CORRELATION_FACTORS,
    SYNTHETIC_DATA_CONFIG,
    DATA_DIR
)


def generate_synthetic_dataset(
    num_samples: int = 1000,
    save_csv: bool = True,
    output_path: str = None
) -> pd.DataFrame:
    """
    Generate synthetic Talisay fruit dataset based on scientific research.
    
    The dataset correlates fruit dimensions with oil yield using
    parameters derived from peer-reviewed studies.
    
    Args:
        num_samples: Number of samples to generate
        save_csv: Whether to save the dataset to CSV
        output_path: Custom output path for CSV
        
    Returns:
        DataFrame with synthetic fruit data
    """
    np.random.seed(42)  # For reproducibility
    
    # Calculate samples per color based on distribution
    color_dist = SYNTHETIC_DATA_CONFIG["color_distribution"]
    samples_per_color = {
        color: int(num_samples * ratio)
        for color, ratio in color_dist.items()
    }
    
    # Adjust for rounding errors
    remaining = num_samples - sum(samples_per_color.values())
    samples_per_color["yellow"] += remaining
    
    data = []
    
    for color, n_samples in samples_per_color.items():
        color_params = OIL_YIELD_BY_COLOR[color]
        
        for _ in range(n_samples):
            # Generate correlated dimensions
            # Larger fruits tend to have higher oil yield
            
            # Base random factor (0.3 to 1.0) - affects all dimensions
            size_factor = np.random.uniform(0.3, 1.0)
            
            # Generate length (3.5 - 7.0 cm)
            length_range = DIMENSION_RANGES["length"]
            length = length_range["min"] + size_factor * (
                length_range["max"] - length_range["min"]
            )
            length += np.random.normal(0, 0.3)  # Add noise
            length = np.clip(length, length_range["min"], length_range["max"])
            
            # Generate width (2.0 - 5.5 cm) - correlated with length
            width_range = DIMENSION_RANGES["width"]
            width_factor = size_factor + np.random.normal(0, 0.1)
            width_factor = np.clip(width_factor, 0.2, 1.0)
            width = width_range["min"] + width_factor * (
                width_range["max"] - width_range["min"]
            )
            width = np.clip(width, width_range["min"], width_range["max"])
            
            # Generate kernel mass (0.1 - 0.9 g) - correlated with fruit size
            kernel_range = DIMENSION_RANGES["kernel_mass"]
            kernel_factor = size_factor + np.random.normal(0, 0.1)
            kernel_factor = np.clip(kernel_factor, 0.1, 1.0)
            kernel_mass = kernel_range["min"] + kernel_factor * (
                kernel_range["max"] - kernel_range["min"]
            )
            kernel_mass = np.clip(kernel_mass, kernel_range["min"], kernel_range["max"])
            
            # Generate whole fruit weight (15 - 60 g)
            weight_range = DIMENSION_RANGES["whole_fruit_weight"]
            weight_factor = size_factor + np.random.normal(0, 0.1)
            weight_factor = np.clip(weight_factor, 0.1, 1.0)
            whole_weight = weight_range["min"] + weight_factor * (
                weight_range["max"] - weight_range["min"]
            )
            whole_weight = np.clip(whole_weight, weight_range["min"], weight_range["max"])
            
            # Generate spot coverage (0-60%) - real fruits often have spots
            # Green fruits can have spots, yellow less so, brown has natural darkening
            spot_coverage = 0.0
            if color == "green":
                # Green fruits can have 0-50% spot coverage (brown/black spots common)
                if np.random.random() < 0.6:  # 60% of green fruits have spots
                    spot_coverage = np.random.uniform(0.05, 0.50)
            elif color == "yellow":
                # Yellow fruits typically have fewer spots
                if np.random.random() < 0.3:  # 30% of yellow fruits have spots
                    spot_coverage = np.random.uniform(0.02, 0.25)
            else:  # brown
                # Brown fruits may have natural darkening, not classified as spots
                if np.random.random() < 0.2:  # 20% have additional spots
                    spot_coverage = np.random.uniform(0.05, 0.30)
            
            # Calculate oil yield based on color and dimensions
            # Base yield from color
            base_yield = np.random.normal(
                color_params["mean"],
                color_params["std"]
            )
            
            # Adjust yield based on kernel mass (strongest correlator)
            kernel_normalized = (kernel_mass - kernel_range["min"]) / (
                kernel_range["max"] - kernel_range["min"]
            )
            yield_adjustment = (kernel_normalized - 0.5) * 4 * CORRELATION_FACTORS["kernel_mass"]
            
            # Final oil yield
            oil_yield = base_yield + yield_adjustment
            oil_yield = np.clip(oil_yield, 45.0, 65.0)  # Consensus range
            
            # Create sample record
            sample = {
                "fruit_id": f"TALISAY_{len(data):05d}",
                "color": color,
                "length_cm": round(length, 2),
                "width_cm": round(width, 2),
                "kernel_mass_g": round(kernel_mass, 3),
                "whole_fruit_weight_g": round(whole_weight, 1),
                "spot_coverage_percent": round(spot_coverage * 100, 1),
                "has_spots": spot_coverage > 0.05,
                "oil_yield_percent": round(oil_yield, 2),
                "maturity_stage": _get_maturity_stage(color),
            }
            data.append(sample)
    
    # Create DataFrame and shuffle
    df = pd.DataFrame(data)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Add derived features
    df["length_width_ratio"] = round(df["length_cm"] / df["width_cm"], 3)
    df["kernel_fruit_ratio"] = round(
        df["kernel_mass_g"] / df["whole_fruit_weight_g"] * 100, 2
    )  # As percentage
    
    # Encode color for ML
    color_encoding = {"green": 0, "yellow": 1, "brown": 2}
    df["color_encoded"] = df["color"].map(color_encoding)
    
    if save_csv:
        if output_path is None:
            output_path = DATA_DIR / "synthetic_dataset.csv"
        else:
            output_path = Path(output_path)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Dataset saved to: {output_path}")
        print(f"Total samples: {len(df)}")
        print(f"\nSamples per color:")
        print(df["color"].value_counts())
        print(f"\nOil yield statistics by color:")
        print(df.groupby("color")["oil_yield_percent"].describe())
    
    return df


def _get_maturity_stage(color: str) -> str:
    """Map color to maturity stage description."""
    stages = {
        "green": "immature",
        "yellow": "mature",
        "brown": "fully_ripe"
    }
    return stages.get(color, "unknown")


def create_training_validation_split(
    df: pd.DataFrame,
    validation_ratio: float = 0.2,
    test_ratio: float = 0.1,
    stratify_by: str = "color"
) -> tuple:
    """
    Split dataset into training, validation, and test sets.
    
    Args:
        df: Source DataFrame
        validation_ratio: Fraction for validation
        test_ratio: Fraction for testing
        stratify_by: Column to stratify by
        
    Returns:
        Tuple of (train_df, val_df, test_df)
    """
    from sklearn.model_selection import train_test_split
    
    # First split: separate test set
    train_val_df, test_df = train_test_split(
        df,
        test_size=test_ratio,
        stratify=df[stratify_by],
        random_state=42
    )
    
    # Second split: separate validation from training
    adjusted_val_ratio = validation_ratio / (1 - test_ratio)
    train_df, val_df = train_test_split(
        train_val_df,
        test_size=adjusted_val_ratio,
        stratify=train_val_df[stratify_by],
        random_state=42
    )
    
    print(f"Training samples: {len(train_df)}")
    print(f"Validation samples: {len(val_df)}")
    print(f"Test samples: {len(test_df)}")
    
    return train_df, val_df, test_df


if __name__ == "__main__":
    # Generate dataset when run directly
    print("Generating Talisay Fruit Synthetic Dataset...")
    print("=" * 50)
    
    df = generate_synthetic_dataset(
        num_samples=SYNTHETIC_DATA_CONFIG["num_samples"],
        save_csv=True
    )
    
    print("\n" + "=" * 50)
    print("Dataset Preview:")
    print(df.head(10).to_string())
    
    print("\n" + "=" * 50)
    print("Creating train/val/test splits...")
    train_df, val_df, test_df = create_training_validation_split(df)
    
    # Save splits
    train_df.to_csv(DATA_DIR / "train.csv", index=False)
    val_df.to_csv(DATA_DIR / "validation.csv", index=False)
    test_df.to_csv(DATA_DIR / "test.csv", index=False)
    print("\nSplit datasets saved successfully!")
