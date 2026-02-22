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
      enum: ['single', 'comparison', 'multi_fruit'],
      default: 'single',
      index: true
    },
    comparisonLabel: { type: String, default: null },
    comparisonId: { type: String, default: null, index: true },
    
    // Embedded baseline data for comparison pairs
    baselineData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    
    // Total images analysed (for existing-dataset comparisons)
    totalImages: { type: Number, default: null },

    // Multi-fruit detection fields
    multiFruit: { type: Boolean, default: false },
    fruitCount: { type: Number, default: null },
    colorDistribution: { type: mongoose.Schema.Types.Mixed, default: null },
    averageOilYield: { type: Number, default: null },
    oilYieldRange: { type: mongoose.Schema.Types.Mixed, default: null },
    fruits: { type: mongoose.Schema.Types.Mixed, default: null },
    
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

// Indexes for analytics aggregations (date-range + category filtering)
HistorySchema.index({ createdAt: 1, category: 1 });          // date-range + groupBy category
HistorySchema.index({ category: 1, oilYieldPercent: 1 });     // yield averages per category
HistorySchema.index({ confidence: 1 });                       // confidence buckets / counts
HistorySchema.index({ createdAt: 1, userId: 1 });             // user activity trend

export const History = mongoose.model('History', HistorySchema);
