import { useState } from 'react';
import {
  ArrowRight,
  Cpu,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import type { ConversionSettings, QueueItem, SupportedFormat } from '../types/media';
import { downloadCompletedAsZip } from '../utils/fileUtils';
import { BatchActionBar } from './queue/BatchActionBar';
import { QueueItemCard } from './queue/QueueItemCard';

interface QueueListProps {
  items: readonly QueueItem[];
  isProcessing: boolean;
  onTargetFormatChange: (id: string, format: SupportedFormat) => void;
  onSettingsChange: (id: string, patch: Partial<ConversionSettings>) => void;
  onGlobalTargetChange: (format: SupportedFormat) => void;
  onConvertAll: () => void;
  onConvertItem: (id: string) => void;
  onCancelItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

export function QueueList({
  items,
  isProcessing,
  onTargetFormatChange,
  onSettingsChange,
  onGlobalTargetChange,
  onConvertAll,
  onConvertItem,
  onCancelItem,
  onRemoveItem,
  onClearCompleted,
  onClearAll,
}: QueueListProps) {
  const [globalTarget, setGlobalTarget] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const completedCount = items.filter((item) => item.status === 'completed').length;

  const handleGlobalFormatSelect = (value: string) => {
    setGlobalTarget(value);
    if (!value) return;
    onGlobalTargetChange(value as SupportedFormat);
  };

  const handleDownloadZip = async () => {
    if (completedCount === 0 || isZipping) return;
    setZipError(null);
    setIsZipping(true);
    try {
      await downloadCompletedAsZip(items);
    } catch (err) {
      setZipError(
        err instanceof Error ? err.message : 'Échec de la création de l’archive ZIP.',
      );
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <section aria-label="File de conversion" className="space-y-3">
      {items.length > 0 && (
        <BatchActionBar
          items={items}
          isProcessing={isProcessing}
          isZipping={isZipping}
          globalTarget={globalTarget}
          onGlobalTargetChange={handleGlobalFormatSelect}
          onConvertAll={onConvertAll}
          onDownloadZip={handleDownloadZip}
          onClearCompleted={onClearCompleted}
          onClearAll={onClearAll}
        />
      )}

      {zipError && (
        <p role="alert" className="font-mono text-xs font-semibold text-[#FCA5A5]">
          {zipError}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rack-panel rounded p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2F3A] pb-3.5">
            <div>
              <h2 className="text-base font-bold tracking-[-0.025em] text-[#F4F6F8]">
                Station de Conversion Prête
              </h2>
              <p className="mt-0.5 text-sm font-semibold text-[#A3ACBA]">
                Ajoutez vos fichiers ci-dessus ou sélectionnez un workflow à gauche.
              </p>
            </div>
            <span className="rounded border border-[#2A2F3A] bg-[#0B0C0E] px-2.5 py-1 font-mono text-xs font-semibold uppercase text-[#A3ACBA]">
              En veille
            </span>
          </div>

          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <li className="rounded border border-[#2A2F3A] bg-[#1B1E24] p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#FF5500] bg-[#FF5500] text-[#0B0C0E]">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs font-bold text-[#A3ACBA]">
                  01
                </span>
              </div>
              <p className="text-sm font-bold text-[#F4F6F8]">
                Déposer ou coller
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#A3ACBA]">
                Glissez vos médias, utilisez Ctrl+V ou importez une URL publique CORS.
              </p>
            </li>

            <li className="rounded border border-[#2A2F3A] bg-[#1B1E24] p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#2A2F3A] bg-[#131519] text-[#F4F6F8]">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs font-bold text-[#A3ACBA]">
                  02
                </span>
              </div>
              <p className="text-sm font-bold text-[#F4F6F8]">
                Choisir un format
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#A3ACBA]">
                Appliquez un workflow rapide ou ajustez CRF, résolution, débit et FPS.
              </p>
            </li>

            <li className="rounded border border-[#2A2F3A] bg-[#1B1E24] p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#10B981]/60 bg-[#0B0C0E] text-[#34D399]">
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs font-bold text-[#A3ACBA]">
                  03
                </span>
              </div>
              <p className="text-sm font-bold text-[#F4F6F8]">
                Convertir en local
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#A3ACBA]">
                Traitement 100% navigateur par Canvas et FFmpeg.wasm avec export ZIP.
              </p>
            </li>
          </ol>

          <div className="mt-4 flex items-center gap-2 font-mono text-xs font-semibold text-[#A3ACBA]">
            <ArrowRight className="h-4 w-4 shrink-0 text-[#FF5500]" aria-hidden="true" />
            <span>
              Astuce : cliquez sur un workflow rapide pour ouvrir un sélecteur filtré automatiquement.
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              onTargetFormatChange={onTargetFormatChange}
              onSettingsChange={onSettingsChange}
              onConvert={onConvertItem}
              onCancel={onCancelItem}
              onRemove={onRemoveItem}
            />
          ))}
        </div>
      )}
    </section>
  );
}
