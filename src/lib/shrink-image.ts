import { Platform } from 'react-native';

/**
 * Downscale + compress an image in the browser using a canvas, returning a JPEG
 * Blob. Web only (uses DOM/canvas) — returns null on native or on any failure,
 * so callers fall back to uploading the original. Reliable and dependency-free
 * (replaces expo-image-manipulator, which was flaky on web).
 */
export async function shrinkImageWeb(
  uri: string,
  maxEdge = 1400,
  quality = 0.72,
): Promise<Blob | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  try {
    const img = await loadImage(uri);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return null;
    const scale = Math.min(1, maxEdge / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    );
  } catch {
    return null;
  }
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });
}
