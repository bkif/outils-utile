import { useRef, useState } from 'react';
import {
  Disc,
  Film,
  Image as ImageIcon,
  MessageSquare,
  Music,
  Zap,
} from 'lucide-react';
import { PRESET_LIST, PRESETS } from '../constants/formats';
import type { AddFilesResult, ApplyPresetResult } from '../hooks/useConversionQueue';
import type { MediaCategory, PresetId, QueueItem } from '../types/media';

interface PresetBarProps {
  items: readonly QueueItem[];
  activePresetId: PresetId | null;
  onSelectActivePreset: (presetId: PresetId | null) => void;
  onApplyPreset: (presetId: PresetId) => ApplyPresetResult;
  onFilesAddedWithPreset: (files: FileList | File[], presetId: PresetId) => AddFilesResult;
}

const PRESET_ICONS: Record<PresetId, typeof Zap> = {
  'discord-10mb': MessageSquare,
  'extract-mp3-320': Music,
  'smooth-gif': Film,
  'web-webp': ImageIcon,
  'fast-remux': Zap,
  'lossless-wav': Disc,
};

function getAcceptFilterForCategories(categories: readonly MediaCategory[]): string {
  const tokens: string[] = [];
  if (categories.includes('video')) {
    tokens.push('video/*', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v');
  }
  if (categories.includes('audio')) {
    tokens.push('audio/*', '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus');
  }
  if (categories.includes('image')) {
    tokens.push('image/*', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.ico', '.svg');
  }
  return tokens.join(',');
}

export function PresetBar({
  items,
  activePresetId,
  onSelectActivePreset,
  onApplyPreset,
  onFilesAddedWithPreset,
}: PresetBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const pendingPickerPresetRef = useRef<PresetId | null>(null);

  const handleSelect = (presetId: PresetId) => {
    const preset = PRESETS[presetId];
    onSelectActivePreset(presetId);

    if (items.length === 0) {
      pendingPickerPresetRef.current = presetId;
      if (pickerRef.current) {
        pickerRef.current.accept = getAcceptFilterForCategories(
          preset.compatibleCategories,
        );
        pickerRef.current.click();
      }
      setFeedback(`Prêt : « ${preset.shortLabel} » — choisissez vos fichiers.`);
      return;
    }

    const result = onApplyPreset(presetId);
    if (result.appliedCount === 0) {
      setFeedback(`Aucun fichier compatible dans la file pour « ${preset.shortLabel} ».`);
    } else {
      setFeedback(
        `« ${preset.shortLabel} » appliqué à ${result.appliedCount} ${result.appliedCount > 1 ? 'fichiers' : 'fichier'}.`,
      );
    }
  };

  return (
    <section
      aria-label="Préréglages rapides"
      className="rack-panel space-y-3 rounded p-4"
    >
      <input
        ref={pickerRef}
        type="file"
        multiple
        onChange={(e) => {
          const chosenFiles = e.target.files;
          const targetPreset = pendingPickerPresetRef.current;
          if (chosenFiles && chosenFiles.length > 0 && targetPreset) {
            const result = onFilesAddedWithPreset(chosenFiles, targetPreset);
            if (result.addedCount > 0) {
              setFeedback(
                `${result.addedCount} ${result.addedCount > 1 ? 'fichiers ajoutés' : 'fichier ajouté'} avec « ${PRESETS[targetPreset].shortLabel} ».`,
              );
            } else if (result.rejectedNames.length > 0) {
              setFeedback('Les fichiers choisis sont incompatibles avec ce préréglage.');
            }
          }
          e.target.value = '';
        }}
        className="sr-only"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-[-0.025em] text-[#F4F6F8] uppercase">
          Workflows Rapides
        </h2>
        <p
          className="font-mono text-xs font-semibold text-[#FF5500]"
          role="status"
          aria-live="polite"
        >
          {feedback ??
            (activePresetId ? `Actif : ${PRESETS[activePresetId].shortLabel}` : '')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {PRESET_LIST.map((preset) => {
          const Icon = PRESET_ICONS[preset.id];
          const compatibleCount = items.filter(
            (item) =>
              item.status !== 'converting' &&
              item.status !== 'queued' &&
              preset.compatibleCategories.includes(item.category),
          ).length;

          const activeInQueue = items.some(
            (item) => item.settings.activePreset === preset.id,
          );
          const isSelected = activePresetId === preset.id || activeInQueue;
          const isDimmed = items.length > 0 && compatibleCount === 0;

          return (
            <button
              key={preset.id}
              type="button"
              id={`preset-${preset.id}`}
              aria-pressed={isSelected}
              onClick={() => handleSelect(preset.id)}
              className={`group flex min-h-[48px] flex-col justify-between gap-1.5 rounded border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-[#FF5500] bg-[#FF5500]/12'
                  : isDimmed
                    ? 'border-[#2A2F3A] bg-[#1B1E24]/50 opacity-50 hover:opacity-85'
                    : 'border-[#2A2F3A] bg-[#1B1E24] hover:border-[#4B5568] hover:bg-[#22262E]'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-[#FF5500] bg-[#FF5500] text-[#0B0C0E]'
                        : 'border-[#2A2F3A] bg-[#131519] text-[#F4F6F8] group-hover:border-[#4B5568]'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-[#F4F6F8]">
                    {preset.label}
                  </span>
                </div>

                <span
                  className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${
                    isSelected
                      ? 'border-[#FF5500] bg-[#FF5500] text-[#0B0C0E]'
                      : 'border-[#2A2F3A] bg-[#0B0C0E] text-[#A3ACBA]'
                  }`}
                >
                  {preset.targetBadge}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-[#A3ACBA]">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
