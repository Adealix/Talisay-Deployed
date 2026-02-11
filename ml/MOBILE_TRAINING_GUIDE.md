# Mobile Model Training and Improvement Guide

## 🚀 Overview

This guide explains how to retrain and improve the Talisay fruit detection model for better performance on mobile devices (camera and gallery images).

## 📱 Mobile-Specific Improvements

### What Was Improved?

1. **Enhanced Training with Mobile Augmentation**
   - Simulates variable lighting (shadows, overexposure, underexposure)
   - Handles auto white-balance variations
   - Accounts for motion blur from hand shake
   - Simulates JPEG compression artifacts
   - Tests different camera angles and distances

2. **Mobile-Optimized Fruit Validator**
   - Better coin detection across lighting conditions
   - More lenient shape detection for motion blur
   - Adaptive color ranges for auto-exposure
   - Improved background segmentation
   - Enhanced texture analysis

3. **Model Architecture**
   - MobileNetV3Small/V2 for efficient mobile inference
   - Additional normalization layers for lighting variations
   - Higher dropout for robustness
   - Label smoothing for better generalization

## 🔧 Training the Model

### Prerequisites

Ensure you have the required packages installed:

```powershell
# Install TensorFlow (with GPU support if available)
pip install tensorflow

# Or CPU-only version
pip install tensorflow-cpu

# Other dependencies
pip install pillow opencv-python scikit-learn numpy pandas
```

### Step 1: Prepare Training Data

If you haven't prepared the training data yet:

```powershell
cd ml\data
python auto_label_kaggle.py
```

This will:
- Auto-label the Kaggle fruit images
- Split into train/validation sets
- Organize by color (green, yellow, brown)

### Step 2: Run Complete Training Pipeline

#### Full Training (Recommended)

```powershell
cd ml
python retrain_for_mobile.py
```

This will:
- Validate training data
- Train for 50 epochs + 20 fine-tuning epochs
- Generate evaluation reports
- Save the mobile-optimized model

**Expected Time:**
- With GPU: 30-60 minutes
- With CPU: 2-4 hours

#### Quick Training (For Testing)

```powershell
python retrain_for_mobile.py --quick
```

Trains with reduced epochs (10 + 5) for faster iteration during testing.

**Expected Time:**
- With GPU: 10-15 minutes
- With CPU: 30-60 minutes

### Step 3: Test the Trained Model

```powershell
python test_mobile_model.py
```

This will:
- Load the mobile-optimized model
- Test with sample images
- Show detection results
- Validate system configuration

**Optional:** Test with different mobile conditions:

```powershell
python test_mobile_model.py --simulate
```

## 📊 Understanding Training Output

### Training Phases

**Phase 1: Classification Head Training**
- Trains only the new classification layers
- Base model (MobileNet) weights are frozen
- Higher learning rate (1e-3)
- Builds color classification capability

**Phase 2: Fine-Tuning**
- Unfreezes 50% of base model layers
- Lower learning rate (1e-5)
- Refines features for Talisay-specific patterns
- Improves mobile-specific characteristics

### Key Metrics to Monitor

- **Validation Accuracy**: Should be > 85% for good performance
  - 90%+: Excellent
  - 85-90%: Good
  - 80-85%: Acceptable
  - < 80%: Need more data or longer training

- **Top-2 Accuracy**: Should be > 95%
  - Ensures the correct color is in top 2 predictions

- **Loss**: Should decrease over time
  - Training loss should be lower than validation loss
  - If validation loss increases: Model is overfitting

### Confusion Matrix Interpretation

Example output:
```
              green    yellow    brown
green            45         3        2
yellow            2        48        0
brown             1         1       48
```

- Diagonal = Correct predictions
- Off-diagonal = Confusion between colors
- Green↔Yellow confusion: Common, fruits transition between stages
- Any↔Brown confusion: Less acceptable, brown is distinct

## 🎯 Improving Model Accuracy

### If Model Still Has Issues

