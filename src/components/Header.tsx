import { Cpu, ShieldCheck } from 'lucide-react';
import type { EngineStatus } from '../types/media';

interface HeaderProps {
  engineStatus: EngineStatus;
}

export function Header({ engineStatus }: HeaderProps) {
  const { state, progress, message, errorDetail } = engineStatus;

  const isProcessingOrLoading = state === 'loading' || state === 'busy';

  const ledColorClass =
    state === 'ready'
      ? 'bg-[#10b981]'
      : isProcessingOrLoading
        ? 'bg-[#38bdf8] animate-pulse'
        : state === 'error'
          ? 'bg-[#ef4444]'
          : 'bg-[#9ca3af]';

  const statusTextClass =
    state === 'ready'
      ? 'text-[#10b981]'
      : isProcessingOrLoading
        ? 'text-[#38bdf8]'
        : state === 'error'
          ? 'text-[#ef4444]'
          : 'text-[#d1d5db]';

  const displayLabel =
    state === 'standby'
      ? 'Standby'
      : state === 'loading' && progress > 0 && !message.includes('%')
        ? `${message} (${progress}%)`
        : message;

  return (
    <header className="border-b border-white/10 bg-[#0b0c0e]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          {/* Geometric anvil & waveform-prism studio mark */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#121418] shadow-inner">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M10.5 6.5V9M14 5V9M17.5 6.5V9"
                stroke="#38bdf8"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M5.5 11H22.5L19.6 15.5H8.4L5.5 11Z"
                fill="#f59e0b"
              />
              <path
                d="M9 17.5H19V19.6H9V17.5ZM7 21.2H21V23H7V21.2Z"
                fill="#e5e7eb"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-[#f3f4f6]">
                FORGE
              </h1>
              <span className="rounded border border-white/12 bg-[#181b20] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[#d1d5db]">
                v1.0
              </span>
            </div>
            <p className="text-xs text-[#9ca3af]">
              Studio video, audio &amp; image workstation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-wide text-[#34d399]"
            title="All decoding, transcoding, and ZIP packaging execute strictly inside your browser RAM. No files are ever uploaded."
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>100% LOCAL · ZERO UPLOAD</span>
          </div>

          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-[#121418] px-2.5 py-1.5"
            title={errorDetail ?? `FFmpeg.wasm engine state: ${displayLabel}`}
          >
            <Cpu className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" aria-hidden="true" />
            <span className="font-mono text-[11px] text-[#9ca3af]">WASM ·</span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${ledColorClass}`} />
            <span
              className={`font-mono text-[11px] font-medium tabular-nums ${statusTextClass}`}
            >
              {displayLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
