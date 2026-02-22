import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../lib/auth.js';
import * as forum from '../controllers/forumController.js';

const router = Router();

// Multer for forum: accept images + common document types
const forumUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    cb(null, file.mimetype.startsWith('image/') || allowed.includes(file.mimetype));
  },
});

// Posts
router.get('/', requireAuth, forum.listPosts);
router.get('/:id', requireAuth, forum.getPost);
router.post('/', requireAuth, forumUpload.array('files', 5), forum.createPost);
router.delete('/:id', requireAuth, forum.deletePost);

// Likes
router.post('/:id/like', requireAuth, forum.toggleLike);

// Comments
router.post('/:id/comments', requireAuth, forum.addComment);
router.delete('/:id/comments/:commentId', requireAuth, forum.deleteComment);

export default router;
