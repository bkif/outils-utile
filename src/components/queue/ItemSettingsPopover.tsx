import { AUDIO_FORMATS, VIDEO_FORMATS } from '../../constants/formats';
import type { ConversionSettings, QueueItem } from '../../types/media';

interface ItemSettingsPopoverProps {
  item: QueueItem;
  onSettingsChange: (id: string, patch: Partial<ConversionSettings>) => void;
}

export function ItemSettingsPopover({
  item,
  onSettingsChange,
}: ItemSettingsPopoverProps) {
  const isGifTarget = item.targetFormat === 'gif';
  const isImageTarget = item.category === 'image' && !isGifTarget;
  const isAudioTarget = (AUDIO_FORMATS as readonly string[]).includes(item.targetFormat);
  const isVideoTarget =
    (VIDEO_FORMATS as readonly string[]).includes(item.targetFormat) && !isGifTarget;

  return (
    <div className="border-t border-[#2A2F3A] bg-[#0B0C0E] px-4 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isImageTarget && (
          <>
            {item.targetFormat !== 'ico' && item.targetFormat !== 'png' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`quality-${item.id}`}
                    className="text-sm font-semibold text-[#F4F6F8]"
                  >
                    Qualité
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[#FF5500]">
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
                  className="forge-slider w-full"
                />
              </div>
            )}

            {item.targetFormat !== 'ico' && (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`max-width-${item.id}`}
                    className="block text-sm font-semibold text-[#F4F6F8]"
                  >
                    Largeur max
                  </label>
                  <select
                    id={`max-width-${item.id}`}
                    value={item.settings.maxWidth ?? ''}
                    onChange={(e) =>
                      onSettingsChange(item.id, {
                        maxWidth: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="min-h-[40px] w-full rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 font-mono text-sm font-semibold text-[#F4F6F8]"
                  >
                    <option value="">Largeur d’origine</option>
                    <option value="2560">2560 px (QHD)</option>
                    <option value="1920">1920 px (Full HD)</option>
                    <option value="1280">1280 px (HD)</option>
                    <option value="800">800 px (Web)</option>
                    <option value="512">512 px (Icône)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`max-height-${item.id}`}
                    className="block text-sm font-semibold text-[#F4F6F8]"
                  >
                    Hauteur max
                  </label>
                  <select
                    id={`max-height-${item.id}`}
                    value={item.settings.maxHeight ?? ''}
                    onChange={(e) =>
                      onSettingsChange(item.id, {
                        maxHeight: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="min-h-[40px] w-full rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 font-mono text-sm font-semibold text-[#F4F6F8]"
                  >
                    <option value="">Hauteur d’origine</option>
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
              <p className="text-sm font-semibold text-[#A3ACBA] sm:col-span-2">
                Génère un conteneur <code className="font-mono text-[#F4F6F8]">.ico</code> multi-résolution intégrant des cadres PNG 16×16, 32×32 et 48×48.
              </p>
            )}
          </>
        )}

        {isGifTarget && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`gif-fps-${item.id}`}
                  className="text-sm font-semibold text-[#F4F6F8]"
                >
                  Fréquence (FPS)
                </label>
                <span className="font-mono text-xs font-semibold tabular-nums text-[#FF5500]">
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
                className="forge-slider w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`gif-width-${item.id}`}
                className="block text-sm font-semibold text-[#F4F6F8]"
              >
                Largeur GIF (Lanczos)
              </label>
              <select
                id={`gif-width-${item.id}`}
                value={item.settings.gifWidth}
                onChange={(e) =>
                  onSettingsChange(item.id, { gifWidth: Number(e.target.value) })
                }
                className="min-h-[40px] w-full rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 font-mono text-sm font-semibold text-[#F4F6F8]"
              >
                <option value="320">320 px (Compact)</option>
                <option value="480">480 px (Standard)</option>
                <option value="640">640 px (Net)</option>
                <option value="720">720 px (HD)</option>
              </select>
            </div>
          </>
        )}

        {isVideoTarget && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`crf-${item.id}`}
                  className="text-sm font-semibold text-[#F4F6F8]"
                >
                  Qualité (CRF)
                </label>
                <span className="font-mono text-xs font-semibold tabular-nums text-[#FF5500]">
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
                className="forge-slider w-full disabled:opacity-40"
              />
              <div className="flex justify-between font-mono text-xs font-semibold text-[#A3ACBA]">
                <span>18 (Haute)</span>
                <span>32 (Compact)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`vid-width-${item.id}`}
                className="block text-sm font-semibold text-[#F4F6F8]"
              >
                Résolution max
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
                className="min-h-[40px] w-full rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 font-mono text-sm font-semibold text-[#F4F6F8] disabled:opacity-40"
              >
                <option value="">Résolution d’origine</option>
                <option value="1920">1080p max (1920w)</option>
                <option value="1280">720p max (1280w)</option>
                <option value="854">480p max (854w)</option>
                <option value="640">360p max (640w)</option>
              </select>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <label
                  htmlFor={`vid-audio-${item.id}`}
                  className="block text-sm font-semibold text-[#F4F6F8]"
                >
                  Débit audio
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
                  className="min-h-[40px] w-full rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 font-mono text-sm font-semibold text-[#F4F6F8] disabled:opacity-40"
                >
                  <option value="96k">96 kbps</option>
                  <option value="128k">128 kbps</option>
                  <option value="192k">192 kbps</option>
                  <option value="256k">256 kbps</option>
                  <option value="320k">320 kbps</option>
                </select>
              </div>

              <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-semibold text-[#F4F6F8]">
                <input
                  type="checkbox"
                  checked={item.settings.fastRemux}
                  onChange={(e) =>
                    onSettingsChange(item.id, {
                      fastRemux: e.target.checked,
                      targetSizeMb: null,
                    })
                  }
                  className="h-4 w-4 rounded border-[#2A2F3A] bg-[#1B1E24] accent-[#FF5500]"
                />
                <span>Remux rapide (-c copy)</span>
              </label>
            </div>
          </>
        )}

        {isAudioTarget && (
          <div className="space-y-1.5">
            <label
              htmlFor={`audio-bitrate-${item.id}`}
              className="block text-sm font-semibold text-[#F4F6F8]"
            >
              Débit audio
            </label>
            {item.targetFormat === 'wav' || item.targetFormat === 'flac' ? (
              <p className="flex min-h-[40px] items-center rounded border border-[#2A2F3A] bg-[#131519] px-3 py-2 font-mono text-xs font-semibold text-[#A3ACBA]">
                PCM / FLAC sans perte (débit natif)
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
                className="min-h-[40px] w-full rounded border border-[#2A2F3A] bg-[#1B1E24] px-3 py-2 font-mono text-sm font-semibold text-[#F4F6F8]"
              >
                <option value="96k">96 kbps (Compact)</option>
                <option value="128k">128 kbps (Standard)</option>
                <option value="192k">192 kbps (Élevé)</option>
                <option value="256k">256 kbps (Studio)</option>
                <option value="320k">320 kbps (Max)</option>
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
