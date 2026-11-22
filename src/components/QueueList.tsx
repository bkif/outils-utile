import { useState } from 'react';
import {
  Archive,
  ArrowRight,
  CheckCheck,
  Cpu,
  Layers,
  Loader2,
  Play,
  SlidersHorizontal,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  AUDIO_FORMATS,
  FORMAT_REGISTRY,
  IMAGE_FORMATS,
  VIDEO_FORMATS,
} from '../constants/formats';
import type { ConversionSettings, QueueItem, SupportedFormat } from '../types/media';
import { downloadCompletedAsZip } from '../utils/fileUtils';
import { QueueItemCard } from './QueueItemCard';

interface QueueListProps {
  items: readonly QueueItem[];
  isProcessing: boolean;
  onTargetFormatChange: (id: string, format: SupportedFormat) => void;
  onSettingsChange: (id: string, patch: Partial<ConversionSettings>) => void;
  onGlobalTargetChange: (format: SupportedFormat) => void;
  onConvertAll: () => void;
  onConvertItem: (id: string) => void;
  onCancelItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]';

export function QueueList({
  items,
  isProcessing,
  onTargetFormatChange,
  onSettingsChange,
  onGlobalTargetChange,
  onConvertAll,
  onConvertItem,
  onCancelItem,
  onRemoveItem,
  onClearCompleted,
  onClearAll,
}: QueueListProps) {
  const [globalTarget, setGlobalTarget] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const completedCount = items.filter((item) => item.status === 'completed').length;
  const convertibleCount = items.filter(
    (item) =>
      item.status === 'idle' ||
      item.status === 'error' ||
      item.status === 'cancelled',
  ).length;

  const handleGlobalFormatSelect = (value: string) => {
    setGlobalTarget(value);
    if (!value) return;
    onGlobalTargetChange(value as SupportedFormat);
  };

  const handleDownloadZip = async () => {
    if (completedCount === 0 || isZipping) return;
    setZipError(null);
    setIsZipping(true);
    try {
      await downloadCompletedAsZip(items);
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Failed to build ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <section aria-label="Processing rack" className="space-y-3">
      {/* Batch Action Toolbar */}
      <div className="studio-panel flex flex-col gap-3 rounded-lg p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#9ca3af]" aria-hidden="true" />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#f3f4f6]">
              Processing Rack
            </h2>
            <span className="rounded border border-white/12 bg-[#0b0c0e] px-2 py-0.5 font-mono text-xs tabular-nums text-[#d1d5db]">
              {items.length}
            </span>
          </div>

          {items.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 font-mono text-xs tabular-nums text-[#9ca3af]"
            >
              <span className="text-[#10b981]">{completedCount} done</span>
              <span aria-hidden="true">·</span>
              <span>{convertibleCount} ready</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {items.length > 0 && (
            <>
              <label htmlFor="global-target-format" className="sr-only">
                Set target format for all compatible items
              </label>
              <select
                id="global-target-format"
                value={globalTarget}
                disabled={isProcessing}
                onChange={(e) => handleGlobalFormatSelect(e.target.value)}
                className={`w-full rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${FOCUS_RING}`}
              >
                <option value="">Set compatible format...</option>
                <optgroup label="Video">
                  {VIDEO_FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      → {FORMAT_REGISTRY[fmt].label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Audio">
                  {AUDIO_FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      → {FORMAT_REGISTRY[fmt].label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Image">
                  {IMAGE_FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      → {FORMAT_REGISTRY[fmt].label}
                    </option>
                  ))}
                </optgroup>
              </select>

              {completedCount > 0 && (
                <button
                  type="button"
                  id="clear-completed-button"
                  onClick={onClearCompleted}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/14 bg-[#181b20] px-3 py-1.5 text-xs font-medium text-[#d1d5db] transition-colors hover:border-white/25 hover:text-[#f3f4f6] sm:w-auto ${FOCUS_RING}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear Done</span>
                </button>
              )}

              <button
                type="button"
                id="clear-queue-button"
                onClick={onClearAll}
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/14 bg-[#181b20] px-3 py-1.5 text-xs font-medium text-[#9ca3af] transition-colors hover:border-[#ef4444]/40 hover:text-[#fca5a5] sm:w-auto ${FOCUS_RING}`}
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear Queue</span>
              </button>

              <button
                type="button"
                id="download-zip-button"
                disabled={completedCount === 0 || isZipping}
                onClick={handleDownloadZip}
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#10b981]/40 bg-[#10b981]/15 px-3 py-1.5 text-xs font-medium text-[#34d399] transition-colors hover:bg-[#10b981]/25 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto ${FOCUS_RING}`}
              >
                {isZipping ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Download All (.zip)</span>
              </button>

              <button
                type="button"
                id="convert-all-button"
                disabled={convertibleCount === 0 || isProcessing}
                onClick={onConvertAll}
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#f59e0b]/60 bg-[#f59e0b] px-4 py-1.5 text-xs font-semibold text-[#0b0c0e] transition-colors hover:bg-[#fbbf24] active:bg-[#d97706] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto ${FOCUS_RING}`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Processing...</span>
                  </>
                ) : completedCount > 0 && convertibleCount === 0 ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>All Done</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Convert All ({convertibleCount})</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {zipError && (
        <p role="alert" className="font-mono text-xs text-[#fca5a5]">
          {zipError}
        </p>
      )}

      {/* Queue Items or Workstation Empty-State Guide */}
      {items.length === 0 ? (
        <div className="studio-panel rounded-lg p-6 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-2 border-b border-white/8 pb-3.5">
            <div>
              <h3 className="text-sm font-semibold text-[#f3f4f6]">
                Workstation Ready
              </h3>
              <p className="mt-0.5 text-xs text-[#9ca3af]">
                Stage media files on the left to configure codecs, presets, and batch exports.
              </p>
            </div>
            <span className="hidden rounded border border-white/10 bg-[#181b20] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#9ca3af] sm:inline-block">
              Standby
            </span>
          </div>

          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <li className="rounded-md border border-white/8 bg-[#181b20]/70 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[#fbbf24]">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] font-semibold text-[#9ca3af]">
                  STEP 01
                </span>
              </div>
              <p className="text-xs font-semibold text-[#e5e7eb]">
                Drop or paste media
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#9ca3af]">
                Drag files into the intake bay, press Ctrl+V, or fetch a CORS-enabled URL.
              </p>
            </li>

            <li className="rounded-md border border-white/8 bg-[#181b20]/70 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/14 bg-[#121418] text-[#e5e7eb]">
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] font-semibold text-[#9ca3af]">
                  STEP 02
                </span>
              </div>
              <p className="text-xs font-semibold text-[#e5e7eb]">
                Pick preset or custom codec
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#9ca3af]">
                Use one-click workflow presets or fine-tune CRF, resolution, bitrate &amp; FPS.
              </p>
            </li>

            <li className="rounded-md border border-white/8 bg-[#181b20]/70 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#38bdf8]/40 bg-[#38bdf8]/15 text-[#38bdf8]">
                  <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] font-semibold text-[#9ca3af]">
                  STEP 03
                </span>
              </div>
              <p className="text-xs font-semibold text-[#e5e7eb]">
                Transcode locally in RAM
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#9ca3af]">
                Canvas &amp; FFmpeg.wasm process everything in-browser with instant ZIP export.
              </p>
            </li>
          </ol>

          <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-[#9ca3af]">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#fbbf24]" aria-hidden="true" />
            <span>
              Tip: Click any preset on the left while the rack is empty to jump straight into a filtered file picker.
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              onTargetFormatChange={onTargetFormatChange}
              onSettingsChange={onSettingsChange}
              onConvert={onConvertItem}
              onCancel={onCancelItem}
              onRemove={onRemoveItem}
            />
          ))}
        </div>
      )}
    </section>
  );
}
