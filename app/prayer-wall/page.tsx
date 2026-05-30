"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Heart, Send } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Prayer {
  id: number;
  name: string;
  text: string;
  date: string;
  user_id?: string;   // needed for "delete my own" UI
  hasPhoto?: boolean;
}

export default function PrayerWall() {
  const { isApprovedMember, user, profile } = useAuth();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loadingPrayers, setLoadingPrayers] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const [newRequest, setNewRequest] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch only approved prayers for the public wall
  const fetchApprovedPrayers = async () => {
    setLoadingPrayers(true);
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching approved prayers (FULL):', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: (error as any).status,
      });
      if (process.env.NODE_ENV !== 'production') {
        toast.error(`Fetch error: ${error.message || '403 / permission denied (RLS)'}`);
      }
      setPrayers([]);
    } else {
      const formatted = (data || []).map((p: any) => ({
        id: p.id,
        name: p.is_anonymous ? 'Anonymous' : p.requester_name || 'Member',
        text: p.request_text,
        date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        user_id: p.user_id || undefined,
      }));
      setPrayers(formatted);
    }
    setLoadingPrayers(false);
  };

  useEffect(() => {
    fetchApprovedPrayers();
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const submitPrayer = async () => {
    if (!newRequest.trim()) return;
    if (!isApprovedMember) {
      toast.error("You must be an approved member to submit prayers. Please sign in or wait for approval.");
      return;
    }

    setSubmitting(true);

    // Trusted members (pastor-approved) bypass the review queue
    const autoApprove = !!profile?.prayer_auto_approve;
    const insertStatus = autoApprove ? 'approved' : 'pending';

    const { error } = await supabase.from('prayer_requests').insert({
      requester_name: isAnonymous ? 'Anonymous' : (profile?.full_name || user?.user_metadata?.full_name || 'Member'),
      request_text: newRequest.trim(),
      is_anonymous: isAnonymous,
      status: insertStatus,
      user_id: user?.id || null,
    });

    setSubmitting(false);

    if (error) {
      console.error('Prayer insert error (FULL):', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: (error as any).status,
      });
      toast.error(error.message || "Permission denied. Ask a pastor to check the Supabase policies.");
    } else {
      setNewRequest("");
      setIsAnonymous(false);
      if (autoApprove) {
        toast.success("Your prayer has been posted to the Prayer Wall.");
      } else {
        toast.success("Thank you. Your prayer request has been submitted for pastor approval. It will appear once approved.");
      }
    }
  };

  // Allow logged-in users to delete their own prayers
  const deleteMyPrayer = async (prayerId: number) => {
    if (!user) return;
    if (!confirm("Delete this prayer request? This cannot be undone.")) return;

    setDeletingId(prayerId);

    const { error } = await supabase
      .from('prayer_requests')
      .delete()
      .eq('id', prayerId)
      .eq('user_id', user.id); // Extra safety: only delete if it belongs to them

    setDeletingId(null);

    if (error) {
      console.error('Delete prayer error (may be missing RLS policy):', error);
      toast.error("Could not delete prayer — if this persists after refresh, ask a pastor to run the latest RLS policies SQL file.");
    } else {
      toast.success("Prayer deleted");
      fetchApprovedPrayers(); // refresh the list
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="text-center mb-12">
        <Heart className="w-8 h-8 mx-auto text-[var(--color-gold-dark)]" />
        <h1 className="text-5xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Prayer Wall</h1>
        <p className="mt-3 text-lg">We believe God hears and answers prayer. Share your requests with our church family.</p>
      </div>

      {/* Submit form */}
      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 mb-12">
        {!isClient ? (
          // Render the same on server and initial client render to prevent hydration mismatch
          <div className="text-center py-4">
            <p className="text-[var(--color-stone)]">Loading…</p>
          </div>
        ) : !isApprovedMember ? (
          <div className="text-center py-4">
            <p className="text-[var(--color-stone)]">You must be a logged-in, approved member to submit prayer requests.</p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium underline">Sign in or create an account →</Link>
          </div>
        ) : (
          <>
            <textarea 
              value={newRequest}
              onChange={e => setNewRequest(e.target.value)}
              placeholder="Share your prayer request here... (you can be anonymous if you prefer)"
              className="w-full min-h-[110px] resize-y border border-[var(--color-gold)]/30 rounded-2xl p-5 text-base focus:border-[var(--color-gold)]"
            />
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} /> Submit anonymously
              </label>
              <button 
                onClick={submitPrayer} 
                disabled={submitting || !newRequest.trim()}
                className="flex items-center gap-2 px-7 py-3 bg-[var(--color-navy)] text-white rounded-2xl disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
            <div className="text-xs text-[var(--color-stone-light)] mt-3">All requests are reviewed by the pastoral team before appearing publicly.</div>
          </>
        )}
      </div>

      {/* Prayer List (only approved) */}
      <div className="space-y-4">
        {loadingPrayers && <div className="text-center text-[var(--color-stone-light)]">Loading prayers…</div>}
        {!loadingPrayers && prayers.length === 0 && (
          <div className="text-center text-[var(--color-stone-light)]">No approved prayers yet. Check back soon.</div>
        )}
        {prayers.map(p => (
          <div key={p.id} className="prayer-card bg-white border-l-4 border-[var(--color-gold)] p-6 rounded-r-2xl">
            <div className="flex justify-between text-sm items-start">
              <div className="font-semibold">{p.name}</div>
              <div className="flex items-center gap-3">
                <div className="text-[var(--color-stone-light)]">{p.date}</div>
                {/* Allow user to delete their own prayer */}
                {user && (p as any).user_id === user.id && (
                  <button
                    onClick={() => deleteMyPrayer(p.id)}
                    disabled={deletingId === p.id}
                    className="text-red-500 hover:text-red-700 text-xs px-2 py-0.5 rounded hover:bg-red-50 disabled:opacity-50"
                    title="Delete your prayer"
                  >
                    {deletingId === p.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 text-[15px] leading-relaxed text-[var(--color-stone)]">{p.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
