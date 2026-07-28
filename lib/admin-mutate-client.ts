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

/**
 * Get a token without forcing refresh by default.
 * Force refresh only on retry after 401/403.
 */
async function getToken(supabase: SupabaseClient, forceRefresh: boolean): Promise<string> {
  return ensureAccessToken(supabase, { forceRefresh });
}

async function postWithAuth(
  supabase: SupabaseClient,
  path: string,
  body: unknown
): Promise<{ res: Response; data: Record<string, unknown> }> {
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
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, data };
  };

  // Attempt 1: use existing session token (no force-refresh — that was hanging saves)
  let token = await getToken(supabase, false);
  let controller = new AbortController();
  let timer = window.setTimeout(() => controller.abort(), 20_000);

  try {
    let { res, data } = await postOnce(token, controller.signal);
    window.clearTimeout(timer);

    // Only force-refresh + retry on auth failures
    if (!res.ok) {
      const errMsg = String(data.error || `Request failed (${res.status})`);
      const authFail = res.status === 401 || res.status === 403;
      if (authFail || isRetryable(res.status, errMsg) || data.retryable) {
        console.warn('[adminApi] first attempt failed, retrying:', path, res.status, errMsg);
        token = await getToken(supabase, authFail /* force refresh only on auth */);
        controller = new AbortController();
        timer = window.setTimeout(() => controller.abort(), 20_000);
        ({ res, data } = await postOnce(token, controller.signal));
        window.clearTimeout(timer);
      }
    }

    if (!res.ok) {
      throw new Error(String(data.error || `Request failed (${res.status})`));
    }

    return { res, data };
  } catch (err) {
    window.clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Save timed out contacting the server. Check your connection, refresh the page, and try again.'
      );
    }
    throw err;
  }
}

/**
 * Admin DB write via service-role API (avoids client RLS/session hangs).
 */
export async function adminMutate<T = unknown>(
  supabase: SupabaseClient,
  body: AdminMutateRequest
): Promise<AdminMutateResult<T>> {
  const { data } = await postWithAuth(supabase, '/api/admin/mutate', body);
  return { ok: true, data: (data.row ?? data.data ?? null) as T | null };
}

/**
 * Admin POST to a dedicated API path (sermons, sermon-settings, members, etc.).
 */
export async function adminApiPost<T = unknown>(
  supabase: SupabaseClient,
  path: string,
  body: unknown
): Promise<T> {
  const { data } = await postWithAuth(supabase, path, body);
  return data as T;
}
