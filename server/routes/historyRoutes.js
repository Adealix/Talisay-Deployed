import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { upload } from '../lib/cloudinary.js';
import * as historyController from '../controllers/historyController.js';

const router = Router();

// Upload image to Cloudinary
router.post('/upload/image', requireAuth, upload.single('image'), historyController.uploadHistoryImage);

// All history routes require authentication
router.post('/', requireAuth, historyController.createHistoryItem);
router.get('/', requireAuth, historyController.listHistory);
router.get('/:id', requireAuth, historyController.getHistoryItem);
router.delete('/:id', requireAuth, historyController.deleteHistoryItem);
router.delete('/', requireAuth, historyController.clearHistory);

export default router;
