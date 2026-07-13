import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';

const ALLOWED_BUCKETS = new Set(['youth-photos', 'building-photos']);

/**
 * Create a signed Supabase upload URL so large files can go straight to
 * Storage and never hit Vercel's ~4.5 MB request-body limit.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdminUpload(request.headers.get('authorization'));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const bucket = String(body.bucket || '');
    const contentType = String(body.contentType || 'application/octet-stream');
    const originalName = String(body.fileName || 'upload.bin');

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Invalid storage bucket' }, { status: 400 });
    }

    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 });
    }

    const extFromName = originalName.includes('.')
      ? originalName.split('.').pop()
      : null;
    const fileExt =
      (extFromName && /^[a-zA-Z0-9]+$/.test(extFromName) ? extFromName : null) ||
      (isVideo ? 'mp4' : 'jpg');

    const folder = bucket === 'building-photos' ? 'building' : 'youth';
    const fileName = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const path = `${folder}/${fileName}`;

    const { data, error } = await auth.supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('createSignedUploadUrl error:', error);
      return NextResponse.json(
        { error: error?.message || 'Could not create upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bucket,
      path: data.path || path,
      token: data.token,
      signedUrl: data.signedUrl,
      contentType,
    });
  } catch (error: unknown) {
    console.error('prepare-upload error:', error);
    const message = error instanceof Error ? error.message : 'Prepare upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
