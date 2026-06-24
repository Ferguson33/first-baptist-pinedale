'use client';

/** True when the app is running as an installed PWA (home screen). */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function clearAppCaches(): Promise<void> {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export async function activateWaitingServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

export async function checkForServiceWorkerUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration('/');
  await registration?.update();
}

/**
 * Hard refresh: clear caches, activate any waiting worker, reload the page.
 * Use when the PWA shows stale auth or old content.
 */
export async function hardRefreshApp(): Promise<void> {
  await clearAppCaches();
  await checkForServiceWorkerUpdate();
  await activateWaitingServiceWorker();
  window.location.reload();
}