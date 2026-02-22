import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { upload } from '../lib/cloudinary.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-otp', authController.resendOtp);
router.get('/test-email', authController.testEmail); // debug only — remove after confirming email works

// Protected
router.get('/me', requireAuth, authController.me);
router.put('/profile', requireAuth, authController.updateProfile);
router.post('/upload-avatar', requireAuth, upload.single('avatar'), (err, req, res, next) => {
  // Handle multer errors
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ ok: false, error: 'file_too_large', message: 'Image must be less than 5MB' });
    }
    if (err.message === 'Only image files are allowed') {
      return res.status(400).json({ ok: false, error: 'invalid_file_type', message: 'Only image files are allowed' });
    }
    return res.status(400).json({ ok: false, error: 'upload_error', message: err.message });
  }
  next();
}, authController.uploadAvatar);
router.post('/request-password-otp', requireAuth, authController.requestPasswordOtp);
router.post('/change-password', requireAuth, authController.changePassword);
router.get('/stats', requireAuth, authController.getStats);

export default router;
