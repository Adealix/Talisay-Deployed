/**
 * ML Service — connects to the Python Flask ML backend
 * Provides Talisay fruit analysis with real machine learning predictions.
 *
 * Migrated from talisay_oil and adapted for talisay_ai project.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Performance settings ───
const IMAGE_CONFIG = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.7,
  timeout: 90000,
  targetSizeBytes: 1024 * 1024, // 1 MB
};

// ─── Runtime ngrok URL (stored in AsyncStorage, overrides localhost) ───
const NGROK_URL_KEY = '@talisay_ai/ngrok_url';
let _cachedNgrokUrl = null;  // In-memory cache to avoid AsyncStorage reads every request

/** Load the saved ngrok URL from AsyncStorage into memory */
export async function loadNgrokUrl() {
  try {
    const saved = await AsyncStorage.getItem(NGROK_URL_KEY);
    _cachedNgrokUrl = saved || null;
    if (saved) console.log('[mlService] Loaded ngrok URL:', saved);
  } catch (_) { _cachedNgrokUrl = null; }
}

/** Save a new ngrok URL and cache it */
export async function setNgrokUrl(url) {
  const trimmed = (url || '').trim().replace(/\/$/, '');
  try {
    if (trimmed) {
      await AsyncStorage.setItem(NGROK_URL_KEY, trimmed);
    } else {
      await AsyncStorage.removeItem(NGROK_URL_KEY);
    }
    _cachedNgrokUrl = trimmed || null;
    console.log('[mlService] Ngrok URL updated:', trimmed || '(cleared)');
  } catch (e) {
    console.warn('[mlService] Failed to save ngrok URL:', e.message);
  }
}

/** Get the currently configured ngrok URL (null if not set) */
export function getNgrokUrl() {
  return _cachedNgrokUrl || null;
}

/** Clear the ngrok URL and fall back to localhost */
export async function clearNgrokUrl() {
  await setNgrokUrl('');
}

