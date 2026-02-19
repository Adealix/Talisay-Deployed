/**
 * Upload Service — Handles image uploads to Cloudinary via backend
 * Uses the shared apiClient which races Render vs localhost automatically.
 */
import { Platform } from 'react-native';
import { getToken } from './authService';
import { getActiveApiUrl } from './apiClient';

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
    const response = await fetch(`${getActiveApiUrl()}/api/history/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - let FormData set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Throw a concise error — caller treats upload failure as non-fatal
      throw new Error(errorData.error || `upload_failed (${response.status})`);
    }

    const data = await response.json();
    
    return {
      success: true,
      imageUrl: data.imageUrl,
      publicId: data.publicId,
    };
  } catch (error) {
    // Upload failure is non-fatal — scan still saves with local URI fallback
    console.warn('[uploadService] Image upload skipped:', error.message);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

export default {
  uploadImageToCloudinary,
};
