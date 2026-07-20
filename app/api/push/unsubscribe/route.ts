import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceSupabase } from '@/lib/web-push-server';

export const runtime = 'nodejs';

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

    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || '');

    const admin = createServiceSupabase();

    if (endpoint) {
      await admin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);
    } else {
      await admin.from('push_subscriptions').delete().eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[push unsubscribe]', err);
    const message = err instanceof Error ? err.message : 'Unsubscribe failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
