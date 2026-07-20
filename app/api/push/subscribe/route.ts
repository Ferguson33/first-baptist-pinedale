import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    // Same robust admin check used for photo uploads (service role + own-profile fallback)
    const auth = await authorizeAdminUpload(authHeader);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const jwt = (authHeader || '').replace(/^Bearer\s+/i, '').trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Session expired. Please sign out and sign back in, then try again.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const endpoint = String(body?.endpoint || '');
    const p256dh = String(body?.keys?.p256dh || '');
    const pauth = String(body?.keys?.auth || '');
    const previousEndpoint = String(body?.previousEndpoint || '').trim();
    const replaceOtherDevices = body?.replaceOtherDevices !== false;

    if (!endpoint || !p256dh || !pauth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { error } = await auth.supabaseAdmin.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth: pauth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('[push subscribe]', error);
      if (
        error.code === '42P01' ||
        /push_subscriptions/i.test(error.message || '') ||
        /relation .* does not exist/i.test(error.message || '')
      ) {
        return NextResponse.json(
          {
            error:
              'Push table missing. In Supabase → SQL Editor, run the file push-subscriptions-admin.sql, then try again.',
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Confirm the row is readable (catches silent schema / RLS issues early)
    const { data: saved, error: readErr } = await auth.supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (readErr) {
      console.error('[push subscribe] verify read failed:', readErr);
      return NextResponse.json(
        {
          error: `Saved but could not verify: ${readErr.message}. Check Supabase table push_subscriptions.`,
        },
        { status: 500 }
      );
    }

    if (!saved) {
      console.error('[push subscribe] upsert returned ok but row not found for endpoint');
      return NextResponse.json(
        {
          error:
            'Device did not save correctly. In Supabase → SQL Editor, re-run push-subscriptions-admin.sql, then try Enable again.',
        },
        { status: 500 }
      );
    }

    // Remove the browser's previous endpoint (new endpoint after re-subscribe)
    if (previousEndpoint && previousEndpoint !== endpoint) {
      await auth.supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', previousEndpoint);
    }

    // Default: one active registration per admin account so Re-save / test
    // does not stack 10+ endpoints for the same phone.
    let removedOthers = 0;
    if (replaceOtherDevices) {
      const { data: removed, error: delErr } = await auth.supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .neq('endpoint', endpoint)
        .select('id');

      if (delErr) {
        console.warn('[push subscribe] could not prune other devices:', delErr.message);
      } else {
        removedOthers = removed?.length || 0;
      }
    }

    return NextResponse.json({
      success: true,
      id: saved.id,
      userId: saved.user_id,
      removedOthers,
    });
  } catch (err) {
    console.error('[push subscribe]', err);
    const message = err instanceof Error ? err.message : 'Subscribe failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
