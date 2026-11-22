import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Square,
  X,
} from 'lucide-react';
import {
  AUDIO_FORMATS,
  FORMAT_REGISTRY,
  IMAGE_FORMATS,
  PRESETS,
  TARGET_FORMATS_BY_CATEGORY,
  VIDEO_FORMATS,
} from '../../constants/formats';
import type { ConversionSettings, QueueItem, SupportedFormat } from '../../types/media';
import {
  buildOutputFileName,
  calculateSizeDeltaPercent,
  triggerBlobDownload,
} from '../../utils/fileUtils';
import { formatBytesFr, formatDurationFr } from '../../utils/formatters';
import { ItemSettingsPopover } from './ItemSettingsPopover';

interface QueueItemCardProps {
  item: QueueItem;
  onTargetFormatChange: (id: string, format: SupportedFormat) => void;
  onSettingsChange: (id: string, patch: Partial<ConversionSettings>) => void;
  onConvert: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

const CATEGORY_TAG: Record<QueueItem['category'], string> = {
  video: 'VID',
  audio: 'AUD',
  image: 'IMG',
};

function localizeWarning(warning: string): string {
  if (warning.includes('200 MB')) {
    return 'Fichier volumineux (> 200 Mo). Les limites de RAM du navigateur peuvent impacter le transcodage WASM.';
  }
  if (warning.includes('Fast stream copy')) {
    return 'Copie directe incompatible avec le conteneur cible : ré-encodage automatique effectué.';
  }
  return warning;
}

export function QueueItemCard({
  item,
  onTargetFormatChange,
  onSettingsChange,
  onConvert,
  onCancel,
  onRemove,
}: QueueItemCardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isLocked = item.status === 'converting' || item.status === 'queued';
  const validTargets = TARGET_FORMATS_BY_CATEGORY[item.category];

  const sizeDelta =
    item.outputSize !== null
      ? calculateSizeDeltaPercent(item.size, item.outputSize)
      : null;

  const CategoryIcon =
    item.category === 'video'
      ? Film
      : item.category === 'audio'
        ? Music
        : ImageIcon;

  const handleDownload = () => {
    if (!item.outputBlob) return;
    const filename = buildOutputFileName(item.name, item.targetFormat);
    triggerBlobDownload(item.outputBlob, filename);
  };

  const presetLabel = item.settings.activePreset
    ? PRESETS[item.settings.activePreset].shortLabel
    : null;

  return (
    <article
      aria-label={`Élément en file : ${item.name}`}
      className={`rounded border transition-colors ${
        item.status === 'error'
          ? 'border-[#EF4444]/70 bg-[#131519]'
          : item.status === 'completed'
            ? 'border-[#10B981]/60 bg-[#131519]'
            : item.status === 'converting'
              ? 'border-[#FF5500] bg-[#131519]'
              : 'border-[#2A2F3A] bg-[#131519]'
      }`}
    >
      {/* 3-Column Desktop / Stacked Mobile Layout */}
      <div className="grid grid-cols-1 gap-3.5 p-4 lg:grid-cols-12 lg:items-center lg:gap-4">
        {/* Col 1: Media Identity */}
        <div className="flex min-w-0 items-center gap-3 lg:col-span-5">
          <div className="relative flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded border border-[#2A2F3A] bg-[#0B0C0E]">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <CategoryIcon className="h-4 w-4 text-[#FF5500]" aria-hidden="true" />
                <span className="mt-0.5 font-mono text-xs font-bold text-[#F4F6F8]">
                  {CATEGORY_TAG[item.category]}
                </span>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-[15px] font-semibold text-[#F4F6F8]"
              title={item.name}
            >
              {item.name}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs font-semibold tabular-nums text-[#A3ACBA]">
              <span className="rounded border border-[#2A2F3A] bg-[#0B0C0E] px-1.5 py-0.5 uppercase text-[#F4F6F8]">
                {item.sourceFormat}
              </span>
              <span>{formatBytesFr(item.size)}</span>
              {item.status === 'queued' && (
                <span className="text-[#F4F6F8]">· En attente</span>
              )}
              {item.status === 'cancelled' && (
                <span className="text-[#A3ACBA]">· Annulé</span>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Target & Quick Controls */}
        <div className="flex flex-wrap items-center gap-2 lg:col-span-3">
          <label htmlFor={`target-format-${item.id}`} className="sr-only">
            Format de sortie pour {item.name}
          </label>
          <select
            id={`target-format-${item.id}`}
            value={item.targetFormat}
            disabled={isLocked}
            onChange={(e) =>
              onTargetFormatChange(item.id, e.target.value as SupportedFormat)
            }
            className="min-h-[40px] min-w-[100px] flex-1 rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 font-mono text-sm font-semibold uppercase text-[#F4F6F8] transition-colors hover:border-[#4B5568] disabled:cursor-not-allowed disabled:opacity-50 lg:flex-initial"
          >
            {item.category === 'video' ? (
              <>
                <optgroup label="Vidéo">
                  {validTargets
                    .filter((fmt) => (VIDEO_FORMATS as readonly string[]).includes(fmt))
                    .map((fmt) => (
                      <option key={fmt} value={fmt}>
                        → {FORMAT_REGISTRY[fmt].label}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Extraire Audio">
                  {validTargets
                    .filter((fmt) => (AUDIO_FORMATS as readonly string[]).includes(fmt))
                    .map((fmt) => (
                      <option key={fmt} value={fmt}>
                        → {FORMAT_REGISTRY[fmt].label}
                      </option>
                    ))}
                </optgroup>
              </>
            ) : (
              validTargets.map((fmt) => (
                <option key={fmt} value={fmt}>
                  → {FORMAT_REGISTRY[fmt].label}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            aria-expanded={settingsOpen}
            aria-label={`Réglages d’encodage pour ${item.name}`}
            disabled={isLocked}
            onClick={() => setSettingsOpen((prev) => !prev)}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              settingsOpen
                ? 'border-[#FF5500] bg-[#FF5500] text-[#0B0C0E]'
                : 'border-[#2A2F3A] bg-[#1B1E24] text-[#F4F6F8] hover:border-[#4B5568]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Réglages</span>
          </button>

          {presetLabel && (
            <span className="rounded border border-[#FF5500]/50 bg-[#0B0C0E] px-2 py-1 font-mono text-xs font-semibold text-[#FF5500]">
              {presetLabel}
            </span>
          )}
        </div>

        {/* Col 3: Execution & Output */}
        <div className="flex flex-col gap-2 lg:col-span-4 lg:items-end">
          <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:justify-end">
            {item.status === 'converting' && (
              <div className="flex flex-1 items-center gap-2.5 lg:max-w-[200px]">
                <div className="h-2 flex-1 overflow-hidden rounded bg-[#0B0C0E]">
                  <div
                    className="h-full bg-[#FF5500] transition-all duration-200"
                    style={{ width: `${Math.max(5, item.progress)}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold tabular-nums text-[#FF5500]">
                  {item.progress}%
                </span>
              </div>
            )}

            {item.status === 'completed' && item.outputSize !== null && (
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-semibold tabular-nums">
                <span className="text-[#A3ACBA]">{formatBytesFr(item.size)}</span>
                <span aria-hidden="true" className="text-[#A3ACBA]">
                  →
                </span>
                <span className="text-[#F4F6F8]">{formatBytesFr(item.outputSize)}</span>
                {sizeDelta !== null && (
                  <span
                    className={`rounded border px-1.5 py-0.5 ${
                      sizeDelta <= 0
                        ? 'border-[#10B981]/40 bg-[#10B981]/10 text-[#34D399]'
                        : 'border-[#FF5500]/40 bg-[#FF5500]/10 text-[#FF5500]'
                    }`}
                  >
                    {sizeDelta > 0 ? `+${sizeDelta}%` : `${sizeDelta}%`}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              {item.status === 'converting' || item.status === 'queued' ? (
                <button
                  type="button"
                  onClick={() => onCancel(item.id)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border border-[#EF4444]/60 bg-[#1B1E24] px-3.5 py-2 text-sm font-semibold text-[#FCA5A5] transition-colors hover:bg-[#EF4444]/15"
                >
                  {item.status === 'converting' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#FF5500]" aria-hidden="true" />
                  ) : (
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  )}
                  <span>Annuler</span>
                </button>
              ) : item.status === 'completed' ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border border-[#10B981] bg-[#10B981] px-4 py-2 text-sm font-bold text-[#0B0C0E] transition-colors hover:bg-[#34D399]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Télécharger</span>
                </button>
              ) : item.status === 'error' ? (
                <button
                  type="button"
                  onClick={() => onConvert(item.id)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border border-[#FF5500] bg-[#1B1E24] px-3.5 py-2 text-sm font-semibold text-[#FF5500] transition-colors hover:bg-[#FF5500] hover:text-[#0B0C0E]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Réessayer</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onConvert(item.id)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border border-[#2A2F3A] bg-[#1B1E24] px-3.5 py-2 text-sm font-semibold text-[#F4F6F8] transition-colors hover:border-[#FF5500] hover:text-[#FF5500]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>Convertir</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Supprimer ${item.name} de la file`}
                title="Retirer de la file"
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded border border-[#2A2F3A] bg-[#1B1E24] text-[#A3ACBA] transition-colors hover:border-[#EF4444]/60 hover:text-[#FCA5A5]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {item.status === 'completed' && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-semibold text-[#34D399]">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{buildOutputFileName(item.name, item.targetFormat)}</span>
              {item.durationMs !== null && (
                <span className="text-[#A3ACBA]">({formatDurationFr(item.durationMs)})</span>
              )}
              {(IMAGE_FORMATS as readonly string[]).includes(item.targetFormat) && (
                <span className="text-[#A3ACBA]">· Sans EXIF</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Warnings & Errors */}
      {item.warningMessage && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded border border-[#FF5500]/50 bg-[#0B0C0E] px-3 py-2 text-xs font-semibold text-[#F4F6F8]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5500]" aria-hidden="true" />
          <span>{localizeWarning(item.warningMessage)}</span>
        </div>
      )}

      {item.status === 'error' && item.errorMessage && (
        <div
          role="alert"
          className="mx-4 mb-3 flex items-start gap-2 rounded border border-[#EF4444]/60 bg-[#0B0C0E] px-3 py-2 text-xs font-semibold text-[#FCA5A5]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
          <span className="break-words">{item.errorMessage}</span>
        </div>
      )}

      {/* Expandable Settings Popover Panel */}
      {settingsOpen && (
        <ItemSettingsPopover item={item} onSettingsChange={onSettingsChange} />
      )}
    </article>
  );
}
