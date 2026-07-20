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
  serverHasPushSubscription,
} from '@/lib/push-client';
import { isStandalonePwa } from '@/lib/pwa';

export function AdminPushToggle() {
  const supabase = createClient();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [statusLine, setStatusLine] = useState('Checking…');

  async function refreshStatus(opts?: { keepEnabledOnError?: boolean }) {
    setSupported(pushSupported());
    setIsPwa(isStandalonePwa());

    if (!pushSupported()) {
      setEnabled(false);
      setStatusLine('Not supported in this browser');
      return;
    }

    const browserSub = await getExistingPushSubscription().catch(() => null);

    try {
      const token = await ensureAccessToken(supabase);
      const status = await serverHasPushSubscription(token);

      if (status.hasSubscription) {
        setEnabled(true);
        setStatusLine(status.detail || 'This device is registered.');
        return;
      }

      // Server has no row for this device
      if (browserSub) {
        setEnabled(false);
        setStatusLine(
          'This browser has permission, but the device is not saved on the server yet. Tap Enable to save it.'
        );
      } else {
        setEnabled(false);
        setStatusLine(status.detail || 'Off — tap Enable on this device');
      }
    } catch (err) {
      console.warn('[AdminPushToggle] status check:', err);
      // Do not bounce a successful Enable back to Off because of a flaky status call
      if (opts?.keepEnabledOnError) {
        setStatusLine('Registered on this device. (Could not re-check server; try Send test.)');
        return;
      }
      if (browserSub) {
        setEnabled(false);
        setStatusLine(
          'Could not verify with the server. Tap Enable to re-save this device, then Send test.'
        );
      } else {
        setEnabled(false);
        setStatusLine('Off — tap Enable on this device');
      }
    }
  }

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const token = await ensureAccessToken(supabase);
      await enableAdminMembershipPush(token);
      // Optimistically keep the enabled UI; don't let a status glitch hide Test
      setEnabled(true);
      setStatusLine('This device is registered. You can send a test notification.');
      toast.success('This device is registered for membership alerts.');
      await refreshStatus({ keepEnabledOnError: true });
    } catch (err) {
      console.error(err);
      setEnabled(false);
      toast.error(err instanceof Error ? err.message : 'Could not enable notifications.');
      await refreshStatus();
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
      setStatusLine('Off on this device');
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

      // Ensure this device is saved before sending
      try {
        await enableAdminMembershipPush(token);
        setEnabled(true);
      } catch (e) {
        console.warn('Re-save before test:', e);
        toast.error(
          e instanceof Error
            ? `Could not re-save this device: ${e.message}`
            : 'Could not re-save this device before testing.'
        );
        return;
      }

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
        toast.success(
          data.hint || `Test sent to ${data.sent} device(s). Check notifications on this phone.`
        );
        setStatusLine(`Last test: sent to ${data.sent} device(s).`);
      } else {
        const msg = [data.skipped, data.errors?.[0], data.hint].filter(Boolean).join(' ');
        toast.error(msg || 'No devices received the test.');
        setStatusLine(msg || 'Test did not reach any device.');
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
          ) : enabled ? (
            'Re-save this device'
          ) : (
            'Enable on this device'
          )}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={busy}
          className="admin-big-button px-5 py-2.5 rounded-full border border-[var(--color-navy)] text-[var(--color-navy)] text-sm font-semibold disabled:opacity-60"
        >
          Send test notification
        </button>
        {enabled && (
          <button
            type="button"
            onClick={handleDisable}
            disabled={busy}
            className="admin-big-button px-5 py-2.5 rounded-full border border-red-200 text-red-700 text-sm font-semibold disabled:opacity-60"
          >
            Turn off
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--color-stone-light)] mt-3">
        <strong>Status:</strong> {statusLine}
      </p>
    </div>
  );
}
