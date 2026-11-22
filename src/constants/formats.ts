import type {
  AudioFormat,
  ConversionSettings,
  FormatMeta,
  ImageFormat,
  MediaCategory,
  PresetDefinition,
  PresetId,
  SupportedFormat,
  VideoFormat,
} from '../types/media';

export const LARGE_FILE_WARNING_BYTES = 200 * 1024 * 1024; // 200 MB

export const IMAGE_FORMATS: readonly ImageFormat[] = ['png', 'jpg', 'webp', 'avif', 'ico'];
export const VIDEO_FORMATS: readonly VideoFormat[] = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'gif'];
export const AUDIO_FORMATS: readonly AudioFormat[] = ['mp3', 'wav', 'ogg', 'aac', 'flac'];

export const FORMAT_REGISTRY: Record<SupportedFormat, FormatMeta> = {
  // Video
  mp4: {
    id: 'mp4',
    label: 'MP4',
    extension: 'mp4',
    mimeType: 'video/mp4',
    category: 'video',
    description: 'Conteneur vidéo universel H.264 / AAC',
  },
  webm: {
    id: 'webm',
    label: 'WebM',
    extension: 'webm',
    mimeType: 'video/webm',
    category: 'video',
    description: 'Conteneur web ouvert (VP8/VP9 + Vorbis)',
  },
  mov: {
    id: 'mov',
    label: 'MOV',
    extension: 'mov',
    mimeType: 'video/quicktime',
    category: 'video',
    description: 'Conteneur vidéo Apple QuickTime',
  },
  mkv: {
    id: 'mkv',
    label: 'MKV',
    extension: 'mkv',
    mimeType: 'video/x-matroska',
    category: 'video',
    description: 'Conteneur multimédia flexible Matroska',
  },
  avi: {
    id: 'avi',
    label: 'AVI',
    extension: 'avi',
    mimeType: 'video/x-msvideo',
    category: 'video',
    description: 'Conteneur classique Audio Video Interleave',
  },
  gif: {
    id: 'gif',
    label: 'GIF',
    extension: 'gif',
    mimeType: 'image/gif',
    category: 'video',
    description: 'GIF animé optimisé par palette Lanczos',
  },

  // Audio
  mp3: {
    id: 'mp3',
    label: 'MP3',
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    category: 'audio',
    description: 'Audio compressé universel MPEG-1 Layer III',
  },
  wav: {
    id: 'wav',
    label: 'WAV',
    extension: 'wav',
    mimeType: 'audio/wav',
    category: 'audio',
    description: 'Audio PCM non compressé sans perte',
  },
  ogg: {
    id: 'ogg',
    label: 'OGG',
    extension: 'ogg',
    mimeType: 'audio/ogg',
    category: 'audio',
    description: 'Audio ouvert Ogg Vorbis haute efficacité',
  },
  aac: {
    id: 'aac',
    label: 'AAC',
    extension: 'aac',
    mimeType: 'audio/aac',
    category: 'audio',
    description: 'Advanced Audio Coding (haute efficacité)',
  },
  flac: {
    id: 'flac',
    label: 'FLAC',
    extension: 'flac',
    mimeType: 'audio/flac',
    category: 'audio',
    description: 'Codec audio sans perte Free Lossless',
  },

  // Image
  png: {
    id: 'png',
    label: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    category: 'image',
    description: 'Image matricielle sans perte avec transparence alpha',
  },
  jpg: {
    id: 'jpg',
    label: 'JPG',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    category: 'image',
    description: 'JPEG photographique compact',
  },
  webp: {
    id: 'webp',
    label: 'WebP',
    extension: 'webp',
    mimeType: 'image/webp',
    category: 'image',
    description: 'Format web moderne avec transparence et forte compression',
  },
  avif: {
    id: 'avif',
    label: 'AVIF',
    extension: 'avif',
    mimeType: 'image/avif',
    category: 'image',
    description: 'Format AV1 nouvelle génération (selon support navigateur)',
  },
  ico: {
    id: 'ico',
    label: 'ICO',
    extension: 'ico',
    mimeType: 'image/x-icon',
    category: 'image',
    description: 'Icône Windows multi-résolution (16×16, 32×32, 48×48)',
  },
};

