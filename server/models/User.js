import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    // ── Auth ──
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // ── Email Verification ──
    isVerified: { type: Boolean, default: false },
    verifyOtp: { type: String, default: null },
    verifyOtpExpires: { type: Date, default: null },

    // ── Password Change OTP ──
    passwordOtp: { type: String, default: null },
    passwordOtpExpires: { type: Date, default: null },

    // ── Profile Fields ──
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    avatar: { type: String, default: '' }, // Cloudinary image URL
    cloudinaryPublicId: { type: String, default: '' }, // For deleting old images

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const User = mongoose.model('User', UserSchema);
