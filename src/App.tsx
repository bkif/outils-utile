import { DropZone } from './components/DropZone';
import { Header } from './components/Header';
import { PresetBar } from './components/PresetBar';
import { QueueList } from './components/QueueList';
import { useConversionQueue } from './hooks/useConversionQueue';

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
  } = useConversionQueue();

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0D10] text-[#F3F4F6]">
      <Header engineStatus={engineStatus} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <DropZone onFilesAdded={addFiles} onUrlAdded={addUrl} />

        <PresetBar items={items} onApplyPreset={applyPreset} />

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
        />
      </main>

      <footer className="border-t border-[#262B36] bg-[#0B0D10]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4 text-[11px] text-[#9CA3AF] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono">
            VIDEO: MP4/WebM/MOV/MKV/AVI/GIF • AUDIO: MP3/WAV/OGG/AAC/FLAC • IMAGE: PNG/JPG/WebP/AVIF/ICO
          </p>
          <p className="font-mono text-[#6B7280]">
            Runs in browser RAM via Canvas &amp; FFmpeg.wasm (~200 MB recommended max per file)
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