export const TARGET_FORMATS_BY_CATEGORY: Record<MediaCategory, readonly SupportedFormat[]> = {
  video: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
  image: ['webp', 'png', 'jpg', 'avif', 'ico', 'gif'],
};

const EXTENSION_ALIASES: Record<string, string> = {
  jpeg: 'jpg',
  jpe: 'jpg',
  jfif: 'jpg',
  m4a: 'aac',
  m4v: 'mp4',
  oga: 'ogg',
  ogv: 'webm',
  wave: 'wav',
  tif: 'tiff',
  svgz: 'svg',
};

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mov',
  'mkv',
  'avi',
  'flv',
  'wmv',
  'm4v',
  '3gp',
  'ts',
  'mts',
  'm2ts',
  'mpeg',
  'mpg',
  'ogv',
]);

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'ogg',
  'aac',
  'flac',
  'm4a',
  'wma',
  'opus',
  'aiff',
  'aif',
  'alac',
  'oga',
]);

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'ico',
  'bmp',
  'gif',
  'svg',
  'tiff',
  'tif',
]);

export function normalizeSourceExtension(rawExt: string): string {
  const lower = rawExt.trim().toLowerCase().replace(/^\./, '');
  return EXTENSION_ALIASES[lower] ?? lower;
}

export function detectMediaInfo(file: File): {
  category: MediaCategory | null;
  sourceFormat: string;
} {
  const nameParts = file.name.split('.');
  const rawExt = nameParts.length > 1 ? (nameParts.pop() ?? '') : '';
  let ext = normalizeSourceExtension(rawExt);

  const mime = file.type.toLowerCase();

  if (!ext && mime) {
    const mimeSubtype = mime.split('/')[1]?.split(';')[0] ?? '';
    if (mimeSubtype === 'jpeg') ext = 'jpg';
    else if (mimeSubtype === 'quicktime') ext = 'mov';
    else if (mimeSubtype === 'x-matroska') ext = 'mkv';
    else if (mimeSubtype === 'x-msvideo') ext = 'avi';
    else if (mimeSubtype === 'mpeg' && mime.startsWith('audio/')) ext = 'mp3';
    else if (mimeSubtype === 'x-wav' || mimeSubtype === 'wav') ext = 'wav';
    else if (mimeSubtype === 'x-icon' || mimeSubtype === 'vnd.microsoft.icon') ext = 'ico';
    else if (mimeSubtype === 'svg+xml') ext = 'svg';
    else ext = normalizeSourceExtension(mimeSubtype);
  }

  // Animated GIFs are treated as video/animation when imported? Or image?
  // Treating GIF as 'image' allows converting GIF -> WebP/PNG/ICO via Canvas, or GIF -> MP4?
  // Wait: if someone drops a .gif, Canvas captures first frame; if treated as video, FFmpeg handles animated GIF -> MP4/WebM!
  // Let's check: if mime/ext is gif, wait - let's inspect whether gif fits better in video or image.
  // Actually, if gif is in 'video' category, valid targets include mp4, webm, mov, mkv, avi, gif, etc.
  // Let's keep gif in 'image' if someone wants PNG/WebP, OR wait: if gif is in 'video', they can convert animated GIF -> MP4/WebM cleanly!
  // Let's check the prompt: "e.g., mov/mkv/avi -> mp4, wav/flac -> mp3, png/jpg -> webp".
  if (ext === 'gif' || mime === 'image/gif') {
    return { category: 'video', sourceFormat: 'gif' };
  }

  if (VIDEO_EXTENSIONS.has(ext) || mime.startsWith('video/')) {
    return { category: 'video', sourceFormat: ext || 'video' };
  }
  if (AUDIO_EXTENSIONS.has(ext) || mime.startsWith('audio/')) {
    return { category: 'audio', sourceFormat: ext || 'audio' };
  }
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) {
    return { category: 'image', sourceFormat: ext || 'image' };
  }

  return { category: null, sourceFormat: ext || 'unknown' };
}

export function getDefaultTargetFormat(
  category: MediaCategory,
  sourceFormat: string,
): SupportedFormat {
  if (category === 'video') {
    if (sourceFormat === 'mp4') return 'webm';
    return 'mp4';
  }
  if (category === 'audio') {
    if (sourceFormat === 'mp3') return 'wav';
    return 'mp3';
  }
  // Image
  if (sourceFormat === 'webp') return 'png';
  return 'webp';
}

