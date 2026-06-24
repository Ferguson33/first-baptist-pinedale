"use client";

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { hardRefreshApp } from '@/lib/pwa';

type RefreshAppButtonProps = {
  label?: string;
  variant?: 'primary' | 'secondary' | 'compact';
  className?: string;
  onRefreshing?: () => void;
};

export function RefreshAppButton({
  label = 'Refresh App',
  variant = 'secondary',
  className = '',
  onRefreshing,
}: RefreshAppButtonProps) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    onRefreshing?.();

    try {
      await hardRefreshApp();
    } catch (error) {
      console.error('Hard refresh failed:', error);
      setRefreshing(false);
      window.location.reload();
    }
  }

  const styles = {
    primary:
      'w-full px-4 py-2.5 bg-[var(--color-navy)] text-white rounded-xl text-sm font-semibold hover:bg-black transition disabled:opacity-60',
    secondary:
      'inline-flex items-center justify-center gap-2 px-4 py-2 border border-[var(--color-gold)]/40 text-[var(--color-navy)] rounded-full text-sm font-medium hover:bg-[var(--color-cream)] transition disabled:opacity-60',
    compact:
      'inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white/95 border border-[var(--color-gold)]/30 text-[var(--color-navy)] rounded-full text-xs font-medium shadow-md hover:bg-[var(--color-cream)] transition disabled:opacity-60',
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className={`${styles[variant]} ${className}`}
      aria-label={label}
    >
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? 'Refreshing…' : label}
    </button>
  );
}