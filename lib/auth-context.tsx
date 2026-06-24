"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  startTransition,
} from 'react';
import { User, Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from './supabase/client';
import type { Profile } from './supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signingOut: boolean;
  isAdmin: boolean;
  isApprovedMember: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  revalidateAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function profilesDiffer(a: Profile | null | undefined, b: Profile | null | undefined): boolean {
  if (!a && !b) return false;
  if (!a || !b) return true;
  return (
    a.id !== b.id ||
    a.role !== b.role ||
    a.full_name !== b.full_name ||
    a.email !== b.email
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const userRef = useRef<User | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const signingOutRef = useRef(false);

  const applyAuthState = useCallback(
    (nextSession: Session | null, nextProfile: Profile | null | undefined, immediate = false) => {
      const nextUser = nextSession?.user ?? null;
      userRef.current = nextUser;

      const profileValue = nextProfile ?? null;
      if (profilesDiffer(profileRef.current, profileValue)) {
        profileRef.current = profileValue;
      }

      const apply = () => {
        setSession(nextSession);
        setUser(nextUser);
        setProfile(profileValue);
        setLoading(false);
      };

      if (immediate) {
        apply();
      } else {
        startTransition(apply);
      }
    },
    []
  );

  const clearAuthState = useCallback((immediate = true) => {
    userRef.current = null;
    profileRef.current = null;

    const apply = () => {
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
    };

    if (immediate) {
      apply();
    } else {
      startTransition(apply);
    }
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isApprovedMember = profile?.role === 'approved' || profile?.role === 'admin';

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('Profile fetch note (non-fatal):', error.message);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
      return null;
    }
  }

  const revalidateAuth = useCallback(async (): Promise<void> => {
    if (signingOutRef.current) return;

    try {
      const {
        data: { user: validatedUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !validatedUser) {
        clearAuthState(true);
        return;
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      const prof = await fetchProfile(validatedUser.id);
      applyAuthState(currentSession, prof, true);
    } catch (err) {
      console.error('revalidateAuth error (non-blocking):', err);
    }
  }, [applyAuthState, clearAuthState, supabase.auth]);

  async function refreshProfile(): Promise<void> {
    if (!userRef.current) return;

    try {
      const prof = await fetchProfile(userRef.current.id);
      if (prof && profilesDiffer(profileRef.current, prof)) {
        profileRef.current = prof;
        setProfile(prof);
      }
    } catch (err) {
      console.error('refreshProfile error (non-blocking):', err);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { user: validatedUser },
          error,
        } = await supabase.auth.getUser();

        if (!isMounted || signingOutRef.current) return;

        if (error || !validatedUser) {
          clearAuthState(true);
          return;
        }

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        const prof = await fetchProfile(validatedUser.id);
        if (!isMounted || signingOutRef.current) return;

        applyAuthState(currentSession, prof, true);
      } catch (err) {
        console.error('Initial auth session error (non-blocking):', err);
        if (isMounted) clearAuthState(true);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, nextSession: Session | null) => {
      if (!isMounted) return;

      if (signingOutRef.current && event !== 'SIGNED_OUT') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        signingOutRef.current = false;
        clearAuthState(true);
        return;
      }

      const nextUser = nextSession?.user ?? null;

      if (!nextUser) {
        clearAuthState(true);
        return;
      }

      try {
        const prof = await fetchProfile(nextUser.id);
        if (!isMounted || signingOutRef.current) return;

        const immediate = event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED';
        applyAuthState(nextSession, prof, immediate);

        if (event === 'SIGNED_IN') {
          if (prof?.role === 'pending') {
            toast.info(
              "Welcome! Your membership is pending approval. You'll get access to the Prayer Bulletin and Directory soon."
            );
          } else if (prof?.role === 'admin') {
            toast.success('Welcome back, Pastor! You have full admin access.');
          } else if (prof?.role === 'approved') {
            toast.success('Welcome back!');
          }
        }
      } catch (err) {
        console.error('Auth state profile fetch error (non-blocking):', err);
        if (isMounted && !signingOutRef.current) {
          applyAuthState(nextSession, null, true);
        }
      }
    });

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        revalidateAuth();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [applyAuthState, clearAuthState, revalidateAuth, supabase.auth]);

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data?.user) {
      try {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          role: 'pending',
        });
        if (insertError) {
          console.log('Profile insert note (signup):', insertError.message);
        }
      } catch (insertErr) {
        console.log('Profile insert error during signup (non-fatal):', insertErr);
      }
    }

    return {};
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    await revalidateAuth();
    return {};
  }

  const signOut = useCallback(async (): Promise<{ error?: string }> => {
    if (signingOutRef.current) return {};

    signingOutRef.current = true;
    setSigningOut(true);
    clearAuthState(true);

    try {
      const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
      if (localError) {
        console.warn('Local sign out note:', localError.message);
      }

      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (globalErr) {
        console.warn('Global sign out note (offline/non-fatal):', globalErr);
      }

      if (typeof window !== 'undefined') {
        window.location.replace('/');
        return {};
      }

      toast.success('Signed out successfully');
      return {};
    } catch (err) {
      signingOutRef.current = false;
      const message = err instanceof Error ? err.message : 'Sign out failed';
      toast.error(message);
      return { error: message };
    } finally {
      setSigningOut(false);
    }
  }, [clearAuthState, supabase.auth]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      signingOut,
      isAdmin,
      isApprovedMember,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      revalidateAuth,
    }),
    [user, session, profile, loading, signingOut, isAdmin, isApprovedMember, signOut, revalidateAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}