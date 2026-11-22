import { Cpu, ShieldCheck } from 'lucide-react';
import type { EngineStatus, QueueItem } from '../types/media';
import { formatBytesFr } from '../utils/formatters';

interface HeaderProps {
  engineStatus: EngineStatus;
  items: readonly QueueItem[];
}

function getFrenchEngineLabel(status: EngineStatus): string {
  switch (status.state) {
    case 'standby':
      return 'WASM · Veille';
    case 'loading':
      return status.progress > 0
        ? `WASM · Chargement (${status.progress}%)`
        : 'WASM · Chargement';
    case 'ready':
      return 'WASM · Prêt';
    case 'busy':
      return 'WASM · Actif';
    case 'error':
      return 'WASM · Erreur';
  }
}

export function Header({ engineStatus, items }: HeaderProps) {
  const { state, errorDetail } = engineStatus;

  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  const fileCountLabel = `${items.length} ${items.length <= 1 ? 'fichier' : 'fichiers'}`;
  const engineLabel = getFrenchEngineLabel(engineStatus);

  const ledClass =
    state === 'ready'
      ? 'bg-[#10B981]'
      : state === 'loading' || state === 'busy'
        ? 'bg-[#FF5500] animate-pulse'
        : state === 'error'
          ? 'bg-[#EF4444]'
          : 'bg-[#A3ACBA]';

  const textClass =
    state === 'ready'
      ? 'text-[#34D399]'
      : state === 'loading' || state === 'busy'
        ? 'text-[#FF5500]'
        : state === 'error'
          ? 'text-[#FCA5A5]'
          : 'text-[#F4F6F8]';

  return (
    <header className="border-b border-[#2A2F3A] bg-[#131519]">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:min-h-[60px] sm:px-6 sm:py-2.5">
        <div className="flex items-center gap-3">
          {/* Swiss Industrial Rack SVG Brand Mark */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#2A2F3A] bg-[#0B0C0E]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M5 7h22v5H5V7Z" fill="#FF5500" />
              <path d="M5 15h13v4H5v-4Zm0 6h22v4H5v-4Z" fill="#F4F6F8" />
              <rect x="21" y="15" width="6" height="4" fill="#FF5500" />
            </svg>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="text-lg font-extrabold tracking-[-0.025em] text-[#F4F6F8] sm:text-xl">
              Outils Utiles
            </h1>
            <span className="hidden font-mono text-xs font-semibold uppercase tracking-wider text-[#A3ACBA] md:inline">
              Studio Média Local
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Queue Telemetry */}
          <div
            role="status"
            aria-live="polite"
            className="inline-flex min-h-[36px] items-center gap-2 rounded border border-[#2A2F3A] bg-[#0B0C0E] px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#F4F6F8]"
          >
            <span>{fileCountLabel}</span>
            <span aria-hidden="true" className="text-[#A3ACBA]">
              ·
            </span>
            <span className="text-[#A3ACBA]">{formatBytesFr(totalSize)}</span>
          </div>

          {/* 100% Local Privacy Pill */}
          <div
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded border border-[#10B981]/40 bg-[#0B0C0E] px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-[#34D399]"
            title="Tout le décodage, le transcodage FFmpeg.wasm/Canvas et l'export ZIP s'exécutent dans la RAM de votre navigateur."
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>100% LOCAL • ZÉRO UPLOAD</span>
          </div>

          {/* Live Engine Telemetry */}
          <div
            role="status"
            aria-live="polite"
            title={errorDetail ?? `État du moteur FFmpeg.wasm : ${engineLabel}`}
            className="hidden min-h-[36px] items-center gap-2 rounded border border-[#2A2F3A] bg-[#0B0C0E] px-3 py-1.5 sm:inline-flex"
          >
            <Cpu className="h-4 w-4 shrink-0 text-[#A3ACBA]" aria-hidden="true" />
            <span className={`h-2 w-2 shrink-0 rounded-full ${ledClass}`} />
            <span className={`font-mono text-xs font-semibold tabular-nums ${textClass}`}>
              {engineLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
