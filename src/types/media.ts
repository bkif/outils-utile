export type MediaCategory = 'video' | 'audio' | 'image';

export type ImageFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'ico';

export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'mkv' | 'avi' | 'gif';

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac' | 'flac';

export type SupportedFormat = ImageFormat | VideoFormat | AudioFormat;

export type PresetId =
  | 'discord-10mb'
  | 'extract-mp3-320'
  | 'smooth-gif'
  | 'web-webp'
  | 'fast-remux'
  | 'lossless-wav';

export interface ConversionSettings {
  /** Image compression quality from 0.1 to 1.0 */
  quality: number;
  /** Video Constant Rate Factor (18 = near-lossless, 23 = balanced, 32 = compact) */
  crf: number;
  /** Optional max width for image/video resize */
  maxWidth: number | null;
  /** Optional max height for image resize */
  maxHeight: number | null;
  /** Audio bitrate for lossy audio or video audio track */
  audioBitrate: '96k' | '128k' | '192k' | '256k' | '320k';
  /** Frame rate for GIF exports */
  gifFps: number;
  /** Output width in px for GIF exports */
  gifWidth: number;
  /** Copy streams without re-encoding when container-compatible */
  fastRemux: boolean;
  /** Target maximum file size in MB (used by Discord < 10 MB preset) */
  targetSizeMb: number | null;
  /** Active preset ID if applied */
  activePreset: PresetId | null;
}

export type QueueItemStatus =
  | 'idle'
  | 'queued'
  | 'converting'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  category: MediaCategory;
  sourceFormat: string;
  targetFormat: SupportedFormat;
  settings: ConversionSettings;
  status: QueueItemStatus;
  progress: number;
  outputBlob: Blob | null;
  outputUrl: string | null;
  outputSize: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  warningMessage: string | null;
  thumbnailUrl: string | null;
}

export type EngineState = 'standby' | 'loading' | 'ready' | 'busy' | 'error';

export interface EngineStatus {
  state: EngineState;
  progress: number;
  message: string;
  errorDetail: string | null;
}

export interface FormatMeta {
  id: SupportedFormat;
  label: string;
  extension: string;
  mimeType: string;
  category: MediaCategory;
  description: string;
}

export interface PresetDefinition {
  id: PresetId;
  label: string;
  shortLabel: string;
  targetBadge: string;
  description: string;
  compatibleCategories: MediaCategory[];
  targetFormat: SupportedFormat;
  settingsPatch: Partial<ConversionSettings>;
}
