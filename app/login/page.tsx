"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RefreshAppButton } from '@/components/RefreshAppButton';
import { isStandalonePwa } from '@/lib/pwa';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const { signIn, signUp, user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsPwa(isStandalonePwa());
  }, []);

  // Smart post-login redirect based on role.
  // Made non-blocking for pending users and safe on refresh (authLoading guards prevent premature redirects/crashes).
  useEffect(() => {
    if (authLoading) return;

    // Only act when we have a stable user + profile after load.
    // Pending users are intentionally sent to home (non-blocking, they see public content + toast on SIGNED_IN).
    if (user && profile) {
      if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'approved') {
        router.push('/'); // Normal members go to homepage
      } else {
        // pending: go home, membership approval is non-blocking
        router.push('/');
      }
    }
  }, [user, profile, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await signIn(email, password);
        if (res.error) {
          toast.error(res.error);
          setLoading(false);
        }
        // Redirection is handled by useEffect below once profile loads
      } else {
        if (!fullName) {
          toast.error("Please enter your full name");
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, fullName);
        if (res.error) {
          toast.error(res.error);
          setLoading(false);
        } else {
          toast.success("Account created! Your membership request is now pending pastor approval.");
          // New signups are pending → send to homepage
          router.push('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // While auth is initializing (e.g. after pending signup + refresh), show a non-blocking loader
  // so the page doesn't freeze or flash broken states.
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-[var(--color-cream)]">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[var(--color-stone-light)]">Checking your membership status...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-[var(--color-cream)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✝</div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)]">Welcome Back</h1>
          <p className="text-[var(--color-stone-light)] mt-1">Member access for First Baptist Pinedale</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-[var(--color-gold)]/10">
          <div className="flex rounded-full bg-[var(--color-cream)] p-1 mb-8 text-sm">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-full font-medium ${mode === 'login' ? 'bg-white shadow' : ''}`}>Sign In</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-full font-medium ${mode === 'signup' ? 'bg-white shadow' : ''}`}>Join the Church Family</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-medium text-[var(--color-stone)] tracking-wider">FULL NAME</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)}
                  className="w-full mt-1.5 border border-[var(--color-gold)]/30 rounded-xl px-4 py-3 text-lg focus:border-[var(--color-gold)]" 
                  required 
                  placeholder="Jane Doe"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--color-stone)] tracking-wider">EMAIL ADDRESS</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full mt-1.5 border border-[var(--color-gold)]/30 rounded-xl px-4 py-3 text-lg focus:border-[var(--color-gold)]" 
                required 
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--color-stone)] tracking-wider">PASSWORD</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full mt-1.5 border border-[var(--color-gold)]/30 rounded-xl px-4 py-3 text-lg focus:border-[var(--color-gold)]" 
                required 
                minLength={6}
                placeholder="••••••••"
              />
              {mode === 'signup' && <p className="text-xs text-[var(--color-stone-light)] mt-1">Minimum 6 characters</p>}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-[var(--color-navy)] hover:bg-black text-white font-semibold py-4 rounded-2xl transition disabled:opacity-70"
            >
              {loading ? "Please wait..." : mode === 'login' ? "Sign In to Your Account" : "Create Account & Request Membership"}
            </button>
          </form>

          {mode === 'signup' && (
            <div className="text-xs text-center mt-6 text-[var(--color-stone-light)]">
              Already have an account?{" "}
              <button onClick={() => setMode('login')} className="text-[var(--color-gold-dark)] hover:underline font-medium">
                Sign in instead
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-xs text-[var(--color-stone-light)] space-y-3">
          {isPwa && (
            <div>
              <p className="mb-2">App acting stuck or showing the wrong login state?</p>
              <RefreshAppButton label="Refresh App" variant="secondary" />
            </div>
          )}
          <p>
            Need help logging in? Call the church office at (307) 367-4567.<br />
            <Link href="/" className="underline hover:text-[var(--color-navy)]">Return to homepage</Link>
          </p>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
