"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  checkForServiceWorkerUpdate,
  isStandalonePwa,
  registerServiceWorker,
} from '@/lib/pwa';
import { RefreshAppButton } from '@/components/RefreshAppButton';

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    setIsPwa(isStandalonePwa());
  }, []);

  useEffect(() => {
    let registration: ServiceWorkerRegistration | null = null;
    let updateInterval: ReturnType<typeof setInterval> | null = null;

    async function setup() {
      registration = await registerServiceWorker();
      if (!registration) return;

      const onUpdateFound = () => {
        const installing = registration?.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setUpdateAvailable(true);
          }
        });
      };

      registration.addEventListener('updatefound', onUpdateFound);

      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateAvailable(true);
      }

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(false);
      });

      updateInterval = setInterval(() => {
        checkForServiceWorkerUpdate().catch(() => {});
      }, 5 * 60_000);

      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          checkForServiceWorkerUpdate().catch(() => {});
        }
      };

      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', onVisible);

      return () => {
        registration?.removeEventListener('updatefound', onUpdateFound);
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', onVisible);
      };
    }

    let cleanup: (() => void) | void;
    setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
      if (updateInterval) clearInterval(updateInterval);
    };
  }, []);

  return (
    <>
      {children}

      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-md rounded-2xl border border-[var(--color-gold)]/40 bg-white px-4 py-3 shadow-xl">
          <p className="text-sm font-medium text-[var(--color-navy)]">A new version is available.</p>
          <p className="text-xs text-[var(--color-stone-light)] mt-0.5">
            Refresh to get the latest content and fixes.
          </p>
          <div className="mt-3">
            <RefreshAppButton
              label="Refresh Now"
              variant="primary"
              onRefreshing={() => {
                toast.message('Refreshing app…');
                setUpdateAvailable(false);
              }}
            />
          </div>
        </div>
      )}

      {isPwa && !updateAvailable && (
        <div className="fixed bottom-3 right-3 z-[60]">
          <RefreshAppButton label="Refresh" variant="compact" />
        </div>
      )}
    </>
  );
}