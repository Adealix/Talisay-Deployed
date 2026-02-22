/**
 * Notification Model
 * Stores in-app notifications for each user.
 */
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Who triggered it (actor)
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Notification type
    type: {
      type: String,
      enum: ['new_post', 'new_comment', 'new_like', 'system'],
      required: true,
    },

    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 500 },

    // Extra data (e.g., postId) to deep-link on tap
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    read: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Index for fast per-user queries
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
