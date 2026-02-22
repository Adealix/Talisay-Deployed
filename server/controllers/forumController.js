/**
 * Forum Controller — CRUD for posts, toggle likes, add comments.
 */
import { ForumPost } from '../models/ForumPost.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary.js';

// Populate options used by multiple endpoints
const AUTHOR_POP = { path: 'author', select: 'firstName lastName avatar' };
const COMMENT_POP = { path: 'comments.author', select: 'firstName lastName avatar' };

// ─── List posts (paginated, newest first) ───
export async function listPosts(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      ForumPost.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(AUTHOR_POP)
        .populate(COMMENT_POP)
        .lean(),
      ForumPost.countDocuments(),
    ]);

    res.json({ ok: true, posts, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    console.error('[forum.listPosts]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── Get single post ───
export async function getPost(req, res) {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate(AUTHOR_POP)
      .populate(COMMENT_POP)
      .lean();
    if (!post) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, post });
  } catch (e) {
    console.error('[forum.getPost]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── Create post ───
export async function createPost(req, res) {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ ok: false, error: 'title_and_content_required' });
    }

    // Handle uploaded files (images & attachments come via multer array)
    const images = [];
    const attachments = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isImage = file.mimetype.startsWith('image/');
        const folder = isImage ? 'talisay/forum/images' : 'talisay/forum/files';
        const result = await uploadToCloudinary(file.buffer, folder);
        if (isImage) {
          images.push({ url: result.secure_url, publicId: result.public_id });
        } else {
          attachments.push({
            url: result.secure_url,
            publicId: result.public_id,
            name: file.originalname,
            type: file.mimetype,
          });
        }
      }
    }

    const post = await ForumPost.create({
      author: req.auth.userId,
      title: title.trim(),
      content: content.trim(),
      images,
      attachments,
    });

    const populated = await ForumPost.findById(post._id)
      .populate(AUTHOR_POP)
      .populate(COMMENT_POP)
      .lean();

    res.status(201).json({ ok: true, post: populated });
  } catch (e) {
    console.error('[forum.createPost]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── Delete post (author or admin) ───
export async function deletePost(req, res) {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'not_found' });

    const isOwner = String(post.author) === req.auth.userId;
    const isAdmin = req.auth.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ ok: false, error: 'forbidden' });

    // Clean up Cloudinary assets
    const publicIds = [
      ...post.images.map(i => i.publicId),
      ...post.attachments.map(a => a.publicId),
    ].filter(Boolean);
    await Promise.allSettled(publicIds.map(id => deleteFromCloudinary(id)));

    await post.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error('[forum.deletePost]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── Toggle like ───
export async function toggleLike(req, res) {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'not_found' });

    const uid = req.auth.userId;
    const idx = post.likes.findIndex(id => String(id) === uid);
    if (idx >= 0) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(uid);
    }
    await post.save();

    res.json({ ok: true, liked: idx < 0, likesCount: post.likes.length });
  } catch (e) {
    console.error('[forum.toggleLike]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── Add comment ───
export async function addComment(req, res) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'text_required' });

    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'not_found' });

    post.comments.push({ author: req.auth.userId, text: text.trim() });
    await post.save();

    const updated = await ForumPost.findById(post._id)
      .populate(AUTHOR_POP)
      .populate(COMMENT_POP)
      .lean();

    res.json({ ok: true, comments: updated.comments });
  } catch (e) {
    console.error('[forum.addComment]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── Delete comment (comment author or admin) ───
export async function deleteComment(req, res) {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: 'not_found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ ok: false, error: 'comment_not_found' });

    const isOwner = String(comment.author) === req.auth.userId;
    const isAdmin = req.auth.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ ok: false, error: 'forbidden' });

    comment.deleteOne();
    await post.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('[forum.deleteComment]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}
