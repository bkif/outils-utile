import { Film, Image as ImageIcon, Music } from 'lucide-react';
import {
  AUDIO_FORMATS,
  FORMAT_REGISTRY,
  IMAGE_FORMATS,
  TARGET_FORMATS_BY_CATEGORY,
  VIDEO_FORMATS,
} from '../constants/formats';
import type { QueueItem, SupportedFormat } from '../types/media';

interface FormatMatrixProps {
  items: readonly QueueItem[];
  isProcessing: boolean;
  onSelectTargetFormat: (format: SupportedFormat) => void;
}

export function FormatMatrix({
  items,
  isProcessing,
  onSelectTargetFormat,
}: FormatMatrixProps) {
  const editableItems = items.filter(
    (item) => item.status !== 'converting' && item.status !== 'queued',
  );
  const activeTargets = new Set(items.map((item) => item.targetFormat));

  const isFormatCompatible = (format: SupportedFormat): boolean => {
    if (items.length === 0) return true;
    return editableItems.some((item) =>
      TARGET_FORMATS_BY_CATEGORY[item.category].includes(format),
    );
  };

  const groups: Array<{
    title: string;
    pipeline: string;
    icon: typeof Film;
    formats: readonly SupportedFormat[];
  }> = [
    {
      title: 'Image',
      pipeline: 'Canvas API · Sans EXIF',
      icon: ImageIcon,
      formats: IMAGE_FORMATS,
    },
    {
      title: 'Vidéo',
      pipeline: 'FFmpeg.wasm',
      icon: Film,
      formats: VIDEO_FORMATS,
    },
    {
      title: 'Audio',
      pipeline: 'FFmpeg.wasm',
      icon: Music,
      formats: AUDIO_FORMATS,
    },
  ];

  return (
    <section
      aria-label="Matrice des formats de sortie"
      className="rack-panel space-y-3 rounded p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-[-0.025em] text-[#F4F6F8] uppercase">
          Formats Supportés
        </h2>
        <span className="font-mono text-xs font-semibold text-[#A3ACBA]">
          {items.length > 0 ? 'Clic = appliquer' : 'Canvas + WASM'}
        </span>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div
              key={group.title}
              className="rounded border border-[#2A2F3A] bg-[#0B0C0E] p-3"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F4F6F8]">
                  <Icon className="h-4 w-4 text-[#FF5500]" aria-hidden="true" />
                  <span>{group.title}</span>
                </span>
                <span className="font-mono text-xs font-semibold text-[#A3ACBA]">
                  {group.pipeline}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {group.formats.map((fmt) => {
                  const compatible = isFormatCompatible(fmt);
                  const isActive = items.length > 0 && activeTargets.has(fmt);
                  const isDisabled = isProcessing || (items.length > 0 && !compatible);

                  return (
                    <button
                      key={fmt}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (items.length > 0 && compatible) {
                          onSelectTargetFormat(fmt);
                        }
                      }}
                      title={
                        items.length > 0 && !compatible
                          ? `${FORMAT_REGISTRY[fmt].label} incompatible avec les fichiers en file`
                          : `${FORMAT_REGISTRY[fmt].label} — ${FORMAT_REGISTRY[fmt].description}`
                      }
                      aria-pressed={isActive}
                      className={`inline-flex min-h-[36px] items-center rounded border px-2.5 py-1 font-mono text-xs font-semibold uppercase transition-colors ${
                        isActive
                          ? 'border-[#FF5500] bg-[#FF5500] text-[#0B0C0E]'
                          : isDisabled
                            ? 'cursor-not-allowed border-[#2A2F3A] bg-[#131519] text-[#A3ACBA] opacity-35'
                            : 'border-[#2A2F3A] bg-[#1B1E24] text-[#F4F6F8] hover:border-[#FF5500] hover:text-[#FF5500]'
                      }`}
                    >
                      {FORMAT_REGISTRY[fmt].label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
