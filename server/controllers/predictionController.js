import { Prediction } from '../models/Prediction.js';

/**
 * POST /api/predictions
 * Create a new prediction (requires auth).
 */
export async function createPrediction(req, res) {
  try {
    const { category, confidence, ratio, inputs, imageUri } = req.body ?? {};

    if (!category || typeof ratio !== 'number') {
      return res.status(400).json({ ok: false, error: 'category_and_ratio_required' });
    }

    const doc = await Prediction.create({
      userId: req.auth.userId,
      category,
      confidence: typeof confidence === 'number' ? confidence : null,
      ratio,
      inputs: {
        lengthMm: typeof inputs?.lengthMm === 'number' ? inputs.lengthMm : null,
        widthMm: typeof inputs?.widthMm === 'number' ? inputs.widthMm : null,
        weightG: typeof inputs?.weightG === 'number' ? inputs.weightG : null,
      },
      imageUri: typeof imageUri === 'string' ? imageUri : null,
    });

    return res.json({ ok: true, id: String(doc._id) });
  } catch (e) {
    console.error('[predictionController.createPrediction]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/predictions
 * List predictions for the authenticated user.
 */
export async function listPredictions(req, res) {
  try {
    const items = await Prediction.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ ok: true, items });
  } catch (e) {
    console.error('[predictionController.listPredictions]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
