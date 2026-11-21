import { useState } from 'react';
import {
  Archive,
  CheckCheck,
  Layers,
  Loader2,
  Play,
  Trash2,
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
}

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
    <section aria-label="Conversion queue" className="space-y-3">
      {/* Batch Action Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#262B36] bg-[#12151B] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#9CA3AF]" aria-hidden="true" />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F3F4F6]">
              Queue
            </h2>
            <span className="rounded border border-[#262B36] bg-[#0B0D10] px-2 py-0.5 font-mono text-xs tabular-nums text-[#9CA3AF]">
              {items.length}
            </span>
          </div>

          {items.length > 0 && (
            <div
              className="flex items-center gap-2 font-mono text-xs tabular-nums text-[#9CA3AF]"
              aria-live="polite"
            >
              <span className="text-[#10B981]">{completedCount} done</span>
              <span aria-hidden="true">•</span>
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
                className="w-full rounded-md border border-[#262B36] bg-[#191D26] px-2.5 py-1.5 font-mono text-xs text-[#F3F4F6] transition-colors hover:border-[#3A4252] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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

              <button
                type="button"
                id="clear-completed-button"
                disabled={completedCount === 0}
                onClick={onClearCompleted}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#262B36] bg-[#191D26] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#3A4252] hover:text-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear Completed</span>
              </button>

              <button
                type="button"
                id="download-zip-button"
                disabled={completedCount === 0 || isZipping}
                onClick={handleDownloadZip}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#10B981]/40 bg-[#10B981]/15 px-3 py-1.5 text-xs font-medium text-[#10B981] transition-colors hover:bg-[#10B981]/25 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
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
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B] px-4 py-1.5 text-xs font-semibold text-[#0B0D10] transition-colors hover:bg-[#FBBF24] active:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Converting...</span>
                  </>
                ) : completedCount > 0 && convertibleCount === 0 ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>All Converted</span>
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
        <p role="alert" className="font-mono text-xs text-[#FCA5A5]">
          {zipError}
        </p>
      )}

      {/* Queue Items */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-[#262B36] bg-[#12151B]/50 px-6 py-10 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-[#9CA3AF]">
            Queue Rack Empty
          </p>
          <p className="mt-1.5 text-xs text-[#6B7280]">
            Add local files or a CORS-enabled media URL above to configure formats and begin processing.
          </p>
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
