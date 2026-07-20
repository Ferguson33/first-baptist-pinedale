import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createServiceSupabase,
  notifyAdminsOfMembershipRequest,
} from '@/lib/web-push-server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';

/**
 * Called after a new user signs up (pending membership), or by an admin for a test push.
 *
 * Auth modes:
 *  1) Bearer JWT of the new pending member
 *  2) Body { userId } when signup has no session yet (email confirm) — service role verifies pending + recent
 *  3) Admin Bearer + body { test: true } — send a test notification
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json().catch(() => ({}));
    const isTest = body?.test === true;
    const bodyUserId = typeof body?.userId === 'string' ? body.userId : null;
    const bodyFullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const bodyEmail = typeof body?.email === 'string' ? body.email.trim() : '';

    // --- Admin test push ---
    if (isTest) {
      const auth = await authorizeAdminUpload(authHeader);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }

      const result = await notifyAdminsOfMembershipRequest({
        fullName: 'Test Member',
        email: 'test@example.com',
      });

      return NextResponse.json({
        success: true,
        test: true,
        ...result,
        hint:
          result.sent === 0
            ? result.skipped ||
              'No notifications sent. Confirm Enable is on, SQL table exists, and VAPID keys are set on Vercel.'
            : `Sent to ${result.sent} device(s).`,
      });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim() || '';

    let fullName = bodyFullName || 'New member';
    let email = bodyEmail || 'unknown';
    let profileOk = false;

    // --- Path A: JWT of the new member ---
    if (jwt) {
      const userClient = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser(jwt);

      if (!userError && user) {
        const admin = createServiceSupabase();
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name, email, role, created_at')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'pending') {
          const created = profile.created_at ? new Date(profile.created_at).getTime() : 0;
          if (!created || Date.now() - created <= 30 * 60 * 1000) {
            fullName = profile.full_name || fullName;
            email = profile.email || user.email || email;
            profileOk = true;
          }
        }
      }
    }

    // --- Path B: userId from signup when there is no session (email confirmation) ---
    if (!profileOk && bodyUserId) {
      const admin = createServiceSupabase();
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, email, role, created_at')
        .eq('id', bodyUserId)
        .maybeSingle();

      if (profile?.role === 'pending') {
        const created = profile.created_at ? new Date(profile.created_at).getTime() : 0;
        if (!created || Date.now() - created <= 30 * 60 * 1000) {
          fullName = profile.full_name || fullName;
          email = profile.email || email;
          profileOk = true;
        }
      } else if (!profile && bodyFullName && bodyEmail) {
        // Profile insert may have failed client-side; still alert admins of the signup attempt
        fullName = bodyFullName;
        email = bodyEmail;
        profileOk = true;
      }
    }

    if (!profileOk) {
      return NextResponse.json({
        success: true,
        skipped: 'not_a_fresh_pending_member',
      });
    }

    const result = await notifyAdminsOfMembershipRequest({ fullName, email });
    console.log('[push notify-membership] result', result, { fullName, email });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[push notify-membership]', err);
    const message = err instanceof Error ? err.message : 'Notify failed';
    // Don't break signup UX
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
