import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    createdAt: { type: Date, default: Date.now, index: true },
    
    // Analysis type
    analysisType: {
      type: String,
      enum: ['single', 'comparison'],
      default: 'single',
      index: true
    },
    comparisonLabel: { type: String, default: null },
    
    // Image info
    imageName: { type: String, default: null },
    imageUri: { type: String, default: null }, // Cloudinary URL for persistent storage
    cloudinaryPublicId: { type: String, default: null }, // For deleting old images
    
    // Classification
    category: { 
      type: String, 
      enum: ['GREEN', 'YELLOW', 'BROWN'], 
      required: true,
      index: true 
    },
    maturityStage: { type: String, default: null },
    
    // Confidence scores
    confidence: { type: Number, default: null },
    colorConfidence: { type: Number, default: null },
    fruitConfidence: { type: Number, default: null },
    oilConfidence: { type: Number, default: null },
    
    // Color probabilities (detailed)
    colorProbabilities: {
      green: { type: Number, default: null },
      yellow: { type: Number, default: null },
      brown: { type: Number, default: null },
    },
    
    // Spot detection
    hasSpots: { type: Boolean, default: false },
    spotCoverage: { type: Number, default: null },
    
    // Oil yield prediction
    oilYieldPercent: { type: Number, default: null },
    yieldCategory: { type: String, default: null },
    
    // Physical dimensions (mixed schema allows both snake_case and camelCase)
    dimensions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    dimensionsSource: { type: String, default: null },
    
    // Reference coin detection
    referenceDetected: { type: Boolean, default: false },
    coinInfo: { 
      type: mongoose.Schema.Types.Mixed, 
      default: null 
    },
    
    // Analysis interpretation
    interpretation: { type: String, default: null },
    
    // Full analysis data (for future reference)
    fullAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { 
    versionKey: false,
    timestamps: { createdAt: false, updatedAt: 'updatedAt' }
  }
);

// Compound index for user history queries
HistorySchema.index({ userId: 1, createdAt: -1 });

export const History = mongoose.model('History', HistorySchema);
