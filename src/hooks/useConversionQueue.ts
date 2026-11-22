import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectMediaInfo,
  getDefaultSettings,
  getDefaultTargetFormat,
  isImageFormat,
  LARGE_FILE_WARNING_BYTES,
  PRESETS,
  TARGET_FORMATS_BY_CATEGORY,
} from '../constants/formats';
import { CancelledConversionError, ffmpegEngine } from '../engines/ffmpegEngine';
import { convertImageClientSide } from '../engines/imageEngine';
import type {
  ConversionSettings,
  EngineStatus,
  PresetId,
  QueueItem,
  SupportedFormat,
} from '../types/media';
import { fetchMediaFromUrl } from '../utils/fileUtils';

function createItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function revokeItemUrls(item: QueueItem, includeThumbnail = true): void {
  if (item.outputUrl) {
    URL.revokeObjectURL(item.outputUrl);
  }
  if (includeThumbnail && item.thumbnailUrl) {
    URL.revokeObjectURL(item.thumbnailUrl);
  }
}

function isFfmpegPipeline(item: QueueItem): boolean {
  return item.category !== 'image' || item.targetFormat === 'gif';
}

export interface AddFilesResult {
  addedCount: number;
  rejectedNames: string[];
}

export interface ApplyPresetResult {
  appliedCount: number;
  skippedCount: number;
}

