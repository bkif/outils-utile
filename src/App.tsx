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
    <div className="studio-canvas min-h-screen text-[#f3f4f6]">
      <Header engineStatus={engineStatus} />

      <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        {/* Left Control Column */}
        <div className="space-y-5 lg:col-span-5">
          <DropZone
            activePresetId={activePresetId}
            onFilesAdded={addFiles}
            onUrlAdded={addUrl}
          />

          <PresetBar
            items={items}
            activePresetId={activePresetId}
            onSelectActivePreset={setActivePresetId}
            onApplyPreset={applyPreset}
            onFilesAddedWithPreset={(files, presetId) => addFiles(files, presetId)}
          />

          <FormatMatrix />
        </div>

        {/* Right Processing Rack */}
        <div className="mt-6 lg:col-span-7 lg:mt-0">
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
      </main>

      <footer className="mt-12 border-t border-white/10 pt-6 pb-8">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 text-xs text-[#9ca3af] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono">
            Local browser execution via WebAssembly &amp; Canvas · Recommended max ~200 MB per file
          </p>
          <p className="font-mono text-[#9ca3af]">
            FORGE v1.0 · Zero telemetry · Zero server uploads
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
