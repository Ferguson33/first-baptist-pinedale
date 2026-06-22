"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, startTransition } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Refs to avoid unnecessary state updates / re-renders of consumers when the listener
  // or init re-fires with essentially the same data (common with Supabase on mount/nav).
  // Combined with startTransition + value useMemo, this further reduces the chance of
  // #310 during admin page entry or refresh.
  const userRef = React.useRef<User | null>(null);
  const profileRef = React.useRef<Profile | null>(null);

  const clearAuthState = useCallback((immediate = false) => {
    userRef.current = null;
    profileRef.current = null;
    const apply = () => {
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
    };
    // Logout must update the UI right away; startTransition can defer it past navigation.
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
        // Common for brand new signups before profile row is created, or RLS edge cases
        console.log('Profile fetch note (non-fatal):', error.message);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
      return null;
    }
  }

  async function refreshProfile(): Promise<void> {
    if (!user) return;
    try {
      const prof = await fetchProfile(user.id);
      if (prof) {
        const profChanged = prof.id !== profileRef.current?.id;
        if (profChanged) profileRef.current = prof;
        startTransition(() => {
          if (profChanged) setProfile(prof);
        });
      }
    } catch (err) {
      console.error('refreshProfile error (non-blocking):', err);
      // Do not throw; keep UI responsive
    }
    // Intentionally not returning the profile — callers do not use the return value
  }

  useEffect(() => {
    let isMounted = true;

    // Get initial session - ALL state updates wrapped in startTransition to avoid
    // "Cannot update a component while rendering a different component" (#310)
    // during hydration / hard refresh of admin (or other consumers).
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        const nextUser = session?.user ?? null;
        // Only set if actually a different user (by id) to reduce provider re-renders
        if (nextUser?.id !== userRef.current?.id) {
          userRef.current = nextUser;
          startTransition(() => {
            setSession(session);
            setUser(nextUser);
          });
        } else {
          // still ensure session is current even if user same
          startTransition(() => setSession(session));
        }

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (isMounted) {
            const nextProf = prof;
            if (nextProf?.id !== profileRef.current?.id || !profileRef.current) {
              profileRef.current = nextProf;
              startTransition(() => {
                setProfile(nextProf);
                setLoading(false);
              });
            } else {
              startTransition(() => setLoading(false));
            }
          }
        } else {
          if (isMounted) startTransition(() => setLoading(false));
        }
      } catch (err) {
        console.error('Initial auth session error (non-blocking):', err);
        if (isMounted) {
          startTransition(() => setLoading(false));
          // Do not crash the app; user can still browse public content
        }
      }
    };

    initAuth();

    // Listen for auth changes - wrap *all* sets (session/user/profile/loading) in startTransition.
    // The bare sets were the source of #310 when listener fired around the same time the
    // admin dashboard (or other complex pages) was rendering its initial tree on refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          clearAuthState(true);
          return;
        }

        const nextUser = session?.user ?? null;
        if (nextUser?.id !== userRef.current?.id) {
          userRef.current = nextUser;
          startTransition(() => {
            setSession(session);
            setUser(nextUser);
          });
        } else {
          startTransition(() => setSession(session));
        }

        if (session?.user) {
          try {
            const prof = await fetchProfile(session.user.id);
            if (isMounted) {
              const nextProf = prof;
              const profChanged = nextProf?.id !== profileRef.current?.id || !profileRef.current;
              if (profChanged) {
                profileRef.current = nextProf;
              }
              startTransition(() => {
                if (profChanged) {
                  setProfile(nextProf);
                }

                // Show friendly message on login (non-blocking)
                if (event === 'SIGNED_IN') {
                  if (prof?.role === 'pending') {
                    toast.info("Welcome! Your membership is pending approval. You'll get access to the Prayer Bulletin and Directory soon.");
                  } else if (prof?.role === 'admin') {
                    toast.success("Welcome back, Pastor! You have full admin access.");
                  } else if (prof?.role === 'approved') {
                    toast.success("Welcome back!");
                  }
                }
              });
            }
          } catch (err) {
            console.error('Auth state profile fetch error (non-blocking):', err);
            if (isMounted) {
              profileRef.current = null;
              startTransition(() => setProfile(null));
            }
          }
        } else {
          if (isMounted) {
            profileRef.current = null;
            startTransition(() => setProfile(null));
          }
        }
        if (isMounted) startTransition(() => setLoading(false));
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuthState, supabase.auth]);

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

    // Explicitly create the profile row as 'pending' so:
    // - Admin can see/approve it in the members list
    // - Profile fetches succeed on refresh (prevents null profile + flaky auth)
    // - Pending users have a record with role for isApprovedMember checks
    // This is non-blocking: if insert fails (e.g. row already exists from trigger), we still succeed the signup.
    if (data?.user) {
      try {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: 'pending',
          });
        if (insertError) {
          // Common cases: row already created by DB trigger, or RLS (we'll add policy)
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
    return {};
  }

  const signOut = useCallback(async (): Promise<{ error?: string }> => {
    if (signingOut) return {};

    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        toast.error(`Sign out failed: ${error.message}`);
        return { error: error.message };
      }

      clearAuthState(true);
      toast.success('Signed out successfully');
      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      toast.error(message);
      return { error: message };
    } finally {
      setSigningOut(false);
    }
  }, [clearAuthState, signingOut, supabase.auth]);

  // Memoize context value so consumers only re-render when actual auth state changes.
  // Combined with startTransition on all internal sets, this eliminates #310 during
  // provider bootstrap on hard refreshes of the admin dashboard.
  const value = useMemo(() => ({
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
  }), [user, session, profile, loading, signingOut, isAdmin, isApprovedMember, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
