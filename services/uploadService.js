/**
 * Upload Service — Handles image uploads to Cloudinary via backend
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getToken } from './authService';

// ─── Resolve API base URL ───
function getApiUrl() {
  const configured = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;

  if (Platform.OS === 'web') return 'http://localhost:3000';

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

/**
 * Upload an image to Cloudinary for history storage
 * @param {string} imageUri - Local image URI (file:// or data:)
 * @returns {Promise<{success: boolean, imageUrl?: string, publicId?: string, error?: string}>}
 */
export async function uploadImageToCloudinary(imageUri) {
  try {
    // Get auth token
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    // Create form data
    const formData = new FormData();
    
    // Handle different URI formats
    let filename = 'image.jpg';
    if (imageUri.includes('/')) {
      const parts = imageUri.split('/');
      filename = parts[parts.length - 1].split('?')[0];
    }

    // For React Native, create a blob from the URI
    if (Platform.OS !== 'web') {
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      });
    } else {
      // For web, fetch the blob first
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('image', blob, filename);
    }

    // Upload to server
    const response = await fetch(`${API_URL}/api/history/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - let FormData set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      imageUrl: data.imageUrl,
      publicId: data.publicId,
    };
  } catch (error) {
    console.error('[uploadService] Upload failed:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

export default {
  uploadImageToCloudinary,
};
