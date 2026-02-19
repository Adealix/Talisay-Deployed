import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../lib/auth.js';
import { sendOtpEmail, generateOtp } from '../lib/email.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary.js';

// OTP lifespan (10 minutes)
const OTP_TTL_MS = 10 * 60 * 1000;

// ═══════════════════════════════════════════════
// Helper — shape a safe user object for the client
// ═══════════════════════════════════════════════
function toClientUser(u) {
  return {
    id: String(u._id),
    email: u.email,
    role: u.role,
    isVerified: u.isVerified,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    phone: u.phone || '',
    address: u.address || '',
    avatar: u.avatar || '',
    createdAt: u.createdAt,
  };
}

// ═══════════════════════════════════════════════
// POST /api/auth/register
// Creates user → sends verification OTP email
// ═══════════════════════════════════════════════
export async function register(req, res) {
  try {
    const { email, password, firstName, lastName, role } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'email_and_password_required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ ok: false, error: 'password_too_short' });
    }

    const nextRole = role === 'admin' ? 'admin' : 'user';
    const otp = generateOtp();

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role: nextRole,
      firstName: firstName || '',
      lastName: lastName || '',
      isVerified: false,
      verifyOtp: otp,
      verifyOtpExpires: new Date(Date.now() + OTP_TTL_MS),
    });

    // Send OTP email — await so failures are clearly logged in Render logs
    try {
      await sendOtpEmail(user.email, otp, 'verify');
    } catch (emailErr) {
      // Don't block registration, but log the full error for Render debugging
      console.error('[authController.register] OTP email failed — user still created:');
      console.error('  To:', user.email);
      console.error('  Error:', emailErr);
    }

    return res.json({
      ok: true,
      message: 'account_created_verify_email',
      user: toClientUser(user),
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, error: 'email_already_exists' });
    }
    console.error('[authController.register]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// POST /api/auth/verify-email
// Body: { email, otp }
// ═══════════════════════════════════════════════
export async function verifyEmail(req, res) {
  try {
    const { email, otp } = req.body ?? {};
    if (!email || !otp) {
      return res.status(400).json({ ok: false, error: 'email_and_otp_required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'user_not_found' });
    }
    if (user.isVerified) {
      // Already verified — just sign them in
      const token = signToken(user);
      return res.json({ ok: true, message: 'already_verified', token, user: toClientUser(user) });
    }
    if (!user.verifyOtp || user.verifyOtp !== String(otp).trim()) {
      return res.status(400).json({ ok: false, error: 'invalid_otp' });
    }
    if (user.verifyOtpExpires && user.verifyOtpExpires < new Date()) {
      return res.status(400).json({ ok: false, error: 'otp_expired' });
    }

    user.isVerified = true;
    user.verifyOtp = null;
    user.verifyOtpExpires = null;
    await user.save();

    const token = signToken(user);
    return res.json({ ok: true, message: 'email_verified', token, user: toClientUser(user) });
  } catch (e) {
    console.error('[authController.verifyEmail]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// POST /api/auth/resend-otp
// Body: { email }
// ═══════════════════════════════════════════════
export async function resendOtp(req, res) {
  try {
    const { email } = req.body ?? {};
    if (!email) return res.status(400).json({ ok: false, error: 'email_required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(404).json({ ok: false, error: 'user_not_found' });
    if (user.isVerified) return res.json({ ok: true, message: 'already_verified' });

    const otp = generateOtp();
    user.verifyOtp = otp;
    user.verifyOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    await sendOtpEmail(user.email, otp, 'verify');
    return res.json({ ok: true, message: 'otp_resent' });
  } catch (e) {
    console.error('[authController.resendOtp]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// POST /api/auth/login
// Only allows verified emails
// ═══════════════════════════════════════════════
export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'email_and_password_required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'invalid_credentials' });
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'invalid_credentials' });
    }

    if (!user.isVerified) {
      // Resend OTP automatically
      const otp = generateOtp();
      user.verifyOtp = otp;
      user.verifyOtpExpires = new Date(Date.now() + OTP_TTL_MS);
      await user.save();
      sendOtpEmail(user.email, otp, 'verify').catch(() => {});
      return res.status(403).json({ ok: false, error: 'email_not_verified', message: 'otp_resent' });
    }

    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: toClientUser(user),
    });
  } catch (e) {
    console.error('[authController.login]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// GET /api/auth/me  (protected)
// ═══════════════════════════════════════════════
export async function me(req, res) {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    return res.json({ ok: true, user: toClientUser(user) });
  } catch (e) {
    console.error('[authController.me]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// PUT /api/auth/profile  (protected)
// Update profile fields: firstName, lastName, phone, address
// ═══════════════════════════════════════════════
export async function updateProfile(req, res) {
  try {
    const { firstName, lastName, phone, address } = req.body ?? {};
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ ok: false, error: 'not_found' });

    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (address !== undefined) user.address = String(address).trim();

    await user.save();
    return res.json({ ok: true, user: toClientUser(user) });
  } catch (e) {
    console.error('[authController.updateProfile]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// POST /api/auth/request-password-otp  (protected)
// Sends OTP to user's email for password change
// ═══════════════════════════════════════════════
export async function requestPasswordOtp(req, res) {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ ok: false, error: 'not_found' });

    const otp = generateOtp();
    user.passwordOtp = otp;
    user.passwordOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    await sendOtpEmail(user.email, otp, 'password');
    return res.json({ ok: true, message: 'password_otp_sent' });
  } catch (e) {
    console.error('[authController.requestPasswordOtp]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// POST /api/auth/change-password  (protected)
// Body: { otp, newPassword }
// ═══════════════════════════════════════════════
export async function changePassword(req, res) {
  try {
    const { otp, newPassword } = req.body ?? {};
    if (!otp || !newPassword) {
      return res.status(400).json({ ok: false, error: 'otp_and_password_required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ ok: false, error: 'password_too_short' });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ ok: false, error: 'not_found' });

    if (!user.passwordOtp || user.passwordOtp !== String(otp).trim()) {
      return res.status(400).json({ ok: false, error: 'invalid_otp' });
    }
    if (user.passwordOtpExpires && user.passwordOtpExpires < new Date()) {
      return res.status(400).json({ ok: false, error: 'otp_expired' });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    user.passwordOtp = null;
    user.passwordOtpExpires = null;
    await user.save();

    return res.json({ ok: true, message: 'password_changed' });
  } catch (e) {
    console.error('[authController.changePassword]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// GET /api/auth/stats  (protected)
// Returns real stats for the profile page
// ═══════════════════════════════════════════════
export async function getStats(req, res) {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ ok: false, error: 'not_found' });

    // Import History model dynamically to avoid circular deps
    const { History } = await import('../models/History.js');

    const totalAnalyses = await History.countDocuments({ userId });

    // Most recent analysis
    const lastAnalysis = await History.findOne({ userId }).sort({ createdAt: -1 }).lean();

    // Average confidence
    const avgConfResult = await History.aggregate([
      { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId), confidence: { $ne: null } } },
      { $group: { _id: null, avgConf: { $avg: '$confidence' } } },
    ]);
    const avgConfidence = avgConfResult.length > 0 ? Math.round(avgConfResult[0].avgConf * 100) : null;

    // Category breakdown
    const categoryBreakdown = await History.aggregate([
      { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId) } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Join date
    const joinedDate = user.createdAt;

    return res.json({
      ok: true,
      stats: {
        totalAnalyses,
        avgConfidence, // percentage 0-100 or null
        lastAnalysisDate: lastAnalysis?.createdAt || null,
        joinedDate,
        categoryBreakdown: categoryBreakdown.reduce((acc, c) => {
          if (c._id) acc[c._id.toLowerCase()] = c.count;
          return acc;
        }, {}),
      },
    });
  } catch (e) {
    console.error('[authController.getStats]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ═══════════════════════════════════════════════
// POST /api/auth/upload-avatar
// Upload profile image to Cloudinary
// ═══════════════════════════════════════════════
export async function uploadAvatar(req, res) {
  try {
    console.log('[uploadAvatar] req.auth:', req.auth);
    console.log('[uploadAvatar] req.file:', req.file ? { fieldname: req.file.fieldname, size: req.file.size } : 'no file');
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'no_file_uploaded' });
    }

    if (!req.auth || !req.auth.userId) {
      console.error('[uploadAvatar] No auth found in request');
      return res.status(401).json({ ok: false, error: 'not_authenticated' });
    }

    const userId = req.auth.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'user_not_found' });
    }

    // Delete old image from Cloudinary if exists
    if (user.cloudinaryPublicId) {
      await deleteFromCloudinary(user.cloudinaryPublicId);
    }

    // Upload to Cloudinary with user-specific publicId
    // Using just userId ensures each user has unique image and overwrites on new upload
    const publicId = `user_${userId}`;
    const result = await uploadToCloudinary(
      req.file.buffer,
      'talisay/profile',
      publicId
    );

    // Update user with new avatar URL
    user.avatar = result.secure_url;
    user.cloudinaryPublicId = result.public_id;
    await user.save();

    return res.json({
      ok: true,
      avatar: result.secure_url,
      user: toClientUser(user),
    });
  } catch (e) {
    console.error('[authController.uploadAvatar]', e);
    return res.status(500).json({ ok: false, error: 'upload_failed', message: e.message });
  }
}
