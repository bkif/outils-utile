import type { ConversionSettings, ImageFormat } from '../types/media';

export interface ImageConversionResult {
  blob: Blob;
  width: number;
  height: number;
  warning: string | null;
}

const MIME_BY_FORMAT: Record<Exclude<ImageFormat, 'ico'>, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
};

let cachedAvifSupport: boolean | null = null;

/**
 * Checks whether the current browser natively supports encoding Canvas output as AVIF.
 */
export async function checkAvifEncodeSupport(): Promise<boolean> {
  if (cachedAvifSupport !== null) {
    return cachedAvifSupport;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      cachedAvifSupport = false;
      return false;
    }
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 2, 2);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/avif', 0.8);
    });

    cachedAvifSupport = Boolean(blob && blob.type === 'image/avif');
    return cachedAvifSupport;
  } catch {
    cachedAvifSupport = false;
    return false;
  }
}

async function decodeImageSource(file: File): Promise<{
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function' && file.type !== 'image/svg+xml') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to HTMLImageElement loader (handles SVGs or exotic codecs)
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Unable to decode image "${file.name}".`));
      el.src = objectUrl;
    });

    const width = img.naturalWidth || img.width || 512;
    const height = img.naturalHeight || img.height || 512;
    return {
      source: img,
      width,
      height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

function computeTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number | null,
  maxHeight: number | null,
): { width: number; height: number } {
  let width = srcWidth;
  let height = srcHeight;

  if (maxWidth && maxWidth > 0 && width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.max(1, Math.round(height * ratio));
  }

  if (maxHeight && maxHeight > 0 && height > maxHeight) {
    const ratio = maxHeight / height;
    height = maxHeight;
    width = Math.max(1, Math.round(width * ratio));
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mimeType, quality });
  }

  const htmlCanvas = canvas as HTMLCanvasElement;
  return new Promise<Blob>((resolve, reject) => {
    htmlCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Canvas failed to encode ${mimeType}.`));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function createDrawingCanvas(
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Generates a multi-resolution ICO binary container (16x16, 32x32, 48x48 PNG frames).
 */
async function buildMultiResolutionIco(
  source: ImageBitmap | HTMLImageElement,
  srcWidth: number,
  srcHeight: number,
): Promise<Blob> {
  const sizes = [16, 32, 48] as const;
  const pngPayloads: Uint8Array[] = [];

  for (const size of sizes) {
    const canvas = createDrawingCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D rendering context is unavailable for ICO generation.');
    }

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Contain-fit source within square icon frame
    const scale = Math.min(size / srcWidth, size / srcHeight);
    const drawW = Math.max(1, Math.round(srcWidth * scale));
    const drawH = Math.max(1, Math.round(srcHeight * scale));
    const offsetX = Math.floor((size - drawW) / 2);
    const offsetY = Math.floor((size - drawH) / 2);

    ctx.drawImage(source, offsetX, offsetY, drawW, drawH);

    const pngBlob = await canvasToBlob(canvas, 'image/png', 1);
    const buffer = await pngBlob.arrayBuffer();
    pngPayloads.push(new Uint8Array(buffer));
  }

  const headerSize = 6;
  const entrySize = 16;
  const directorySize = headerSize + entrySize * sizes.length;
  const totalPayloadSize = pngPayloads.reduce((acc, bytes) => acc + bytes.byteLength, 0);
  const icoBuffer = new ArrayBuffer(directorySize + totalPayloadSize);
  const view = new DataView(icoBuffer);
  const outBytes = new Uint8Array(icoBuffer);

  // ICONDIR header
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // Type: 1 = ICO
  view.setUint16(4, sizes.length, true); // Count

  let currentOffset = directorySize;
  for (let i = 0; i < sizes.length; i += 1) {
    const dim = sizes[i];
    const payload = pngPayloads[i];
    const entryOffset = headerSize + i * entrySize;

    view.setUint8(entryOffset + 0, dim); // Width
    view.setUint8(entryOffset + 1, dim); // Height
    view.setUint8(entryOffset + 2, 0); // Color count
    view.setUint8(entryOffset + 3, 0); // Reserved
    view.setUint16(entryOffset + 4, 1, true); // Color planes
    view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    view.setUint32(entryOffset + 8, payload.byteLength, true); // Bytes in resource
    view.setUint32(entryOffset + 12, currentOffset, true); // Offset of image data

    outBytes.set(payload, currentOffset);
    currentOffset += payload.byteLength;
  }

  return new Blob([icoBuffer], { type: 'image/x-icon' });
}

/**
 * Converts a raster/vector image strictly client-side via Canvas/OffscreenCanvas,
 * automatically stripping EXIF metadata.
 */
export async function convertImageClientSide(
  file: File,
  targetFormat: ImageFormat,
  settings: ConversionSettings,
): Promise<ImageConversionResult> {
  if (targetFormat === 'avif') {
    const supported = await checkAvifEncodeSupport();
    if (!supported) {
      throw new Error(
        'This browser does not support native AVIF Canvas encoding. Switch the target format to WebP for reliable high-efficiency compression.',
      );
    }
  }

  const decoded = await decodeImageSource(file);
  try {
    if (targetFormat === 'ico') {
      const icoBlob = await buildMultiResolutionIco(
        decoded.source,
        decoded.width,
        decoded.height,
      );
      return {
        blob: icoBlob,
        width: 48,
        height: 48,
        warning: null,
      };
    }

    const { width, height } = computeTargetDimensions(
      decoded.width,
      decoded.height,
      settings.maxWidth,
      settings.maxHeight,
    );

    const canvas = createDrawingCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to acquire 2D Canvas context for image conversion.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (targetFormat === 'jpg') {
      // JPEG lacks alpha transparency; composite over white to avoid black matte
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    ctx.drawImage(decoded.source, 0, 0, width, height);

    const mimeType = MIME_BY_FORMAT[targetFormat];
    const quality = Math.min(1, Math.max(0.1, settings.quality));
    const blob = await canvasToBlob(canvas, mimeType, quality);

    if (targetFormat === 'avif' && blob.type !== 'image/avif') {
      throw new Error(
        'Browser fell back from AVIF encoding. Please select WebP instead for consistent results.',
      );
    }

    return {
      blob,
      width,
      height,
      warning: null,
    };
  } finally {
    decoded.cleanup();
  }
}
