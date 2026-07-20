import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function getVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'mailto:Firstbaptist646@gmail.com';

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const vapid = getVapidConfig();
  if (!vapid) {
    throw new Error('VAPID keys are not configured on the server.');
  }
  webpush.setVapidDetails(vapid.subject.startsWith('mailto:') || vapid.subject.startsWith('http')
    ? vapid.subject
    : `mailto:${vapid.subject}`, vapid.publicKey, vapid.privateKey);
  return vapid;
}

export function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role is not configured.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Send a web push to every admin subscription; prune dead endpoints. */
export async function notifyAdminsOfMembershipRequest(payload: {
  fullName: string;
  email: string;
}): Promise<{ sent: number; failed: number; skipped?: string }> {
  const vapid = getVapidConfig();
  if (!vapid) {
    return { sent: 0, failed: 0, skipped: 'VAPID not configured' };
  }

  configureWebPush();
  const supabase = createServiceSupabase();

  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('[push] admin lookup failed:', adminError.message);
    throw new Error(adminError.message);
  }

  const adminIds = (admins || []).map((a) => a.id);
  if (adminIds.length === 0) {
    return { sent: 0, failed: 0, skipped: 'No admin profiles' };
  }

  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', adminIds);

  if (subError) {
    console.error('[push] subscription lookup failed:', subError.message);
    throw new Error(subError.message);
  }

  if (!subs || subs.length === 0) {
    return { sent: 0, failed: 0, skipped: 'No admin push subscriptions' };
  }

  const body = JSON.stringify({
    title: 'New membership request',
    body: `${payload.fullName} (${payload.email}) requested membership.`,
    url: '/admin',
  });

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 12 }
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const status = (err as { statusCode?: number })?.statusCode;
        // Gone / expired subscription
        if (status === 404 || status === 410) {
          staleIds.push(sub.id);
        }
        console.error('[push] send failed:', status || err);
      }
    })
  );

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds);
  }

  return { sent, failed };
}
