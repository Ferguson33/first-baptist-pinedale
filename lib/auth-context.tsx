"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('Profile fetch note:', error.message);
      return null;
    }
    return data as Profile;
  }

  async function refreshProfile(): Promise<void> {
    if (!user) return;
    const prof = await fetchProfile(user.id);
    if (prof) setProfile(prof);
    // Intentionally not returning the profile — callers do not use the return value
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then((prof) => {
          setProfile(prof);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          setProfile(prof);
          
          // Show friendly message on login
          if (event === 'SIGNED_IN') {
            if (prof?.role === 'pending') {
              toast.info("Welcome! Your membership is pending approval. You'll get access to the Prayer Bulletin and Directory soon.");
            } else if (prof?.role === 'admin') {
              toast.success("Welcome back, Pastor! You have full admin access.");
            } else if (prof?.role === 'approved') {
              toast.success("Welcome back!");
            }
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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

    // Profile is created automatically by the database trigger (handle_new_user)
    // We keep this comment as documentation. No client-side insert.

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
