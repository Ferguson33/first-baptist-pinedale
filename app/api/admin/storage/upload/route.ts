import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload, processAdminStorageUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdminUpload(request.headers.get('authorization'));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await processAdminStorageUpload(auth.supabaseAdmin, {
      file,
      bucket: String(formData.get('bucket') || ''),
      albumId: formData.get('album_id') as string | null,
      caption: formData.get('caption') as string | null,
      target: String(formData.get('target') || 'album'),
    });

    if ('ok' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Admin storage upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}