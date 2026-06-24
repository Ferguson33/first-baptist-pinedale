"use client";

import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { UploadProgress } from '@/lib/storage-upload';

type UploadProgressBannerProps = {
  progress: UploadProgress | null;
  fileName?: string;
  onRetry?: () => void;
};

export function UploadProgressBanner({ progress, fileName, onRetry }: UploadProgressBannerProps) {
  if (!progress) return null;

  const isError = progress.phase === 'error';
  const isDone = progress.phase === 'done';

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : isDone
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-[var(--color-gold)]/30 bg-[var(--color-cream)] text-[var(--color-navy)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {isError ? (
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : isDone ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium">{progress.message}</p>
          {fileName && <p className="text-xs opacity-70 truncate mt-0.5">{fileName}</p>}

          {!isError && !isDone && progress.phase === 'uploading' && (
            <div className="mt-2 h-1.5 bg-white/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-gold)] transition-all duration-300"
                style={{ width: `${Math.max(progress.percent, 8)}%` }}
              />
            </div>
          )}

          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}