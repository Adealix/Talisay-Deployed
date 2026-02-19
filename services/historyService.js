/**
 * History Service — CRUD operations against the talisay_ai Express backend.
 * Uses the shared apiClient which tries Render first, falls back to localhost.
 */
import { apiFetch as clientFetch } from './apiClient';
import { getToken } from './authService';

async function apiFetch(path, opts = {}) {
  const { method = 'GET', body } = opts;
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };

  // Attach auth token if available
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await clientFetch(path, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API ${res.status}`);
  }
  return res.json();
}

// ════════════════════════════════════════════════

/** Save an analysis result as a history item */
export async function saveHistoryItem(item) {
  try {
    const res = await apiFetch('/api/history', { method: 'POST', body: item });
    return { id: res.id || res._id };
  } catch (e) {
    console.warn('[historyService.save]', e?.message);
    return null;
  }
}

/** List history items (paginated) */
export async function listHistory({ limit = 50, skip = 0 } = {}) {
  try {
    const res = await apiFetch(`/api/history?limit=${limit}&skip=${skip}`);
    return { items: res.items || [], total: res.total || 0, hasMore: res.hasMore || false };
  } catch (e) {
    console.warn('[historyService.list]', e?.message);
    return { items: [], total: 0, hasMore: false };
  }
}

/** Get single history item by ID */
export async function getHistoryItem(id) {
  try {
    const res = await apiFetch(`/api/history/${id}`);
    return res.item || res || null;
  } catch (e) {
    console.warn('[historyService.get]', e?.message);
    return null;
  }
}

/** Delete a history item */
export async function deleteHistoryItem(id) {
  try {
    await apiFetch(`/api/history/${id}`, { method: 'DELETE' });
    return true;
  } catch (e) {
    console.warn('[historyService.delete]', e?.message);
    return false;
  }
}

/** Clear all history for the current user */
export async function clearAllHistory() {
  try {
    const res = await apiFetch('/api/history', { method: 'DELETE' });
    return { deletedCount: res.deletedCount || 0 };
  } catch (e) {
    console.warn('[historyService.clear]', e?.message);
    return { deletedCount: 0 };
  }
}

export const historyService = {
  saveHistoryItem,
  listHistory,
  getHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
};
