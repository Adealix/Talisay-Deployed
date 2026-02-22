/**
 * Talisay AI — Notification Service
 * API client for notification endpoints.
 */
import { apiFetch } from './apiClient';
import { getToken } from './authService';

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Fetch paginated notifications */
export async function fetchNotifications(page = 1, limit = 20) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/notifications?page=${page}&limit=${limit}`, { headers });
    const data = await res.json();
    return data.ok ? data : { ok: false, notifications: [], total: 0, unread: 0 };
  } catch (e) {
    console.error('[notificationService.fetchNotifications]', e);
    return { ok: false, notifications: [], total: 0, unread: 0 };
  }
}

/** Get just the unread count (lightweight) */
export async function fetchUnreadCount() {
  try {
    const headers = await authHeaders();
    const res = await apiFetch('/api/notifications/unread-count', { headers });
    const data = await res.json();
    return data.ok ? data.count : 0;
  } catch (e) {
    return 0;
  }
}

/** Mark specific notifications read (pass empty array to mark all) */
export async function markRead(ids = []) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch('/api/notifications/mark-read', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false };
  }
}

/** Delete a single notification */
export async function deleteNotification(id) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/notifications/${id}`, { method: 'DELETE', headers });
    return await res.json();
  } catch (e) {
    return { ok: false };
  }
}

/** Register device push token with the backend */
export async function registerPushToken(token) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch('/api/notifications/push-token', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    });
    return await res.json();
  } catch (e) {
    console.error('[notificationService.registerPushToken]', e);
    return { ok: false };
  }
}

/** Remove device push token (call on logout) */
export async function removePushToken(token) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch('/api/notifications/push-token', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ token }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false };
  }
}

/** Update per-user notification settings */
export async function updateNotificationSettings(settings) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch('/api/notifications/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
    });
    return await res.json();
  } catch (e) {
    return { ok: false };
  }
}
