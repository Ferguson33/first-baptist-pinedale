import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';

const ALLOWED_BUCKETS = new Set(['youth-photos', 'building-photos']);

/**
 * After a client uploads directly to Supabase Storage, insert the DB row
 * (building_photos / youth_photos) and return the public URL.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdminUpload(request.headers.get('authorization'));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const bucket = String(body.bucket || '');
    const path = String(body.path || '');
    const caption = body.caption != null ? String(body.caption) : null;
    const albumId = body.albumId != null ? String(body.albumId) : null;
    const target = String(body.target || 'album');

    if (!ALLOWED_BUCKETS.has(bucket) || !path) {
      return NextResponse.json({ error: 'Invalid bucket or path' }, { status: 400 });
    }

    // Prevent path traversal / wrong-folder abuse
    const expectedFolder = bucket === 'building-photos' ? 'building/' : 'youth/';
    if (!path.startsWith(expectedFolder) || path.includes('..')) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    const { data: urlData } = auth.supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    if (target === 'event') {
      return NextResponse.json({
        success: true,
        url: publicUrl,
        path,
        target: 'event',
      });
    }

    if (bucket === 'building-photos' || target === 'building') {
      const { data: insertData, error: insertError } = await auth.supabaseAdmin
        .from('building_photos')
        .insert({
          url: publicUrl,
          caption: caption || 'New construction photo',
        })
        .select()
        .single();

      if (insertError) {
        await auth.supabaseAdmin.storage.from(bucket).remove([path]).catch(() => {});
        return NextResponse.json(
          { error: insertError.message || 'DB insert failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        url: publicUrl,
        path,
        id: insertData.id,
        caption: insertData.caption,
      });
    }

    const { data: insertData, error: insertError } = await auth.supabaseAdmin
      .from('youth_photos')
      .insert({
        url: publicUrl,
        caption: caption || null,
        album_id: albumId || null,
      })
      .select()
      .single();

    if (insertError) {
      await auth.supabaseAdmin.storage.from('youth-photos').remove([path]).catch(() => {});
      return NextResponse.json(
        { error: insertError.message || 'DB insert failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
      id: insertData.id,
      album_id: insertData.album_id,
    });
  } catch (error: unknown) {
    console.error('finalize-upload error:', error);
    const message = error instanceof Error ? error.message : 'Finalize upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
