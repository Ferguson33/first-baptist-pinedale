import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminsOfMembershipRequest } from '@/lib/web-push-server';

export const runtime = 'nodejs';

/**
 * Called after a new user signs up (pending membership).
 * Verifies the caller is that pending member, then notifies admins.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const jwt = authHeader.slice(7);

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read profile as the user (RLS allows own row)
    const authed = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile } = await authed
      .from('profiles')
      .select('full_name, email, role, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'pending') {
      // Not a new membership request — ignore quietly
      return NextResponse.json({ success: true, skipped: 'not_pending' });
    }

    // Avoid spam if something retries long after signup
    const created = profile.created_at ? new Date(profile.created_at).getTime() : 0;
    if (created && Date.now() - created > 15 * 60 * 1000) {
      return NextResponse.json({ success: true, skipped: 'too_old' });
    }

    const result = await notifyAdminsOfMembershipRequest({
      fullName: profile.full_name || 'New member',
      email: profile.email || user.email || 'unknown',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[push notify-membership]', err);
    // Don't fail signup UX if push fails
    const message = err instanceof Error ? err.message : 'Notify failed';
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
