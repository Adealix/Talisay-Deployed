"""
Train Color Classifier on Real Images from Kaggle Dataset

This script trains a deep learning model (MobileNetV2) on real Talisay fruit images
from the Biome Azuero 2022 dataset.

Features:
- Transfer learning from ImageNet
- Data augmentation for robustness
- Handles fruits with spots, varied lighting, different backgrounds
- Exports trained model for use in the predictor
"""

import os
import sys
from pathlib import Path
import numpy as np
import json

# Add parent to path
sys.path.append(str(Path(__file__).parent.parent))

from config import IMAGE_SIZE, FRUIT_COLORS, MODELS_DIR


def check_dependencies():
    """Check if TensorFlow/Keras is available."""
    try:
        import tensorflow as tf
        print(f"✓ TensorFlow version: {tf.__version__}")
        
        # Check GPU
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            print(f"✓ GPU available: {len(gpus)} device(s)")
        else:
            print("ℹ No GPU found, will use CPU (slower training)")
        
        return True
    except ImportError:
        print("✗ TensorFlow not installed")
        print("  Install with: pip install tensorflow")
        return False


def create_data_generators(
    train_dir: Path,
    val_dir: Path,
    batch_size: int = 32,
    img_size: tuple = (224, 224)
):
    """
    Create data generators with augmentation for training.
    
    Args:
        train_dir: Directory with training images (subdirs per class)
        val_dir: Directory with validation images
        batch_size: Batch size for training
        img_size: Target image size
        
    Returns:
        Tuple of (train_generator, val_generator, class_indices)
    """
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    
    # Training data with augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        vertical_flip=True,
        brightness_range=[0.7, 1.3],
        fill_mode='nearest'
    )
    
    # Validation data - only rescaling
    val_datagen = ImageDataGenerator(rescale=1./255)
    
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=True
    )
    
    val_generator = val_datagen.flow_from_directory(
        val_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    return train_generator, val_generator, train_generator.class_indices


def build_model(num_classes: int = 3, img_size: tuple = (224, 224)):
    """
    Build MobileNetV2-based classification model.
    
    Uses transfer learning with ImageNet weights.
    """
    import tensorflow as tf
    from tensorflow.keras import layers, Model
    from tensorflow.keras.applications import MobileNetV2
    
    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(
        input_shape=(*img_size, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model initially
    base_model.trainable = False
    
    # Build model
    inputs = tf.keras.Input(shape=(*img_size, 3))
    
    # Data preprocessing layer
    x = inputs
    
    # Base model
    x = base_model(x, training=False)
    
    # Classification head
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs, name='TalisayColorClassifier')
    
    return model, base_model


def train_model(
    train_dir: Path,
    val_dir: Path,
    output_dir: Path = None,
    epochs: int = 30,
    batch_size: int = 32,
    fine_tune: bool = True,
    fine_tune_epochs: int = 10
):
    """
    Train the color classification model.
    
    Args:
        train_dir: Training data directory
        val_dir: Validation data directory
        output_dir: Where to save the trained model
        epochs: Initial training epochs
        batch_size: Training batch size
        fine_tune: Whether to fine-tune base model layers
        fine_tune_epochs: Additional epochs for fine-tuning
    """
    import tensorflow as tf
    
    if output_dir is None:
        output_dir = MODELS_DIR
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "=" * 60)
    print("TRAINING TALISAY COLOR CLASSIFIER")
    print("=" * 60)
    
    # Create data generators
    print("\nLoading training data...")
    train_gen, val_gen, class_indices = create_data_generators(
        train_dir, val_dir, batch_size, IMAGE_SIZE
    )
    
    num_classes = len(class_indices)
    print(f"Classes: {class_indices}")
    print(f"Training samples: {train_gen.samples}")
    print(f"Validation samples: {val_gen.samples}")
    
    # Build model
    print("\nBuilding model...")
    model, base_model = build_model(num_classes, IMAGE_SIZE)
    model.summary()
    
    # Compile for initial training
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Callbacks
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7
        ),
        tf.keras.callbacks.ModelCheckpoint(
            output_dir / 'color_classifier_best.keras',
            monitor='val_accuracy',
            save_best_only=True
        )
    ]
    
    # Phase 1: Train classification head only
    print("\n" + "-" * 60)
    print("Phase 1: Training classification head...")
    print("-" * 60)
    
    history1 = model.fit(
        train_gen,
        epochs=epochs,
        validation_data=val_gen,
        callbacks=callbacks
    )
    
    # Phase 2: Fine-tune some base model layers
    if fine_tune and fine_tune_epochs > 0:
        print("\n" + "-" * 60)
        print("Phase 2: Fine-tuning base model layers...")
        print("-" * 60)
        
        # Unfreeze last 30 layers of base model
        base_model.trainable = True
        for layer in base_model.layers[:-30]:
            layer.trainable = False
        
        # Recompile with lower learning rate
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        history2 = model.fit(
            train_gen,
            epochs=fine_tune_epochs,
            validation_data=val_gen,
            callbacks=callbacks
        )
    
    # Save final model
    model_path = output_dir / 'color_classifier_kaggle.keras'
    model.save(model_path)
    print(f"\n✓ Model saved to: {model_path}")
    
    # Save class indices mapping
    indices_path = output_dir / 'class_indices.json'
    with open(indices_path, 'w') as f:
        # Invert mapping for prediction
        idx_to_class = {v: k for k, v in class_indices.items()}
        json.dump({
            'class_to_idx': class_indices,
            'idx_to_class': idx_to_class
        }, f, indent=2)
    print(f"✓ Class indices saved to: {indices_path}")
    
    # Evaluate on validation set
    print("\n" + "-" * 60)
    print("Final Evaluation:")
    print("-" * 60)
    
    val_loss, val_acc = model.evaluate(val_gen)
    print(f"Validation Accuracy: {val_acc * 100:.2f}%")
    print(f"Validation Loss: {val_loss:.4f}")
    
    return model, history1


