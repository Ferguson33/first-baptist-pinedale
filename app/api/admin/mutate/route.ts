import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type AllowedTable =
  | 'events'
  | 'youth_albums'
  | 'youth_events'
  | 'youth_photos'
  | 'building_photos'
  | 'building_progress'
  | 'profiles'
  | 'sermons';

type Op = 'insert' | 'update' | 'delete';

const ALLOWED_OPS: Record<AllowedTable, Op[]> = {
  events: ['insert', 'update', 'delete'],
  youth_albums: ['insert', 'update', 'delete'],
  youth_events: ['insert', 'update', 'delete'],
  youth_photos: ['delete'],
  building_photos: ['delete'],
  building_progress: ['update'],
  profiles: ['update'],
  sermons: ['delete'],
};

const ALLOWED_STORAGE_BUCKETS = new Set(['youth-photos', 'building-photos']);

/** Only these fields may be written per table (defense in depth). */
const ALLOWED_FIELDS: Record<string, Set<string>> = {
  events: new Set(['title', 'date', 'time', 'description', 'location']),
  youth_albums: new Set(['title', 'date']),
  youth_events: new Set(['title', 'date', 'description', 'image_url', 'link_url']),
  building_progress: new Set([
    'physical_percent',
    'funds_raised',
    'funds_goal',
    'physical_note',
    'updated_at',
  ]),
  profiles: new Set(['role']),
};

function pickAllowedFields(
  table: string,
  data: Record<string, unknown> | undefined
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const allowed = ALLOWED_FIELDS[table];
  if (!allowed) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Generic admin mutate via service role.
 * Body: { table, op, id?, data?, select?, storage? }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const auth = await authorizeAdminUpload(authHeader);
    if (!auth.ok) {
      const status = auth.status === 401 || auth.status === 403 ? auth.status : auth.status;
      return NextResponse.json(
        {
          error: auth.error,
          retryable:
            status === 401 ||
            status === 403 ||
            /permission denied|session|expired/i.test(auth.error),
        },
        { status }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const table = body.table as AllowedTable;
    const op = body.op as Op;
    const id = body.id as string | number | undefined;
    const select = typeof body.select === 'string' ? body.select : undefined;
    const storage = body.storage as
      | { bucket?: string; paths?: string[] }
      | undefined;

    if (!table || !ALLOWED_OPS[table]) {
      return NextResponse.json({ error: 'Unknown or disallowed table.' }, { status: 400 });
    }
    if (!op || !ALLOWED_OPS[table].includes(op)) {
      return NextResponse.json(
        { error: `Operation "${op}" not allowed on ${table}.` },
        { status: 400 }
      );
    }

    const admin = auth.supabaseAdmin;

    // Optional storage cleanup (photo deletes)
    if (storage?.bucket && Array.isArray(storage.paths) && storage.paths.length > 0) {
      if (!ALLOWED_STORAGE_BUCKETS.has(storage.bucket)) {
        return NextResponse.json({ error: 'Invalid storage bucket.' }, { status: 400 });
      }
      const paths = storage.paths
        .map((p) => String(p || '').trim())
        .filter(Boolean)
        .slice(0, 20);
      if (paths.length) {
        const { error: storageError } = await admin.storage.from(storage.bucket).remove(paths);
        if (storageError) {
          console.warn('[admin/mutate] storage remove:', storageError.message);
          // Continue — DB row delete is more important than file cleanup
        }
      }
    }

    // —— DELETE ——
    if (op === 'delete') {
      if (id == null || id === '') {
        return NextResponse.json({ error: 'id is required for delete.' }, { status: 400 });
      }
      const { error } = await admin.from(table).delete().eq('id', id);
      if (error) {
        console.error('[admin/mutate] delete', table, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, deleted: true, id });
    }

    // —— INSERT ——
    if (op === 'insert') {
      const data = pickAllowedFields(table, body.data);
      if (!data || Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'No valid fields to insert.' }, { status: 400 });
      }
      if (table === 'events' || table === 'youth_events' || table === 'youth_albums') {
        if (!data.title || !String(data.title).trim()) {
          return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
        }
      }

      let query = admin.from(table).insert(data);
      if (select) {
        const { data: row, error } = await query.select(select).maybeSingle();
        if (error) {
          console.error('[admin/mutate] insert', table, error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, row });
      }
      const { error } = await query;
      if (error) {
        console.error('[admin/mutate] insert', table, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // —— UPDATE ——
    if (op === 'update') {
      let data = pickAllowedFields(table, body.data);
      if (!data || Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
      }

      // profiles: only allow approving members (role → approved)
      if (table === 'profiles') {
        if (data.role !== 'approved') {
          return NextResponse.json(
            { error: 'Only role=approved is allowed via this endpoint.' },
            { status: 400 }
          );
        }
        data = { role: 'approved' };
      }

      // building_progress is a singleton row id=1
      const matchId = table === 'building_progress' ? 1 : id;
      if (matchId == null || matchId === '') {
        return NextResponse.json({ error: 'id is required for update.' }, { status: 400 });
      }

      if (table === 'building_progress' && data.updated_at == null) {
        data.updated_at = new Date().toISOString();
      }

      let query = admin.from(table).update(data).eq('id', matchId);
      if (select) {
        const { data: row, error } = await query.select(select).maybeSingle();
        if (error) {
          console.error('[admin/mutate] update', table, error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!row && table === 'building_progress') {
          // Upsert singleton if missing
          const { data: upserted, error: upsertError } = await admin
            .from('building_progress')
            .upsert({ id: 1, ...data }, { onConflict: 'id' })
            .select(select)
            .maybeSingle();
          if (upsertError) {
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
          }
          return NextResponse.json({ success: true, row: upserted });
        }
        return NextResponse.json({ success: true, row });
      }

      const { error } = await query;
      if (error) {
        console.error('[admin/mutate] update', table, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported operation.' }, { status: 400 });
  } catch (err) {
    console.error('[admin/mutate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Mutate failed' },
      { status: 500 }
    );
  }
}
