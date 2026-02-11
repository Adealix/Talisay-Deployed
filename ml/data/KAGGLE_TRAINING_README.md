# Training with Kaggle Biome Azuero 2022 Dataset

This guide explains how to use the **Biome Azuero 2022** Kaggle dataset to improve the Talisay fruit color classifier with real-world images.

## Dataset Information

- **Dataset**: [Biome Azuero 2022](https://www.kaggle.com/datasets/earthshot/azuero-trees-1024/)
- **Paper**: BiomeAzuero2022: A Fine-Grained Dataset and Baselines For Tree Species Classification
- **Relevant Folder**: `Terminalia catappa` (Talisay/Indian Almond)
- **Images**: 62 fruit images with varied conditions

## Quick Start

### Step 1: Download the Dataset

**Option A: Using Kaggle API (recommended)**

1. Set up Kaggle API credentials:
   - Go to https://www.kaggle.com/settings → Create API Token
   - Save `kaggle.json` to `~/.kaggle/` (or `C:\Users\<username>\.kaggle\` on Windows)

2. Download:
   ```bash
   cd ml/data
   python kaggle_dataset_loader.py download
   ```

**Option B: Manual Download**

1. Go to https://www.kaggle.com/datasets/earthshot/azuero-trees-1024/
2. Click "Download" (requires Kaggle account)
3. Extract the ZIP file
4. Copy the `Terminalia catappa` folder to:
   ```
   ml/data/kaggle_talisay/
   ```

### Step 2: Auto-Label Images

Use our improved classifier to automatically label the images:

```bash
cd ml
python data/auto_label_kaggle.py label --path data/kaggle_talisay
```

This will analyze all images and save predictions to `data/kaggle_talisay/auto_labels.json`

### Step 3: Visual Review

Create an HTML review page to check the auto-labels:

```bash
python data/auto_label_kaggle.py review
```

Open `data/kaggle_talisay/review_labels.html` in your browser to:
- View all labeled images organized by color
- Identify low-confidence predictions (red border)
- Manually verify and correct labels

### Step 4: Prepare Training Data

Split the labeled data into training and validation sets:

```bash
python data/auto_label_kaggle.py split
```

This creates:
```
data/kaggle_talisay/prepared/
├── train/
│   ├── green/
│   ├── yellow/
│   └── brown/
└── val/
    ├── green/
    ├── yellow/
    └── brown/
```

### Step 5: Train Deep Learning Model

Train a MobileNetV2-based classifier on the real images:

```bash
python data/train_on_kaggle.py train --epochs 30
```

Training features:
- **Transfer learning** from ImageNet
- **Data augmentation** (rotation, zoom, flip, brightness)
- **Fine-tuning** of base model layers
- **Early stopping** to prevent overfitting

### Step 6: Evaluate the Model

```bash
python data/train_on_kaggle.py evaluate
```

This generates:
- Classification report with precision/recall/F1
- Confusion matrix visualization

## File Structure

```
ml/data/
├── kaggle_dataset_loader.py    # Download and manage Kaggle data
├── auto_label_kaggle.py        # Auto-label images using our classifier
├── train_on_kaggle.py          # Train deep learning model
├── kaggle_talisay/             # Dataset directory
│   ├── auto_labels.json        # Auto-generated labels
│   ├── review_labels.html      # Visual review page
│   └── prepared/               # Train/val split
│       ├── train/
│       │   ├── green/
│       │   ├── yellow/
│       │   └── brown/
│       └── val/
│           ├── green/
│           ├── yellow/
│           └── brown/
```

## Manual Labeling (Optional)

For highest accuracy, manually label images:

```bash
python data/kaggle_dataset_loader.py label
```

This shows each image with its auto-prediction and lets you:
- Confirm the prediction (press Enter)
- Correct to: `g` (green), `y` (yellow), `b` (brown)
- Skip unclear images: `s`
- Quit and save: `q`

## Expected Results

With 62 Terminalia catappa images:
- ~50 green fruits (immature)
- ~8 transitional (green-yellow)
- ~4 yellow/brown fruits

After training on real images, the classifier should achieve:
- **Higher accuracy** on real-world images
- **Better handling** of varied lighting conditions
- **Improved spot detection** on actual spotted fruits
- **More robust** background handling

## Combining with Existing Model

The trained deep learning model can be used alongside the existing HSV-based classifier:

```python
from predict import TalisayPredictor

# Use deep learning model for higher accuracy
predictor = TalisayPredictor(
    color_model_path="models/color_classifier_kaggle.keras",
    use_simple_color=False  # Use deep learning
)

# Or stick with fast HSV-based classifier
predictor = TalisayPredictor(use_simple_color=True)
```

## Tips

1. **Low confidence images**: Manually review images with <70% confidence
2. **Transitional fruits**: Label green-yellow fruits based on dominant color
3. **Augmentation**: The training script applies heavy augmentation - good for small datasets
4. **Fine-tuning**: Set `fine_tune=True` to get better accuracy (takes longer)
5. **GPU**: Training is ~10x faster with a GPU (CUDA-enabled NVIDIA card)

## Troubleshooting

**"No images found"**
- Check that images are in `data/kaggle_talisay/` directory
- Verify image file extensions (.jpg, .png, etc.)

**"TensorFlow not installed"**
```bash
pip install tensorflow
```

**"Kaggle API error"**
- Ensure `kaggle.json` is in the correct location
- Check that your API token is valid

**Low accuracy after training**
- Try more epochs: `--epochs 50`
- Check class balance in training data
- Review and correct auto-labels manually
