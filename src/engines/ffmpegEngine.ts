import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FORMAT_REGISTRY } from '../constants/formats';
import type {
  ConversionSettings,
  EngineStatus,
  MediaCategory,
  SupportedFormat,
} from '../types/media';

const CORE_VERSION = '0.12.10';
const CDN_BASES = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
] as const;

export interface FfmpegConversionResult {
  blob: Blob;
  warning: string | null;
}

export class CancelledConversionError extends Error {
  constructor(message = 'Conversion cancelled by user.') {
    super(message);
    this.name = 'CancelledConversionError';
  }
}

type StatusListener = (status: EngineStatus) => void;

class FfmpegEngineSingleton {
  private ffmpeg: FFmpeg | null = null;
  private loadPromise: Promise<FFmpeg> | null = null;
  private cachedCoreURL: string | null = null;
  private cachedWasmURL: string | null = null;
  private statusListeners = new Set<StatusListener>();
  private status: EngineStatus = {
    state: 'standby',
    progress: 0,
    message: 'Standby',
    errorDetail: null,
  };
  private cancelRequested = false;
  private activeJobAbortReason: string | null = null;

  public getStatus(): EngineStatus {
    return this.status;
  }

  public subscribe(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(patch: Partial<EngineStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) {
      listener(this.status);
    }
  }

