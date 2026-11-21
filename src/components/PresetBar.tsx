import { useState } from 'react';
import {
  Disc,
  Film,
  Image as ImageIcon,
  MessageSquare,
  Music,
  Zap,
} from 'lucide-react';
import { PRESET_LIST } from '../constants/formats';
import type { ApplyPresetResult } from '../hooks/useConversionQueue';
import type { PresetId, QueueItem } from '../types/media';

interface PresetBarProps {
  items: readonly QueueItem[];
  onApplyPreset: (presetId: PresetId) => ApplyPresetResult;
}

const PRESET_ICONS: Record<PresetId, typeof Zap> = {
  'discord-10mb': MessageSquare,
  'extract-mp3-320': Music,
  'smooth-gif': Film,
  'web-webp': ImageIcon,
  'fast-remux': Zap,
  'lossless-wav': Disc,
};

export function PresetBar({ items, onApplyPreset }: PresetBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSelect = (presetId: PresetId, label: string) => {
    if (items.length === 0) {
      setFeedback(`Add media files first, then click "${label}".`);
      return;
    }

    const result = onApplyPreset(presetId);
    if (result.appliedCount === 0) {
      setFeedback(`No compatible idle items in queue for "${label}".`);
    } else {
      setFeedback(
        `Configured ${result.appliedCount} item${result.appliedCount > 1 ? 's' : ''} with ${label}.`,
      );
    }
  };

  return (
    <section aria-label="Quick workflow presets" className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Quick Presets
        </h2>
        {feedback && (
          <p className="font-mono text-[11px] text-[#F59E0B]" aria-live="polite">
            {feedback}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET_LIST.map((preset) => {
          const Icon = PRESET_ICONS[preset.id];
          const compatibleCount = items.filter(
            (item) =>
              item.status !== 'converting' &&
              item.status !== 'queued' &&
              preset.compatibleCategories.includes(item.category),
          ).length;

          const activeCount = items.filter(
            (item) => item.settings.activePreset === preset.id,
          ).length;

          const isDimmed = items.length > 0 && compatibleCount === 0;

          return (
            <button
              key={preset.id}
              type="button"
              id={`preset-${preset.id}`}
              onClick={() => handleSelect(preset.id, preset.shortLabel)}
              title={preset.description}
              className={`group flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                activeCount > 0
                  ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10'
                  : isDimmed
                    ? 'border-[#262B36] bg-[#12151B]/60 opacity-60 hover:opacity-90'
                    : 'border-[#262B36] bg-[#12151B] hover:border-[#3A4252] hover:bg-[#191D26] active:bg-[#151921]'
              }`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                  activeCount > 0
                    ? 'border-[#F59E0B]/50 bg-[#F59E0B]/20 text-[#F59E0B]'
                    : 'border-[#262B36] bg-[#191D26] text-[#9CA3AF] group-hover:text-[#F3F4F6]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-[#F3F4F6]">
                    {preset.label}
                  </span>
                  {items.length > 0 && compatibleCount > 0 && (
                    <span className="shrink-0 rounded border border-[#262B36] bg-[#0B0D10] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[#9CA3AF]">
                      {compatibleCount}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-[#9CA3AF]">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
