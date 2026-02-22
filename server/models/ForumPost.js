import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true, versionKey: false }
);

const ForumPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 5000 },

    // Media — Cloudinary URLs
    images: [{ url: String, publicId: String }],
    attachments: [{ url: String, publicId: String, name: String, type: String }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Update `updatedAt` on save
ForumPostSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const ForumPost = mongoose.model('ForumPost', ForumPostSchema);
