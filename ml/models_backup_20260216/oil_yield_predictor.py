"""
Oil Yield Prediction Model for Talisay Fruit
Predicts seed-to-oil ratio based on fruit characteristics
"""

import numpy as np
import pandas as pd
from pathlib import Path
import sys
import joblib

sys.path.append(str(Path(__file__).parent.parent))

from config import (
    OIL_YIELD_BY_COLOR,
    CORRELATION_FACTORS,
    DIMENSION_RANGES,
    OIL_YIELD_MODEL_CONFIG,
    MODELS_DIR
)


class OilYieldPredictor:
    """
    Machine learning model to predict Talisay fruit oil yield.
    
    Uses an ensemble of Random Forest and Gradient Boosting models
    trained on synthetic data based on scientific research parameters.
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize the oil yield predictor.
        
        Args:
            model_path: Path to pre-trained model
        """
        self.rf_model = None
        self.gb_model = None
        self.scaler = None
        self.is_trained = False
        self.feature_names = [
            "color_encoded",
            "length_cm",
            "width_cm",
            "kernel_mass_g",
            "whole_fruit_weight_g",
            "length_width_ratio",
            "kernel_fruit_ratio"
        ]
        
        if model_path and Path(model_path).exists():
            self.load_model(model_path)
    
    def build_models(self):
        """Build the ensemble prediction models."""
        from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
        from sklearn.preprocessing import StandardScaler
        
        # Random Forest model
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        # Gradient Boosting model
        self.gb_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        # Feature scaler
        self.scaler = StandardScaler()
        
        print("Models built successfully!")
    
    def prepare_features(self, data: dict | pd.DataFrame) -> np.ndarray:
        """
        Prepare input features for prediction.
        
        Args:
            data: Dictionary or DataFrame with fruit measurements
            
        Returns:
            Numpy array of features
        """
        if isinstance(data, dict):
            data = pd.DataFrame([data])
        
        # Encode color if string
        if "color" in data.columns and "color_encoded" not in data.columns:
            color_encoding = {"green": 0, "yellow": 1, "brown": 2}
            data = data.copy()
            data["color_encoded"] = data["color"].map(color_encoding)
        
        # Calculate derived features if missing
        if "length_width_ratio" not in data.columns:
            data["length_width_ratio"] = data["length_cm"] / data["width_cm"]
        
        if "kernel_fruit_ratio" not in data.columns:
            data["kernel_fruit_ratio"] = (
                data["kernel_mass_g"] / data["whole_fruit_weight_g"] * 100
            )
        
        # Select and order features
        features = data[self.feature_names].values
        
        return features
    
    def train(
        self,
        train_data: pd.DataFrame,
        val_data: pd.DataFrame = None,
        target_column: str = "oil_yield_percent"
    ):
        """
        Train the ensemble models.
        
        Args:
            train_data: Training DataFrame
            val_data: Validation DataFrame (optional)
            target_column: Name of target column
        """
        from sklearn.metrics import mean_absolute_error, r2_score
        
        if self.rf_model is None:
            self.build_models()
        
        # Prepare features
        X_train = self.prepare_features(train_data)
        y_train = train_data[target_column].values
        
        # Fit scaler
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train models
        print("Training Random Forest...")
        self.rf_model.fit(X_train_scaled, y_train)
        
        print("Training Gradient Boosting...")
        self.gb_model.fit(X_train_scaled, y_train)
        
        self.is_trained = True
        
        # Evaluate on training data
        train_pred = self.predict_batch(train_data)
        train_mae = mean_absolute_error(y_train, train_pred)
        train_r2 = r2_score(y_train, train_pred)
        
        print(f"\nTraining Results:")
        print(f"  MAE: {train_mae:.4f}%")
        print(f"  R²:  {train_r2:.4f}")
        
        # Evaluate on validation data if provided
        if val_data is not None:
            X_val = self.prepare_features(val_data)
            y_val = val_data[target_column].values
            val_pred = self.predict_batch(val_data)
            
            val_mae = mean_absolute_error(y_val, val_pred)
            val_r2 = r2_score(y_val, val_pred)
            
            print(f"\nValidation Results:")
            print(f"  MAE: {val_mae:.4f}%")
            print(f"  R²:  {val_r2:.4f}")
        
        # Feature importance
        print("\nFeature Importance (Random Forest):")
        for name, importance in sorted(
            zip(self.feature_names, self.rf_model.feature_importances_),
            key=lambda x: x[1],
            reverse=True
        ):
            print(f"  {name}: {importance:.4f}")
    
    def predict(self, data: dict) -> dict:
        """
        Predict oil yield for a single fruit sample.
        
        Args:
            data: Dictionary with fruit measurements
                Required keys: color, length_cm, width_cm, 
                              kernel_mass_g, whole_fruit_weight_g
                              
        Returns:
            Dictionary with prediction and confidence
        """
        if not self.is_trained:
            # Use formula-based prediction if model not trained
            return self._formula_predict(data)
        
        # Prepare features
        X = self.prepare_features(data)
        X_scaled = self.scaler.transform(X)
        
        # Get predictions from both models
        rf_pred = self.rf_model.predict(X_scaled)[0]
        gb_pred = self.gb_model.predict(X_scaled)[0]
        
        # Ensemble average
        ensemble_pred = (rf_pred + gb_pred) / 2
        
        # Calculate confidence based on model agreement
        pred_diff = abs(rf_pred - gb_pred)
        confidence = max(0.5, 1.0 - pred_diff / 10)  # Lower confidence if models disagree
        
        # Get yield category
        yield_category = self._get_yield_category(ensemble_pred)
        
        return {
            "oil_yield_percent": round(ensemble_pred, 2),
            "confidence": round(confidence, 3),
            "yield_category": yield_category,
            "model_predictions": {
                "random_forest": round(rf_pred, 2),
                "gradient_boosting": round(gb_pred, 2)
            },
            "interpretation": self._get_interpretation(ensemble_pred, data.get("color", "yellow"))
        }
    
    def predict_batch(self, data: pd.DataFrame) -> np.ndarray:
        """
        Predict oil yield for multiple samples.
        
        Args:
            data: DataFrame with fruit measurements
            
        Returns:
            Array of predictions
        """
        X = self.prepare_features(data)
        X_scaled = self.scaler.transform(X)
        
        rf_pred = self.rf_model.predict(X_scaled)
        gb_pred = self.gb_model.predict(X_scaled)
        
        return (rf_pred + gb_pred) / 2
    
    def _formula_predict(self, data: dict) -> dict:
        """
        Formula-based prediction using scientific research parameters.
        Used when ML model is not trained.
        """
        color = data.get("color", "yellow")
        
        # Base yield from color
        color_params = OIL_YIELD_BY_COLOR.get(color, OIL_YIELD_BY_COLOR["yellow"])
        base_yield = color_params["mean"]
        
        # Adjust based on kernel mass if available
        kernel_mass = data.get("kernel_mass_g")
        if kernel_mass:
            kernel_range = DIMENSION_RANGES["kernel_mass"]
            kernel_normalized = (kernel_mass - kernel_range["min"]) / (
                kernel_range["max"] - kernel_range["min"]
            )
            kernel_normalized = np.clip(kernel_normalized, 0, 1)
            
            # Adjust yield based on kernel mass
            yield_adjustment = (kernel_normalized - 0.5) * 4
            base_yield += yield_adjustment
        
        # Adjust based on fruit size
        length = data.get("length_cm", 5.0)
        width = data.get("width_cm", 3.5)
        
        size_factor = (length * width) / (5.0 * 3.5)  # Normalized to average
        size_adjustment = (size_factor - 1.0) * 2
        base_yield += size_adjustment
        
        # Clip to realistic range
        final_yield = np.clip(base_yield, 45.0, 65.0)
        
        return {
            "oil_yield_percent": round(final_yield, 2),
            "confidence": 0.75,  # Lower confidence for formula-based
            "yield_category": self._get_yield_category(final_yield),
            "method": "formula_based",
            "interpretation": self._get_interpretation(final_yield, color)
        }
    
    def _get_yield_category(self, yield_percent: float) -> str:
        """Categorize oil yield."""
        if yield_percent >= 58:
            return "Excellent"
        elif yield_percent >= 54:
            return "Good"
        elif yield_percent >= 50:
            return "Average"
        else:
            return "Below Average"
    
    def _get_interpretation(self, yield_percent: float, color: str) -> str:
        """Generate human-readable interpretation."""
        category = self._get_yield_category(yield_percent)
        
        interpretations = {
            "Excellent": (
                f"This {color} Talisay fruit has excellent oil yield potential "
                f"({yield_percent:.1f}%). It is ideal for oil extraction."
            ),
            "Good": (
                f"This {color} Talisay fruit has good oil yield potential "
                f"({yield_percent:.1f}%). Suitable for commercial extraction."
            ),
            "Average": (
                f"This {color} Talisay fruit has average oil yield potential "
                f"({yield_percent:.1f}%). Consider waiting for further maturation."
            ),
            "Below Average": (
                f"This {color} Talisay fruit has below average oil yield "
                f"({yield_percent:.1f}%). The fruit may be too immature."
            )
        }
        
        return interpretations.get(category, f"Oil yield: {yield_percent:.1f}%")
    
    def save_model(self, path: str = None):
        """Save trained models to disk."""
        if path is None:
            path = MODELS_DIR / "oil_yield_predictor.joblib"
        
        model_data = {
            "rf_model": self.rf_model,
            "gb_model": self.gb_model,
            "scaler": self.scaler,
            "feature_names": self.feature_names,
            "is_trained": self.is_trained
        }
        
        joblib.dump(model_data, path)
        print(f"Model saved to: {path}")
    
    def load_model(self, path: str):
        """Load trained models from disk."""
        model_data = joblib.load(path)
        
        self.rf_model = model_data["rf_model"]
        self.gb_model = model_data["gb_model"]
        self.scaler = model_data["scaler"]
        self.feature_names = model_data["feature_names"]
        self.is_trained = model_data["is_trained"]
        
        print(f"Model loaded from: {path}")


if __name__ == "__main__":
    # Test the predictor
    print("Testing Oil Yield Predictor...")
    print("=" * 50)
    
    predictor = OilYieldPredictor()
    
    # Test formula-based prediction
    test_samples = [
        {
            "color": "green",
            "length_cm": 4.5,
            "width_cm": 3.0,
            "kernel_mass_g": 0.3,
            "whole_fruit_weight_g": 25.0
        },
        {
            "color": "yellow",
            "length_cm": 5.5,
            "width_cm": 4.0,
            "kernel_mass_g": 0.6,
            "whole_fruit_weight_g": 40.0
        },
        {
            "color": "brown",
            "length_cm": 6.0,
            "width_cm": 4.5,
            "kernel_mass_g": 0.7,
            "whole_fruit_weight_g": 50.0
        }
    ]
    
    for sample in test_samples:
        result = predictor.predict(sample)
        print(f"\nInput: {sample}")
        print(f"Prediction: {result['oil_yield_percent']}%")
        print(f"Category: {result['yield_category']}")
        print(f"Interpretation: {result['interpretation']}")
