/**
 * Talisay AI — Forum Service
 * Frontend API client for forum endpoints.
 */
import { apiFetch, getActiveApiUrl } from './apiClient';
import { getToken } from './authService';

async function authHeaders(json = true) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Fetch paginated posts */
export async function fetchPosts(page = 1, limit = 20) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/forum?page=${page}&limit=${limit}`, { headers });
    const data = await res.json();
    return data.ok ? data : { ok: false, posts: [], total: 0 };
  } catch (e) {
    console.error('[forumService.fetchPosts]', e);
    return { ok: false, posts: [], total: 0 };
  }
}

/** Create a new post (with optional files) */
export async function createPost({ title, content, files = [] }) {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    files.forEach(f => {
      formData.append('files', {
        uri: f.uri,
        name: f.name || f.fileName || 'file',
        type: f.type || f.mimeType || 'application/octet-stream',
      });
    });
    const base = getActiveApiUrl();
    const res = await fetch(`${base}/api/forum`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return await res.json();
  } catch (e) {
    console.error('[forumService.createPost]', e);
    return { ok: false, error: 'network_error' };
  }
}

/** Delete a post */
export async function deletePost(postId) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/forum/${postId}`, { method: 'DELETE', headers });
    return await res.json();
  } catch (e) {
    console.error('[forumService.deletePost]', e);
    return { ok: false, error: 'network_error' };
  }
}

/** Toggle like on a post */
export async function toggleLike(postId) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/forum/${postId}/like`, { method: 'POST', headers });
    return await res.json();
  } catch (e) {
    console.error('[forumService.toggleLike]', e);
    return { ok: false, error: 'network_error' };
  }
}

/** Add a comment */
export async function addComment(postId, text) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/forum/${postId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });
    return await res.json();
  } catch (e) {
    console.error('[forumService.addComment]', e);
    return { ok: false, error: 'network_error' };
  }
}

/** Delete a comment */
export async function deleteComment(postId, commentId) {
  try {
    const headers = await authHeaders();
    const res = await apiFetch(`/api/forum/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  } catch (e) {
    console.error('[forumService.deleteComment]', e);
    return { ok: false, error: 'network_error' };
  }
}
