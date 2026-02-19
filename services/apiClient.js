/**
 * Talisay AI — Shared API Client
 *
 * Uses EXPO_PUBLIC_API_URL from .env as the backend base URL.
 * Currently pointing to: https://talisay-server-backend.onrender.com
 *
 * To switch to local development:
 *   1. In .env, comment out the Render URL and uncomment localhost.
 *   2. Restart Expo with: npx expo start --clear
 */

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://talisay-server-backend.onrender.com')
  .trim()
  .replace(/\/$/, '');

console.log('[apiClient] Backend URL:', BASE_URL);

/**
 * Fetch `path` from the configured backend.
 *
 * @param {string} path     e.g. '/api/auth/login'
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, options);
}

/**
 * Returns the active base URL (used by services that build URLs manually,
 * e.g. multipart/form-data uploads).
 */
export function getActiveApiUrl() {
  return BASE_URL;
}

/** No-op — kept for API compatibility with any callers. */
export function resetApiUrlCache() {}