export function useConversionQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(() =>
    ffmpegEngine.getStatus(),
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const itemsRef = useRef<QueueItem[]>(items);
  itemsRef.current = items;

  const processingRef = useRef(false);
  const cancelledIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribe = ffmpegEngine.subscribe(setEngineStatus);
    return unsubscribe;
  }, []);

  // Revoke all remaining object URLs on unmount
  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        revokeItemUrls(item, true);
      }
    };
  }, []);

  const updateItem = useCallback(
    (id: string, updater: (prev: QueueItem) => QueueItem) => {
      setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    },
    [],
  );

  const addFiles = useCallback(
    (fileList: FileList | File[], presetOverride?: PresetId): AddFilesResult => {
      const incoming = Array.from(fileList);
      const newItems: QueueItem[] = [];
      const rejectedNames: string[] = [];
      const preset = presetOverride ? PRESETS[presetOverride] : null;

      for (const file of incoming) {
        const { category, sourceFormat } = detectMediaInfo(file);
        if (!category) {
          rejectedNames.push(file.name);
          continue;
        }

        const applyPresetOnIntake =
          preset !== null && preset.compatibleCategories.includes(category);

        const targetFormat = applyPresetOnIntake
          ? preset.targetFormat
          : getDefaultTargetFormat(category, sourceFormat);

        const settings: ConversionSettings = applyPresetOnIntake
          ? {
              ...getDefaultSettings(),
              ...preset.settingsPatch,
            }
          : getDefaultSettings();

        const thumbnailUrl =
          category === 'image' && file.size < 30 * 1024 * 1024
            ? URL.createObjectURL(file)
            : null;

        const warningMessage =
          file.size > LARGE_FILE_WARNING_BYTES
            ? 'Large file (> 200 MB). Browser RAM limits may affect WASM transcoding.'
            : null;

        newItems.push({
          id: createItemId(),
          file,
          name: file.name,
          size: file.size,
          category,
          sourceFormat,
          targetFormat,
          settings,
          status: 'idle',
          progress: 0,
          outputBlob: null,
          outputUrl: null,
          outputSize: null,
          durationMs: null,
          errorMessage: null,
          warningMessage,
          thumbnailUrl,
        });
      }

      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
      }

      return {
        addedCount: newItems.length,
        rejectedNames,
      };
    },
    [],
  );

  const addUrl = useCallback(
    async (rawUrl: string, presetOverride?: PresetId): Promise<void> => {
      const file = await fetchMediaFromUrl(rawUrl);
      const result = addFiles([file], presetOverride);
      if (result.addedCount === 0) {
        throw new Error(
          `Unsupported media format for "${file.name}". Please link directly to a video, audio, or image file.`,
        );
      }
    },
    [addFiles],
  );

  const updateTargetFormat = useCallback(
    (id: string, targetFormat: SupportedFormat) => {
      updateItem(id, (prev) => {
        if (prev.status === 'converting') return prev;
        if (!TARGET_FORMATS_BY_CATEGORY[prev.category].includes(targetFormat)) {
          return prev;
        }
        if (prev.outputUrl) {
          URL.revokeObjectURL(prev.outputUrl);
        }
        return {
          ...prev,
          targetFormat,
          settings: {
            ...prev.settings,
            activePreset: null,
            targetSizeMb: null,
          },
          status: 'idle',
          progress: 0,
          outputBlob: null,
          outputUrl: null,
          outputSize: null,
          durationMs: null,
          errorMessage: null,
        };
      });
    },
    [updateItem],
  );

  const updateSettings = useCallback(
    (id: string, patch: Partial<ConversionSettings>) => {
      updateItem(id, (prev) => {
        if (prev.status === 'converting') return prev;
        if (prev.outputUrl) {
          URL.revokeObjectURL(prev.outputUrl);
        }
        return {
          ...prev,
          settings: {
            ...prev.settings,
            ...patch,
            activePreset:
              patch.activePreset !== undefined ? patch.activePreset : null,
          },
          status: 'idle',
          progress: 0,
          outputBlob: null,
          outputUrl: null,
          outputSize: null,
          durationMs: null,
          errorMessage: null,
        };
      });
    },
    [updateItem],
  );

  const applyGlobalTargetFormat = useCallback((targetFormat: SupportedFormat) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.status === 'converting' || item.status === 'queued') return item;
        if (!TARGET_FORMATS_BY_CATEGORY[item.category].includes(targetFormat)) {
          return item;
        }
        if (item.outputUrl) {
          URL.revokeObjectURL(item.outputUrl);
        }
        return {
          ...item,
          targetFormat,
          settings: {
            ...item.settings,
            activePreset: null,
            targetSizeMb: null,
          },
          status: 'idle',
          progress: 0,
          outputBlob: null,
          outputUrl: null,
          outputSize: null,
          durationMs: null,
          errorMessage: null,
        };
      }),
    );
  }, []);

  const applyPreset = useCallback((presetId: PresetId): ApplyPresetResult => {
    const preset = PRESETS[presetId];
    let appliedCount = 0;
    let skippedCount = 0;

    setItems((prev) =>
      prev.map((item) => {
        if (item.status === 'converting' || item.status === 'queued') {
          skippedCount += 1;
          return item;
        }
        if (!preset.compatibleCategories.includes(item.category)) {
          skippedCount += 1;
          return item;
        }
        appliedCount += 1;
        if (item.outputUrl) {
          URL.revokeObjectURL(item.outputUrl);
        }
        return {
          ...item,
          targetFormat: preset.targetFormat,
          settings: {
            ...getDefaultSettings(),
            ...item.settings,
            targetSizeMb: null,
            fastRemux: false,
            ...preset.settingsPatch,
          },
          status: 'idle',
          progress: 0,
          outputBlob: null,
          outputUrl: null,
          outputSize: null,
          durationMs: null,
          errorMessage: null,
        };
      }),
    );

    return { appliedCount, skippedCount };
  }, []);

  const runImageItem = useCallback(
    async (item: QueueItem): Promise<void> => {
      if (!isImageFormat(item.targetFormat)) {
        throw new Error(`Invalid image target format: ${item.targetFormat}`);
      }

      const start = performance.now();
      updateItem(item.id, (prev) => {
        if (prev.outputUrl) URL.revokeObjectURL(prev.outputUrl);
        return {
          ...prev,
          status: 'converting',
          progress: 35,
          outputBlob: null,
          outputUrl: null,
          outputSize: null,
          durationMs: null,
          errorMessage: null,
        };
      });

      try {
        const result = await convertImageClientSide(
          item.file,
          item.targetFormat,
          item.settings,
        );
        const durationMs = Math.round(performance.now() - start);
        const outputUrl = URL.createObjectURL(result.blob);

        updateItem(item.id, (prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
          outputBlob: result.blob,
          outputUrl,
          outputSize: result.blob.size,
          durationMs,
          errorMessage: null,
          warningMessage: result.warning ?? prev.warningMessage,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Image conversion failed.';
        updateItem(item.id, (prev) => ({
          ...prev,
          status: 'error',
          progress: 0,
          errorMessage: message,
        }));
      }
    },
    [updateItem],
  );

  const runFfmpegItem = useCallback(
    async (item: QueueItem): Promise<boolean> => {
      if (cancelledIdsRef.current.has(item.id)) {
        cancelledIdsRef.current.delete(item.id);
        updateItem(item.id, (prev) => ({
          ...prev,
          status: 'cancelled',
          progress: 0,
        }));
        return false;
      }

      const start = performance.now();
      updateItem(item.id, (prev) => {
        if (prev.outputUrl) URL.revokeObjectURL(prev.outputUrl);
        return {
          ...prev,
          status: 'converting',
          progress: 1,
          outputBlob: null,
          outputUrl: null,
          outputSize: null,
          durationMs: null,
          errorMessage: null,
        };
      });

      try {
        const result = await ffmpegEngine.convert({
          jobId: item.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
          file: item.file,
          sourceFormat: item.sourceFormat,
          sourceCategory: item.category,
          targetFormat: item.targetFormat,
          settings: item.settings,
          onProgress: (pct) => {
            updateItem(item.id, (prev) =>
              prev.status === 'converting' ? { ...prev, progress: pct } : prev,
            );
          },
        });

        const durationMs = Math.round(performance.now() - start);
        const outputUrl = URL.createObjectURL(result.blob);

        updateItem(item.id, (prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
          outputBlob: result.blob,
          outputUrl,
          outputSize: result.blob.size,
          durationMs,
          errorMessage: null,
          warningMessage: result.warning ?? prev.warningMessage,
        }));
        return true;
      } catch (err) {
        const isCancelled =
          err instanceof CancelledConversionError ||
          cancelledIdsRef.current.has(item.id);
        cancelledIdsRef.current.delete(item.id);

        if (isCancelled) {
          updateItem(item.id, (prev) => ({
            ...prev,
            status: 'cancelled',
            progress: 0,
            errorMessage: null,
          }));
          return false;
        }

        const message =
          err instanceof Error ? err.message : 'Media conversion failed.';
        updateItem(item.id, (prev) => ({
          ...prev,
          status: 'error',
          progress: 0,
          errorMessage: message,
        }));
        return true;
      }
    },
    [updateItem],
  );

  const runBatch = useCallback(
    async (targetIds?: string[]) => {
      if (processingRef.current) return;

      const idSet = targetIds ? new Set(targetIds) : null;
      const candidates = itemsRef.current.filter((item) => {
        if (idSet && !idSet.has(item.id)) return false;
        return (
          item.status === 'idle' ||
          item.status === 'error' ||
          item.status === 'cancelled'
        );
      });

      if (candidates.length === 0) return;

      processingRef.current = true;
      setIsProcessing(true);
      cancelledIdsRef.current.clear();

      try {
        const imageJobs = candidates.filter((item) => !isFfmpegPipeline(item));
        const ffmpegJobs = candidates.filter((item) => isFfmpegPipeline(item));

        if (ffmpegJobs.length > 0) {
          const ffmpegIds = new Set(ffmpegJobs.map((j) => j.id));
          setItems((prev) =>
            prev.map((item) =>
              ffmpegIds.has(item.id)
                ? { ...item, status: 'queued', progress: 0, errorMessage: null }
                : item,
            ),
          );
        }

        // Run all Canvas image conversions concurrently (near-instant)
        const imagePromise = Promise.all(imageJobs.map((job) => runImageItem(job)));

        // Run FFmpeg jobs sequentially so MEMFS holds only one active file pair at a time
        for (const job of ffmpegJobs) {
          const fresh = itemsRef.current.find((it) => it.id === job.id);
          if (!fresh || fresh.status !== 'queued') {
            continue;
          }
          await runFfmpegItem(fresh);
        }

        await imagePromise;
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [runFfmpegItem, runImageItem],
  );

  const convertAll = useCallback(async () => {
    await runBatch();
  }, [runBatch]);

  const convertItem = useCallback(
    async (id: string) => {
      const target = itemsRef.current.find((it) => it.id === id);
      if (!target) return;

      if (!isFfmpegPipeline(target)) {
        await runImageItem(target);
        return;
      }

      await runBatch([id]);
    },
    [runBatch, runImageItem],
  );

  const cancelItem = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((it) => it.id === id);
      if (!target) return;

      if (target.status === 'queued') {
        updateItem(id, (prev) => ({
          ...prev,
          status: 'idle',
          progress: 0,
        }));
        return;
      }

      if (target.status === 'converting') {
        cancelledIdsRef.current.add(id);
        ffmpegEngine.cancelCurrentJob();
      }
    },
    [updateItem],
  );

  const removeItem = useCallback((id: string) => {
    const target = itemsRef.current.find((it) => it.id === id);
    if (!target) return;

    if (target.status === 'converting') {
      cancelledIdsRef.current.add(id);
      ffmpegEngine.cancelCurrentJob();
    }

    revokeItemUrls(target, true);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => {
      const remaining: QueueItem[] = [];
      for (const item of prev) {
        if (item.status === 'completed') {
          revokeItemUrls(item, true);
        } else {
          remaining.push(item);
        }
      }
      return remaining;
    });
  }, []);

  const clearAll = useCallback(() => {
    if (processingRef.current) {
      ffmpegEngine.cancelCurrentJob();
    }
    for (const item of itemsRef.current) {
      revokeItemUrls(item, true);
    }
    setItems([]);
  }, []);

  return {
    items,
    engineStatus,
    isProcessing,
    addFiles,
    addUrl,
    updateTargetFormat,
    updateSettings,
    applyGlobalTargetFormat,
    applyPreset,
    convertAll,
    convertItem,
    cancelItem,
    removeItem,
    clearCompleted,
    clearAll,
  };
}
