"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from './supabase/client';
import type { Profile } from './supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isApprovedMember: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (prof) setProfile(prof);
    } catch (err) {
      console.error('refreshProfile error (non-blocking):', err);
      // Do not throw; keep UI responsive
    }
    // Intentionally not returning the profile — callers do not use the return value
  }

  useEffect(() => {
    let isMounted = true;

    // Get initial session - wrapped to prevent unhandled rejections and ensure loading always settles
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (isMounted) {
            setProfile(prof);
            setLoading(false);
          }
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        console.error('Initial auth session error (non-blocking):', err);
        if (isMounted) {
          setLoading(false);
          // Do not crash the app; user can still browse public content
        }
      }
    };

    initAuth();

    // Listen for auth changes - always settle loading, catch fetch errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const prof = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(prof);

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
            }
          } catch (err) {
            console.error('Auth state profile fetch error (non-blocking):', err);
            if (isMounted) setProfile(null);
          }
        } else {
          if (isMounted) setProfile(null);
        }
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  async function signOut() {
    await supabase.auth.signOut();

    // Let the middleware handle cookie/session clearing on next request.
    // Aggressive localStorage clearing can cause auth state to desync with the new SSR setup.

    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success("Signed out successfully");
  }

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isApprovedMember,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
