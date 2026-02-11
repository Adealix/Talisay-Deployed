/**
 * ML Service — connects to the Python Flask ML backend
 * Provides Talisay fruit analysis with real machine learning predictions.
 *
 * Migrated from talisay_oil and adapted for talisay_ai project.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';

// ─── Performance settings ───
const IMAGE_CONFIG = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.7,
  timeout: 90000,
  targetSizeBytes: 1024 * 1024, // 1 MB
};

// ─── Resolve the ML API URL based on platform ───
function getMLApiUrl() {
  const configuredUrl = (process.env.EXPO_PUBLIC_ML_API_URL || '').trim().replace(/\/$/, '');

  if (configuredUrl && !configuredUrl.includes('localhost') && !configuredUrl.includes('127.0.0.1')) {
    return configuredUrl;
  }

  if (Platform.OS === 'web') {
    return configuredUrl || 'http://localhost:5001';
  }

  // For mobile, try to get the dev server host IP from Expo
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const hostIp = debuggerHost.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5001`;
    }
  }

  return 'http://localhost:5001';
}

const ML_API_URL = getMLApiUrl();
console.log(`[mlService] Using ML API URL: ${ML_API_URL} (Platform: ${Platform.OS})`);

// ════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════

/** Check if the ML backend is healthy and reachable */
export async function isMLBackendAvailable() {
  try {
    const res = await fetch(`${ML_API_URL}/`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        // 'ngrok-skip-browser-warning': 'true',  // Skip ngrok browser warning (commented out - using localhost)
      },
    });
    
    // Check if response is ok and content-type is JSON
    if (!res.ok) {
      console.warn(`[mlService] ML backend returned status ${res.status}`);
      return false;
    }
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`[mlService] ML backend returned non-JSON response: ${contentType}`);
      return false;
    }
    
    const data = await res.json();
    return data.status === 'healthy';
  } catch (err) {
    console.warn('[mlService] ML backend not available:', err.message);
    return false;
  }
}

/** Get backend system info */
export async function getMLSystemInfo() {
  try {
    const res = await fetch(`${ML_API_URL}/api/info`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        // 'ngrok-skip-browser-warning': 'true',  // (commented out - using localhost)
      },
    });
    
    if (!res.ok) {
      console.warn(`[mlService] Failed to get system info: ${res.status}`);
      return null;
    }
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`[mlService] System info returned non-JSON response`);
      return null;
    }
    
    return await res.json();
  } catch (err) {
    console.warn('[mlService] Failed to get system info:', err.message);
    return null;
  }
}

/**
 * Analyze a Talisay fruit image using the ML backend
 * @param {string} imageUri – local image URI from camera / gallery
 * @param {object} [options]
 * @param {object} [options.dimensions] – known dimensions { length_cm, width_cm, kernel_mass_g }
 * @param {function} [options.onProgress] – (stage, message) callback
 */
