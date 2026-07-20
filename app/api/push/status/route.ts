import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';
import { createServiceSupabase, getVapidConfig } from '@/lib/web-push-server';

export const runtime = 'nodejs';

/** Diagnostics for admin push setup (does not send a notification). */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const auth = await authorizeAdminUpload(authHeader);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const vapid = getVapidConfig();
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || '');

    const jwt = (authHeader || '').replace(/^Bearer\s+/i, '').trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser(jwt);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let adminSubscriptionCount = 0;
    let hasSubscription = false;
    let mySubscriptionCount = 0;
    let tableOk = true;
    let tableError = '';

    try {
      const admin = createServiceSupabase();

      // Prefer this admin's rows by user_id (most reliable)
      const { data: mySubs, error: myErr } = await admin
        .from('push_subscriptions')
        .select('id, endpoint, user_id')
        .eq('user_id', user.id);

      if (myErr) {
        tableOk = false;
        tableError = myErr.message;
      } else {
        mySubscriptionCount = mySubs?.length || 0;
        if (mySubs && mySubs.length > 0) {
          hasSubscription = true;
          if (endpoint) {
            hasSubscription = mySubs.some((s) => s.endpoint === endpoint) || mySubs.length > 0;
          }
        }
      }

      const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
      const adminIds = (admins || []).map((a) => a.id);
      if (adminIds.length > 0) {
        const { data: allAdminSubs } = await admin
          .from('push_subscriptions')
          .select('id')
          .in('user_id', adminIds);
        adminSubscriptionCount = allAdminSubs?.length || 0;
      }
    } catch (e) {
      tableOk = false;
      tableError = e instanceof Error ? e.message : 'lookup failed';
    }

    let detail = '';
    if (!vapid) {
      detail =
        'VAPID keys missing on server — add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel, then Redeploy.';
    } else if (!tableOk) {
      detail = `Database issue: ${tableError}. Run push-subscriptions-admin.sql in Supabase.`;
    } else if (hasSubscription) {
      detail = `This device is registered (${mySubscriptionCount} saved for your account).`;
    } else if (adminSubscriptionCount > 0) {
      detail =
        'Other devices are registered, but this one is not saved yet. Tap Enable on this device.';
    } else {
      detail = 'No devices saved yet. Tap Enable on this device.';
    }

    return NextResponse.json({
      vapidConfigured: !!vapid,
      vapidPublicKeyPresent: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim(),
      vapidPrivateKeyPresent: !!process.env.VAPID_PRIVATE_KEY?.trim(),
      tableOk,
      tableError: tableError || undefined,
      adminSubscriptionCount,
      mySubscriptionCount,
      hasSubscription,
      browserHasEndpoint: !!endpoint,
      detail,
    });
  } catch (err) {
    console.error('[push status]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
