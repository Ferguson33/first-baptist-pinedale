import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';
import { createServiceSupabase, getVapidConfig } from '@/lib/web-push-server';

export const runtime = 'nodejs';

/** Diagnostics for admin push setup (does not send a notification). */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdminUpload(request.headers.get('authorization'));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const vapid = getVapidConfig();
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || '');

    const jwt = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser(jwt);

    let adminSubscriptionCount = 0;
    let hasSubscription = false;
    let tableOk = true;
    let tableError = '';

    try {
      const admin = createServiceSupabase();
      const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
      const adminIds = (admins || []).map((a) => a.id);

      if (adminIds.length > 0) {
        const { data: subs, error } = await admin
          .from('push_subscriptions')
          .select('id, endpoint, user_id')
          .in('user_id', adminIds);

        if (error) {
          tableOk = false;
          tableError = error.message;
        } else {
          adminSubscriptionCount = subs?.length || 0;
          if (endpoint && subs) {
            hasSubscription = subs.some((s) => s.endpoint === endpoint);
          }
          if (!hasSubscription && user && subs) {
            hasSubscription = subs.some((s) => s.user_id === user.id);
          }
        }
      }
    } catch (e) {
      tableOk = false;
      tableError = e instanceof Error ? e.message : 'lookup failed';
    }

    return NextResponse.json({
      vapidConfigured: !!vapid,
      vapidPublicKeyPresent: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim(),
      vapidPrivateKeyPresent: !!process.env.VAPID_PRIVATE_KEY?.trim(),
      tableOk,
      tableError: tableError || undefined,
      adminSubscriptionCount,
      hasSubscription,
      browserHasEndpoint: !!endpoint,
      detail: !vapid
        ? 'VAPID keys missing on server — add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel, then Redeploy.'
        : !tableOk
          ? `Database issue: ${tableError}. Run push-subscriptions-admin.sql in Supabase.`
          : adminSubscriptionCount === 0
            ? 'No device subscriptions saved yet. Tap Enable on this device (even if it says On) to re-save.'
            : hasSubscription
              ? 'This device is registered.'
              : 'Other admin devices are registered, but this browser endpoint is not. Tap Enable to re-save this device.',
    });
  } catch (err) {
    console.error('[push status]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