#### 1. More Training Data

**Symptom:** Low accuracy (< 80%)

**Solution:** Add more labeled images

```powershell
# Add more images to:
ml\data\kaggle_talisay\fruit\

# Then relabel and retrain:
cd ml\data
python auto_label_kaggle.py
cd ..
python retrain_for_mobile.py
```

**Recommended:** 50+ images per color class

#### 2. Longer Training

**Symptom:** Validation accuracy still improving at end of training

**Solution:** Train for more epochs

```powershell
python retrain_for_mobile.py --epochs 80 --fine-tune-epochs 30
```

#### 3. Data Quality Issues

**Symptom:** High training accuracy but low validation accuracy

**Solutions:**
- Review auto-labeled images in `review_labels.html`
- Correct any mislabeled images
- Remove poor quality images (blur, bad lighting)
- Retrain after corrections

#### 4. Coin Detection Issues

**Symptom:** Coin not detected or false positives

**Mobile Validator Adjustments in `fruit_validator_mobile.py`:**

```python
# Make coin detection more strict
self.coin_shape = {
    "min_circularity": 0.85,  # Increase from 0.80
    "max_circularity": 1.0,
}

# Or make it more lenient
self.coin_shape = {
    "min_circularity": 0.70,  # Decrease from 0.80
    "max_circularity": 1.0,
}
```

Then retrain:
```powershell
python retrain_for_mobile.py
```

#### 5. False "Not Talisay" Detection

**Symptom:** Valid Talisay fruits rejected as "not Talisay"

**Solution:** Adjust mobile validator thresholds in `fruit_validator_mobile.py`:

```python
def _determine_result_mobile(self, score, ...):
    # Make acceptance more lenient
    if score >= 0.45:  # Reduce from 0.55
        return (FruitDetectionResult.TALISAY_FRUIT, True, "...")
```

**Or:** Increase color confidence in validation:

```python
# In _compute_validation_score_mobile
weights = {
    "color": 0.50,      # Increase from 0.40
    "shape": 0.20,      # Decrease from 0.25
    "size": 0.15,
    "texture": 0.15,    # Decrease from 0.20
}
```

## 🔍 Testing Strategies

### 1. Test with Real Mobile Photos

Take photos using your mobile device:
- Different lighting conditions
- Various angles
- With and without coin
- Different backgrounds

```powershell
# Place test photos in ml\test_images\
python test_mobile_model.py
```

### 2. Test Individual Images

```powershell
cd ml
python predict.py --image path\to\your\image.jpg
```

### 3. Batch Testing

```python
from predict import TalisayPredictor

predictor = TalisayPredictor()

images = ["img1.jpg", "img2.jpg", "img3.jpg"]
results = predictor.batch_analyze(images)

for i, result in enumerate(results):
    print(f"Image {i+1}: {result['is_talisay']}")
```

## 📈 Performance Benchmarks

### Expected Performance

| Scenario | Expected Accuracy |
|----------|------------------|
| Desktop Web (Good lighting) | 95%+ |
| Mobile Camera (Good lighting) | 90%+ |
| Mobile Camera (Poor lighting) | 80%+ |
| Gallery Images (Various) | 85%+ |

### Coin Detection Performance

| Scenario | Expected Success Rate |
|----------|----------------------|
| ₱5 coin, good lighting | 95%+ |
| ₱5 coin, shadows | 85%+ |
| Other coins | 70%+ |
| No coin | N/A (estimation mode) |

## 🛠️ Troubleshooting

### Problem: "TensorFlow not installed"

```powershell
pip install tensorflow
# Or for GPU support (requires CUDA)
pip install tensorflow-gpu
```

### Problem: "Training directory not found"

```powershell
cd ml\data
python auto_label_kaggle.py
```

### Problem: "Out of memory during training"

Reduce batch size:

```python
# In train_mobile_optimized.py or retrain_for_mobile.py
python retrain_for_mobile.py --batch-size 8  # Default is 16
```

