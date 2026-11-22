import {
  Archive,
  CheckCheck,
  Layers,
  Loader2,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  AUDIO_FORMATS,
  FORMAT_REGISTRY,
  IMAGE_FORMATS,
  VIDEO_FORMATS,
} from '../../constants/formats';
import type { QueueItem, SupportedFormat } from '../../types/media';

interface BatchActionBarProps {
  items: readonly QueueItem[];
  isProcessing: boolean;
  isZipping: boolean;
  globalTarget: string;
  onGlobalTargetChange: (value: string) => void;
  onConvertAll: () => void;
  onDownloadZip: () => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

export function BatchActionBar({
  items,
  isProcessing,
  isZipping,
  globalTarget,
  onGlobalTargetChange,
  onConvertAll,
  onDownloadZip,
  onClearCompleted,
  onClearAll,
}: BatchActionBarProps) {
  const completedCount = items.filter((item) => item.status === 'completed').length;
  const convertibleCount = items.filter(
    (item) =>
      item.status === 'idle' ||
      item.status === 'error' ||
      item.status === 'cancelled',
  ).length;

  return (
    <div className="rack-panel sticky top-3 z-20 flex flex-col gap-3 rounded p-3.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#FF5500]" aria-hidden="true" />
            <h2 className="text-sm font-bold tracking-[-0.025em] text-[#F4F6F8] uppercase">
              File de Conversion
            </h2>
            <span className="rounded border border-[#2A2F3A] bg-[#0B0C0E] px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-[#F4F6F8]">
              {items.length}
            </span>
          </div>

          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 font-mono text-xs font-semibold tabular-nums text-[#A3ACBA]"
          >
            <span className="text-[#34D399]">{completedCount} terminé(s)</span>
            <span aria-hidden="true">·</span>
            <span>{convertibleCount} prêt(s)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {completedCount > 0 && (
            <button
              type="button"
              id="clear-completed-button"
              onClick={onClearCompleted}
              aria-label="Effacer les fichiers terminés"
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-1.5 text-sm font-semibold text-[#F4F6F8] transition-colors hover:border-[#4B5568] hover:bg-[#232730]"
            >
              <Trash2 className="h-4 w-4 text-[#A3ACBA]" aria-hidden="true" />
              <span>Effacer terminés</span>
            </button>
          )}

          <button
            type="button"
            id="clear-queue-button"
            onClick={onClearAll}
            aria-label="Tout effacer de la file"
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-1.5 text-sm font-semibold text-[#A3ACBA] transition-colors hover:border-[#EF4444]/60 hover:text-[#FCA5A5]"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            <span>Tout effacer</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[#2A2F3A] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <label
            htmlFor="global-target-format"
            className="shrink-0 font-mono text-xs font-semibold uppercase text-[#A3ACBA]"
          >
            Cible globale :
          </label>
          <select
            id="global-target-format"
            value={globalTarget}
            disabled={isProcessing}
            onChange={(e) => onGlobalTargetChange(e.target.value)}
            className="min-h-[40px] w-full rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 text-sm font-semibold text-[#F4F6F8] transition-colors hover:border-[#4B5568] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[230px]"
          >
            <option value="">Choisir un format...</option>
            <optgroup label="Vidéo">
              {VIDEO_FORMATS.map((fmt: SupportedFormat) => (
                <option key={fmt} value={fmt}>
                  → {FORMAT_REGISTRY[fmt].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Audio">
              {AUDIO_FORMATS.map((fmt: SupportedFormat) => (
                <option key={fmt} value={fmt}>
                  → {FORMAT_REGISTRY[fmt].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Image">
              {IMAGE_FORMATS.map((fmt: SupportedFormat) => (
                <option key={fmt} value={fmt}>
                  → {FORMAT_REGISTRY[fmt].label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            id="download-zip-button"
            disabled={completedCount === 0 || isZipping}
            onClick={onDownloadZip}
            className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded border border-[#10B981]/50 bg-[#1B1E24] px-4 py-2 text-sm font-semibold text-[#34D399] transition-colors hover:bg-[#10B981]/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {isZipping ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Archive className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Tout télécharger (.zip)</span>
          </button>

          <button
            type="button"
            id="convert-all-button"
            disabled={convertibleCount === 0 || isProcessing}
            onClick={onConvertAll}
            className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded border border-[#FF5500] bg-[#FF5500] px-5 py-2 text-sm font-bold text-[#0B0C0E] transition-colors hover:bg-[#FF6B1A] active:bg-[#E04B00] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Conversion...</span>
              </>
            ) : completedCount > 0 && convertibleCount === 0 ? (
              <>
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                <span>Tout est terminé</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Tout convertir ({convertibleCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
