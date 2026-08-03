import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Approve a pending member (profiles.role → approved).
 * Uses service role after admin JWT check so DB triggers that only
 * allow "self" role changes do not block pastoral approval.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const auth = await authorizeAdminUpload(authHeader);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, retryable: auth.status === 401 || auth.status === 403 },
        { status: auth.status }
      );
    }

    const body = await request.json().catch(() => null);
    const userId = body?.userId ? String(body.userId).trim() : '';
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const admin = auth.supabaseAdmin;

    const { data: existing, error: fetchError } = await admin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin/members/approve] fetch', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json(
        { error: 'Member profile not found — refresh the Members list and try again.' },
        { status: 404 }
      );
    }
    if (existing.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be changed from this screen.' },
        { status: 400 }
      );
    }
    if (existing.role === 'approved') {
      return NextResponse.json({ success: true, profile: existing, already: true });
    }

    // Prefer RPC if present (SECURITY DEFINER + is_admin); fall back to direct update
    const { data: rpcRow, error: rpcError } = await admin.rpc('admin_approve_member', {
      target_id: userId,
    });

    if (!rpcError && rpcRow) {
      const profile = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
      return NextResponse.json({ success: true, profile });
    }

    if (rpcError && !/function|does not exist|schema cache/i.test(rpcError.message || '')) {
      console.error('[admin/members/approve] rpc', rpcError);
    }

    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ role: 'approved' })
      .eq('id', userId)
      .select('id, email, full_name, role')
      .maybeSingle();

    if (updateError) {
      console.error('[admin/members/approve] update', updateError);
      const msg = updateError.message || 'Failed to approve member';
      if (/cannot be changed by this user|42501|permission/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'Database is blocking role changes. In Supabase → SQL Editor, run supabase/fix-profiles-role-change-trigger.sql, then try again.',
            detail: msg,
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Approve did not update any row. Check the profile id and try again.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err) {
    console.error('[admin/members/approve]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Approve failed' },
      { status: 500 }
    );
  }
}
