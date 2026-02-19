import { History } from '../models/History.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';

/**
 * POST /api/upload/history-image
 * Upload an image to Cloudinary for history storage.
 * Expects multipart/form-data with 'image' field.
 */
export async function uploadHistoryImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'no_image_provided' });
    }

    // Upload to Cloudinary in talisay/history folder
    const result = await uploadToCloudinary(
      req.file.buffer, 
      'talisay/history',
      null // Auto-generate unique public ID
    );

    return res.json({
      ok: true,
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (e) {
    console.error('[historyController.uploadHistoryImage]', e);
    return res.status(500).json({ ok: false, error: 'upload_failed' });
  }
}

/**
 * POST /api/history
 * Save a new history item for the authenticated user.
 */
export async function createHistoryItem(req, res) {
  try {
    const {
      analysisType,
      comparisonLabel,
      comparisonId,
      baselineData,
      totalImages,
      imageName,
      imageUri,
      category,
      maturityStage,
      confidence,
      colorConfidence,
      fruitConfidence,
      oilConfidence,
      oilYieldPercent,
      yieldCategory,
      dimensions,
      dimensionsSource,
      referenceDetected,
      coinInfo,
      interpretation,
      hasSpots,
      spotCoverage,
      colorProbabilities,
    } = req.body ?? {};

    if (!category) {
      return res.status(400).json({ ok: false, error: 'category_required' });
    }

    const doc = await History.create({
      userId: req.auth.userId,
      analysisType: analysisType || 'single',
      comparisonLabel: comparisonLabel || null,
      comparisonId: comparisonId || null,
      baselineData: baselineData || null,
      totalImages: typeof totalImages === 'number' ? totalImages : null,
      imageName: imageName || null,
      imageUri: imageUri || null,
      cloudinaryPublicId: req.body.cloudinaryPublicId || null,
      category,
      maturityStage: maturityStage || null,
      confidence: typeof confidence === 'number' ? confidence : null,
      colorConfidence: typeof colorConfidence === 'number' ? colorConfidence : null,
      fruitConfidence: typeof fruitConfidence === 'number' ? fruitConfidence : null,
      oilConfidence: typeof oilConfidence === 'number' ? oilConfidence : null,
      oilYieldPercent: typeof oilYieldPercent === 'number' ? oilYieldPercent : null,
      yieldCategory: yieldCategory || null,
      dimensions: {
        lengthCm: dimensions?.lengthCm ?? dimensions?.length_cm ?? null,
        widthCm: dimensions?.widthCm ?? dimensions?.width_cm ?? null,
        wholeFruitWeightG: dimensions?.wholeFruitWeightG ?? dimensions?.whole_fruit_weight_g ?? null,
        kernelWeightG: dimensions?.kernelWeightG ?? dimensions?.kernel_mass_g ?? null,
      },
      dimensionsSource: dimensionsSource || null,
      referenceDetected: !!referenceDetected,
      coinInfo: coinInfo || null,
      interpretation: interpretation || null,
      hasSpots: !!hasSpots,
      spotCoverage: typeof spotCoverage === 'number' ? spotCoverage : null,
      colorProbabilities: colorProbabilities || null,
    });

    return res.json({ ok: true, id: String(doc._id) });
  } catch (e) {
    console.error('[historyController.createHistoryItem]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/history
 * List history items for the authenticated user.
 */
export async function listHistory(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = parseInt(req.query.skip) || 0;

    const items = await History.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await History.countDocuments({ userId: req.auth.userId });

    return res.json({ 
      ok: true, 
      items: items.map(item => ({
        ...item,
        id: String(item._id),
        _id: undefined,
      })),
      total,
      hasMore: skip + items.length < total,
    });
  } catch (e) {
    console.error('[historyController.listHistory]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/history/:id
 * Get a single history item by ID.
 */
export async function getHistoryItem(req, res) {
  try {
    const { id } = req.params;
    
    const item = await History.findOne({ 
      _id: id, 
      userId: req.auth.userId 
    }).lean();

    if (!item) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    return res.json({ 
      ok: true, 
      item: {
        ...item,
        id: String(item._id),
        _id: undefined,
      }
    });
  } catch (e) {
    console.error('[historyController.getHistoryItem]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * DELETE /api/history/:id
 * Delete a history item by ID.
 */
export async function deleteHistoryItem(req, res) {
  try {
    const { id } = req.params;
    
    const result = await History.deleteOne({ 
      _id: id, 
      userId: req.auth.userId 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[historyController.deleteHistoryItem]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * DELETE /api/history
 * Clear all history for the authenticated user.
 */
export async function clearHistory(req, res) {
  try {
    const result = await History.deleteMany({ userId: req.auth.userId });
    return res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) {
    console.error('[historyController.clearHistory]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
