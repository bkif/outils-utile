import JSZip from 'jszip';
import { FORMAT_REGISTRY } from '../constants/formats';
import type { QueueItem, SupportedFormat } from '../types/media';

/**
 * Formats a byte count into a compact tabular-friendly human string.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  if (exponent === 0) return `${Math.round(value)} B`;
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Formats millisecond duration into compact readable seconds/minutes.
 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0.0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Calculates signed percentage change from originalSize to outputSize.
 * Negative values indicate size reduction (e.g. -82%).
 */
export function calculateSizeDeltaPercent(originalSize: number, outputSize: number): number {
  if (originalSize <= 0) return 0;
  return Math.round(((outputSize - originalSize) / originalSize) * 100);
}

/**
 * Builds an output filename preserving the stem and applying the target extension.
 */
export function buildOutputFileName(originalName: string, targetFormat: SupportedFormat): string {
  const ext = FORMAT_REGISTRY[targetFormat].extension;
  const lastDot = originalName.lastIndexOf('.');
  const stem = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const safeStem = stem.trim() || 'converted';
  return `${safeStem}.${ext}`;
}

/**
 * Triggers a browser download for a single Blob or Object URL.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Bundles all completed queue items into a single client-side ZIP archive.
 */
export async function downloadCompletedAsZip(items: readonly QueueItem[]): Promise<void> {
  const completed = items.filter(
    (item): item is QueueItem & { outputBlob: Blob } =>
      item.status === 'completed' && item.outputBlob !== null,
  );

  if (completed.length === 0) {
    throw new Error('No completed conversions available to archive.');
  }

  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const item of completed) {
    let targetName = buildOutputFileName(item.name, item.targetFormat);
    const count = usedNames.get(targetName) ?? 0;
    if (count > 0) {
      const dotIdx = targetName.lastIndexOf('.');
      const stem = dotIdx > 0 ? targetName.slice(0, dotIdx) : targetName;
      const ext = dotIdx > 0 ? targetName.slice(dotIdx) : '';
      targetName = `${stem} (${count + 1})${ext}`;
    }
    usedNames.set(buildOutputFileName(item.name, item.targetFormat), count + 1);
    zip.file(targetName, item.outputBlob);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 3 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(zipBlob, `forge-converted-${stamp}.zip`);
}

function inferExtensionFromContentType(contentType: string): string {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  const map: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/x-msvideo': 'avi',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/flac': 'flac',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/x-icon': 'ico',
    'image/svg+xml': 'svg',
  };
  return map[mime] ?? '';
}

function isMediaContentType(contentType: string): boolean {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('image/') ||
    mime === 'application/octet-stream'
  );
}

/**
 * Fetches a direct public media file URL directly in the browser.
 * Validates Content-Type and provides explicit CORS guidance on blocked hosts.
 */
export async function fetchMediaFromUrl(rawUrl: string): Promise<File> {
  const trimmed = rawUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new Error('Please enter a valid http:// or https:// direct file URL.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS direct media URLs are supported.');
  }

  let response: Response;
  try {
    response = await fetch(parsedUrl.toString(), { mode: 'cors' });
  } catch {
    throw new Error(
      'Fetch blocked by browser CORS policy or network error. Ensure the host sends Access-Control-Allow-Origin headers and links directly to a media file (not a streaming page).',
    );
  }

  if (!response.ok) {
    throw new Error(`Remote server returned HTTP ${response.status} (${response.statusText || 'Error'}).`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType && !isMediaContentType(contentType)) {
    throw new Error(
      `URL returned "${contentType.split(';')[0]}" instead of a direct media file. HTML pages and streaming platforms (e.g., YouTube) cannot be imported client-side.`,
    );
  }

  const blob = await response.blob();
  const effectiveType = blob.type || contentType.split(';')[0]?.trim() || 'application/octet-stream';

  const rawPathName = decodeURIComponent(parsedUrl.pathname.split('/').pop() || '');
  let fileName = rawPathName.split('?')[0]?.trim() || 'remote-media';

  if (!fileName.includes('.')) {
    const inferredExt = inferExtensionFromContentType(effectiveType);
    if (inferredExt) {
      fileName = `${fileName}.${inferredExt}`;
    }
  }

  return new File([blob], fileName, { type: effectiveType });
}
