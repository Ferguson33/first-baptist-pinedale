'use client';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Request permission, (re)subscribe this device with the current VAPID key,
 * and save the subscription for the signed-in admin.
 */
export async function enableAdminMembershipPush(accessToken: string): Promise<void> {
  if (!pushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    throw new Error(
      'Push is not configured on this site build (missing NEXT_PUBLIC_VAPID_PUBLIC_KEY). Add it in Vercel and redeploy.'
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted. Check phone Settings → Notifications.');
  }

  // Ensure service worker is active before subscribing
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  // Always resubscribe so we use the current VAPID public key and re-save to the database
  // (a prior failed "Enable" can leave a browser subscription without a DB row).
  const existing = await reg.pushManager.getSubscription();
  const previousEndpoint = existing?.endpoint || '';
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      /* continue */
    }
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Browser returned an incomplete push subscription.');
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      // Drop the browser's previous endpoint so Re-save does not stack devices
      previousEndpoint: previousEndpoint || undefined,
      // Keep only this device for this admin (avoids "sent to 11 devices" after re-testing)
      replaceOtherDevices: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save push subscription on the server.');
  }
}

export async function disableAdminMembershipPush(accessToken: string): Promise<void> {
  if (!pushSupported()) return;

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;

  if (subscription) {
    await subscription.unsubscribe();
  }

  if (endpoint) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ endpoint }),
    });
  }
}

/** Ask the server if this browser endpoint is stored for the admin. */
export async function serverHasPushSubscription(accessToken: string): Promise<{
  hasSubscription: boolean;
  vapidConfigured: boolean;
  adminSubscriptionCount: number;
  detail?: string;
}> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  const endpoint = sub?.endpoint || '';

  const res = await fetch('/api/push/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ endpoint }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Could not check push status.');
  }
  return data;
}
