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
      setFeedback(`Armed "${preset.shortLabel}" — pick compatible media files.`);
      return;
    }

    const result = onApplyPreset(presetId);
    if (result.appliedCount === 0) {
      setFeedback(`No compatible idle items in queue for "${preset.shortLabel}".`);
    } else {
      setFeedback(
        `Applied "${preset.shortLabel}" to ${result.appliedCount} item${result.appliedCount > 1 ? 's' : ''}.`,
      );
    }
  };

  return (
    <section aria-label="Quick workflow presets" className="studio-panel rounded-lg p-4 space-y-3">
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
                `Staged ${result.addedCount} item${result.addedCount > 1 ? 's' : ''} with ${PRESETS[targetPreset].shortLabel}.`,
              );
            } else if (result.rejectedNames.length > 0) {
              setFeedback('Selected files were not compatible with this media pipeline.');
            }
          }
          e.target.value = '';
        }}
        className="sr-only"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#d1d5db]">
          Quick Presets
        </h2>
        <p
          className="font-mono text-[11px] text-[#fbbf24]"
          role="status"
          aria-live="polite"
        >
          {feedback ?? (activePresetId ? `Armed: ${PRESETS[activePresetId].shortLabel}` : '')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
              className={`group flex flex-col justify-between gap-2 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] ${
                isSelected
                  ? 'border-[#f59e0b]/70 bg-[#f59e0b]/12'
                  : isDimmed
                    ? 'border-white/8 bg-[#181b20]/50 opacity-60 hover:opacity-90'
                    : 'border-white/10 bg-[#181b20] hover:border-white/20 hover:bg-[#1e2229] active:bg-[#15181e]'
              }`}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-[#f59e0b]/50 bg-[#f59e0b]/20 text-[#fbbf24]'
                        : 'border-white/10 bg-[#121418] text-[#9ca3af] group-hover:text-[#f3f4f6]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold leading-snug text-[#f3f4f6]">
                    {preset.label}
                  </span>
                </div>

                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums ${
                    isSelected
                      ? 'border-[#f59e0b]/50 bg-[#f59e0b]/20 text-[#fbbf24]'
                      : 'border-white/10 bg-[#0b0c0e] text-[#9ca3af]'
                  }`}
                >
                  {preset.targetBadge}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-[#9ca3af]">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
