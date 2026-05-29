"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await signIn(email, password);
        if (res.error) {
          toast.error(res.error);
        } else {
          router.push('/members');
        }
      } else {
        if (!fullName) {
          toast.error("Please enter your full name");
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, fullName);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Account created! While the pastors review your request, please take a moment to complete your member profile.");
          router.push('/members/profile');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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

        <div className="text-center mt-8 text-xs text-[var(--color-stone-light)]">
          For pastoral or technical help logging in, call the church office at (307) 367-4567.<br />
          <Link href="/" className="underline hover:text-[var(--color-navy)]">Return to public site</Link>
        </div>
      </div>
    </div>
  );
}
