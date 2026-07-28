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
  retryable?: boolean;
};

export type AdminUploadAuth = {
  ok: true;
  supabaseAdmin: SupabaseClient;
  userEmail: string;
};

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = (match?.[1] || authHeader).trim();
  return token || null;
}

function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function authorizeAdminUpload(
  authHeader: string | null
): Promise<AdminUploadAuth | AdminUploadProcessFailure> {
  const jwt = extractBearerToken(authHeader);
  if (!jwt) {
    return { ok: false, error: 'Unauthorized — please sign in again.', status: 401 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, error: 'Server misconfiguration (missing Supabase URL/anon key)', status: 500 };
  }

  const supabaseUser = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let user: { id: string; email?: string | null } | null = null;
  try {
    const result = await withTimeout(supabaseUser.auth.getUser(jwt), 8_000, 'Auth getUser');
    if (result.error || !result.data.user) {
      console.error('[authorizeAdminUpload] getUser failed:', result.error?.message);
      return {
        ok: false,
        error: 'Unauthorized — your session expired. Please sign out and sign back in.',
        status: 401,
      };
    }
    user = result.data.user;
  } catch (err) {
    console.error('[authorizeAdminUpload] getUser timed out/failed:', err);
    return {
      ok: false,
      error:
        'Auth check timed out. Please try again in a moment. If it keeps happening, sign out and sign back in.',
      status: 503,
      retryable: true,
    };
  }

  const supabaseAdmin = createServiceRoleClient();
  if (!supabaseAdmin) {
    console.error('[authorizeAdminUpload] SUPABASE_SERVICE_ROLE_KEY is not set');
    return {
      ok: false,
      error:
        'Server misconfiguration (missing SUPABASE_SERVICE_ROLE_KEY on the host). Add it in Vercel → Settings → Environment Variables, then redeploy.',
      status: 500,
    };
  }

  // Prefer service-role lookup (bypasses RLS). Fall back to the caller's JWT
  // reading their own profile if the service-role query fails for any reason.
  let role: string | null = null;
  let profileLookupError: string | null = null;

  let adminProfile: { role?: string } | null = null;
  let adminProfileError: { message?: string; code?: string } | null = null;
  try {
    const result = await withTimeout(
      supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      8_000,
      'Admin profile lookup'
    );
    adminProfile = result.data;
    adminProfileError = result.error;
  } catch (err) {
    profileLookupError = err instanceof Error ? err.message : 'profile lookup timed out';
    console.error('[authorizeAdminUpload] profile lookup timed out:', err);
  }

  if (adminProfileError) {
    profileLookupError = adminProfileError.message ?? 'profile lookup failed';
    console.error('[authorizeAdminUpload] service-role profile error:', {
      userId: user.id,
      email: user.email,
      message: adminProfileError.message,
      code: adminProfileError.code,
    });
  } else if (adminProfile?.role) {
    role = String(adminProfile.role);
  }

  if (!role) {
    const userScoped = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: ownProfile, error: ownError } = await userScoped
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (ownError) {
      profileLookupError = ownError.message;
      console.error('[authorizeAdminUpload] user-scoped profile error:', ownError.message);
    } else if (ownProfile?.role) {
      role = String(ownProfile.role);
    }
  }

  const normalizedRole = (role || '').trim().toLowerCase();
  if (normalizedRole !== 'admin') {
    console.error('[authorizeAdminUpload] not admin:', {
      userId: user.id,
      email: user.email,
      role,
      profileLookupError,
    });

    // Surface the real DB permission error so it's fixable (e.g. missing GRANT on profiles)
    const permissionish =
      profileLookupError &&
      /permission denied|42501|row-level security/i.test(profileLookupError);

    if (permissionish) {
      return {
        ok: false,
        error: `Permission denied for table profiles. In Supabase → SQL Editor, run supabase/fix-sermons-and-profiles-grants.sql (grants on profiles + sermons for authenticated and service_role), then try again. Detail: ${profileLookupError}`,
        status: 500,
      };
    }

    return {
      ok: false,
      error:
        'Admin access required. Sign out and sign back in. If this continues, confirm your profile role is set to admin in Supabase (Table Editor → profiles → your row → role must be exactly: admin).',
      status: 403,
    };
  }

  return { ok: true, supabaseAdmin, userEmail: user.email || 'admin' };
}

/** Re-export name for non-upload callers (push, etc.). */
export const authorizeAdmin = authorizeAdminUpload;

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