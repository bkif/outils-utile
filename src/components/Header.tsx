import { Cpu, ShieldCheck } from 'lucide-react';
import type { EngineStatus } from '../types/media';

interface HeaderProps {
  engineStatus: EngineStatus;
}

export function Header({ engineStatus }: HeaderProps) {
  const { state, progress, message, errorDetail } = engineStatus;

  const ledColorClass =
    state === 'ready'
      ? 'bg-[#10B981]'
      : state === 'loading' || state === 'busy'
        ? 'bg-[#F59E0B] animate-pulse'
        : state === 'error'
          ? 'bg-[#EF4444]'
          : 'bg-[#6B7280]';

  const statusTextClass =
    state === 'ready'
      ? 'text-[#10B981]'
      : state === 'loading' || state === 'busy'
        ? 'text-[#F59E0B]'
        : state === 'error'
          ? 'text-[#EF4444]'
          : 'text-[#9CA3AF]';

  return (
    <header className="border-b border-[#262B36] bg-[#0B0D10]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#262B36] bg-[#12151B]">
            <span className="font-mono text-xs font-semibold tracking-tighter text-[#F59E0B]">
              FG
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-[#F3F4F6]">
                FORGE
              </h1>
              <span className="rounded border border-[#262B36] bg-[#12151B] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                v1.0
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              Client-side video, audio &amp; image transcoder
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-wide text-[#10B981]"
            title="All decoding, transcoding, and ZIP packaging run inside your browser. No files ever leave your device."
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>100% LOCAL • ZERO UPLOAD</span>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-md border border-[#262B36] bg-[#12151B] px-2.5 py-1.5"
            title={errorDetail ?? `FFmpeg.wasm engine state: ${message}`}
            aria-live="polite"
          >
            <Cpu className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden="true" />
            <span className="font-mono text-[11px] text-[#9CA3AF]">WASM</span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${ledColorClass}`} />
            <span className={`font-mono text-[11px] font-medium tabular-nums ${statusTextClass}`}>
              {state === 'loading' && progress > 0 && !message.includes('%')
                ? `${message} (${progress}%)`
                : message}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
