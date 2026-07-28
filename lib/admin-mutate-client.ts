import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureAccessToken } from '@/lib/storage-upload';

export type AdminMutateRequest = {
  table:
    | 'events'
    | 'youth_albums'
    | 'youth_events'
    | 'youth_photos'
    | 'building_photos'
    | 'building_progress'
    | 'profiles'
    | 'sermons';
  op: 'insert' | 'update' | 'delete';
  /** Primary key match (uuid or number). */
  id?: string | number;
  data?: Record<string, unknown>;
  /** Columns to return after insert/update. */
  select?: string;
  /** Optional storage cleanup before a row delete. */
  storage?: { bucket: 'youth-photos' | 'building-photos'; paths: string[] };
};

export type AdminMutateResult<T = unknown> = {
  ok: true;
  data: T | null;
};

function isRetryable(status: number, message: string): boolean {
  if (status === 401 || status === 403 || status === 408 || status === 429) return true;
  if (status >= 500) return true;
  return /permission denied|unauthorized|session|expired|jwt|timeout|42501|row-level security/i.test(
    message || ''
  );
}

async function getToken(supabase: SupabaseClient, forceRefresh: boolean): Promise<string> {
  try {
    return await ensureAccessToken(supabase, { forceRefresh });
  } catch (err) {
    if (!forceRefresh) {
      return ensureAccessToken(supabase, { forceRefresh: true });
    }
    throw err;
  }
}

/**
 * Admin DB write via service-role API (avoids client RLS/session hangs).
 * Fresh JWT + one silent retry + 18s abort per attempt.
 */
export async function adminMutate<T = unknown>(
  supabase: SupabaseClient,
  body: AdminMutateRequest
): Promise<AdminMutateResult<T>> {
  const postOnce = async (token: string, signal: AbortSignal) => {
    const res = await fetch('/api/admin/mutate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let token = await getToken(supabase, true);
  let controller = new AbortController();
  let timer = window.setTimeout(() => controller.abort(), 18_000);

  try {
    let { res, data } = await postOnce(token, controller.signal);
    window.clearTimeout(timer);

    if (!res.ok) {
      const errMsg = String(data.error || `Request failed (${res.status})`);
      if (isRetryable(res.status, errMsg) || data.retryable) {
        console.warn('[adminMutate] first attempt failed, retrying:', res.status, errMsg);
        token = await getToken(supabase, true);
        controller = new AbortController();
        timer = window.setTimeout(() => controller.abort(), 18_000);
        ({ res, data } = await postOnce(token, controller.signal));
        window.clearTimeout(timer);
      }
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    return { ok: true, data: (data.row ?? data.data ?? null) as T | null };
  } catch (err) {
    window.clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Save timed out. Sign out, sign back in, and try once more.');
    }
    throw err;
  }
}

/**
 * Admin POST to a dedicated API path with the same token/retry/timeout pattern.
 * Used by sermons + sermon-settings (and any future dedicated routes).
 */
export async function adminApiPost<T = unknown>(
  supabase: SupabaseClient,
  path: string,
  body: unknown
): Promise<T> {
  const postOnce = async (token: string, signal: AbortSignal) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let token = await getToken(supabase, true);
  let controller = new AbortController();
  let timer = window.setTimeout(() => controller.abort(), 18_000);

  try {
    let { res, data } = await postOnce(token, controller.signal);
    window.clearTimeout(timer);

    if (!res.ok) {
      const errMsg = String(data.error || `Request failed (${res.status})`);
      if (isRetryable(res.status, errMsg) || data.retryable) {
        console.warn('[adminApiPost] first attempt failed, retrying:', path, res.status, errMsg);
        token = await getToken(supabase, true);
        controller = new AbortController();
        timer = window.setTimeout(() => controller.abort(), 18_000);
        ({ res, data } = await postOnce(token, controller.signal));
        window.clearTimeout(timer);
      }
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    return data as T;
  } catch (err) {
    window.clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Save timed out. Sign out, sign back in, and try once more.');
    }
    throw err;
  }
}
