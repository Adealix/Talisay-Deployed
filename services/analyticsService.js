/**
 * Talisay AI — Analytics Service
 * Frontend API client for admin analytics endpoints.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getToken } from './authService';

// ─── Resolve API base URL (called dynamically per-request so hostUri is available) ───
function getApiUrl() {
  const configured = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/$/, '');

  // Only use the configured URL if it is NOT a localhost address (localhost won't
  // work on a physical device — only on the dev machine itself).
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }

  if (Platform.OS === 'web') {
    return configured || 'http://localhost:3000';
  }

  // On a physical device/emulator, derive the IP from the Expo Metro bundler host.
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return `http://${ip}:3000`;
  }

  return 'http://localhost:3000';
}

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch comprehensive analytics overview.
 */
export async function fetchAnalyticsOverview() {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${getApiUrl()}/api/admin/analytics/overview`, { headers });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Failed to fetch analytics');
    return data.analytics;
  } catch (e) {
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
    const res = await fetch(`${getApiUrl()}/api/admin/analytics/charts?chartType=${chartType}`, { headers });
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
    const res = await fetch(`${getApiUrl()}/api/admin/users`, { headers });
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
    const res = await fetch(`${getApiUrl()}/api/admin/history?limit=${limit}`, { headers });
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
    const res = await fetch(`${getApiUrl()}/api/admin/users/${userId}`, {
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
    const res = await fetch(`${getApiUrl()}/api/admin/users/${userId}`, {
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
    const res = await fetch(`${getApiUrl()}/api/admin/history/${historyId}`, {
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