def evaluate_with_confusion_matrix(
    model_path: Path,
    test_dir: Path,
    class_indices_path: Path = None
):
    """
    Evaluate model and show confusion matrix.
    """
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from sklearn.metrics import classification_report, confusion_matrix
    import matplotlib.pyplot as plt
    
    # Load model
    model = tf.keras.models.load_model(model_path)
    
    # Load class indices
    if class_indices_path is None:
        class_indices_path = model_path.parent / 'class_indices.json'
    
    with open(class_indices_path, 'r') as f:
        indices = json.load(f)
    
    idx_to_class = indices['idx_to_class']
    class_names = [idx_to_class[str(i)] for i in range(len(idx_to_class))]
    
    # Create test generator
    test_datagen = ImageDataGenerator(rescale=1./255)
    test_gen = test_datagen.flow_from_directory(
        test_dir,
        target_size=IMAGE_SIZE,
        batch_size=1,
        class_mode='categorical',
        shuffle=False
    )
    
    # Predict
    predictions = model.predict(test_gen)
    y_pred = np.argmax(predictions, axis=1)
    y_true = test_gen.classes
    
    # Get unique classes present in test data
    unique_labels = np.unique(np.concatenate([y_true, y_pred]))
    present_class_names = [class_names[i] for i in unique_labels]
    
    # Classification report
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=present_class_names, labels=unique_labels))
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    print("\nConfusion Matrix:")
    print(cm)
    
    # Plot confusion matrix
    plt.figure(figsize=(8, 6))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix')
    plt.colorbar()
    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45)
    plt.yticks(tick_marks, class_names)
    
    # Add values to cells
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, format(cm[i, j], 'd'),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")
    
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    
    # Save figure
    fig_path = model_path.parent / 'confusion_matrix.png'
    plt.savefig(fig_path)
    print(f"\n✓ Confusion matrix saved to: {fig_path}")
    plt.close()


def create_sample_dataset_structure():
    """
    Create sample directory structure for manual dataset organization.
    """
    base_dir = Path(__file__).parent / "kaggle_talisay" / "prepared"
    
    for split in ["train", "val"]:
        for color in ["green", "yellow", "brown"]:
            dir_path = base_dir / split / color
            dir_path.mkdir(parents=True, exist_ok=True)
    
    print("Created directory structure:")
    print(f"  {base_dir}/")
    print("  ├── train/")
    print("  │   ├── green/    <- Put green fruit images here")
    print("  │   ├── yellow/   <- Put yellow fruit images here")
    print("  │   └── brown/    <- Put brown fruit images here")
    print("  └── val/")
    print("      ├── green/")
    print("      ├── yellow/")
    print("      └── brown/")
    print("\nOrganize your Kaggle images into these folders, then run training.")
    
    return base_dir


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Train Talisay Color Classifier on Kaggle Images"
    )
    parser.add_argument(
        "command",
        nargs="?",
        choices=["train", "evaluate", "setup", "check"],
        default="check",
        help="Command to run"
    )
    parser.add_argument("--train-dir", type=str, help="Training data directory")
    parser.add_argument("--val-dir", type=str, help="Validation data directory")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--model", type=str, help="Path to trained model")
    
    args = parser.parse_args()
    
    if args.command == "check":
        check_dependencies()
        print("\nTo set up dataset structure, run: python train_on_kaggle.py setup")
    
    elif args.command == "setup":
        base_dir = create_sample_dataset_structure()
        print(f"\nDataset structure created at: {base_dir}")
    
    elif args.command == "train":
        if not check_dependencies():
            sys.exit(1)
        
        # Default paths
        data_dir = Path(__file__).parent / "kaggle_talisay" / "prepared"
        train_dir = Path(args.train_dir) if args.train_dir else data_dir / "train"
        val_dir = Path(args.val_dir) if args.val_dir else data_dir / "val"
        
        if not train_dir.exists():
            print(f"Training directory not found: {train_dir}")
            print("Run 'setup' command first and organize your images.")
            sys.exit(1)
        
        train_model(
            train_dir=train_dir,
            val_dir=val_dir,
            epochs=args.epochs,
            batch_size=args.batch_size
        )
    
    elif args.command == "evaluate":
        if not args.model:
            model_path = MODELS_DIR / 'color_classifier_kaggle.keras'
        else:
            model_path = Path(args.model)
        
        val_dir = Path(args.val_dir) if args.val_dir else \
                  Path(__file__).parent / "kaggle_talisay" / "prepared" / "val"
        
        evaluate_with_confusion_matrix(model_path, val_dir)
