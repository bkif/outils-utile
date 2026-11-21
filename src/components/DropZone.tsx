import { useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import type { AddFilesResult } from '../hooks/useConversionQueue';

interface DropZoneProps {
  onFilesAdded: (files: FileList | File[]) => AddFilesResult;
  onUrlAdded: (url: string) => Promise<void>;
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

export function DropZone({ onFilesAdded, onUrlAdded }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFeedbackError(null);
    const result = onFilesAdded(files);
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
      await onUrlAdded(trimmed);
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
    <section aria-label="Media ingestion" className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-lg border border-dashed transition-colors ${
          isDragging
            ? 'border-[#F59E0B] bg-[#F59E0B]/10'
            : 'border-[#262B36] bg-[#12151B] hover:border-[#3A4252]'
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

        <div className="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row sm:p-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${
                isDragging
                  ? 'border-[#F59E0B]/60 bg-[#F59E0B]/20 text-[#F59E0B]'
                  : 'border-[#262B36] bg-[#191D26] text-[#9CA3AF]'
              }`}
            >
              <Upload className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#F3F4F6]">
                {isDragging
                  ? 'Release files to stage in conversion rack'
                  : 'Drop video, audio, or image files here'}
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">
                MP4, WebM, MOV, MKV, AVI, GIF • MP3, WAV, OGG, AAC, FLAC • PNG, JPG, WebP, AVIF, ICO
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              id="browse-files-button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-[#0B0D10] transition-colors hover:bg-[#FBBF24] active:bg-[#D97706] sm:w-auto"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Select Files</span>
            </button>

            <button
              type="button"
              id="toggle-url-import-button"
              aria-expanded={urlOpen}
              onClick={() => setUrlOpen((prev) => !prev)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#262B36] bg-[#191D26] px-3 py-2 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#3A4252] hover:bg-[#202632] active:bg-[#151921] sm:w-auto"
            >
              <LinkIcon className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden="true" />
              <span>Direct URL</span>
              {urlOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {urlOpen && (
          <div className="border-t border-[#262B36] bg-[#0E1116] px-5 py-4 sm:px-6">
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
                className="w-full flex-1 rounded-md border border-[#262B36] bg-[#12151B] px-3 py-2 font-mono text-xs text-[#F3F4F6] placeholder-[#6B7280] transition-colors hover:border-[#3A4252] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                id="fetch-url-button"
                disabled={isFetchingUrl || !urlValue.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#262B36] bg-[#191D26] px-4 py-2 text-xs font-semibold text-[#F3F4F6] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#202632] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" aria-hidden="true" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <span>Import URL</span>
                )}
              </button>
            </form>
            <p className="mt-2 text-[11px] leading-relaxed text-[#9CA3AF]">
              Link directly to a public media file (<code className="font-mono text-[#F3F4F6]">.mp4</code>,{' '}
              <code className="font-mono text-[#F3F4F6]">.mp3</code>,{' '}
              <code className="font-mono text-[#F3F4F6]">.png</code>,{' '}
              <code className="font-mono text-[#F3F4F6]">.webp</code>). Standard browser CORS headers apply—streaming pages like YouTube or TikTok are unsupported client-side.
            </p>
          </div>
        )}
      </div>

      {feedbackError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" aria-hidden="true" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            aria-label="Dismiss import error"
            className="rounded p-0.5 text-[#FCA5A5] hover:bg-[#EF4444]/20"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
