/**
 * Notification Controller
 * Handles in-app notification CRUD + Expo push notification dispatch.
 */
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

// ─── Constants ───
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ─── Helper: send Expo push notifications in batches ───
export async function sendExpoPush(messages) {
  if (!messages || messages.length === 0) return;

  // Expo allows up to 100 messages per request
  const batches = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  for (const batch of batches) {
    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
    } catch (err) {
      console.error('[notifications] Expo push batch error:', err);
    }
  }
}

// ─── Helper: create in-app notifications + send push to matching users ───
/**
 * @param {object} opts
 * @param {ObjectId|string} opts.actorId  - user who triggered the event
 * @param {ObjectId[]|string[]} opts.recipientIds - users who should receive it
 * @param {'new_post'|'new_comment'|'new_like'|'system'} opts.type
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {object} opts.data              - extra data (postId etc.)
 * @param {string} opts.settingKey        - notificationSettings field to respect
 */
export async function createNotifications({
  actorId,
  recipientIds,
  type,
  title,
  body,
  data = {},
  settingKey = 'newPost',
}) {
  if (!recipientIds || recipientIds.length === 0) return;

  try {
    // Build in-app notification documents (skip if actor === recipient)
    const docs = recipientIds
      .filter(id => String(id) !== String(actorId))
      .map(recipientId => ({
        recipient: recipientId,
        actor: actorId || null,
        type,
        title,
        body,
        data,
        read: false,
      }));

    if (docs.length > 0) {
      await Notification.insertMany(docs, { ordered: false });
    }

    // Collect push tokens for recipients who have a valid token
    // and have the matching notification setting enabled
    const recipients = await User.find(
      {
        _id: { $in: recipientIds.filter(id => String(id) !== String(actorId)) },
        isActive: true,
        pushTokens: { $exists: true, $not: { $size: 0 } },
        [`notificationSettings.${settingKey}`]: true,
      },
      'pushTokens'
    ).lean();

    const pushMessages = [];
    for (const user of recipients) {
      for (const token of user.pushTokens || []) {
        if (token && token.startsWith('ExponentPushToken[')) {
          pushMessages.push({
            to: token,
            sound: 'default',
            title,
            body,
            data,
          });
        }
      }
    }

    await sendExpoPush(pushMessages);
  } catch (err) {
    // Notification errors should never break the main request
    console.error('[notifications.createNotifications]', err);
  }
}

// ─── API: List my notifications ───
export async function listNotifications(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [notifications, total, unread] = await Promise.all([
      Notification.find({ recipient: req.auth.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'actor', select: 'firstName lastName avatar' })
        .lean(),
      Notification.countDocuments({ recipient: req.auth.userId }),
      Notification.countDocuments({ recipient: req.auth.userId, read: false }),
    ]);

    res.json({ ok: true, notifications, total, unread, page });
  } catch (e) {
    console.error('[notifications.listNotifications]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── API: Get unread count only ───
export async function getUnreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({
      recipient: req.auth.userId,
      read: false,
    });
    res.json({ ok: true, count });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── API: Mark notification(s) as read ───
export async function markRead(req, res) {
  try {
    const { ids } = req.body; // array of notification IDs, or empty = mark all
    if (ids && ids.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ids }, recipient: req.auth.userId },
        { $set: { read: true } }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { recipient: req.auth.userId, read: false },
        { $set: { read: true } }
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── API: Delete a notification ───
export async function deleteNotification(req, res) {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.auth.userId,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── API: Register / update push token ───
export async function registerPushToken(req, res) {
  try {
    const { token } = req.body;
    if (!token || !token.startsWith('ExponentPushToken[')) {
      return res.status(400).json({ ok: false, error: 'invalid_token' });
    }

    // Add token if not already stored (avoid duplicates)
    await User.findByIdAndUpdate(
      req.auth.userId,
      { $addToSet: { pushTokens: token } },
      { new: true }
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('[notifications.registerPushToken]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── API: Remove push token (on logout / permission revoked) ───
export async function removePushToken(req, res) {
  try {
    const { token } = req.body;
    if (token) {
      await User.findByIdAndUpdate(
        req.auth.userId,
        { $pull: { pushTokens: token } }
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

// ─── API: Update notification settings ───
export async function updateSettings(req, res) {
  try {
    const { newPost, newComment, newLike } = req.body;
    const update = {};
    if (typeof newPost === 'boolean') update['notificationSettings.newPost'] = newPost;
    if (typeof newComment === 'boolean') update['notificationSettings.newComment'] = newComment;
    if (typeof newLike === 'boolean') update['notificationSettings.newLike'] = newLike;

    await User.findByIdAndUpdate(req.auth.userId, { $set: update });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}
