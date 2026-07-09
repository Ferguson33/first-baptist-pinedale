import type { SupabaseClient } from '@supabase/supabase-js';

export type UploadProgress = {
  phase: 'preparing' | 'uploading' | 'saving' | 'done' | 'error';
  percent: number;
  message: string;
};

export type StorageUploadResult = {
  url: string;
  id?: string;
  path: string;
};

const DEFAULT_TIMEOUT_MS = 120_000;
const LARGE_FILE_TIMEOUT_MS = 600_000;

function uploadTimeoutMs(file: File): number {
  const isLargeOrVideo = file.size > 20 * 1024 * 1024 || file.type.startsWith('video/');
  return isLargeOrVideo ? LARGE_FILE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a validated access token, refreshing the session if needed.
 * Fixes first-attempt failures when getSession() returns a stale/null token
 * (common on cold loads, PWA resumes, and long-lived admin tabs).
 */
export async function ensureAccessToken(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Your session expired. Please sign in again.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Refresh when missing, or when the access token expires within 60s.
  const expiresAtMs = (session?.expires_at ?? 0) * 1000;
  const needsRefresh =
    !session?.access_token || expiresAtMs < Date.now() + 60_000;

  if (!needsRefresh && session?.access_token) {
    return session.access_token;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session?.access_token) {
    // If refresh failed but we still have a non-expired token, use it.
    if (session?.access_token && expiresAtMs > Date.now()) {
      return session.access_token;
    }
    throw new Error('Could not refresh your session. Please sign in again.');
  }

  return refreshed.session.access_token;
}

/** True when a Supabase/PostgREST error looks like auth or RLS rejection. */
export function isAuthOrRlsError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();
  return (
    code === 'pgrst301' ||
    code === '42501' || // insufficient_privilege
    msg.includes('jwt') ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('not authorized') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('403')
  );
}

/**
 * Run a Supabase write after ensuring a fresh session.
 * On auth/RLS failure, force-refresh once and retry (fixes first-click admin saves).
 */
export async function withAdminSessionRetry<T extends { error: { message?: string; code?: string } | null }>(
  supabase: SupabaseClient,
  operation: () => PromiseLike<T>
): Promise<T> {
  await ensureAccessToken(supabase);

  let result = await operation();

  if (result.error && isAuthOrRlsError(result.error)) {
    await supabase.auth.refreshSession();
    await ensureAccessToken(supabase);
    result = await operation();
  }

  return result;
}

export async function withUploadRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; supabase?: SupabaseClient } = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0 && options.supabase) {
        await ensureAccessToken(options.supabase);
        await delay(400 * attempt);
      }
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Upload failed');
}

type ApiUploadOptions = {
  bucket: 'youth-photos' | 'building-photos';
  albumId?: string | null;
  caption?: string | null;
  target?: 'album' | 'event' | 'building';
  onProgress?: (progress: UploadProgress) => void;
};

export function postFormDataWithProgress(
  url: string,
  formData: FormData,
  token: string,
  options: { timeoutMs?: number; onProgress?: (percent: number) => void } = {}
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = window.setTimeout(() => {
      xhr.abort();
      reject(new Error('Upload timed out. Please check your connection and try again.'));
    }, timeoutMs);

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !options.onProgress) return;
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
      options.onProgress(percent);
    });

    xhr.addEventListener('load', () => {
      window.clearTimeout(timer);

      let data: Record<string, unknown> = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = { error: xhr.responseText || 'Invalid server response' };
      }

      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      });
    });

    xhr.addEventListener('error', () => {
      window.clearTimeout(timer);
      reject(new Error('Network error during upload. Please try again.'));
    });

    xhr.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new Error('Upload cancelled or timed out.'));
    });

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export async function uploadFileViaApi(
  supabase: SupabaseClient,
  file: File,
  options: ApiUploadOptions
): Promise<StorageUploadResult> {
  const report = (progress: UploadProgress) => options.onProgress?.(progress);

  report({ phase: 'preparing', percent: 0, message: 'Preparing upload…' });

  return withUploadRetry(
    async () => {
      const token = await ensureAccessToken(supabase);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', options.bucket);
      if (options.albumId) formData.append('album_id', options.albumId);
      if (options.caption) formData.append('caption', options.caption);
      if (options.target) formData.append('target', options.target);

      report({ phase: 'uploading', percent: 5, message: `Uploading ${file.name}…` });

      const response = await postFormDataWithProgress('/api/admin/storage/upload', formData, token, {
        timeoutMs: uploadTimeoutMs(file),
        onProgress: (percent) => {
          report({
            phase: 'uploading',
            percent,
            message: `Uploading ${file.name}… ${percent}%`,
          });
        },
      });

      if (!response.ok || !response.data.success) {
        const message =
          (typeof response.data.error === 'string' && response.data.error) ||
          `Upload failed (${response.status})`;
        throw new Error(message);
      }

      report({ phase: 'done', percent: 100, message: 'Upload complete' });

      return {
        url: String(response.data.url),
        id: response.data.id ? String(response.data.id) : undefined,
        path: String(response.data.path || ''),
      };
    },
    { supabase, retries: 2 }
  );
}