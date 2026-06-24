import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_BUCKETS = new Set(['youth-photos', 'building-photos']);

export type AdminUploadInput = {
  file: File;
  bucket: string;
  albumId?: string | null;
  caption?: string | null;
  target?: string;
};

export type AdminUploadSuccess = {
  success: true;
  url: string;
  path: string;
  id?: string;
  caption?: string;
  album_id?: string | null;
  target?: string;
};

export type AdminUploadProcessFailure = {
  ok: false;
  error: string;
  status: number;
};

export type AdminUploadAuth = {
  ok: true;
  supabaseAdmin: SupabaseClient;
  userEmail: string;
};

export async function authorizeAdminUpload(
  authHeader: string | null
): Promise<AdminUploadAuth | AdminUploadProcessFailure> {
  if (!authHeader) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));

  if (userError || !user) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'Server misconfiguration', status: 500 };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { ok: false, error: 'Forbidden', status: 403 };
  }

  return { ok: true, supabaseAdmin, userEmail: user.email || 'admin' };
}

export async function processAdminStorageUpload(
  supabaseAdmin: SupabaseClient,
  input: AdminUploadInput
): Promise<AdminUploadSuccess | AdminUploadProcessFailure> {
  const { file, bucket, albumId, caption, target = 'album' } = input;

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return { ok: false, error: 'Invalid storage bucket', status: 400 };
  }

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) {
    return { ok: false, error: 'Only image or video files are allowed', status: 400 };
  }

  const fileExt = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const folder = bucket === 'building-photos' ? 'building' : 'youth';
  const fileName = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(filePath, arrayBuffer, {
    contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    upsert: false,
  });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return { ok: false, error: uploadError.message || 'Storage upload failed', status: 500 };
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  if (target === 'event') {
    return { success: true, url: publicUrl, path: filePath, target: 'event' };
  }

  if (bucket === 'building-photos' || target === 'building') {
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('building_photos')
      .insert({
        url: publicUrl,
        caption: caption || 'New construction photo',
      })
      .select()
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from(bucket).remove([filePath]).catch(() => {});
      return { ok: false, error: insertError.message || 'DB insert failed', status: 500 };
    }

    return {
      success: true,
      url: publicUrl,
      path: filePath,
      id: insertData.id,
      caption: insertData.caption,
    };
  }

  const { data: insertData, error: insertError } = await supabaseAdmin
    .from('youth_photos')
    .insert({
      url: publicUrl,
      caption: caption || null,
      album_id: albumId || null,
    })
    .select()
    .single();

  if (insertError) {
    await supabaseAdmin.storage.from('youth-photos').remove([filePath]).catch(() => {});
    return { ok: false, error: insertError.message || 'DB insert failed', status: 500 };
  }

  return {
    success: true,
    url: publicUrl,
    path: filePath,
    id: insertData.id,
    album_id: insertData.album_id,
  };
}