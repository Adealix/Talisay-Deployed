import { Router } from 'express';
import { requireAuth, requireAdmin } from '../lib/auth.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

router.get('/users', adminController.listUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/predictions', adminController.listAllPredictions);
router.get('/history', adminController.listAllHistory);
router.delete('/history/:id', adminController.deleteHistory);
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/analytics/charts', adminController.getChartData);

export default router;
