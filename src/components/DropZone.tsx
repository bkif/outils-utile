import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import type { AddFilesResult } from '../hooks/useConversionQueue';
import type { PresetId } from '../types/media';

interface DropZoneProps {
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

  const handleFileSelection = (files: FileList | File[] | null, sourceLabel?: string) => {
    if (!files || files.length === 0) return;
    setFeedbackError(null);
    const result = onFilesAdded(files, activePresetRef.current ?? undefined);
    if (result.addedCount > 0 && sourceLabel) {
      setPasteNotice(
        `Staged ${result.addedCount} ${result.addedCount === 1 ? 'file' : 'files'} from ${sourceLabel}.`,
      );
    }
    if (result.rejectedNames.length > 0) {
      const preview = result.rejectedNames.slice(0, 3).join(', ');
      const suffix =
        result.rejectedNames.length > 3
          ? ` (+${result.rejectedNames.length - 3} more)`
          : '';
      setFeedbackError(
        `Unsupported file format skipped: ${preview}${suffix}. Supported: video, audio, and image files.`,
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
        handleFileSelection(clipboardFiles, 'clipboard');
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain')?.trim() ?? '';
      if (/^https?:\/\/\S+/i.test(pastedText)) {
        e.preventDefault();
        setFeedbackError(null);
        setIsFetchingUrl(true);
        void onUrlAdded(pastedText, activePresetRef.current ?? undefined)
          .then(() => {
            setPasteNotice('Imported direct media URL from clipboard.');
          })
          .catch((err) => {
            setFeedbackError(
              err instanceof Error ? err.message : 'Unable to import pasted URL.',
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
        err instanceof Error ? err.message : 'Unable to import media from URL.',
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <section aria-label="Media intake bay" className="space-y-2.5">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[168px] flex-col justify-between rounded-lg border border-dashed transition-all ${
          isDragging
            ? 'border-[#f59e0b] bg-[#f59e0b]/10 shadow-[0_0_24px_-6px_rgba(245,158,11,0.45),0_0_16px_-6px_rgba(56,189,248,0.3)]'
            : 'border-white/15 bg-[#121418] hover:border-white/25'
        }`}
      >
        {/* Corner brackets on dragover */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 transition-transform duration-150 ${
            isDragging ? 'scale-100 border-[#f59e0b]' : 'scale-75 border-white/15'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 transition-transform duration-150 ${
            isDragging ? 'scale-100 border-[#38bdf8]' : 'scale-75 border-white/15'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 transition-transform duration-150 ${
            isDragging ? 'scale-100 border-[#38bdf8]' : 'scale-75 border-white/15'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-2 bottom-2 h-3 w-3 border-r-2 border-b-2 transition-transform duration-150 ${
            isDragging ? 'scale-100 border-[#f59e0b]' : 'scale-75 border-white/15'
          }`}
        />

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

        {/* Primary Local Drop & Select Area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-5 py-6 text-center">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              isDragging
                ? 'border-[#f59e0b]/60 bg-[#f59e0b]/20 text-[#fbbf24]'
                : 'border-white/12 bg-[#181b20] text-[#d1d5db]'
            }`}
          >
            {isFetchingUrl ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#38bdf8]" aria-hidden="true" />
            ) : (
              <Upload className="h-5 w-5" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-[#f3f4f6]">
              {isDragging
                ? 'Release files to stage in processing rack'
                : 'Drop video, audio, or image files here'}
            </p>
            <p className="text-xs text-[#9ca3af]">
              or paste file / URL with{' '}
              <kbd className="rounded border border-white/15 bg-[#181b20] px-1.5 py-0.5 font-mono text-[10px] text-[#e5e7eb]">
                Ctrl+V
              </kbd>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              id="browse-files-button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#f59e0b]/60 bg-[#f59e0b] px-4 py-2 text-xs font-semibold text-[#0b0c0e] transition-colors hover:bg-[#fbbf24] active:bg-[#d97706] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Select Files</span>
            </button>

            <button
              type="button"
              id="toggle-url-import-button"
              aria-expanded={urlOpen}
              aria-controls="direct-url-drawer"
              onClick={() => setUrlOpen((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/14 bg-[#181b20] px-3 py-2 text-xs font-medium text-[#e5e7eb] transition-colors hover:border-white/25 hover:bg-[#1f232a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]"
            >
              <LinkIcon className="h-3.5 w-3.5 text-[#9ca3af]" aria-hidden="true" />
              <span>Direct URL</span>
              {urlOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#9ca3af]" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#9ca3af]" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Separated Direct URL Intake Drawer */}
        {urlOpen && (
          <div
            id="direct-url-drawer"
            className="border-t border-white/10 bg-[#0e1014] px-4 py-3.5"
          >
            <form
              onSubmit={handleUrlSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <label htmlFor="direct-media-url-input" className="sr-only">
                Direct public media file URL
              </label>
              <input
                id="direct-media-url-input"
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com/sample-clip.mp4"
                required
                disabled={isFetchingUrl}
                className="w-full flex-1 rounded-md border border-white/14 bg-[#121418] px-3 py-2 font-mono text-xs text-[#f3f4f6] placeholder-[#9ca3af]/70 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                id="fetch-url-button"
                disabled={isFetchingUrl || !urlValue.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-white/14 bg-[#181b20] px-3.5 py-2 text-xs font-semibold text-[#f3f4f6] transition-colors hover:border-[#f59e0b]/60 hover:text-[#fbbf24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#38bdf8]" aria-hidden="true" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <span>Import URL</span>
                )}
              </button>
            </form>
            <p className="mt-2 text-[11px] leading-relaxed text-[#9ca3af]">
              Direct public media file links only (<code className="font-mono text-[#e5e7eb]">.mp4</code>,{' '}
              <code className="font-mono text-[#e5e7eb]">.mp3</code>,{' '}
              <code className="font-mono text-[#e5e7eb]">.png</code>,{' '}
              <code className="font-mono text-[#e5e7eb]">.webp</code>). Browser CORS applies; streaming pages like YouTube are unsupported client-side.
            </p>
          </div>
        )}
      </div>

      {pasteNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-md border border-[#10b981]/35 bg-[#10b981]/10 px-3 py-2 text-xs text-[#34d399]"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{pasteNotice}</span>
        </div>
      )}

      {feedbackError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-3.5 py-2.5 text-xs text-[#fca5a5]"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ef4444]" aria-hidden="true" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            aria-label="Dismiss import error"
            className="rounded p-0.5 text-[#fca5a5] hover:bg-[#ef4444]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