// ─── Resolve the ML API URL based on platform ───
// Priority: runtime ngrok URL → EXPO_PUBLIC_ML_API_URL (if non-localhost) → auto-detect IP → localhost fallback
function getMLApiUrl() {
  // 1. Runtime ngrok URL (highest priority — set via Admin panel or scan page)
  if (_cachedNgrokUrl) {
    return _cachedNgrokUrl;
  }

  const configuredUrl = (process.env.EXPO_PUBLIC_ML_API_URL || '').trim().replace(/\/$/, '');

  // 2. If .env points to a real external URL (not localhost), use it
  if (configuredUrl && !configuredUrl.includes('localhost') && !configuredUrl.includes('127.0.0.1')) {
    return configuredUrl;
  }

  if (Platform.OS === 'web') {
    return configuredUrl || 'http://localhost:5001';
  }

  // 3. For mobile, try to get the dev server host IP from Expo
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const hostIp = debuggerHost.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5001`;
    }
  }

  // 4. Localhost fallback (always last resort)
  return 'http://localhost:5001';
}

const ML_API_URL_STARTUP = getMLApiUrl();
console.log(`[mlService] Initial ML API URL: ${ML_API_URL_STARTUP} (Platform: ${Platform.OS})`);

// ─── Build fetch headers ───────────────────────────────────────────────────
// ngrok-skip-browser-warning is sent on every request.
// Free-tier ngrok injects an HTML interstitial page unless this header is
// present — which would cause "JSON Parse error: Unexpected character: <".
// Sending it unconditionally is safe for non-ngrok endpoints.
function getApiHeaders(extra = {}) {
  return {
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...extra,
  };
}

/** Expose the current active ML API URL for display in UI */
export function getCurrentMLApiUrl() {
  return getMLApiUrl();
}

/** Check if the ML backend is healthy and reachable */
export async function isMLBackendAvailable() {
  try {
    const res = await fetch(`${getMLApiUrl()}/`, {
      method: 'GET',
      headers: getApiHeaders(),
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
    const res = await fetch(`${getMLApiUrl()}/api/info`, {
      method: 'GET',
      headers: getApiHeaders(),
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
      const response = await fetch(`${getMLApiUrl()}/api/predict/image`, {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
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
 * Analyze an image containing multiple Talisay fruits.
 * Calls /api/predict/multi — per-fruit oil yield + averages.
 * @param {string} imageUri – local image URI
 * @param {object} [options]
 * @param {function} [options.onProgress]
 */
export async function analyzeMultiFruitImage(imageUri, options = {}) {
  const { onProgress } = options;
  const startTime = Date.now();
  try {
    onProgress?.('optimizing', 'Compressing image...');
    let optimizedUri = imageUri;
    let finalSize = 0;
    let compressionInfo = { iterations: 0 };
    if (Platform.OS !== 'web') {
      try {
        compressionInfo = await compressImageToTargetSize(imageUri, IMAGE_CONFIG.targetSizeBytes);
        optimizedUri = compressionInfo.uri;
        finalSize = compressionInfo.sizeBytes;
      } catch (e) {
        console.warn('[mlService] Compression failed:', e.message);
      }
    }
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
    onProgress?.('analyzing', 'Detecting multiple fruits...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_CONFIG.timeout);
    try {
      const response = await fetch(`${getMLApiUrl()}/api/predict/multi`, {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (!response.ok) throw new Error(data.error || `ML API error: ${response.status}`);
      if (!data.success) throw new Error(data.error || 'Multi-fruit analysis failed');
      const r = data.result;
      const _fruits = r.fruits || [];
      const overallConf = _fruits.length > 0
        ? _fruits.reduce((sum, f) => sum + (f.detection_confidence || f.confidence || 0.85), 0) / _fruits.length
        : 0.85;
      return {
        success: true,
        multiFruit: true,
        fruitCount: r.fruit_count || 0,
        fruits: _fruits,
        averageOilYield: r.average_oil_yield,
        oilYieldRange: r.oil_yield_range,
        colorDistribution: r.color_distribution || {},
        interpretation: r.interpretation,
        analysisComplete: r.analysis_complete,
        overallConfidence: overallConf,
        colorConfidence: overallConf,
        timing: { totalSeconds: parseFloat(elapsed), imageSizeKB: (finalSize / 1024).toFixed(1) },
        raw: r,
      };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') throw new Error('Analysis timed out. Please try again.');
      throw fetchErr;
    }
  } catch (error) {
    console.error('[mlService.analyzeMultiFruitImage]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Predict from manual measurements (no image).
 */
export async function predictFromMeasurements({ color, lengthCm, widthCm, kernelMassG }) {
  try {
    const response = await fetch(`${getMLApiUrl()}/api/predict/measurements`, {
      method: 'POST',
      headers: getApiHeaders({ 'Content-Type': 'application/json' }),
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
      `${getMLApiUrl()}/api/existing-dataset/average?color=${encodeURIComponent(color)}`,
      { method: 'GET', headers: getApiHeaders(), signal: controller.signal }
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
  // ── Multi-fruit result (from auto-routed /api/predict/image or /api/predict/multi) ──
  if (result.multi_fruit || result.fruit_count != null) {
    const fruits = result.fruits || [];
    const dominant = fruits.length > 0
      ? fruits.reduce((a, b) => (a.detection_confidence > b.detection_confidence ? a : b))
      : null;
    return {
      // Multi-fruit specific
      multiFruit: true,
      fruitCount: result.fruit_count || 0,
      fruits,
      averageOilYield: result.average_oil_yield,
      oilYieldRange: result.oil_yield_range,
      colorDistribution: result.color_distribution || {},
      // Mirror single-fruit fields from dominant fruit so existing UI doesn’t break
      isTalisay: true,
      category: dominant ? dominant.color.toUpperCase() : 'BROWN',
      color: dominant?.color || 'brown',
      maturityStage: null,
      colorConfidence: dominant?.color_confidence || 0,
      colorMethod: 'cnn_multi',
      hasSpots: false,
      spotCoverage: 0,
      dimensions: dominant?.dimensions || {},
      dimensionsSource: dominant?.dimensions_source || 'estimated',
      dimensionsConfidence: dominant?.detection_confidence || 0.5,
      referenceDetected: result.pipeline_info?.coin_reference || false,
      measurementMode: result.pipeline_info?.coin_reference ? 'coin_reference' : 'smart_estimation',
      coinInfo: { detected: result.pipeline_info?.coin_reference || false },
      oilYieldPercent: result.average_oil_yield,
      yieldCategory: null,
      oilConfidence: null,
      overallConfidence: dominant?.detection_confidence || 0.5,
      interpretation: result.interpretation,
      analysisComplete: result.analysis_complete,
      segmentation: null,
    };
  }

  // ── Single-fruit result ───────────────────────────────────────────
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
  analyzeMultiFruitImage,
  predictFromMeasurements,
  getExistingDatasetAnalysis,
  getPhotoGuide,
};