export async function analyzeImage(imageUri, options = {}) {
  const { onProgress } = options;
  const startTime = Date.now();

  try {
    // Step 1: compress / optimise image
    onProgress?.('optimizing', 'Compressing image for fast analysis...');
    let optimizedUri = imageUri;
    let finalSize = 0;
    let compressionInfo = { iterations: 0 };

    if (Platform.OS !== 'web') {
      try {
        compressionInfo = await compressImageToTargetSize(imageUri, IMAGE_CONFIG.targetSizeBytes);
        optimizedUri = compressionInfo.uri;
        finalSize = compressionInfo.sizeBytes;
      } catch (e) {
        console.warn('[mlService] Image compression failed, using original:', e.message);
        const r = await fetch(imageUri);
        const b = await r.blob();
        finalSize = b.size;
      }
    } else {
      try {
        const r = await fetch(imageUri);
        const b = await r.blob();
        finalSize = b.size;
      } catch (_) { /* ignore */ }
    }

    // Step 2: convert to base64
    onProgress?.('encoding', 'Preparing image...');
    let base64Image;
    try {
      const response = await fetch(optimizedUri);
      const blob = await response.blob();
      if (!finalSize) finalSize = blob.size;
      base64Image = await blobToBase64(blob);
    } catch (fetchError) {
      if (imageUri.startsWith('data:')) {
        base64Image = imageUri.split(',')[1];
      } else {
        throw new Error('Failed to read image: ' + fetchError.message);
      }
    }

    // Step 3: call ML backend
    onProgress?.('analyzing', 'Analyzing fruit...');
    const requestBody = { image: base64Image };
    if (options.dimensions) requestBody.dimensions = options.dimensions;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_CONFIG.timeout);

    try {
      const response = await fetch(`${ML_API_URL}/api/predict/image`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json',
          // 'ngrok-skip-browser-warning': 'true',  // (commented out - using localhost)
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!response.ok) throw new Error(data.error || `ML API error: ${response.status}`);
      if (!data.success) throw new Error(data.error || 'Analysis failed');

      return {
        success: true,
        ...transformMLResult(data.result),
        raw: data.result,
        timing: {
          totalSeconds: parseFloat(elapsed),
          imageSizeKB: (finalSize / 1024).toFixed(1),
          compressionIterations: compressionInfo.iterations || 0,
        },
      };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') throw new Error('Analysis timed out. Please try again.');
      throw fetchErr;
    }
  } catch (error) {
    console.error('[mlService.analyzeImage]', error);
    return { success: false, error: error.message, fallbackAvailable: true };
  }
}

/**
 * Predict from manual measurements (no image).
 */
export async function predictFromMeasurements({ color, lengthCm, widthCm, kernelMassG }) {
  try {
    const response = await fetch(`${ML_API_URL}/api/predict/measurements`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        // 'ngrok-skip-browser-warning': 'true',  // (commented out - using localhost)
      },
      body: JSON.stringify({
        color: color.toLowerCase(),
        length_cm: lengthCm,
        width_cm: widthCm,
        kernel_mass_g: kernelMassG,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `ML API error: ${response.status}`);
    return { success: true, ...transformMLResult(data.result), raw: data.result };
  } catch (error) {
    console.error('[mlService.predictFromMeasurements]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load and analyze averaged baseline from existing training datasets.
 * The ML backend analyzes multiple images and returns aggregated metrics
 * to use as a comparison baseline.
 *
 * @param {'green'|'yellow'|'brown'} color – dataset colour folder (default 'green')
 * @param {number} sampleSize – number of images to analyze (default 30)
 * @returns {Promise<object>}
 */
export async function getExistingDatasetAnalysis(color = 'green', sampleSize = 30) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_CONFIG.timeout); // Normal timeout - instant retrieval

    const response = await fetch(
      `${ML_API_URL}/api/existing-dataset/average?color=${encodeURIComponent(color)}`,
      { 
        method: 'GET', 
        headers: { 
          'Accept': 'application/json',
          // 'ngrok-skip-browser-warning': 'true',  // (commented out - using localhost)
        }, 
        signal: controller.signal 
      }
    );
    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `API error: ${response.status}`);
    if (!data.success) throw new Error(data.error || 'Failed to load pre-computed baseline');

    // Map baseline response to match the same shape as analyzeImage results
    // so ResultDisplay can render it consistently
    const category = (data.colorCategory || data.color || 'green').toUpperCase();
    return {
      success: true,
      imageUri: `data:image/jpeg;base64,${data.representativeImage}`,
      imageName: data.representativeImageName || data.imageName,
      totalImages: data.totalImages,
      analyzedImages: data.analyzedImages,
      representativeImage: data.representativeImage,
      color: data.color,
      // Mapped to match ResultDisplay expected field names
      category,
      colorConfidence: data.confidence,
      overallConfidence: data.confidence,
      oilConfidence: data.confidence,
      oilYieldPercent: data.oilYieldPercent,
      colorCategory: data.colorCategory,
      maturityStage: data.maturityStage,
      confidence: data.confidence,
      dimensions: data.dimensions || {},
      yieldCategory: data.yieldCategory,
      hasSpots: (data.seedSpotsDetectionRate || 0) > 0,
      spotCoverage: data.seedSpotsDetectionRate || 0,
      referenceDetected: (data.referenceDetectionRate || 0) > 0,
      interpretation: `Averaged baseline from ${data.analyzedImages || data.totalImages || 0} ${data.color || 'green'} dataset images. Average oil yield: ${(data.oilYieldPercent || 0).toFixed(1)}%. Maturity: ${data.maturityStage || 'Unknown'}.`,
      raw: data,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please try again.' };
    }
    console.error('[mlService.getExistingDatasetAnalysis]', err);
    return { success: false, error: err.message };
  }
}

