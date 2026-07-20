'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ensureAccessToken } from '@/lib/storage-upload';
import {
  disableAdminMembershipPush,
  enableAdminMembershipPush,
  getExistingPushSubscription,
  pushSupported,
} from '@/lib/push-client';
import { isStandalonePwa } from '@/lib/pwa';

export function AdminPushToggle() {
  const supabase = createClient();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    setSupported(pushSupported());
    setIsPwa(isStandalonePwa());
    getExistingPushSubscription()
      .then((sub) => setEnabled(!!sub))
      .catch(() => setEnabled(false));
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const token = await ensureAccessToken(supabase);
      await enableAdminMembershipPush(token);
      setEnabled(true);
      toast.success('Membership request alerts are on for this device.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const token = await ensureAccessToken(supabase);
      await disableAdminMembershipPush(token);
      setEnabled(false);
      toast.success('Membership request alerts turned off on this device.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Could not disable notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    try {
      const token = await ensureAccessToken(supabase);
      const res = await fetch('/api/push/notify-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ test: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Test failed');
      }
      if (data.sent > 0) {
        toast.success(data.hint || `Test sent to ${data.sent} device(s). Check your phone.`);
      } else {
        toast.error(
          data.hint ||
            data.skipped ||
            'No devices received the test. Re-enable alerts and confirm VAPID keys + SQL setup.'
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Test notification failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="admin-section bg-white p-6 rounded-3xl border border-[var(--color-gold)]/20">
        <div className="font-semibold mb-2 flex items-center gap-2">
          <BellOff className="w-5 h-5 text-[var(--color-stone-light)]" />
          Membership alerts
        </div>
        <p className="text-sm text-[var(--color-stone-light)]">
          Push notifications are not supported in this browser. Try Chrome or Edge on Android, or install the app on a
          supported iPhone (Home Screen).
        </p>
      </div>
    );
  }

  return (
    <div className="admin-section bg-white p-6 rounded-3xl border border-[var(--color-gold)]/20">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <Bell className="w-5 h-5 text-[var(--color-gold-dark)]" />
        Membership request alerts
      </div>
      <p className="text-sm text-[var(--color-stone)] mb-4">
        Get a push notification on this device when someone signs up and requests membership.
        {!isPwa && (
          <span className="block mt-1 text-[var(--color-stone-light)]">
            Tip: install the site to your Home Screen for the most reliable delivery (required on iPhone).
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <>
            <button
              type="button"
              onClick={handleTest}
              disabled={busy}
              className="admin-big-button px-5 py-2.5 rounded-full bg-[var(--color-navy)] text-white text-sm font-semibold disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Working…
                </span>
              ) : (
                'Send test notification'
              )}
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={busy}
              className="admin-big-button px-5 py-2.5 rounded-full border border-[var(--color-navy)] text-[var(--color-navy)] text-sm font-semibold disabled:opacity-60"
            >
              Turn off on this device
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="admin-big-button px-5 py-2.5 rounded-full bg-[var(--color-navy)] text-white text-sm font-semibold disabled:opacity-60"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Working…
              </span>
            ) : (
              'Enable on this device'
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--color-stone-light)] mt-3">
        Status: {enabled ? 'On for this browser/device' : 'Off'}. Use <strong>Send test</strong> first to confirm this phone receives pushes.
      </p>
    </div>
  );
}