### Problem: "Model trains but performs poorly on mobile"

1. Check if mobile validator is being used:
```python
# Should see this message:
"✓ Using mobile-optimized fruit validator"
```

2. Verify model is loaded:
```python
# Should see this message:
"ℹ Using mobile-optimized color classifier"
```

3. If not, check file paths in `predict.py`

### Problem: "Coin detected everywhere"

Make coin detection more strict in `fruit_validator_mobile.py`:

```python
# Increase minimum score threshold
if coin_score > best_score and coin_score > 0.60:  # Increase from 0.45
```

## 📝 Advanced Configuration

### Custom Training Parameters

```powershell
python retrain_for_mobile.py \
    --epochs 60 \
    --fine-tune-epochs 25 \
    --batch-size 12
```

### Using Different Model Architecture

Edit `train_mobile_optimized.py`:

```python
# Try MobileNetV2 instead of V3
from tensorflow.keras.applications import MobileNetV2

base_model = MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights='imagenet'
)
```

### Adjusting Mobile Augmentation Intensity

Edit `train_mobile_optimized.py`:

```python
# In MobileAugmentationGenerator.__init__
self.mobile_aug_prob = 0.8  # Increase from 0.7 for more augmentation
```

## 🎓 Best Practices

1. **Always validate training data first**
   - Check `review_labels.html` before training
   - Correct any mislabeled images

2. **Start with quick training**
   - Use `--quick` flag to test pipeline
   - Then do full training once confirmed working

3. **Monitor training progress**
   - Watch validation accuracy
   - Look for overfitting (val_loss increasing)
   - Use TensorBoard if needed

4. **Test on real mobile photos**
   - Don't rely only on validation set
   - Test with actual device photos

5. **Iterate on issues**
   - If coin detection fails: Adjust thresholds
   - If colors confused: Add more training data
   - If rejected wrongly: Adjust validation thresholds

## 📞 Support

If you encounter issues:

1. Check this guide first
2. Review error messages carefully
3. Test with `--quick` flag first
4. Ensure training data is properly prepared
5. Verify TensorFlow installation

## 🔄 Continuous Improvement

### Adding New Training Data

1. Collect more mobile photos
2. Place in `ml\data\kaggle_talisay\fruit\`
3. Run auto-labeling:
   ```powershell
   cd ml\data
   python auto_label_kaggle.py
   ```
4. Review labels in `review_labels.html`
5. Retrain:
   ```powershell
   cd ..
   python retrain_for_mobile.py
   ```

### Versioning Models

Save different model versions:

```powershell
# After training, backup the model
copy ml\models\color_classifier_mobile_optimized.keras ml\models\color_classifier_mobile_v2.keras
```

### A/B Testing

Compare model performance:

```python
# Test old model
predictor_old = TalisayPredictor(color_model_path="models/old_model.keras")
result_old = predictor_old.analyze_image("test.jpg")

# Test new model  
predictor_new = TalisayPredictor(color_model_path="models/color_classifier_mobile_optimized.keras")
result_new = predictor_new.analyze_image("test.jpg")

# Compare results
print(f"Old: {result_old['overall_confidence']}")
print(f"New: {result_new['overall_confidence']}")
```

## ✅ Success Checklist

- [ ] Training data prepared (auto-labeled)
- [ ] TensorFlow installed
- [ ] Full training completed without errors
- [ ] Validation accuracy > 85%
- [ ] Model tested with `test_mobile_model.py`
- [ ] Real mobile photos tested
- [ ] Coin detection working in various lighting
- [ ] Talisay fruit correctly detected
- [ ] Non-Talisay fruits correctly rejected

## 🎉 Next Steps

Once training is successful:

1. Update your application to use the new model
2. Test in production with real users
3. Collect feedback on edge cases
4. Continuously improve with more data
5. Monitor performance metrics

---

**Last Updated:** February 2, 2026
**Model Version:** Mobile-Optimized v1.0
