import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force Node runtime for reliable FormData / File handling + service role uploads
export const runtime = 'nodejs';

// === YOUTH SERVER ROUTE v2 (FULL UPLOAD) ===
// Handles BOTH Storage upload + youth_photos INSERT using service role.
// This bypasses ALL RLS for admin photo adds to albums.
// Client must send Authorization: Bearer <access_token> + multipart FormData with 'file'.

export async function POST(request: NextRequest) {
  const routeVersion = 'SERVER ROUTE v2 - FULL FILE HANDLER';
  console.log(`%c=== ${routeVersion} RECEIVED REQUEST ===`, 'color: #00ff00; font-weight: bold');

  try {
    // Get the user's session from the request (sent by the browser client)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('v2 route: missing auth header');
      return NextResponse.json({ error: 'Unauthorized - no Authorization header' }, { status: 401 });
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.log('v2 route: getUser failed', userError);
      return NextResponse.json({ error: 'Unauthorized - invalid token' }, { status: 401 });
    }

    // Verify the user is an admin
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      console.log('v2 route: not admin', profile);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse multipart form data (file + optional album_id + caption)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const album_id = formData.get('album_id') as string | null;
    const caption = formData.get('caption') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    console.log(`%c=== ${routeVersion} AUTH OK - processing file: ${file.name} (album: ${album_id || 'none'}) ===`, 'color: #00ff00; font-size: 13px');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('v2 FATAL: SUPABASE_SERVICE_ROLE_KEY is not set in environment');
      return NextResponse.json({ error: 'Server misconfiguration: service role key missing (set SUPABASE_SERVICE_ROLE_KEY in Vercel)' }, { status: 500 });
    }

    // Create Supabase client with service role (bypasses ALL RLS for storage + table)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create unique path inside the bucket
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `youth-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `youth/${fileName}`;

    // Upload file bytes using service role (this is what was failing with client-side RLS)
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('youth-photos')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('v2 SERVICE ROLE STORAGE UPLOAD ERROR:', uploadError);
      return NextResponse.json({ error: 'Storage upload failed: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL (service role client works the same)
    const { data: urlData } = supabaseAdmin.storage
      .from('youth-photos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Insert metadata row using service role (bypasses youth_photos RLS)
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('youth_photos')
      .insert({
        url: publicUrl,
        caption: caption || null,
        album_id: album_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('v2 SERVICE ROLE DB INSERT ERROR:', insertError);
      // Best effort cleanup of orphaned storage file
      await supabaseAdmin.storage.from('youth-photos').remove([filePath]).catch(() => {});
      return NextResponse.json({ error: 'DB insert failed: ' + insertError.message }, { status: 500 });
    }

    console.log(`%c=== ${routeVersion} SUCCESS === photo id=${insertData?.id} album=${album_id || 'uncategorized'}`, 'color: lime; font-weight: bold');

    return NextResponse.json({ 
      success: true, 
      id: insertData?.id, 
      url: publicUrl,
      album_id: album_id || null 
    });
  } catch (error: any) {
    console.error('API route v2 uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Unknown server error in v2 route' }, { status: 500 });
  }
}
