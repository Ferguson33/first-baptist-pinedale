import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminUpload } from '@/lib/admin-storage-upload-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Approve a pending member (profiles.role → approved).
 * Prefers admin_approve_member RPC; falls back to direct service-role update.
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

    // 1) Preferred: SECURITY DEFINER RPC
    const { data: rpcRow, error: rpcError } = await admin.rpc('admin_approve_member', {
      target_id: userId,
    });

    if (!rpcError && rpcRow) {
      const profile = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
      return NextResponse.json({ success: true, profile });
    }

    // 2) Fallback: direct service-role update
    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ role: 'approved' })
      .eq('id', userId)
      .select('id, email, full_name, role')
      .maybeSingle();

    if (!updateError && updated) {
      return NextResponse.json({ success: true, profile: updated });
    }

    const detail = updateError?.message || rpcError?.message || 'Unknown database error';
    console.error('[admin/members/approve] failed', { rpcError, updateError, userId });

    const needsSql = /cannot be changed by this user|blocking role|42501|permission denied|function.*does not exist/i.test(
      detail
    );

    return NextResponse.json(
      {
        error: needsSql
          ? 'Database is still blocking role changes. Run the FULL script supabase/fix-profiles-role-change-trigger.sql in Supabase SQL Editor (as project owner), then try Approve again.'
          : `Could not approve member: ${detail}`,
        detail,
        hint: needsSql
          ? 'SQL Editor → paste entire fix-profiles-role-change-trigger.sql → Run. Confirm Notices show dropped triggers.'
          : undefined,
      },
      { status: 500 }
    );
  } catch (err) {
    console.error('[admin/members/approve]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Approve failed' },
      { status: 500 }
    );
  }
}
