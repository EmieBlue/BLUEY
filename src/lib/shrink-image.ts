import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * Downscale + compress an image in the browser using a canvas, returning a JPEG
 * Blob. Web only (uses DOM/canvas) — returns null on native or on any failure,
 * so callers fall back to uploading the original. Reliable and dependency-free
 * (replaces expo-image-manipulator, which was flaky on web — see shrinkImageNative
 * below for the native equivalent, where the native manipulator is reliable).
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

/**
 * Downscale + compress an image on iOS/Android using expo-image-manipulator,
 * returning a local file:// URI to a re-encoded JPEG. Native only — returns
 * null on web or on any failure, so callers fall back to uploading the
 * original. Unlike on web (see shrinkImageWeb's comment), the native
 * manipulator uses real platform APIs and is reliable here.
 */
export async function shrinkImageNative(
  uri: string,
  width: number,
  height: number,
  maxEdge = 1400,
  quality = 0.72,
): Promise<string | null> {
  if (Platform.OS === 'web' || !width || !height) return null;
  try {
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    if (scale >= 1) return null; // already small enough — skip re-encode

    const isWide = width >= height;
    const target = isWide
      ? { width: Math.round(width * scale), height: null }
      : { width: null, height: Math.round(height * scale) };
    const context = ImageManipulator.manipulate(uri);
    const rendered = await context.resize(target).renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    return result.uri;
  } catch {
    return null;
  }
}
