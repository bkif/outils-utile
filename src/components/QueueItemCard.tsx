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
  Trash2,
} from 'lucide-react';
import {
  AUDIO_FORMATS,
  FORMAT_REGISTRY,
  IMAGE_FORMATS,
  TARGET_FORMATS_BY_CATEGORY,
  VIDEO_FORMATS,
} from '../constants/formats';
import type { ConversionSettings, QueueItem, SupportedFormat } from '../types/media';
import {
  buildOutputFileName,
  calculateSizeDeltaPercent,
  formatBytes,
  formatDurationMs,
  triggerBlobDownload,
} from '../utils/fileUtils';

interface QueueItemCardProps {
  item: QueueItem;
  onTargetFormatChange: (id: string, format: SupportedFormat) => void;
  onSettingsChange: (id: string, patch: Partial<ConversionSettings>) => void;
  onConvert: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]';

export function QueueItemCard({
  item,
  onTargetFormatChange,
  onSettingsChange,
  onConvert,
  onCancel,
  onRemove,
}: QueueItemCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const isGifTarget = item.targetFormat === 'gif';
  const isImageTarget = item.category === 'image' && !isGifTarget;
  const isAudioTarget = (AUDIO_FORMATS as readonly string[]).includes(item.targetFormat);
  const isVideoTarget =
    (VIDEO_FORMATS as readonly string[]).includes(item.targetFormat) && !isGifTarget;

  return (
    <article
      aria-label={`Queue item ${item.name}`}
      className={`rounded-lg border transition-colors ${
        item.status === 'error'
          ? 'border-[#ef4444]/50 bg-[#121418]'
          : item.status === 'completed'
            ? 'border-[#10b981]/40 bg-[#121418]'
            : item.status === 'converting'
              ? 'border-[#38bdf8]/50 bg-[#121418]'
              : 'border-white/10 bg-[#121418]'
      }`}
    >
      <div className="flex flex-col gap-3 p-3.5 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
        {/* Left: Thumbnail/icon + file identity + size telemetry */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#0b0c0e]">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <CategoryIcon className="h-5 w-5 text-[#9ca3af]" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="truncate text-sm font-medium text-[#f3f4f6]"
                title={item.name}
              >
                {item.name}
              </h3>

              {item.settings.activePreset && (
                <span className="rounded border border-[#f59e0b]/45 bg-[#f59e0b]/12 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[#fbbf24]">
                  {item.settings.activePreset}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs tabular-nums text-[#9ca3af]">
              <span className="uppercase text-[#d1d5db]">{item.sourceFormat}</span>
              <span aria-hidden="true" className="text-[#6b7280]">
                ·
              </span>
              <span>{formatBytes(item.size)}</span>

              {item.status === 'completed' && item.outputSize !== null && (
                <>
                  <span aria-hidden="true" className="text-[#6b7280]">
                    →
                  </span>
                  <span className="font-semibold text-[#f3f4f6]">
                    {formatBytes(item.outputSize)}
                  </span>
                  {sizeDelta !== null && (
                    <span
                      className={
                        sizeDelta <= 0 ? 'text-[#34d399]' : 'text-[#fbbf24]'
                      }
                    >
                      ({sizeDelta > 0 ? `+${sizeDelta}%` : `${sizeDelta}%`})
                    </span>
                  )}
                  {item.durationMs !== null && (
                    <span className="text-[#9ca3af]">
                      in {formatDurationMs(item.durationMs)}
                    </span>
                  )}
                </>
              )}

              {item.status === 'queued' && (
                <span className="text-[#d1d5db]">· Queued</span>
              )}
              {item.status === 'converting' && (
                <span className="text-[#38bdf8]">· Processing {item.progress}%</span>
              )}
              {item.status === 'completed' && (
                <span className="text-[#34d399]">· Done</span>
              )}
              {item.status === 'error' && (
                <span className="text-[#fca5a5]">· Error</span>
              )}
              {item.status === 'cancelled' && (
                <span className="text-[#9ca3af]">· Cancelled</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Format routing + hardware controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="rounded border border-white/10 bg-[#0b0c0e] px-2 py-1.5 font-mono text-xs uppercase text-[#9ca3af]">
              {item.sourceFormat}
            </span>
            <span className="font-mono text-xs text-[#9ca3af]" aria-hidden="true">
              →
            </span>
            <label htmlFor={`target-format-${item.id}`} className="sr-only">
              Target format for {item.name}
            </label>
            <select
              id={`target-format-${item.id}`}
              value={item.targetFormat}
              disabled={isLocked}
              onChange={(e) =>
                onTargetFormatChange(item.id, e.target.value as SupportedFormat)
              }
              className={`rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs font-medium uppercase text-[#f3f4f6] transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              {item.category === 'video' ? (
                <>
                  <optgroup label="Video">
                    {validTargets
                      .filter((fmt) => (VIDEO_FORMATS as readonly string[]).includes(fmt))
                      .map((fmt) => (
                        <option key={fmt} value={fmt}>
                          {FORMAT_REGISTRY[fmt].label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Extract Audio">
                    {validTargets
                      .filter((fmt) => (AUDIO_FORMATS as readonly string[]).includes(fmt))
                      .map((fmt) => (
                        <option key={fmt} value={fmt}>
                          {FORMAT_REGISTRY[fmt].label}
                        </option>
                      ))}
                  </optgroup>
                </>
              ) : (
                validTargets.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {FORMAT_REGISTRY[fmt].label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-expanded={drawerOpen}
              aria-label={`Toggle settings for ${item.name}`}
              disabled={isLocked}
              onClick={() => setDrawerOpen((prev) => !prev)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${
                drawerOpen
                  ? 'border-[#f59e0b]/60 bg-[#f59e0b]/15 text-[#fbbf24]'
                  : 'border-white/12 bg-[#181b20] text-[#9ca3af] hover:border-white/25 hover:text-[#f3f4f6]'
              }`}
              title="Fine-tune quality, resolution, and bitrate"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {item.status === 'converting' || item.status === 'queued' ? (
              <button
                type="button"
                onClick={() => onCancel(item.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-[#ef4444]/50 bg-[#ef4444]/15 px-2.5 text-xs font-medium text-[#fca5a5] transition-colors hover:bg-[#ef4444]/25 ${FOCUS_RING}`}
                title={item.status === 'queued' ? 'Unqueue item' : 'Cancel active job'}
              >
                {item.status === 'converting' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#38bdf8]" aria-hidden="true" />
                ) : (
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                )}
                <span>Cancel</span>
              </button>
            ) : item.status === 'completed' ? (
              <button
                type="button"
                onClick={handleDownload}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-[#10b981]/50 bg-[#10b981] px-3 text-xs font-semibold text-[#0b0c0e] transition-colors hover:bg-[#34d399] active:bg-[#059669] ${FOCUS_RING}`}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download</span>
              </button>
            ) : item.status === 'error' ? (
              <button
                type="button"
                onClick={() => onConvert(item.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2.5 text-xs font-medium text-[#fbbf24] transition-colors hover:bg-[#f59e0b]/25 ${FOCUS_RING}`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConvert(item.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-white/14 bg-[#181b20] px-2.5 text-xs font-medium text-[#f3f4f6] transition-colors hover:border-[#f59e0b]/60 hover:text-[#fbbf24] ${FOCUS_RING}`}
                title="Convert this file now"
              >
                <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                <span>Convert</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.name}`}
              title="Remove from queue"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/12 bg-[#181b20] text-[#9ca3af] transition-colors hover:border-[#ef4444]/40 hover:bg-[#ef4444]/10 hover:text-[#fca5a5] ${FOCUS_RING}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      {(item.status === 'converting' ||
        item.status === 'completed' ||
        item.status === 'error') && (
        <div className="px-3.5 pb-3 sm:px-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0b0c0e]">
            <div
              className={`h-full transition-all duration-200 ${
                item.status === 'completed'
                  ? 'bg-[#10b981]'
                  : item.status === 'error'
                    ? 'bg-[#ef4444]'
                    : 'bg-[#38bdf8]'
              }`}
              style={{
                width: `${
                  item.status === 'completed'
                    ? 100
                    : item.status === 'error'
                      ? 100
                      : Math.max(4, item.progress)
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Warnings & Errors */}
      {item.warningMessage && (
        <div className="mx-3.5 mb-3 flex items-start gap-2 rounded border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-2.5 py-1.5 text-[11px] text-[#fde68a] sm:mx-4">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f59e0b]" aria-hidden="true" />
          <span>{item.warningMessage}</span>
        </div>
      )}

      {item.status === 'error' && item.errorMessage && (
        <div
          role="alert"
          className="mx-3.5 mb-3 flex items-start gap-2 rounded border border-[#ef4444]/40 bg-[#ef4444]/10 px-2.5 py-1.5 text-[11px] text-[#fca5a5] sm:mx-4"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ef4444]" aria-hidden="true" />
          <span className="break-words">{item.errorMessage}</span>
        </div>
      )}

      {item.status === 'completed' && (
        <div className="mx-3.5 mb-3 flex items-center justify-between gap-2 text-[11px] text-[#34d399] sm:mx-4">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Ready:{' '}
              <span className="font-mono">
                {buildOutputFileName(item.name, item.targetFormat)}
              </span>
            </span>
          </span>
          {(IMAGE_FORMATS as readonly string[]).includes(item.targetFormat) && (
            <span className="font-mono text-[10px] text-[#9ca3af]">EXIF stripped</span>
          )}
        </div>
      )}

      {/* Expandable Fine-Tuning Drawer */}
      {drawerOpen && (
        <div className="border-t border-white/10 bg-[#0e1014] px-3.5 py-3.5 sm:px-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isImageTarget && (
              <>
                {item.targetFormat !== 'ico' && item.targetFormat !== 'png' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor={`quality-${item.id}`} className="text-[#9ca3af]">
                        Compression Quality
                      </label>
                      <span className="font-mono tabular-nums text-[#f3f4f6]">
                        {Math.round(item.settings.quality * 100)}%
                      </span>
                    </div>
                    <input
                      id={`quality-${item.id}`}
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={item.settings.quality}
                      onChange={(e) =>
                        onSettingsChange(item.id, {
                          quality: Number(e.target.value),
                        })
                      }
                      className={`forge-slider w-full ${FOCUS_RING}`}
                    />
                  </div>
                )}

                {item.targetFormat !== 'ico' && (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`max-width-${item.id}`}
                        className="block text-xs text-[#9ca3af]"
                      >
                        Max Width (px)
                      </label>
                      <select
                        id={`max-width-${item.id}`}
                        value={item.settings.maxWidth ?? ''}
                        onChange={(e) =>
                          onSettingsChange(item.id, {
                            maxWidth: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className={`w-full rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] ${FOCUS_RING}`}
                      >
                        <option value="">Original width</option>
                        <option value="2560">2560 px (QHD)</option>
                        <option value="1920">1920 px (FHD)</option>
                        <option value="1280">1280 px (HD)</option>
                        <option value="800">800 px (Web)</option>
                        <option value="512">512 px (Icon/Avatar)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`max-height-${item.id}`}
                        className="block text-xs text-[#9ca3af]"
                      >
                        Max Height (px)
                      </label>
                      <select
                        id={`max-height-${item.id}`}
                        value={item.settings.maxHeight ?? ''}
                        onChange={(e) =>
                          onSettingsChange(item.id, {
                            maxHeight: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className={`w-full rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] ${FOCUS_RING}`}
                      >
                        <option value="">Original height</option>
                        <option value="1440">1440 px</option>
                        <option value="1080">1080 px</option>
                        <option value="720">720 px</option>
                        <option value="600">600 px</option>
                        <option value="512">512 px</option>
                      </select>
                    </div>
                  </>
                )}

                {item.targetFormat === 'ico' && (
                  <p className="text-xs text-[#9ca3af] sm:col-span-2">
                    Generates a multi-resolution{' '}
                    <code className="font-mono text-[#f3f4f6]">.ico</code> container embedding crisp 16×16, 32×32, and 48×48 PNG frames.
                  </p>
                )}
              </>
            )}

            {isGifTarget && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`gif-fps-${item.id}`} className="text-[#9ca3af]">
                      GIF Frame Rate
                    </label>
                    <span className="font-mono tabular-nums text-[#f3f4f6]">
                      {item.settings.gifFps} FPS
                    </span>
                  </div>
                  <input
                    id={`gif-fps-${item.id}`}
                    type="range"
                    min={8}
                    max={24}
                    step={1}
                    value={item.settings.gifFps}
                    onChange={(e) =>
                      onSettingsChange(item.id, { gifFps: Number(e.target.value) })
                    }
                    className={`forge-slider w-full ${FOCUS_RING}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`gif-width-${item.id}`}
                    className="block text-xs text-[#9ca3af]"
                  >
                    GIF Width (Lanczos Scale)
                  </label>
                  <select
                    id={`gif-width-${item.id}`}
                    value={item.settings.gifWidth}
                    onChange={(e) =>
                      onSettingsChange(item.id, { gifWidth: Number(e.target.value) })
                    }
                    className={`w-full rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] ${FOCUS_RING}`}
                  >
                    <option value="320">320 px (Compact)</option>
                    <option value="480">480 px (Standard)</option>
                    <option value="640">640 px (Sharp)</option>
                    <option value="720">720 px (HD)</option>
                  </select>
                </div>
              </>
            )}

            {isVideoTarget && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`crf-${item.id}`} className="text-[#9ca3af]">
                      Quality (CRF)
                    </label>
                    <span className="font-mono tabular-nums text-[#f3f4f6]">
                      CRF {item.settings.crf}
                    </span>
                  </div>
                  <input
                    id={`crf-${item.id}`}
                    type="range"
                    min={18}
                    max={32}
                    step={1}
                    disabled={item.settings.fastRemux}
                    value={item.settings.crf}
                    onChange={(e) =>
                      onSettingsChange(item.id, {
                        crf: Number(e.target.value),
                        targetSizeMb: null,
                      })
                    }
                    className={`forge-slider w-full disabled:opacity-40 ${FOCUS_RING}`}
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#9ca3af]">
                    <span>18 (Higher)</span>
                    <span>32 (Smaller)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`vid-width-${item.id}`}
                    className="block text-xs text-[#9ca3af]"
                  >
                    Resolution Scale
                  </label>
                  <select
                    id={`vid-width-${item.id}`}
                    disabled={item.settings.fastRemux}
                    value={item.settings.maxWidth ?? ''}
                    onChange={(e) =>
                      onSettingsChange(item.id, {
                        maxWidth: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className={`w-full rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] disabled:opacity-40 ${FOCUS_RING}`}
                  >
                    <option value="">Original resolution</option>
                    <option value="1920">1080p max (1920w)</option>
                    <option value="1280">720p max (1280w)</option>
                    <option value="854">480p max (854w)</option>
                    <option value="640">360p max (640w)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`vid-audio-${item.id}`}
                      className="block text-xs text-[#9ca3af]"
                    >
                      Audio Bitrate
                    </label>
                    <select
                      id={`vid-audio-${item.id}`}
                      disabled={item.settings.fastRemux}
                      value={item.settings.audioBitrate}
                      onChange={(e) =>
                        onSettingsChange(item.id, {
                          audioBitrate: e.target.value as ConversionSettings['audioBitrate'],
                        })
                      }
                      className={`w-full rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] disabled:opacity-40 ${FOCUS_RING}`}
                    >
                      <option value="96k">96 kbps</option>
                      <option value="128k">128 kbps</option>
                      <option value="192k">192 kbps</option>
                      <option value="256k">256 kbps</option>
                      <option value="320k">320 kbps</option>
                    </select>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#f3f4f6]">
                    <input
                      type="checkbox"
                      checked={item.settings.fastRemux}
                      onChange={(e) =>
                        onSettingsChange(item.id, {
                          fastRemux: e.target.checked,
                          targetSizeMb: null,
                        })
                      }
                      className={`h-3.5 w-3.5 rounded border-white/20 bg-[#181b20] accent-[#f59e0b] ${FOCUS_RING}`}
                    />
                    <span>Fast Remux (-c copy, no re-encode)</span>
                  </label>
                </div>
              </>
            )}

            {isAudioTarget && (
              <div className="space-y-1.5">
                <label
                  htmlFor={`audio-bitrate-${item.id}`}
                  className="block text-xs text-[#9ca3af]"
                >
                  Audio Bitrate
                </label>
                {item.targetFormat === 'wav' || item.targetFormat === 'flac' ? (
                  <p className="rounded-md border border-white/10 bg-[#121418] px-2.5 py-1.5 font-mono text-xs text-[#9ca3af]">
                    Lossless PCM / FLAC (no bitrate cap)
                  </p>
                ) : (
                  <select
                    id={`audio-bitrate-${item.id}`}
                    value={item.settings.audioBitrate}
                    onChange={(e) =>
                      onSettingsChange(item.id, {
                        audioBitrate: e.target.value as ConversionSettings['audioBitrate'],
                      })
                    }
                    className={`w-full rounded-md border border-white/14 bg-[#181b20] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] ${FOCUS_RING}`}
                  >
                    <option value="96k">96 kbps (Compact)</option>
                    <option value="128k">128 kbps (Standard)</option>
                    <option value="192k">192 kbps (High)</option>
                    <option value="256k">256 kbps (Studio)</option>
                    <option value="320k">320 kbps (Max)</option>
                  </select>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
