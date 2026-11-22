import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import type { AddFilesResult } from '../hooks/useConversionQueue';
import type { PresetId } from '../types/media';

interface DropZoneProps {
  queueCount: number;
  activePresetId: PresetId | null;
  onFilesAdded: (files: FileList | File[], presetOverride?: PresetId) => AddFilesResult;
  onUrlAdded: (url: string, presetOverride?: PresetId) => Promise<void>;
}

const ACCEPTED_FILE_TYPES = [
  'video/*',
  'audio/*',
  'image/*',
  '.mkv',
  '.avi',
  '.mov',
  '.flv',
  '.wmv',
  '.m4v',
  '.flac',
  '.ogg',
  '.opus',
  '.aac',
  '.m4a',
  '.avif',
  '.webp',
  '.ico',
  '.svg',
].join(',');

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

export function DropZone({
  queueCount,
  activePresetId,
  onFilesAdded,
  onUrlAdded,
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const activePresetRef = useRef<PresetId | null>(activePresetId);
  activePresetRef.current = activePresetId;

  const isCompact = queueCount > 0;

  const handleFileSelection = (
    files: FileList | File[] | null,
    sourceLabel?: string,
  ) => {
    if (!files || files.length === 0) return;
    setFeedbackError(null);
    const result = onFilesAdded(files, activePresetRef.current ?? undefined);
    if (result.addedCount > 0 && sourceLabel) {
      setPasteNotice(
        `${result.addedCount} ${result.addedCount === 1 ? 'fichier ajouté' : 'fichiers ajoutés'} depuis ${sourceLabel}.`,
      );
    }
    if (result.rejectedNames.length > 0) {
      const preview = result.rejectedNames.slice(0, 3).join(', ');
      const suffix =
        result.rejectedNames.length > 3
          ? ` (+${result.rejectedNames.length - 3} autres)`
          : '';
      setFeedbackError(
        `Format non pris en charge ignoré : ${preview}${suffix}. Formats acceptés : Images, Vidéo et Audio.`,
      );
    }
  };

  useEffect(() => {
    if (!pasteNotice) return;
    const timer = window.setTimeout(() => setPasteNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [pasteNotice]);

  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (isEditableElement(e.target) || isEditableElement(document.activeElement)) {
        return;
      }

      const clipboardFiles = e.clipboardData?.files;
      if (clipboardFiles && clipboardFiles.length > 0) {
        e.preventDefault();
        handleFileSelection(clipboardFiles, 'le presse-papiers');
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain')?.trim() ?? '';
      if (/^https?:\/\/\S+/i.test(pastedText)) {
        e.preventDefault();
        setFeedbackError(null);
        setIsFetchingUrl(true);
        void onUrlAdded(pastedText, activePresetRef.current ?? undefined)
          .then(() => {
            setPasteNotice('Média importé depuis l’URL collée.');
          })
          .catch((err) => {
            setFeedbackError(
              err instanceof Error
                ? err.message
                : 'Impossible d’importer l’URL collée.',
            );
          })
          .finally(() => {
            setIsFetchingUrl(false);
          });
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [onUrlAdded, onFilesAdded]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleUrlSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = urlValue.trim();
    if (!trimmed || isFetchingUrl) return;

    setFeedbackError(null);
    setIsFetchingUrl(true);
    try {
      await onUrlAdded(trimmed, activePresetId ?? undefined);
      setUrlValue('');
      setUrlOpen(false);
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : 'Impossible d’importer le média via cette URL.',
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <section aria-label="Zone d’importation de fichiers" className="space-y-2.5">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded border transition-colors ${
          isDragging
            ? 'border-2 border-dashed border-[#FF5500] bg-[#FF5500]/12'
            : isCompact
              ? 'border-[#2A2F3A] bg-[#131519] hover:border-[#3E4554]'
              : 'border-2 border-dashed border-[#2A2F3A] bg-[#131519] hover:border-[#4B5568]'
        }`}
      >
        <input
          ref={fileInputRef}
          id="media-file-input"
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={(e) => {
            handleFileSelection(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
        />

        {isCompact ? (
          /* Compact Bar State (queue.length > 0) */
          <div className="flex min-h-[58px] flex-col gap-2.5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${
                  isDragging
                    ? 'border-[#FF5500] bg-[#FF5500] text-[#0B0C0E]'
                    : 'border-[#2A2F3A] bg-[#1B1E24] text-[#F4F6F8]'
                }`}
              >
                {isFetchingUrl ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#FF5500]" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F4F6F8]">
                  {isDragging
                    ? 'Relâchez pour ajouter à la file'
                    : 'Glisser d’autres fichiers ou coller (Ctrl+V)'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="browse-files-button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded border border-[#FF5500] bg-[#FF5500] px-4 py-2 text-sm font-semibold text-[#0B0C0E] transition-colors hover:bg-[#FF6B1A] active:bg-[#E04B00] sm:flex-initial"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                <span>Ajouter</span>
              </button>

              <button
                type="button"
                id="toggle-url-import-button"
                aria-expanded={urlOpen}
                aria-controls="direct-url-drawer"
                onClick={() => setUrlOpen((prev) => !prev)}
                className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded border border-[#2A2F3A] bg-[#1B1E24] px-3.5 py-2 text-sm font-semibold text-[#F4F6F8] transition-colors hover:border-[#4B5568] hover:bg-[#232730] sm:flex-initial"
              >
                <LinkIcon className="h-4 w-4 text-[#A3ACBA]" aria-hidden="true" />
                <span>URL</span>
                {urlOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#A3ACBA]" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#A3ACBA]" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Bold Tactile Empty State (queue.length === 0) */
          <div className="relative flex min-h-[240px] flex-col items-center justify-center gap-4 px-5 py-8 text-center">
            {/* Architectural Corner Brackets */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2 ${
                isDragging ? 'border-[#FF5500]' : 'border-[#4B5568]'
              }`}
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2 ${
                isDragging ? 'border-[#FF5500]' : 'border-[#4B5568]'
              }`}
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 ${
                isDragging ? 'border-[#FF5500]' : 'border-[#4B5568]'
              }`}
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute right-3 bottom-3 h-4 w-4 border-r-2 border-b-2 ${
                isDragging ? 'border-[#FF5500]' : 'border-[#4B5568]'
              }`}
            />

            <div
              className={`flex h-12 w-12 items-center justify-center rounded border transition-colors ${
                isDragging
                  ? 'border-[#FF5500] bg-[#FF5500] text-[#0B0C0E]'
                  : 'border-[#2A2F3A] bg-[#1B1E24] text-[#FF5500]'
              }`}
            >
              {isFetchingUrl ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-6 w-6" aria-hidden="true" />
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-base font-bold tracking-tight text-[#F4F6F8] sm:text-lg">
                {isDragging
                  ? 'Relâchez vos fichiers pour les préparer'
                  : 'Glissez vos fichiers ici ou cliquez pour parcourir'}
              </p>
              <p className="text-sm font-semibold text-[#A3ACBA]">
                Images · Vidéo · Audio — ou collez un fichier / URL via{' '}
                <kbd className="rounded border border-[#2A2F3A] bg-[#0B0C0E] px-2 py-0.5 font-mono text-xs font-semibold text-[#F4F6F8]">
                  Ctrl+V
                </kbd>
              </p>
            </div>

            <div className="flex w-full flex-col items-stretch justify-center gap-2.5 pt-1 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                id="browse-files-button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-[#FF5500] bg-[#FF5500] px-5 py-2.5 text-sm font-bold text-[#0B0C0E] transition-colors hover:bg-[#FF6B1A] active:bg-[#E04B00]"
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                <span>Parcourir les fichiers</span>
              </button>

              <button
                type="button"
                id="toggle-url-import-button"
                aria-expanded={urlOpen}
                aria-controls="direct-url-drawer"
                onClick={() => setUrlOpen((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-[#2A2F3A] bg-[#1B1E24] px-4 py-2.5 text-sm font-semibold text-[#F4F6F8] transition-colors hover:border-[#4B5568] hover:bg-[#232730]"
              >
                <LinkIcon className="h-4 w-4 text-[#A3ACBA]" aria-hidden="true" />
                <span>Importer une URL</span>
                {urlOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#A3ACBA]" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#A3ACBA]" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Separated Direct URL Drawer */}
        {urlOpen && (
          <div
            id="direct-url-drawer"
            className="border-t border-[#2A2F3A] bg-[#0B0C0E] px-4 py-3.5"
          >
            <form
              onSubmit={handleUrlSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <label htmlFor="direct-media-url-input" className="sr-only">
                URL directe d’un fichier média public
              </label>
              <input
                id="direct-media-url-input"
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://exemple.com/clip-video.mp4"
                required
                disabled={isFetchingUrl}
                className="min-h-[40px] w-full flex-1 rounded border border-[#2A2F3A] bg-[#131519] px-3 py-2 font-mono text-sm font-medium text-[#F4F6F8] placeholder-[#A3ACBA] transition-colors hover:border-[#4B5568] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                id="fetch-url-button"
                disabled={isFetchingUrl || !urlValue.trim()}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded border border-[#2A2F3A] bg-[#1B1E24] px-4 py-2 text-sm font-semibold text-[#F4F6F8] transition-colors hover:border-[#FF5500] hover:text-[#FF5500] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#FF5500]" aria-hidden="true" />
                    <span>Importation...</span>
                  </>
                ) : (
                  <span>Importer l’URL</span>
                )}
              </button>
            </form>
            <p className="mt-2 text-xs leading-relaxed text-[#A3ACBA]">
              Liens directs vers un fichier média public uniquement (<code className="font-mono text-[#F4F6F8]">.mp4</code>,{' '}
              <code className="font-mono text-[#F4F6F8]">.mp3</code>,{' '}
              <code className="font-mono text-[#F4F6F8]">.png</code>,{' '}
              <code className="font-mono text-[#F4F6F8]">.webp</code>). La politique CORS du serveur s’applique ; les plateformes de streaming (YouTube, etc.) ne sont pas prises en charge côté client.
            </p>
          </div>
        )}
      </div>

      {pasteNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded border border-[#10B981]/50 bg-[#131519] px-3.5 py-2.5 text-sm font-semibold text-[#34D399]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{pasteNotice}</span>
        </div>
      )}

      {feedbackError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded border border-[#EF4444]/60 bg-[#131519] px-3.5 py-2.5 text-sm font-semibold text-[#FCA5A5]"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            aria-label="Fermer le message d’erreur"
            className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded text-[#FCA5A5] hover:bg-[#EF4444]/20"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
