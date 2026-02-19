/**
 * Talisay AI — Analytics Service
 * Frontend API client for admin analytics endpoints.
 * Uses the shared apiClient which tries Render first, falls back to localhost.
 */
import { apiFetch } from './apiClient';
import { getToken } from './authService';

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch comprehensive analytics overview.
 * @param {{ signal?: AbortSignal, _retried?: boolean }} opts
 */
export async function fetchAnalyticsOverview(opts = {}) {
  const { signal, _retried = false } = opts;
  try {
    const headers = await authHeaders();
    const res = await apiFetch('/api/admin/analytics/overview', { headers, signal });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Failed to fetch analytics');
    return data.analytics;
  } catch (e) {
    // Auto-retry once on AbortError (handles React Strict Mode double-mount)
    if (e.name === 'AbortError' && !_retried && (!signal || !signal.aborted)) {
      return fetchAnalyticsOverview({ signal, _retried: true });
    }
    // Silently ignore intentional aborts (component unmount)
    if (e.name === 'AbortError') return null;
    console.error('[analyticsService.fetchAnalyticsOverview]', e);
    return null;
  }
}

/**
 * Fetch chart-specific data.
 * @param {'oilYieldTrend'|'categoryTimeline'|'dimensionCorrelation'} chartType
 */
export async function fetchChartData(chartType) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/admin/analytics/charts?chartType=${chartType}`, { headers });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Failed to fetch chart');
    return data.data;
  } catch (e) {
    console.error('[analyticsService.fetchChartData]', e);
    return null;
  }
}

/**
 * Fetch all users (admin).
 */
export async function fetchUsers() {
  try {
    const headers = await authHeaders();
    const res = await apiFetch('/api/admin/users', { headers });
    const data = await res.json();
    return data.ok ? data.users : [];
  } catch (e) {
    console.error('[analyticsService.fetchUsers]', e);
    return [];
  }
}

/**
 * Fetch all history items (admin).
 */
export async function fetchAllHistory(limit = 100) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/admin/history?limit=${limit}`, { headers });
    const data = await res.json();
    return data.ok ? data.items : [];
  } catch (e) {
    console.error('[analyticsService.fetchAllHistory]', e);
    return [];
  }
}

/**
 * Update a user (admin).
 */
export async function updateUser(userId, updates) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('[analyticsService.updateUser]', e);
    return { ok: false, error: 'network_error' };
  }
}

/**
 * Delete a user (admin).
 */
export async function deleteUser(userId) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('[analyticsService.deleteUser]', e);
    return { ok: false, error: 'network_error' };
  }
}

/**
 * Delete a history record (admin).
 */
export async function deleteHistory(historyId) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/admin/history/${historyId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('[analyticsService.deleteHistory]', e);
    return { ok: false, error: 'network_error' };
  }
}
