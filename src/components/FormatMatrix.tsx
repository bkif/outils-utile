import { Cpu, Sparkles } from 'lucide-react';
import {
  AUDIO_FORMATS,
  FORMAT_REGISTRY,
  IMAGE_FORMATS,
  VIDEO_FORMATS,
} from '../constants/formats';

export function FormatMatrix() {
  return (
    <section
      aria-label="Engine and supported codec matrix"
      className="studio-panel rounded-lg p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#d1d5db]">
          Engine &amp; Format Matrix
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#9ca3af]">
          Local Pipelines
        </span>
      </div>

      <div className="space-y-3">
        {/* FFmpeg.wasm Pipeline */}
        <div className="rounded-md border border-white/8 bg-[#0b0c0e]/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#38bdf8]">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>FFmpeg.wasm</span>
            </span>
            <span className="font-mono text-[10px] text-[#9ca3af]">
              Video · Audio · GIF
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-11 shrink-0 font-mono text-[10px] uppercase text-[#9ca3af]">
                Video
              </span>
              {VIDEO_FORMATS.map((fmt) => (
                <span
                  key={fmt}
                  title={FORMAT_REGISTRY[fmt].description}
                  className="rounded border border-white/10 bg-[#181b20] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-[#e5e7eb]"
                >
                  {FORMAT_REGISTRY[fmt].label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-11 shrink-0 font-mono text-[10px] uppercase text-[#9ca3af]">
                Audio
              </span>
              {AUDIO_FORMATS.map((fmt) => (
                <span
                  key={fmt}
                  title={FORMAT_REGISTRY[fmt].description}
                  className="rounded border border-white/10 bg-[#181b20] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-[#e5e7eb]"
                >
                  {FORMAT_REGISTRY[fmt].label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas API Pipeline */}
        <div className="rounded-md border border-white/8 bg-[#0b0c0e]/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#fbbf24]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Canvas API</span>
            </span>
            <span className="font-mono text-[10px] text-[#9ca3af]">
              Instant · EXIF Strip
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-11 shrink-0 font-mono text-[10px] uppercase text-[#9ca3af]">
              Image
            </span>
            {IMAGE_FORMATS.map((fmt) => (
              <span
                key={fmt}
                title={FORMAT_REGISTRY[fmt].description}
                className="rounded border border-white/10 bg-[#181b20] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-[#e5e7eb]"
              >
                {FORMAT_REGISTRY[fmt].label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
