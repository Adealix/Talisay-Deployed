import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import * as notif from '../controllers/notificationController.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// List notifications (paginated)
router.get('/', notif.listNotifications);

// Unread count only (lightweight polling)
router.get('/unread-count', notif.getUnreadCount);

// Mark as read (body: { ids: [...] } or empty to mark all)
router.post('/mark-read', notif.markRead);

// Delete one notification
router.delete('/:id', notif.deleteNotification);

// Push token management
router.post('/push-token', notif.registerPushToken);
router.delete('/push-token', notif.removePushToken);

// Notification preferences
router.put('/settings', notif.updateSettings);

export default router;
