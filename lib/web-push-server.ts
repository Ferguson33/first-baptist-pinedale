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
  // Strip accidental quotes/newlines from Vercel paste
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, '');
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, '');
  let subject =
    process.env.VAPID_SUBJECT?.trim().replace(/^["']|["']$/g, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'mailto:Firstbaptist646@gmail.com';

  if (subject && !subject.startsWith('mailto:') && !subject.startsWith('http')) {
    subject = `mailto:${subject}`;
  }

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const vapid = getVapidConfig();
  if (!vapid) {
    throw new Error('VAPID keys are not configured on the server.');
  }
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
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

export type NotifyResult = {
  sent: number;
  failed: number;
  skipped?: string;
  errors?: string[];
  subscriptionCount?: number;
};

/** Send a web push to every admin subscription; prune dead endpoints. */
export async function notifyAdminsOfMembershipRequest(payload: {
  fullName: string;
  email: string;
}): Promise<NotifyResult> {
  const vapid = getVapidConfig();
  if (!vapid) {
    return {
      sent: 0,
      failed: 0,
      skipped:
        'VAPID keys missing on server. In Vercel → Settings → Environment Variables add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, then Redeploy.',
    };
  }

  try {
    configureWebPush();
  } catch (e) {
    return {
      sent: 0,
      failed: 0,
      skipped: e instanceof Error ? e.message : 'Invalid VAPID configuration',
    };
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    return {
      sent: 0,
      failed: 0,
      skipped: e instanceof Error ? e.message : 'Supabase service role missing',
    };
  }

  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('[push] admin lookup failed:', adminError.message);
    return {
      sent: 0,
      failed: 0,
      skipped: `Could not load admins: ${adminError.message}`,
    };
  }

  const adminIds = (admins || []).map((a) => a.id);
  if (adminIds.length === 0) {
    return { sent: 0, failed: 0, skipped: 'No profiles with role = admin' };
  }

  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', adminIds);

  if (subError) {
    console.error('[push] subscription lookup failed:', subError.message);
    return {
      sent: 0,
      failed: 0,
      skipped: `Could not load subscriptions (run push-subscriptions-admin.sql?): ${subError.message}`,
    };
  }

  if (!subs || subs.length === 0) {
    return {
      sent: 0,
      failed: 0,
      subscriptionCount: 0,
      skipped:
        'No devices saved in the database. Tap Enable on this device again (even if it says On) so this phone is stored.',
    };
  }

  const body = JSON.stringify({
    title: 'New membership request',
    body: `${payload.fullName} (${payload.email}) requested membership.`,
    url: '/admin',
  });

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 12, urgency: 'high' }
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const status = (err as { statusCode?: number; body?: string; message?: string })?.statusCode;
        const msg =
          (err as { body?: string })?.body ||
          (err as { message?: string })?.message ||
          String(err);
        errors.push(`status ${status ?? '?'}: ${String(msg).slice(0, 160)}`);
        if (status === 404 || status === 410) {
          staleIds.push(sub.id);
        }
        console.error('[push] send failed:', status, msg);
      }
    })
  );

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds);
  }

  return {
    sent,
    failed,
    subscriptionCount: subs.length,
    errors: errors.length ? errors : undefined,
    skipped:
      sent === 0 && failed > 0
        ? `Send failed for ${failed} device(s). Often a VAPID public/private key mismatch — re-Enable after confirming both keys from the same pair on Vercel, then Redeploy.`
        : undefined,
  };
}