export function getDefaultSettings(): ConversionSettings {
  return {
    quality: 0.85,
    crf: 23,
    maxWidth: null,
    maxHeight: null,
    audioBitrate: '192k',
    gifFps: 15,
    gifWidth: 480,
    fastRemux: false,
    targetSizeMb: null,
    activePreset: null,
  };
}

export const PRESETS: Record<PresetId, PresetDefinition> = {
  'discord-10mb': {
    id: 'discord-10mb',
    label: 'Compression Discord (< 10 Mo)',
    shortLabel: 'Discord < 10 Mo',
    targetBadge: 'MP4 · <10 Mo',
    description: 'Débit 2-passes calibré automatiquement pour Discord',
    compatibleCategories: ['video', 'audio'],
    targetFormat: 'mp4',
    settingsPatch: {
      targetSizeMb: 9.5,
      audioBitrate: '128k',
      fastRemux: false,
      activePreset: 'discord-10mb',
    },
  },
  'extract-mp3-320': {
    id: 'extract-mp3-320',
    label: 'Audio MP3 320k',
    shortLabel: 'MP3 320 kbps',
    targetBadge: 'MP3 · 320k',
    description: 'Extraction audio MP3 stéréo haute fidélité depuis toute vidéo',
    compatibleCategories: ['video', 'audio'],
    targetFormat: 'mp3',
    settingsPatch: {
      audioBitrate: '320k',
      targetSizeMb: null,
      fastRemux: false,
      activePreset: 'extract-mp3-320',
    },
  },
  'smooth-gif': {
    id: 'smooth-gif',
    label: 'Vidéo → GIF Fluide',
    shortLabel: 'GIF Fluide',
    targetBadge: 'GIF · 15fps',
    description: 'Palette 2-passes Lanczos à 15 images/seconde',
    compatibleCategories: ['video', 'image'],
    targetFormat: 'gif',
    settingsPatch: {
      gifFps: 15,
      gifWidth: 480,
      targetSizeMb: null,
      fastRemux: false,
      activePreset: 'smooth-gif',
    },
  },
  'web-webp': {
    id: 'web-webp',
    label: 'Web Ultra-Léger (WebP)',
    shortLabel: 'WebP 82%',
    targetBadge: 'WEBP · 82%',
    description: 'Export Canvas WebP à 82% de qualité sans métadonnées EXIF',
    compatibleCategories: ['image'],
    targetFormat: 'webp',
    settingsPatch: {
      quality: 0.82,
      targetSizeMb: null,
      fastRemux: false,
      activePreset: 'web-webp',
    },
  },
  'fast-remux': {
    id: 'fast-remux',
    label: 'Remux Rapide (MP4)',
    shortLabel: 'Remux MP4',
    targetBadge: 'MP4 · COPIE',
    description: 'Copie directe des flux (-c copy) sans ré-encodage',
    compatibleCategories: ['video'],
    targetFormat: 'mp4',
    settingsPatch: {
      fastRemux: true,
      targetSizeMb: null,
      activePreset: 'fast-remux',
    },
  },
  'lossless-wav': {
    id: 'lossless-wav',
    label: 'Lossless WAV PCM',
    shortLabel: 'WAV PCM',
    targetBadge: 'WAV · PCM',
    description: 'Extraction audio stéréo PCM 16-bit non compressée',
    compatibleCategories: ['video', 'audio'],
    targetFormat: 'wav',
    settingsPatch: {
      targetSizeMb: null,
      fastRemux: false,
      activePreset: 'lossless-wav',
    },
  },
};

export const PRESET_LIST: readonly PresetDefinition[] = [
  PRESETS['discord-10mb'],
  PRESETS['extract-mp3-320'],
  PRESETS['smooth-gif'],
  PRESETS['web-webp'],
  PRESETS['fast-remux'],
  PRESETS['lossless-wav'],
];

export function isImageFormat(format: SupportedFormat): format is ImageFormat {
  return (IMAGE_FORMATS as readonly string[]).includes(format);
}

export function isVideoFormat(format: SupportedFormat): format is VideoFormat {
  return (VIDEO_FORMATS as readonly string[]).includes(format);
}

export function isAudioFormat(format: SupportedFormat): format is AudioFormat {
  return (AUDIO_FORMATS as readonly string[]).includes(format);
}
