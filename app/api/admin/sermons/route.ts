import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/youtube';
import { normalizeEmbedMode } from '@/lib/sermon-display';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Admin create/update sermon via service role (bypasses client RLS hangs).
 * POST body: { id?: string, title, preacher, date, video_url, description?, is_public?, embed_mode? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdminUpload(request.headers.get('authorization'));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const title = String(body.title || '').trim();
    const preacher = String(body.preacher || 'Pastor Ted York').trim() || 'Pastor Ted York';
    const date = String(body.date || '').trim();
    const rawVideo = String(body.video_url || '').trim();
    const description = body.description != null ? String(body.description) : '';
    const isPublic = Boolean(body.is_public);
    const embedMode = normalizeEmbedMode(body.embed_mode);
    const id = body.id ? String(body.id) : null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }
    if (!rawVideo) {
      return NextResponse.json({ error: 'YouTube URL is required.' }, { status: 400 });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'A valid date (YYYY-MM-DD) is required.' },
        { status: 400 }
      );
    }

    const videoId = extractYouTubeVideoId(rawVideo);
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            'Could not read a valid YouTube link or 11-character video ID. Paste the full YouTube URL and try again.',
        },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      title,
      preacher,
      date,
      video_url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail_url: getYouTubeThumbnailUrl(videoId, 'hq'),
      description,
      is_public: isPublic,
      embed_mode: embedMode,
    };

    const admin = auth.supabaseAdmin;

    if (id) {
      let { data, error } = await admin
        .from('sermons')
        .update(payload)
        .eq('id', id)
        .select('id, title, date')
        .maybeSingle();

      if (error && /embed_mode|column|schema cache/i.test(error.message || '')) {
        const { embed_mode: _drop, ...withoutEmbed } = payload;
        ({ data, error } = await admin
          .from('sermons')
          .update(withoutEmbed)
          .eq('id', id)
          .select('id, title, date')
          .maybeSingle());
      }

      if (error) {
        console.error('[admin/sermons] update', error);
        const msg = error.message || 'Update failed';
        if (/permission denied|42501/i.test(msg)) {
          return NextResponse.json(
            {
              error:
                'Permission denied for table sermons. In Supabase → SQL Editor, run the file supabase/fix-sermons-and-profiles-grants.sql, then try again.',
            },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: 'Sermon not found to update.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, sermon: data, updated: true });
    }

    let { data, error } = await admin
      .from('sermons')
      .insert(payload)
      .select('id, title, date')
      .maybeSingle();

    if (error && /embed_mode|column|schema cache/i.test(error.message || '')) {
      const { embed_mode: _drop, ...withoutEmbed } = payload;
      ({ data, error } = await admin
        .from('sermons')
        .insert(withoutEmbed)
        .select('id, title, date')
        .maybeSingle());
    }

    if (error) {
      console.error('[admin/sermons] insert', error);
      const msg = error.message || 'Insert failed';
      if (/permission denied|42501/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'Permission denied for table sermons. In Supabase → SQL Editor, run the file supabase/fix-sermons-and-profiles-grants.sql, then try again.',
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Insert did not return a row. Check sermons table permissions.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, sermon: data, created: true });
  } catch (err) {
    console.error('[admin/sermons]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sermon save failed' },
      { status: 500 }
    );
  }
}
