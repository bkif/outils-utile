import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { FormatMatrix } from './components/FormatMatrix';
import { Header } from './components/Header';
import { PresetBar } from './components/PresetBar';
import { QueueList } from './components/QueueList';
import { useConversionQueue } from './hooks/useConversionQueue';
import type { PresetId } from './types/media';

export function App() {
  const {
    items,
    engineStatus,
    isProcessing,
    addFiles,
    addUrl,
    updateTargetFormat,
    updateSettings,
    applyGlobalTargetFormat,
    applyPreset,
    convertAll,
    convertItem,
    cancelItem,
    removeItem,
    clearCompleted,
    clearAll,
  } = useConversionQueue();

  const [activePresetId, setActivePresetId] = useState<PresetId | null>(null);

  return (
    <div className="industrial-grid min-h-screen text-[#F4F6F8]">
      <Header engineStatus={engineStatus} items={items} />

      <main className="mx-auto max-w-[1360px] space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        {/* Adaptive Two-State DropZone: Bold 240px bay when empty, compact 58px bar when queued */}
        <DropZone
          queueCount={items.length}
          activePresetId={activePresetId}
          onFilesAdded={addFiles}
          onUrlAdded={addUrl}
        />

        {/* Workstation Grid: Queue sits first on mobile when active for instant above-the-fold controls */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start lg:gap-6">
          <div
            className={`${
              items.length > 0 ? 'order-1' : 'order-2'
            } lg:order-2 lg:col-span-8`}
          >
            <QueueList
              items={items}
              isProcessing={isProcessing}
              onTargetFormatChange={updateTargetFormat}
              onSettingsChange={updateSettings}
              onGlobalTargetChange={applyGlobalTargetFormat}
              onConvertAll={convertAll}
              onConvertItem={convertItem}
              onCancelItem={cancelItem}
              onRemoveItem={removeItem}
              onClearCompleted={clearCompleted}
              onClearAll={clearAll}
            />
          </div>

          <aside
            aria-label="Workflows et matrice des formats"
            className={`${
              items.length > 0 ? 'order-2' : 'order-1'
            } space-y-5 lg:order-1 lg:col-span-4`}
          >
            <PresetBar
              items={items}
              activePresetId={activePresetId}
              onSelectActivePreset={setActivePresetId}
              onApplyPreset={applyPreset}
              onFilesAddedWithPreset={(files, presetId) => addFiles(files, presetId)}
            />

            <FormatMatrix
              items={items}
              isProcessing={isProcessing}
              onSelectTargetFormat={applyGlobalTargetFormat}
            />
          </aside>
        </div>
      </main>

      <footer className="mt-10 border-t border-[#2A2F3A] bg-[#131519] py-5">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 font-mono text-xs font-semibold text-[#A3ACBA] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Exécution locale par WebAssembly &amp; Canvas API · Maximum recommandé ~200 Mo par fichier
          </p>
          <p className="text-[#F4F6F8]">
            Outils Utiles · Zéro télémétrie · Zéro upload
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
