/**
 * Auth Service — Frontend API client for authentication.
 * Connects to Express backend at /api/auth/*.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Resolve API base URL ───
function getApiUrl() {
  const configured = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  
  // Skip localhost URLs for mobile - they won't work on mobile devices
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }

  if (Platform.OS === 'web') {
    return configured || 'http://localhost:3000';
  }

  // For mobile, try to get the dev server host IP from Expo
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000`;
    }
  }
  return 'http://localhost:3000';
}

const API_URL = getApiUrl();
console.log(`[authService] Using API URL: ${API_URL} (Platform: ${Platform.OS})`);

// ─── Token management ───
let _token = null;

export async function getToken() {
  if (_token) return _token;
  try {
    _token = await AsyncStorage.getItem('auth_token');
  } catch {}
  return _token;
}

export async function setToken(token) {
  _token = token;
  try {
    if (token) {
      await AsyncStorage.setItem('auth_token', token);
    } else {
      await AsyncStorage.removeItem('auth_token');
    }
  } catch {}
}

// ─── API helpers ───
async function apiFetch(path, opts = {}) {
  const { method = 'GET', body, auth = false } = opts;
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `API ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ═══════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════

/** Register a new account (sends OTP email) */
export async function register({ email, password, firstName, lastName }) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: { email, password, firstName, lastName },
  });
  return data; // { ok, message, user }
}

/** Verify email with OTP code */
export async function verifyEmail(email, otp) {
  const data = await apiFetch('/api/auth/verify-email', {
    method: 'POST',
    body: { email, otp },
  });
  if (data.token) await setToken(data.token);
  return data; // { ok, token, user }
}

/** Resend verification OTP */
export async function resendOtp(email) {
  return apiFetch('/api/auth/resend-otp', { method: 'POST', body: { email } });
}

/** Login with email + password */
export async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (data.token) await setToken(data.token);
  return data; // { ok, token, user }
}

/** Get current user info (requires auth) */
export async function getMe() {
  return apiFetch('/api/auth/me', { auth: true });
}

/** Update profile fields (requires auth) */
export async function updateProfile({ firstName, lastName, phone, address }) {
  return apiFetch('/api/auth/profile', {
    method: 'PUT',
    body: { firstName, lastName, phone, address },
    auth: true,
  });
}

/** Request OTP for password change (requires auth) */
export async function requestPasswordOtp() {
  return apiFetch('/api/auth/request-password-otp', { method: 'POST', auth: true });
}

/** Change password with OTP (requires auth) */
export async function changePassword(otp, newPassword) {
  return apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: { otp, newPassword },
    auth: true,
  });
}

/** Get user stats (requires auth) */
export async function getUserStats() {
  return apiFetch('/api/auth/stats', { auth: true });
}

/** Upload profile avatar (requires auth) */
export async function uploadAvatar(imageUri) {
  try {
    console.log('[uploadAvatar] Starting upload...');
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    // Create FormData
    const formData = new FormData();
    
    // For web, imageUri is a blob URL, need to fetch and convert to File
    // For mobile, imageUri is a file:// path
    if (Platform.OS === 'web') {
      console.log('[uploadAvatar] Web platform detected, converting blob to file...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = 'avatar_' + Date.now() + '.jpg';
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      console.log('[uploadAvatar] File created:', { name: file.name, type: file.type, size: file.size });
      formData.append('avatar', file);
    } else {
      // Mobile: Use URI directly
      const filename = imageUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      console.log('[uploadAvatar] Mobile - Image info:', { filename, type });
      formData.append('avatar', {
        uri: imageUri,
        type,
        name: filename,
      });
    }

    console.log('[uploadAvatar] Uploading to:', `${API_URL}/api/auth/upload-avatar`);
    const response = await fetch(`${API_URL}/api/auth/upload-avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type, fetch will set it automatically for FormData
      },
      body: formData,
    });

    console.log('[uploadAvatar] Response status:', response.status);
    const data = await response.json();
    console.log('[uploadAvatar] Response data:', data);
    
    if (!response.ok) {
      const error = new Error(data.error || 'Upload failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[uploadAvatar] Error:', error);
    throw error;
  }
}

/** Logout */
export async function logoutUser() {
  await setToken(null);
}