  private async ensureCoreBlobUrls(): Promise<{ coreURL: string; wasmURL: string }> {
    if (this.cachedCoreURL && this.cachedWasmURL) {
      return { coreURL: this.cachedCoreURL, wasmURL: this.cachedWasmURL };
    }

    let lastError: unknown = null;

    for (const base of CDN_BASES) {
      try {
        this.setStatus({
          state: 'loading',
          progress: 5,
          message: 'Loading WASM Core...',
          errorDetail: null,
        });

        const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
        this.setStatus({ progress: 15 });

        const wasmURL = await toBlobURL(
          `${base}/ffmpeg-core.wasm`,
          'application/wasm',
          true,
          ({ received, total }) => {
            if (total > 0) {
              const pct = Math.min(95, 15 + Math.round((received / total) * 80));
              this.setStatus({
                state: 'loading',
                progress: pct,
                message: `Loading WASM Core... (${pct}%)`,
              });
            }
          },
        );

        this.cachedCoreURL = coreURL;
        this.cachedWasmURL = wasmURL;
        return { coreURL, wasmURL };
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      lastError instanceof Error
        ? `Failed to download FFmpeg WASM core: ${lastError.message}`
        : 'Failed to download FFmpeg WASM core from CDN.',
    );
  }

  public async ensureLoaded(): Promise<FFmpeg> {
    if (this.ffmpeg && this.ffmpeg.loaded) {
      return this.ffmpeg;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      try {
        const instance = new FFmpeg();
        const { coreURL, wasmURL } = await this.ensureCoreBlobUrls();

        this.setStatus({
          state: 'loading',
          progress: 96,
          message: 'Initializing WASM Worker...',
          errorDetail: null,
        });

        await instance.load({ coreURL, wasmURL });
        this.ffmpeg = instance;
        this.setStatus({
          state: 'ready',
          progress: 100,
          message: 'Core Ready',
          errorDetail: null,
        });
        return instance;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to initialize FFmpeg.wasm worker.';
        this.ffmpeg = null;
        this.setStatus({
          state: 'error',
          progress: 0,
          message: 'Engine Error',
          errorDetail: message,
        });
        throw new Error(message);
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  public cancelCurrentJob(): void {
    this.cancelRequested = true;
    this.activeJobAbortReason = 'Conversion cancelled by user.';

    if (this.ffmpeg) {
      try {
        this.ffmpeg.terminate();
      } catch {
        // Ignore terminate errors if worker was already closed
      }
      this.ffmpeg = null;
    }

    this.loadPromise = null;
    this.setStatus({
      state: 'standby',
      progress: 0,
      message: 'Standby',
      errorDetail: null,
    });
  }

  private async safeDelete(ffmpeg: FFmpeg, path: string): Promise<void> {
    try {
      await ffmpeg.deleteFile(path);
    } catch {
      // File may not exist if job aborted early
    }
  }

  private async getMediaDurationSeconds(
    file: File,
    category: MediaCategory,
    ffmpeg: FFmpeg,
    inputPath: string,
  ): Promise<number> {
    // Fast browser metadata probe first
    if (category === 'video' || category === 'audio') {
      const browserDuration = await new Promise<number | null>((resolve) => {
        const url = URL.createObjectURL(file);
        const el = document.createElement(category === 'video' ? 'video' : 'audio');
        el.preload = 'metadata';

        const cleanup = () => {
          el.removeAttribute('src');
          el.load();
          URL.revokeObjectURL(url);
        };

        const timer = window.setTimeout(() => {
          cleanup();
          resolve(null);
        }, 2500);

        el.onloadedmetadata = () => {
          window.clearTimeout(timer);
          const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null;
          cleanup();
          resolve(dur);
        };

        el.onerror = () => {
          window.clearTimeout(timer);
          cleanup();
          resolve(null);
        };

        el.src = url;
      });

      if (browserDuration !== null && browserDuration > 0) {
        return browserDuration;
      }
    }

    // Fallback: inspect FFmpeg header output
    let parsedSeconds = 0;
    const logListener = ({ message }: { message: string }) => {
      const match = /Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(message);
      if (match) {
        const hrs = Number(match[1]);
        const mins = Number(match[2]);
        const secs = Number(match[3]);
        parsedSeconds = hrs * 3600 + mins * 60 + secs;
      }
    };

    ffmpeg.on('log', logListener);
    try {
      await ffmpeg.exec(['-i', inputPath]);
    } catch {
      // Expected non-zero exit without output path
    } finally {
      ffmpeg.off('log', logListener);
    }

    return parsedSeconds > 0 ? parsedSeconds : 10;
  }

  private buildVideoFilterArgs(settings: ConversionSettings): string[] {
    if (settings.maxWidth && settings.maxWidth > 0) {
      // Ensure even width & height for YUV420p encoders
      const evenMaxWidth = Math.max(2, settings.maxWidth - (settings.maxWidth % 2));
      return ['-vf', `scale='min(${evenMaxWidth},iw)':-2`];
    }
    return [];
  }

  private buildStandardArgs(
    inputPath: string,
    outputPath: string,
    sourceCategory: MediaCategory,
    targetFormat: SupportedFormat,
    settings: ConversionSettings,
  ): string[] {
    if (targetFormat === 'gif') {
      const fps = Math.max(5, Math.min(30, settings.gifFps || 15));
      const width = Math.max(120, Math.min(1280, settings.gifWidth || 480));
      const filter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
      return ['-i', inputPath, '-vf', filter, '-loop', '0', outputPath];
    }

    // Audio-only targets
    if (targetFormat === 'mp3') {
      return ['-i', inputPath, '-vn', '-c:a', 'libmp3lame', '-b:a', settings.audioBitrate, outputPath];
    }
    if (targetFormat === 'wav') {
      return ['-i', inputPath, '-vn', '-c:a', 'pcm_s16le', outputPath];
    }
    if (targetFormat === 'ogg') {
      return ['-i', inputPath, '-vn', '-c:a', 'libvorbis', '-b:a', settings.audioBitrate, outputPath];
    }
    if (targetFormat === 'aac') {
      return [
        '-i',
        inputPath,
        '-vn',
        '-c:a',
        'aac',
        '-b:a',
        settings.audioBitrate,
        '-f',
        'adts',
        outputPath,
      ];
    }
    if (targetFormat === 'flac') {
      return ['-i', inputPath, '-vn', '-c:a', 'flac', outputPath];
    }

    const scaleArgs = sourceCategory === 'video' ? this.buildVideoFilterArgs(settings) : [];

    // Video targets
    if (targetFormat === 'webm') {
      return [
        '-i',
        inputPath,
        ...scaleArgs,
        '-c:v',
        'libvpx',
        '-crf',
        String(settings.crf),
        '-b:v',
        '1M',
        '-c:a',
        'libvorbis',
        '-b:a',
        settings.audioBitrate,
        outputPath,
      ];
    }

    if (targetFormat === 'avi') {
      const qscale = Math.max(2, Math.min(31, Math.round((settings.crf - 10) / 2)));
      return [
        '-i',
        inputPath,
        ...scaleArgs,
        '-c:v',
        'mpeg4',
        '-q:v',
        String(qscale),
        '-c:a',
        'libmp3lame',
        '-b:a',
        settings.audioBitrate,
        outputPath,
      ];
    }

    // mp4, mov, mkv
    const extraFlags = targetFormat === 'mp4' ? ['-movflags', '+faststart'] : [];
    const gifInputFix =
      sourceCategory === 'video' && inputPath.toLowerCase().endsWith('.gif')
        ? ['-vf', "scale='trunc(iw/2)*2:trunc(ih/2)*2'"]
        : scaleArgs;

    return [
      '-i',
      inputPath,
      ...gifInputFix,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      String(settings.crf),
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      settings.audioBitrate,
      ...extraFlags,
      outputPath,
    ];
  }

  public async convert(params: {
    jobId: string;
    file: File;
    sourceFormat: string;
    sourceCategory: MediaCategory;
    targetFormat: SupportedFormat;
    settings: ConversionSettings;
    onProgress: (percent: number) => void;
  }): Promise<FfmpegConversionResult> {
    const { jobId, file, sourceFormat, sourceCategory, targetFormat, settings, onProgress } =
      params;

    this.cancelRequested = false;
    this.activeJobAbortReason = null;

    const ffmpeg = await this.ensureLoaded();

    if (this.cancelRequested) {
      throw new CancelledConversionError(this.activeJobAbortReason ?? undefined);
    }

    this.setStatus({
      state: 'busy',
      progress: 100,
      message: 'Transcoding...',
    });

    const safeSrcExt = sourceFormat.replace(/[^a-z0-9]/gi, '') || 'bin';
    const targetExt = FORMAT_REGISTRY[targetFormat].extension;
    const inputPath = `in_${jobId}.${safeSrcExt}`;
    const outputPath = `out_${jobId}.${targetExt}`;
    const passLogPrefix = `pass_${jobId}`;

    let currentPhaseProgressScale = 1;
    let currentPhaseProgressOffset = 0;
    const recentLogs: string[] = [];

    const progressListener = ({ progress }: { progress: number }) => {
      if (Number.isFinite(progress)) {
        const clamped = Math.max(0, Math.min(1, progress));
        const pct = Math.min(
          99,
          Math.round((currentPhaseProgressOffset + clamped * currentPhaseProgressScale) * 100),
        );
        onProgress(pct);
      }
    };

    const logListener = ({ message }: { message: string }) => {
      recentLogs.push(message);
      if (recentLogs.length > 40) {
        recentLogs.shift();
      }
    };

    ffmpeg.on('progress', progressListener);
    ffmpeg.on('log', logListener);

    let warning: string | null = null;

    try {
      onProgress(2);
      const inputData = await fetchFile(file);
      if (this.cancelRequested) {
        throw new CancelledConversionError(this.activeJobAbortReason ?? undefined);
      }

      await ffmpeg.writeFile(inputPath, inputData);
      onProgress(5);

      let exitCode = 1;

      // 1. Fast Remux (-c copy) if enabled for compatible container formats
      const isVideoContainer =
        sourceCategory === 'video' &&
        (targetFormat === 'mp4' ||
          targetFormat === 'mov' ||
          targetFormat === 'mkv' ||
          targetFormat === 'webm');

      if (settings.fastRemux && isVideoContainer && !settings.targetSizeMb) {
        const remuxArgs = [
          '-i',
          inputPath,
          '-c',
          'copy',
          ...(targetFormat === 'mp4' ? ['-movflags', '+faststart'] : []),
          outputPath,
        ];
        exitCode = await ffmpeg.exec(remuxArgs);

        if (exitCode !== 0 && !this.cancelRequested) {
          await this.safeDelete(ffmpeg, outputPath);
          warning =
            'Fast stream copy was incompatible with the target container; automatically fell back to re-encoding.';
        }
      }

      // 2. Target-size compression (Discord < 10 MB preset)
      if (exitCode !== 0 && !this.cancelRequested && settings.targetSizeMb) {
        const targetBytes = settings.targetSizeMb * 1024 * 1024 * 0.94; // 6% muxer safety headroom
        const durationSec = await this.getMediaDurationSeconds(
          file,
          sourceCategory,
          ffmpeg,
          inputPath,
        );
        const totalKbps = Math.max(64, Math.floor((targetBytes * 8) / (durationSec * 1000)));

        const isAudioOnly =
          sourceCategory === 'audio' ||
          targetFormat === 'mp3' ||
          targetFormat === 'ogg' ||
          targetFormat === 'aac';

        if (isAudioOnly) {
          const clampedAudio = Math.max(32, Math.min(320, totalKbps));
          const audioCodec =
            targetFormat === 'ogg' ? 'libvorbis' : targetFormat === 'aac' ? 'aac' : 'libmp3lame';
          const extra = targetFormat === 'aac' ? ['-f', 'adts'] : [];
          exitCode = await ffmpeg.exec([
            '-i',
            inputPath,
            '-vn',
            '-c:a',
            audioCodec,
            '-b:a',
            `${clampedAudio}k`,
            ...extra,
            outputPath,
          ]);
        } else {
          const audioKbps = totalKbps < 220 ? 64 : totalKbps < 420 ? 96 : 128;
          const videoKbps = Math.max(80, totalKbps - audioKbps);
          const autoScale =
            videoKbps < 300
              ? ['-vf', "scale='min(640,iw)':-2"]
              : videoKbps < 650
                ? ['-vf', "scale='min(960,iw)':-2"]
                : this.buildVideoFilterArgs(settings);

          if (targetFormat === 'mp4' || targetFormat === 'mov' || targetFormat === 'mkv') {
            // Two-pass libx264 for accurate file-size targeting
            currentPhaseProgressOffset = 0;
            currentPhaseProgressScale = 0.45;
            const pass1Code = await ffmpeg.exec([
              '-i',
              inputPath,
              ...autoScale,
              '-c:v',
              'libx264',
              '-preset',
              'veryfast',
              '-b:v',
              `${videoKbps}k`,
              '-pix_fmt',
              'yuv420p',
              '-pass',
              '1',
              '-passlogfile',
              passLogPrefix,
              '-an',
              '-f',
              'null',
              '/dev/null',
            ]);

            if (pass1Code === 0 && !this.cancelRequested) {
              currentPhaseProgressOffset = 0.45;
              currentPhaseProgressScale = 0.55;
              exitCode = await ffmpeg.exec([
                '-i',
                inputPath,
                ...autoScale,
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-b:v',
                `${videoKbps}k`,
                '-maxrate',
                `${Math.round(videoKbps * 1.2)}k`,
                '-bufsize',
                `${Math.round(videoKbps * 2)}k`,
                '-pix_fmt',
                'yuv420p',
                '-pass',
                '2',
                '-passlogfile',
                passLogPrefix,
                '-c:a',
                'aac',
                '-b:a',
                `${audioKbps}k`,
                ...(targetFormat === 'mp4' ? ['-movflags', '+faststart'] : []),
                outputPath,
              ]);
            }

            // Fallback to constrained single-pass ABR if 2-pass failed
            if (exitCode !== 0 && !this.cancelRequested) {
              currentPhaseProgressOffset = 0;
              currentPhaseProgressScale = 1;
              await this.safeDelete(ffmpeg, outputPath);
              exitCode = await ffmpeg.exec([
                '-i',
                inputPath,
                ...autoScale,
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-b:v',
                `${videoKbps}k`,
                '-maxrate',
                `${Math.round(videoKbps * 1.15)}k`,
                '-bufsize',
                `${Math.round(videoKbps * 1.5)}k`,
                '-pix_fmt',
                'yuv420p',
                '-c:a',
                'aac',
                '-b:a',
                `${audioKbps}k`,
                ...(targetFormat === 'mp4' ? ['-movflags', '+faststart'] : []),
                outputPath,
              ]);
            }
          } else {
            // Constrained bitrate fallback for WebM / AVI
            const args = this.buildStandardArgs(
              inputPath,
              outputPath,
              sourceCategory,
              targetFormat,
              settings,
            );
            exitCode = await ffmpeg.exec(args);
          }
        }
      }

      // 3. Standard transcode path
      if (exitCode !== 0 && !this.cancelRequested) {
        currentPhaseProgressOffset = 0;
        currentPhaseProgressScale = 1;
        const args = this.buildStandardArgs(
          inputPath,
          outputPath,
          sourceCategory,
          targetFormat,
          settings,
        );
        exitCode = await ffmpeg.exec(args);
      }

      if (this.cancelRequested) {
        throw new CancelledConversionError(this.activeJobAbortReason ?? undefined);
      }

      if (exitCode !== 0) {
        const tail = recentLogs.slice(-4).join(' | ');
        throw new Error(
          `FFmpeg exited with code ${exitCode}.${tail ? ` Details: ${tail}` : ''}`,
        );
      }

      const rawOutput = await ffmpeg.readFile(outputPath);
      if (typeof rawOutput === 'string' || rawOutput.byteLength === 0) {
        throw new Error('FFmpeg produced an empty output file.');
      }

      // Copy into a standard ArrayBuffer-backed Uint8Array for Blob construction
      const safeBytes = new Uint8Array(rawOutput.byteLength);
      safeBytes.set(rawOutput);
      const outputBlob = new Blob([safeBytes], {
        type: FORMAT_REGISTRY[targetFormat].mimeType,
      });

      onProgress(100);
      return {
        blob: outputBlob,
        warning,
      };
    } catch (err) {
      if (this.cancelRequested) {
        throw new CancelledConversionError(this.activeJobAbortReason ?? undefined);
      }
      throw err instanceof Error
        ? err
        : new Error('Unexpected FFmpeg transcoding failure.');
    } finally {
      ffmpeg.off('progress', progressListener);
      ffmpeg.off('log', logListener);

      // Mandatory MEMFS cleanup to prevent browser tab OOM crashes
      if (this.ffmpeg && this.ffmpeg.loaded) {
        await this.safeDelete(this.ffmpeg, inputPath);
        await this.safeDelete(this.ffmpeg, outputPath);
        await this.safeDelete(this.ffmpeg, `${passLogPrefix}-0.log`);
        await this.safeDelete(this.ffmpeg, `${passLogPrefix}-0.log.mbtree`);
      }

      if (!this.cancelRequested && this.ffmpeg?.loaded) {
        this.setStatus({
          state: 'ready',
          progress: 100,
          message: 'Core Ready',
        });
      }
    }
  }
}

export const ffmpegEngine = new FfmpegEngineSingleton();
