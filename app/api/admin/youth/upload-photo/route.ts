import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force Node runtime for reliable FormData / File handling + service role uploads
export const runtime = 'nodejs';

// Youth photo upload route (admin only).
// Uses service role for storage + DB insert to bypass RLS.

export async function POST(request: NextRequest) {

  try {
    // Get the user's session from the request (sent by the browser client)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdminForCheck = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: profile } = await supabaseAdminForCheck
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('Youth upload authorized for', user.email);

    // Parse multipart form data (file + optional album_id + caption)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const album_id = formData.get('album_id') as string | null;
    const caption = formData.get('caption') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    console.log('Processing youth upload:', file.name);

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
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
      console.error('Youth storage upload error:', uploadError);
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
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
      console.error('Youth DB insert error:', insertError);
      await supabaseAdmin.storage.from('youth-photos').remove([filePath]).catch(() => {});
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });
    }

    console.log('Youth photo uploaded successfully:', insertData?.id);

    return NextResponse.json({ 
      success: true, 
      id: insertData?.id, 
      url: publicUrl,
      album_id: album_id || null 
    });
  } catch (error: any) {
    console.error('Youth upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