/** Photo guide tips */
export function getPhotoGuide() {
  return {
    title: 'Photo Guide for Best Results',
    coinPlacement: { position: 'LEFT side', coinType: '₱5 Silver Coin (NEW)', diameter: '25mm' },
    fruitPlacement: { position: 'RIGHT side' },
    tips: [
      'Place the ₱5 coin on the LEFT side of the image',
      'Place the Talisay fruit on the RIGHT side',
      'Keep both at the same vertical height',
      'Use a plain background (white, black, or neutral)',
      'Ensure good lighting (avoid harsh shadows)',
      'Take photo from directly above (top-down view)',
      'Fill 60–80% of frame with coin and fruit',
    ],
    withoutCoin: 'System can still estimate dimensions, but results will be less precise.',
  };
}

// ════════════════════════════════════════════════
// Internal helpers
// ════════════════════════════════════════════════

function transformMLResult(result) {
  const category = (result.color || 'brown').toUpperCase();
  return {
    isTalisay: result.is_talisay !== false,
    fruitValidation: result.fruit_validation || null,
    userMessage: result.user_message || null,
    category,
    color: result.color,
    maturityStage: result.maturity_stage,
    colorConfidence: result.color_confidence,
    colorMethod: result.color_method_used,
    hasSpots: result.has_spots || false,
    spotCoverage: result.spot_coverage_percent || 0,
    dimensions: result.dimensions || {},
    dimensionsSource: result.dimensions_source,
    dimensionsConfidence: result.dimensions_confidence,
    referenceDetected: result.reference_detected || false,
    measurementMode: result.measurement_mode,
    coinInfo: result.coin_info || { detected: false },
    measurementTip: result.measurement_tip,
    oilYieldPercent: result.oil_yield_percent,
    yieldCategory: result.yield_category,
    oilConfidence: result.oil_confidence,
    interpretation: result.interpretation,
    overallConfidence: result.overall_confidence,
    analysisComplete: result.analysis_complete,
    segmentation: result.segmentation || null,
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressImageToTargetSize(imageUri, targetSizeBytes = IMAGE_CONFIG.targetSizeBytes) {
  const strategies = [
    { width: 800, quality: 0.6 },
    { width: 700, quality: 0.5 },
    { width: 600, quality: 0.4 },
    { width: 500, quality: 0.35 },
    { width: 400, quality: 0.3 },
  ];

  for (let i = 0; i < strategies.length; i++) {
    const { width, quality } = strategies[i];
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      const response = await fetch(result.uri);
      const blob = await response.blob();
      const sizeBytes = blob.size;

      if (sizeBytes <= targetSizeBytes || i === strategies.length - 1) {
        return { uri: result.uri, sizeBytes, iterations: i + 1 };
      }
    } catch (error) {
      if (i === strategies.length - 1) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        return { uri: imageUri, sizeBytes: blob.size, iterations: 0 };
      }
    }
  }
}

export default {
  isMLBackendAvailable,
  getMLSystemInfo,
  analyzeImage,
  predictFromMeasurements,
  getExistingDatasetAnalysis,
  getPhotoGuide,
};
