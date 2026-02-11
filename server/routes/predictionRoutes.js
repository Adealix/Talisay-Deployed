import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import * as predictionController from '../controllers/predictionController.js';

const router = Router();

// All prediction routes require authentication
router.post('/', requireAuth, predictionController.createPrediction);
router.get('/', requireAuth, predictionController.listPredictions);

export default router;
