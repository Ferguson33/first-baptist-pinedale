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

  async function refreshStatus() {
    setSupported(pushSupported());
    setIsPwa(isStandalonePwa());

    if (!pushSupported()) {
      setEnabled(false);
      setStatusLine('Not supported in this browser');
      return;
    }

    try {
      const token = await ensureAccessToken(supabase);
      const status = await serverHasPushSubscription(token);
      setEnabled(status.hasSubscription);
      setStatusLine(status.detail || (status.hasSubscription ? 'On' : 'Off'));
    } catch {
      // Fall back to browser-only check
      const sub = await getExistingPushSubscription().catch(() => null);
      setEnabled(false);
      setStatusLine(
        sub
          ? 'Browser is subscribed, but not saved on the server yet — tap Enable again.'
          : 'Off — tap Enable on this device'
      );
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
      setEnabled(true);
      toast.success('This device is registered for membership alerts.');
      await refreshStatus();
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
      await refreshStatus();
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

      // Always re-save this device first so "On" in the browser alone is not enough
      try {
        await enableAdminMembershipPush(token);
      } catch (e) {
        console.warn('Re-save before test:', e);
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
      } else {
        const parts = [
          data.skipped,
          data.hint,
          data.errors?.[0],
          data.subscriptionCount === 0
            ? 'No devices in the database.'
            : undefined,
        ].filter(Boolean);
        toast.error(parts.join(' ') || 'No devices received the test.');
      }
      await refreshStatus();
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
            'Re-enable / re-save this device'
          ) : (
            'Enable on this device'
          )}
        </button>
        {enabled && (
          <>
            <button
              type="button"
              onClick={handleTest}
              disabled={busy}
              className="admin-big-button px-5 py-2.5 rounded-full border border-[var(--color-navy)] text-[var(--color-navy)] text-sm font-semibold disabled:opacity-60"
            >
              Send test notification
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={busy}
              className="admin-big-button px-5 py-2.5 rounded-full border border-red-200 text-red-700 text-sm font-semibold disabled:opacity-60"
            >
              Turn off
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-[var(--color-stone-light)] mt-3">
        <strong>Status:</strong> {statusLine}
      </p>
      <p className="text-xs text-[var(--color-stone-light)] mt-1">
        If test fails, tap <strong>Re-enable / re-save this device</strong> first, then <strong>Send test</strong>.
      </p>
    </div>
  );
}
