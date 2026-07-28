import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';
import { extractYouTubeVideoId } from '@/lib/youtube';

export const runtime = 'nodejs';
export const maxDuration = 30;

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function asDateOrNull(value: unknown): string | null {
  const s = asNullableString(value);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function asYouTubeIdOrNull(value: unknown, strict = true): string | null {
  const raw = asNullableString(value);
  if (!raw) return null;
  const id = extractYouTubeVideoId(raw);
  if (id) return id;
  // Live stream historically accepted bare IDs; keep that for live_video_id only.
  if (!strict && /^[a-zA-Z0-9_-]{6,20}$/.test(raw)) return raw;
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * Admin update of sermon_settings (homepage teaser, docs, live stream, videos).
 * Uses service role after admin JWT check — avoids client RLS/session hangs.
 * POST body: flat fields matching sermon_settings columns (id is always 1).
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

    const liveVideoId = asYouTubeIdOrNull(body.live_video_id, false);
    const welcomeId = asYouTubeIdOrNull(body.welcome_video_id, true);
    const yorkId = asYouTubeIdOrNull(body.pastor_york_video_id, true);
    const holmesId = asYouTubeIdOrNull(body.pastor_holmes_video_id, true);
    const youthActivityId = asYouTubeIdOrNull(body.youth_activity_video_id, true);

    const liveActive = asBoolean(body.live_stream_active) && !!liveVideoId;
    const livePublic = asBoolean(body.live_stream_public) && !!liveVideoId;

    // Full payload (preferred). Optional columns stripped on schema errors below.
    const updatePayload: Record<string, unknown> = {
      pastor_note: asNullableString(body.pastor_note),
      upcoming_title: asNullableString(body.upcoming_title),
      upcoming_reference: asNullableString(body.upcoming_reference),
      upcoming_date: asDateOrNull(body.upcoming_date),
      sunday_school_lesson: asNullableString(body.sunday_school_lesson),
      sunday_school_reference: asNullableString(body.sunday_school_reference),
      youth_sunday_school_lesson: asNullableString(body.youth_sunday_school_lesson),
      youth_sunday_school_reference: asNullableString(body.youth_sunday_school_reference),
      youth_sunday_school_date: asDateOrNull(body.youth_sunday_school_date),
      youth_pastor_note: asNullableString(body.youth_pastor_note),
      youth_google_doc_url: asNullableString(body.youth_google_doc_url),
      youth_activity_video_id: youthActivityId,
      events_google_doc_url: asNullableString(body.events_google_doc_url),
      prayer_bulletin_google_doc_url: asNullableString(body.prayer_bulletin_google_doc_url),
      nursery_schedule_google_doc_url: asNullableString(body.nursery_schedule_google_doc_url),
      live_video_id: liveVideoId,
      live_stream_active: liveActive,
      live_stream_public: livePublic,
      welcome_video_id: welcomeId,
      pastor_york_video_id: yorkId,
      pastor_holmes_video_id: holmesId,
      updated_at: new Date().toISOString(),
    };

    const admin = auth.supabaseAdmin;
    const selectCols =
      'id, pastor_note, upcoming_title, upcoming_reference, upcoming_date, sunday_school_lesson, sunday_school_reference, live_video_id, live_stream_active, live_stream_public, welcome_video_id, pastor_york_video_id, pastor_holmes_video_id, youth_activity_video_id';

    let { data, error } = await admin
      .from('sermon_settings')
      .update(updatePayload)
      .eq('id', 1)
      .select(selectCols)
      .maybeSingle();

    // Retry without optional columns if schema is behind
    if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
      const optionalKeys = [
        'youth_activity_video_id',
        'live_stream_public',
        'welcome_video_id',
        'pastor_york_video_id',
        'pastor_holmes_video_id',
        'nursery_schedule_google_doc_url',
        'prayer_bulletin_google_doc_url',
        'events_google_doc_url',
        'youth_google_doc_url',
      ];
      const stripped = { ...updatePayload };
      for (const key of optionalKeys) {
        if (new RegExp(key, 'i').test(error.message || '')) {
          delete stripped[key];
        }
      }
      // If message is generic, strip the newest optional field first
      if (Object.keys(stripped).length === Object.keys(updatePayload).length) {
        delete stripped.youth_activity_video_id;
      }

      ({ data, error } = await admin
        .from('sermon_settings')
        .update(stripped)
        .eq('id', 1)
        .select('id, pastor_note, upcoming_title, upcoming_reference, upcoming_date')
        .maybeSingle());
    }

    if (error) {
      console.error('[admin/sermon-settings] update', error);
      const msg = error.message || 'Update failed';
      if (/permission denied|42501/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'Permission denied for sermon_settings. In Supabase → SQL Editor, run supabase/fix-sermon-settings-grants.sql, then try again.',
          },
          { status: 500 }
        );
      }
      if (/youth_activity_video_id/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Couldn't save — run the youth video SQL (supabase/add-youth-activity-video.sql) in Supabase, then try again.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    if (!data) {
      // Ensure the singleton row exists, then retry once
      const { error: upsertError } = await admin
        .from('sermon_settings')
        .upsert({ id: 1, ...updatePayload }, { onConflict: 'id' });

      if (upsertError) {
        console.error('[admin/sermon-settings] upsert', upsertError);
        return NextResponse.json(
          {
            error:
              upsertError.message ||
              "Save didn't apply (no settings row). Run sermon_settings SQL, then try again.",
          },
          { status: 500 }
        );
      }

      const { data: afterUpsert, error: afterError } = await admin
        .from('sermon_settings')
        .select(selectCols)
        .eq('id', 1)
        .maybeSingle();

      if (afterError || !afterUpsert) {
        return NextResponse.json(
          { error: afterError?.message || 'Settings row still missing after upsert.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, settings: afterUpsert });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (err) {
    console.error('[admin/sermon-settings]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Settings save failed' },
      { status: 500 }
    );
  }
}
