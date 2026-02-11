import mongoose from 'mongoose';

const PredictionSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['GREEN', 'YELLOW', 'BROWN'], required: true },
    confidence: { type: Number, default: null },
    ratio: { type: Number, required: true },
    inputs: {
      lengthMm: { type: Number, default: null },
      widthMm: { type: Number, default: null },
      weightG: { type: Number, default: null },
    },
    // In a real system you might store an image reference (URL) instead.
    imageUri: { type: String, default: null },
  },
  { versionKey: false }
);

export const Prediction = mongoose.model('Prediction', PredictionSchema);
