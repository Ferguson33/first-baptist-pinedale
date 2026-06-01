"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Upload, Users, BookOpen, Image, Calendar, TrendingUp, 
  CheckCircle, XCircle, Trash2, Edit2, Plus 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

// Types for admin
type AdminTab = 'overview' | 'sermons' | 'building' | 'youth' | 'members' | 'events' | 'guide';

interface LocalSermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  video_url: string;
  thumbnail_url: string;
  description: string;
}

interface LocalBuildingPhoto {
  id: string;
  url: string;
  caption: string;
}

interface LocalMember {
  id: string;
  name: string;
  spouse?: string;
  phone?: string;
  email?: string;
  notes?: string;
  approved: boolean;
}

interface LocalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  description: string;
  location?: string;
}

export default function AdminDashboard() {
  const { user, profile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');



  // Local state for demo (replace with real Supabase calls once connected)
  const [sermons, setSermons] = useState<LocalSermon[]>([
    { id: '1', title: "The Faith That Moves Mountains", preacher: "Ted York", date: "2025-02-23", video_url: "https://youtube.com/watch?v=dQw4w9wg", thumbnail_url: "https://picsum.photos/id/1016/600/340", description: "Mark 11:22-24" }
  ]);
  const [buildingPhotos, setBuildingPhotos] = useState<any[]>([]);
  const [youthPhotos, setYouthPhotos] = useState<any[]>([]);
  const [directory, setDirectory] = useState<LocalMember[]>([
    { id: 'm1', name: "Robert & Linda Thompson", spouse: "Linda", phone: "(307) 555-0182", approved: true }
  ]);
  const [events, setEvents] = useState<LocalEvent[]>([
    { id: 'e1', title: "Spring Potluck & Church Clean-up", date: "2025-05-17", time: "11:30 AM", description: "Bring a dish to share. All ages welcome!", location: "Church Fellowship Hall" }
  ]);

  const [progress, setProgress] = useState({ 
    physical_percent: 68, 
    funds_raised: 250000, 
    funds_goal: 451000 
  });
  const [progressNote, setProgressNote] = useState("");

  // Sermon Settings (Pastor Note + Upcoming Sermon + Sunday School for homepage)
  const [sermonSettings, setSermonSettings] = useState({
    pastor_note: "",
    upcoming_title: "",
    upcoming_reference: "",
    upcoming_date: "",
    sunday_school_lesson: "",
    sunday_school_reference: "",
    youth_sunday_school_lesson: "",
    youth_sunday_school_reference: "",
    youth_sunday_school_date: "",
    youth_pastor_note: "",
    youth_google_doc_url: "",
    live_video_id: "",
  });
  const [savingSermonSettings, setSavingSermonSettings] = useState(false);

  // Real members from Supabase (for approval / access control)
  const [realMembers, setRealMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null); // For viewing full profile in modal

  // Real sermons from Supabase (for Admin management)
  const [realSermons, setRealSermons] = useState<any[]>([]);
  const [loadingSermons, setLoadingSermons] = useState(false);

  async function fetchMembers() {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load members");
      console.error(error);
    } else {
      setRealMembers(data || []);
    }
    setLoadingMembers(false);
  }

  async function approveRealMember(userId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'approved' })
      .eq('id', userId);

    if (error) {
      toast.error("Failed to approve member");
    } else {
      toast.success("Member approved!");
      fetchMembers(); // refresh list
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragover');
  };

  const handleImageUpload = async (files: FileList | null, type: string) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    if (type === 'building') {
      const caption = prompt("Enter a short caption for this photo (e.g. 'Roof trusses installed')") || "New construction photo";

      try {
        toast.loading("Uploading photo...", { id: 'upload' });

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `building/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('building-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('building-photos')
          .getPublicUrl(filePath);

        // Insert record into database
        const { data: insertData, error: insertError } = await supabase
          .from('building_photos')
          .insert({
            url: urlData.publicUrl,
            caption: caption,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Add to local state
        setBuildingPhotos(prev => [...prev, {
          id: insertData.id,
          url: insertData.url,
          caption: insertData.caption
        }]);

        toast.success("Photo uploaded successfully!", { id: 'upload' });
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error("Failed to upload photo: " + (error.message || "Unknown error"), { id: 'upload' });
      }
    } 
    else if (type === 'sermon-thumb') {
      // For sermon upload flow
      toast.info("Thumbnail selected. Fill out the form below and save.");
      // Could open a modal in a full version
    }
    else if (type === 'youth') {
      // Exact same pattern as building photos (direct client-side)
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        const toastId = toast.loading("Uploading photo...");

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `youth/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('youth-photos')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('youth-photos')
            .getPublicUrl(filePath);

          const caption = prompt("Enter a short caption for this photo (optional)") || "";

          const { data: insertData, error: insertError } = await supabase
            .from('youth_photos')
            .insert({
              url: urlData.publicUrl,
              caption: caption,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          setYouthPhotos(prev => [insertData, ...prev]);

          toast.success("Photo uploaded successfully!", { id: toastId });
        } catch (error: any) {
          console.error('Youth upload error:', error);
          toast.error("Failed to upload photo: " + (error.message || "Unknown error"), { id: toastId });
        }
      }
    }
  };

  const approveMember = (id: string) => {
    setDirectory(prev => prev.map(m => m.id === id ? { ...m, approved: true } : m));
    toast.success("Member approved. They now have access to the directory and Prayer Bulletin.");
  };

  const addSermon = () => {
    const title = prompt("Sermon title?");
    if (!title) return;
    const newSermon: LocalSermon = {
      id: Date.now().toString(),
      title,
      preacher: "Ted York",
      date: new Date().toISOString().split('T')[0],
      video_url: "https://www.youtube.com/embed/dQw4w9wg",
      thumbnail_url: "https://picsum.photos/id/1015/600/340",
      description: "New sermon added via admin"
    };
    setSermons(prev => [newSermon, ...prev]);
    toast.success("Sermon added! In production you would also upload a custom thumbnail via drag & drop.");
  };

  const updateProgress = async () => {
    const phys = prompt("New physical progress % (0-100)?", progress.physical_percent.toString());
    const funds = prompt("Funds raised so far (whole dollars)?", progress.funds_raised.toString());
    const total = prompt("Total project cost / goal (whole dollars)?", progress.funds_goal.toString());
    
    if (!phys || !funds || !total) return;

    const newPhysical = Math.min(100, parseInt(phys));
    const newFunds = parseInt(funds);
    const newGoal = parseInt(total);

    const { error } = await supabase
      .from('building_progress')
      .update({
        physical_percent: newPhysical,
        funds_raised: newFunds,
        funds_goal: newGoal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      console.error("Supabase update error:", error);
      toast.error("Failed to update progress: " + (error.message || "Permission denied. Check RLS policies."));
    } else {
      setProgress({
        physical_percent: newPhysical,
        funds_raised: newFunds,
        funds_goal: newGoal,
      });
      toast.success("Progress updated! Changes are now live on the public Building Project page.");
    }
  };

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
      toast.error("Admin access only. Please sign in with an administrator account.");
    }
  }, [user, isAdmin, loading, router]);

  // Load building progress from Supabase
  const loadBuildingProgress = async () => {
    const { data, error } = await supabase
      .from('building_progress')
      .select('physical_percent, funds_raised, funds_goal, physical_note')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Failed to load building progress:', error);
    } else if (data) {
      setProgress(data);
      setProgressNote(data.physical_note || "");
    }
  };

  useEffect(() => {
    loadBuildingProgress();
    fetchBuildingPhotos(); // Load photos early so they're ready when switching to the tab
  }, []);

  // Fetch building photos when the building tab is active (helps when returning to the page)
  useEffect(() => {
    if (activeTab === 'building') {
      fetchBuildingPhotos();
      loadBuildingProgress();
    }
  }, [activeTab]);

  if (loading || !isAdmin) {
    return <div className="min-h-[60vh] flex items-center justify-center">Checking permissions…</div>;
  }

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'sermons', label: 'Sermons', icon: BookOpen },
    { id: 'building', label: 'Building Project', icon: Image },
    { id: 'youth', label: 'Youth Group', icon: Image },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'guide', label: 'Pastor Quick Guide', icon: CheckCircle },
  ];

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'members') {
      fetchMembers();
    }
    if (tab === 'building') {
      fetchBuildingPhotos();
      loadBuildingProgress();
    }
    if (tab === 'youth') {
      fetchYouthPhotos();
      loadSermonSettings();
    }
    if (tab === 'sermons') {
      loadSermonSettings();
      fetchRealSermons();
    }
  };

  async function fetchBuildingPhotos() {
    const { data, error } = await supabase
      .from('building_photos')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching building photos:', error);
    } else {
      setBuildingPhotos(data || []);
    }
  }

  async function fetchYouthPhotos() {
    const { data, error } = await supabase
      .from('youth_photos')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching youth photos:', error);
      toast.error("Failed to load youth photos");
    } else {
      setYouthPhotos(data || []);
    }
  }



  // === Sermon Settings (Pastor Note + Upcoming Sermon) ===
  async function loadSermonSettings() {
    const { data, error } = await supabase
      .from('sermon_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error loading sermon settings:', error);
    } else if (data) {
      setSermonSettings({
        pastor_note: data.pastor_note || "",
        upcoming_title: data.upcoming_title || "",
        upcoming_reference: data.upcoming_reference || "",
        upcoming_date: data.upcoming_date || "",
        sunday_school_lesson: data.sunday_school_lesson || "",
        sunday_school_reference: data.sunday_school_reference || "",
        youth_sunday_school_lesson: data.youth_sunday_school_lesson || "",
        youth_sunday_school_reference: data.youth_sunday_school_reference || "",
        youth_sunday_school_date: data.youth_sunday_school_date || "",
        youth_pastor_note: data.youth_pastor_note || "",
        youth_google_doc_url: data.youth_google_doc_url || "",
        live_video_id: data.live_video_id || "",
      });
    }
  }

  async function saveSermonSettings() {
    setSavingSermonSettings(true);
    const { error } = await supabase
      .from('sermon_settings')
      .update({
        pastor_note: sermonSettings.pastor_note || null,
        upcoming_title: sermonSettings.upcoming_title || null,
        upcoming_reference: sermonSettings.upcoming_reference || null,
        upcoming_date: sermonSettings.upcoming_date || null,
        sunday_school_lesson: sermonSettings.sunday_school_lesson || null,
        sunday_school_reference: sermonSettings.sunday_school_reference || null,
        youth_sunday_school_lesson: sermonSettings.youth_sunday_school_lesson || null,
        youth_sunday_school_reference: sermonSettings.youth_sunday_school_reference || null,
        youth_sunday_school_date: sermonSettings.youth_sunday_school_date || null,
        youth_pastor_note: sermonSettings.youth_pastor_note || null,
        youth_google_doc_url: sermonSettings.youth_google_doc_url || null,
        live_video_id: sermonSettings.live_video_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    setSavingSermonSettings(false);

    if (error) {
      console.error('Failed to save sermon settings:', error);
      toast.error("Failed to save sermon settings. Did you run the sermon-settings-update.sql file?");
    } else {
      toast.success("Homepage content updated!");
    }
  }

  // Load and manage real archived sermons
  async function fetchRealSermons() {
    setLoadingSermons(true);
    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading sermons:', error);
    } else {
      setRealSermons(data || []);
    }
    setLoadingSermons(false);
  }

  async function addRealSermon() {
    const title = prompt("Sermon title?");
    if (!title) return;

    const videoUrl = prompt("YouTube URL or Embed URL?");
    if (!videoUrl) return;

    const preacher = prompt("Preacher name?", "Pastor Ted York") || "Pastor Ted York";
    const date = prompt("Date (YYYY-MM-DD)?", new Date().toISOString().split('T')[0]);

    const { error } = await supabase.from('sermons').insert({
      title,
      preacher,
      date: date || new Date().toISOString().split('T')[0],
      video_url: videoUrl,
      thumbnail_url: "https://picsum.photos/id/1015/600/340", // placeholder for now
      description: "",
    });

    if (error) {
      toast.error("Failed to add sermon: " + error.message);
    } else {
      toast.success("Sermon added!");
      fetchRealSermons();
    }
  }

  // Track which sermon is currently being deleted (for loading state)
  const [deletingSermonId, setDeletingSermonId] = useState<string | null>(null);

  async function deleteRealSermon(id: string, title: string) {
    if (!confirm(`Delete sermon "${title}"?\n\nThis cannot be undone.`)) return;

    setDeletingSermonId(id);

    // Note: If you later store real thumbnails in Supabase Storage (instead of YouTube thumbnails),
    // you would also delete the file here using supabase.storage.from('sermons').remove([...])
    const { error } = await supabase.from('sermons').delete().eq('id', id);

    if (error) {
      toast.error("Failed to delete sermon: " + error.message);
    } else {
      toast.success("Sermon deleted");
      fetchRealSermons();
    }

    setDeletingSermonId(null);
  }

  async function deleteYouthPhoto(id: string, url: string) {
    if (!confirm("Delete this youth photo?")) return;

    try {
      // Delete from storage (path is "youth/filename")
      const path = url.split('/youth-photos/')[1];
      if (path) {
        await supabase.storage.from('youth-photos').remove([`youth/${path.split('/').pop()}`]);
      }

      // Delete from database
      const { error } = await supabase.from('youth_photos').delete().eq('id', id);
      if (error) throw error;

      setYouthPhotos(prev => prev.filter(p => p.id !== id));
      toast.success("Youth photo deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete youth photo");
    }
  }

  async function saveProgressNote() {
    const { error } = await supabase
      .from('building_progress')
      .update({ 
        physical_note: progressNote || null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', 1);

    if (error) {
      console.error("Failed to save progress note:", error);
      toast.error("Failed to save note: " + (error.message || "Permission denied"));
    } else {
      toast.success("Note saved! It will appear on the public Building Project page.");
      // Also update local progress state
      setProgress(prev => ({ ...prev, physical_note: progressNote || null }));
    }
  }

  async function deleteBuildingPhoto(id: string, url: string) {
    if (!confirm("Delete this photo?")) return;

    try {
      // Delete from storage
      const path = url.split('/building-photos/')[1];
      if (path) {
        await supabase.storage.from('building-photos').remove([`building/${path.split('/').pop()}`]);
      }

      // Delete from database
      const { error } = await supabase.from('building_photos').delete().eq('id', id);
      if (error) throw error;

      setBuildingPhotos(prev => prev.filter(p => p.id !== id));
      toast.success("Photo deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete photo");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">CHURCH ADMINISTRATION</div>
          <h1 className="text-5xl font-semibold tracking-tighter text-[var(--color-navy)]">Admin Dashboard</h1>
          <p className="text-[var(--color-stone-light)] mt-1">Welcome back, {profile?.full_name?.split(' ')[0] || 'Pastor'}. Everything here is simple — no coding required.</p>
        </div>
        <a href="/admin/quick-guide" target="_blank" className="text-sm px-4 py-2 border rounded-full hover:bg-white">Open Printable Quick Guide →</a>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-1 border-b mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id ? 'border-[var(--color-gold)] text-[var(--color-navy)]' : 'border-transparent text-[var(--color-stone-light)] hover:text-[var(--color-navy)]'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
            {tab.id === 'members' && realMembers.filter((m: any) => m.role === 'pending').length > 0 && (
              <span className="ml-1.5 px-1.5 py-px text-[10px] leading-none font-semibold bg-orange-500 text-white rounded-full">
                {realMembers.filter((m: any) => m.role === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="admin-section bg-white p-8 rounded-3xl">
            <div className="font-semibold mb-4 flex items-center gap-2 text-lg"><TrendingUp className="text-[var(--color-gold-dark)]" /> Quick Stats</div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between"><span>Pending Member Approvals</span><span className="font-semibold">{realMembers.filter((m: any) => m.role === 'pending').length || '—'}</span></div>
              <div className="flex justify-between"><span>Sermons Published</span><span className="font-semibold">{sermons.length}</span></div>
              <div className="flex justify-between"><span>Building Progress</span><span className="font-semibold">{progress.physical_percent}%</span></div>
            </div>
            <div className="text-xs mt-6 text-[var(--color-stone-light)]">All changes you make here update the website instantly for your members and visitors.</div>
          </div>

          <div className="admin-section bg-white p-8 rounded-3xl">
            <div className="font-semibold mb-4 text-lg">Getting Started</div>
            <ol className="space-y-3 text-sm text-[var(--color-stone)] list-decimal list-inside">
              <li>Upload new construction photos in the Building tab</li>
              <li>Add this week’s sermon (title + YouTube link + thumbnail)</li>
              <li>Approve new members in the Members tab</li>
              <li>Update building progress percentages anytime</li>
            </ol>
            <div className="mt-6 text-[10px] font-mono bg-[var(--color-cream)] p-3 rounded">TIP: Use the printable Pastor Quick Guide tab for a one-page cheat sheet you can keep by your desk.</div>
          </div>
        </div>
      )}

      {/* SERMONS TAB */}
      {activeTab === 'sermons' && (
        <div className="space-y-10">
          {/* === NEW: Pastor Note + Upcoming Sermon (pushes to homepage) === */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Homepage Sermon Teaser</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                This content appears on the main page for everyone. Use it for a short note from the Pastor and this week’s upcoming message.
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 space-y-8">
              {/* Pastor Note */}
              <div>
                <label className="block font-medium mb-2">Note from the Pastor (to the church family)</label>
                <textarea
                  value={sermonSettings.pastor_note}
                  onChange={(e) => setSermonSettings({ ...sermonSettings, pastor_note: e.target.value })}
                  rows={4}
                  className="w-full border border-[var(--color-gold)]/30 rounded-2xl p-4 text-sm"
                  placeholder="Example: Dear church family, as we continue through the Gospel of Mark..."
                />
                <p className="text-xs text-[var(--color-stone-light)] mt-1">This will be shown prominently on the homepage.</p>
              </div>

              {/* This Week’s Service */}
              <div>
                <div className="font-medium mb-3 text-lg">This Week’s Service</div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-medium mb-2 text-sm">Date</label>
                    <input
                      type="date"
                      value={sermonSettings.upcoming_date}
                      onChange={(e) => setSermonSettings({ ...sermonSettings, upcoming_date: e.target.value })}
                      className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-sm">Sermon Title</label>
                    <input
                      type="text"
                      value={sermonSettings.upcoming_title}
                      onChange={(e) => setSermonSettings({ ...sermonSettings, upcoming_title: e.target.value })}
                      className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                      placeholder="The Faith That Moves Mountains"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-sm">Scripture Reference</label>
                    <input
                      type="text"
                      value={sermonSettings.upcoming_reference}
                      onChange={(e) => setSermonSettings({ ...sermonSettings, upcoming_reference: e.target.value })}
                      className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                      placeholder="Mark 11:22-24"
                    />
                  </div>
                </div>
              </div>

              {/* Sunday School */}
              <div>
                <div className="font-medium mb-3 text-lg">Sunday School</div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-medium mb-2 text-sm">Lesson Title</label>
                    <input
                      type="text"
                      value={sermonSettings.sunday_school_lesson}
                      onChange={(e) => setSermonSettings({ ...sermonSettings, sunday_school_lesson: e.target.value })}
                      className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                      placeholder="The Armor of God"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-sm">Scripture Reference</label>
                    <input
                      type="text"
                      value={sermonSettings.sunday_school_reference}
                      onChange={(e) => setSermonSettings({ ...sermonSettings, sunday_school_reference: e.target.value })}
                      className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                      placeholder="Ephesians 6:10-18"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={saveSermonSettings}
                disabled={savingSermonSettings}
                className="w-full md:w-auto px-8 py-3 bg-[var(--color-navy)] text-white rounded-2xl font-medium disabled:opacity-60"
              >
                {savingSermonSettings ? "Saving..." : "Save All Homepage Content"}
              </button>
            </div>
          </div>

          {/* Live Stream Management */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Live Stream</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                Enter the YouTube Video ID (or full URL) for the current live service. Approved members will see the live player on the Sermons page.
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8">
              <label className="block font-medium mb-2 text-sm">Live YouTube Video ID or URL</label>
              <input
                type="text"
                value={sermonSettings.live_video_id}
                onChange={(e) => setSermonSettings({ ...sermonSettings, live_video_id: e.target.value })}
                className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm font-mono"
                placeholder="e.g. dQw4w9wg or https://www.youtube.com/watch?v=dQw4w9wg"
              />
              <p className="text-xs text-[var(--color-stone-light)] mt-2">
                <strong>Simplest way:</strong> Go to YouTube Studio → Go live (as Unlisted). Copy the video URL or ID, paste it here, and save. 
                The live player will appear instantly on the Sermons page for approved members. Clear this field when the stream ends.
              </p>
            </div>
          </div>

          {/* Real Archived Sermons Management */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="font-semibold text-2xl">Archived Sermons</div>
                <div className="text-sm text-[var(--color-stone-light)]">These will be visible only to signed-in approved members on the Sermons page.</div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={fetchRealSermons} 
                  disabled={loadingSermons}
                  className="admin-big-button px-4 border border-[var(--color-gold)] text-[var(--color-navy)] rounded-2xl text-sm"
                >
                  Refresh
                </button>
                <button 
                  onClick={addRealSermon} 
                  className="admin-big-button flex items-center gap-2 bg-[var(--color-navy)] text-white px-6 rounded-2xl"
                >
                  <Plus className="w-5 h-5" /> Add Sermon
                </button>
              </div>
            </div>

            {loadingSermons ? (
              <div className="text-center py-8 text-[var(--color-stone-light)]">Loading...</div>
            ) : realSermons.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {realSermons.map((s: any) => {
                  const isDeleting = deletingSermonId === s.id;
                  return (
                    <div key={s.id} className="bg-white border rounded-2xl p-5 relative group">
                      <button
                        onClick={() => deleteRealSermon(s.id, s.title)}
                        disabled={isDeleting}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete this sermon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="font-semibold text-[var(--color-navy)] pr-10">{s.title}</div>
                      <div className="text-sm mt-1 text-[var(--color-stone)]">
                        {s.preacher} • {new Date(s.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs mt-2 text-[var(--color-gold-dark)] truncate font-mono">{s.video_url}</div>

                      {isDeleting && (
                        <div className="mt-3 text-xs text-red-600">Deleting...</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--color-stone-light)] border rounded-2xl">
                No sermons added yet. Click “Add Sermon” above.
              </div>
            )}

            <div className="mt-6 admin-help text-xs">
              Paste the full YouTube URL (or embed URL). Only approved members will be able to watch these on the Sermons page after logging in.
            </div>
          </div>
        </div>
      )}

      {/* BUILDING PROJECT TAB - DRAG & DROP */}
      {activeTab === 'building' && (
        <div>
          <div className="flex justify-between mb-6">
            <div>
              <div className="font-semibold text-2xl">Building Project Management</div>
              <div className="text-sm text-[var(--color-stone-light)]">Update progress &amp; add construction photos that appear on the public page.</div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={async () => {
                  await loadBuildingProgress();
                  await fetchBuildingPhotos();
                  toast.success("Building data refreshed");
                }} 
                className="admin-big-button px-4 border border-[var(--color-gold)] text-[var(--color-navy)] rounded-2xl text-sm"
              >
                Refresh Data
              </button>
              <button onClick={updateProgress} className="admin-big-button px-6 bg-[var(--color-gold)] text-white rounded-2xl">Update Progress Numbers</button>
            </div>
          </div>

          {/* Current Progress */}
          <div className="bg-white p-8 rounded-3xl mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="font-medium mb-2">Physical Progress: {progress.physical_percent}%</div>
                <div className="h-4 bg-[var(--color-cream)] rounded-full overflow-hidden">
                  <div className="progress-bar h-full bg-[var(--color-gold-dark)]" style={{ width: `${progress.physical_percent}%` }} />
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Funds Raised: ${progress.funds_raised.toLocaleString()} / ${progress.funds_goal.toLocaleString()}</div>
                <div className="h-4 bg-[var(--color-cream)] rounded-full overflow-hidden">
                  <div className="progress-bar h-full bg-[var(--color-navy)]" style={{ width: `${Math.min(100, (progress.funds_raised / progress.funds_goal) * 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Editable Physical Progress Note */}
            <div className="mt-6">
              <div className="font-medium mb-2">Physical Progress Note (shown on public page)</div>
              <textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                className="w-full border border-[var(--color-gold)]/30 rounded-lg p-3 text-sm min-h-[80px]"
                placeholder="Enter a short note about the current physical progress..."
              />
              <button 
                onClick={saveProgressNote}
                className="mt-2 px-4 py-1.5 text-sm bg-[var(--color-navy)] text-white rounded-lg hover:bg-black transition"
              >
                Save Note
              </button>
            </div>
          </div>

          {/* BIG DRAG & DROP ZONE */}
          <div 
            className="dropzone dropzone-large mb-6" 
            onDragOver={handleDragOver} 
            onDragLeave={handleDragLeave}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleImageUpload(e.dataTransfer.files, 'building'); }}
            onClick={() => document.getElementById('building-upload')?.click()}
          >
            <Upload className="w-10 h-10 text-[var(--color-gold-dark)] mb-4" />
            <div className="font-semibold text-xl">Drag &amp; Drop New Construction Photos Here</div>
            <div className="text-[var(--color-stone-light)] mt-1">or click to browse • JPG or PNG recommended</div>
            <input id="building-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files, 'building')} />
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {buildingPhotos.map(photo => (
              <div key={photo.id} className="group relative rounded-2xl overflow-hidden border aspect-video bg-[var(--color-cream)]">
                <img 
                  src={photo.url} 
                  alt={photo.caption || ""} 
                  className="w-full h-full object-contain p-1" 
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-3 text-xs text-white">{photo.caption}</div>
                
                {/* Delete button */}
                <button
                  onClick={() => deleteBuildingPhoto(photo.id, photo.url)}
                  className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="admin-help mt-4">Photos you add here will appear on the public Building Project page with beautiful masonry layout.</div>
        </div>
      )}

      {/* YOUTH GROUP - Sunday School + Pastor Note + Photo management */}
      {activeTab === 'youth' && (
        <div className="space-y-10">
          {/* Note from the Youth Pastor */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Note from the Youth Pastor</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                This will appear prominently on the Youth Ministry page.
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8">
              <textarea
                value={sermonSettings.youth_pastor_note}
                onChange={(e) => setSermonSettings({ ...sermonSettings, youth_pastor_note: e.target.value })}
                rows={5}
                className="w-full border border-[var(--color-gold)]/30 rounded-2xl p-4 text-sm"
                placeholder="Example: Hey teens! This week we're talking about..."
              />
              <p className="text-xs text-[var(--color-stone-light)] mt-2">This note will be shown on the /youth page.</p>
            </div>
          </div>

          {/* Google Doc Embed for Youth Page */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Youth Google Doc Embed</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                Optional: Embed a Google Doc on the Youth Ministry page (similar to the Member Directory and Prayer Bulletin pages).
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8">
              <label className="block font-medium mb-2 text-sm">Google Doc Publish Link (embed URL)</label>
              <input
                type="text"
                value={sermonSettings.youth_google_doc_url}
                onChange={(e) => setSermonSettings({ ...sermonSettings, youth_google_doc_url: e.target.value })}
                className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm"
                placeholder="https://docs.google.com/document/d/e/XXXXXXXXXXXXXXXX/pub?embedded=true"
              />
              <p className="text-xs text-[var(--color-stone-light)] mt-2">
                Paste the "Publish to web" embed link here. Leave blank to hide the section on the Youth page.
              </p>
            </div>
          </div>

          {/* Youth Sunday School - same structure as main service */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Youth Sunday School (Homepage)</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                This will appear on the main page in the Youth section.
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block font-medium mb-2 text-sm">Date</label>
                  <input
                    type="date"
                    value={sermonSettings.youth_sunday_school_date}
                    onChange={(e) => setSermonSettings({ ...sermonSettings, youth_sunday_school_date: e.target.value })}
                    className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm">Lesson Title</label>
                  <input
                    type="text"
                    value={sermonSettings.youth_sunday_school_lesson}
                    onChange={(e) => setSermonSettings({ ...sermonSettings, youth_sunday_school_lesson: e.target.value })}
                    className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                    placeholder="The Armor of God"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm">Scripture Reference</label>
                  <input
                    type="text"
                    value={sermonSettings.youth_sunday_school_reference}
                    onChange={(e) => setSermonSettings({ ...sermonSettings, youth_sunday_school_reference: e.target.value })}
                    className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3"
                    placeholder="Ephesians 6:10-18"
                  />
                </div>
              </div>

              <button
                onClick={saveSermonSettings}
                disabled={savingSermonSettings}
                className="mt-6 w-full md:w-auto px-8 py-3 bg-[var(--color-navy)] text-white rounded-2xl font-medium disabled:opacity-60"
              >
                {savingSermonSettings ? "Saving..." : "Save Youth Sunday School to Homepage"}
              </button>
            </div>
          </div>

          {/* Photos section - Simple flat list (no albums) */}
          <div>
            <div className="flex justify-between mb-6">
              <div>
                <div className="font-semibold text-2xl">Youth Ministry Photos</div>
                <div className="text-sm text-[var(--color-stone-light)]">Drag photos here. They will appear on the public Youth page.</div>
              </div>
              <button 
                onClick={async () => {
                  await fetchYouthPhotos();
                  toast.success("Youth photos refreshed");
                }} 
                className="admin-big-button px-4 border border-[var(--color-gold)] text-[var(--color-navy)] rounded-2xl text-sm"
              >
                Refresh
              </button>
            </div>

          {/* BIG DRAG & DROP ZONE */}
          <div 
            className="dropzone dropzone-large mb-6" 
            onDragOver={handleDragOver} 
            onDragLeave={handleDragLeave}
            onDrop={(e) => { 
              e.preventDefault(); 
              e.currentTarget.classList.remove('dragover'); 
              handleImageUpload(e.dataTransfer.files, 'youth'); 
            }}
            onClick={() => document.getElementById('youth-upload')?.click()}
          >
            <Upload className="w-10 h-10 text-[var(--color-gold-dark)] mb-4" />
            <div className="font-semibold text-xl">
              Drag &amp; Drop Youth Photos Here
            </div>
            <div className="text-[var(--color-stone-light)] mt-1">
              or click to browse • JPG or PNG recommended
            </div>
            <input 
              id="youth-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleImageUpload(e.target.files, 'youth')} 
            />
          </div>

          {/* Current Youth Photos - flat grid */}
          <div className="bg-white p-8 rounded-3xl">
            <div className="font-semibold mb-4">Youth Photos</div>
            {youthPhotos.length === 0 ? (
              <div className="text-[var(--color-stone-light)] py-4">No youth photos yet. Drag photos into the box above to get started.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {youthPhotos.map((photo: any) => (
                  <div key={photo.id} className="group relative rounded-2xl overflow-hidden border aspect-video bg-[var(--color-cream)]">
                    <img 
                      src={photo.url} 
                      alt={photo.caption || ""} 
                      className="w-full h-full object-contain p-1" 
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-3 text-xs text-white">
                      {photo.caption || "Youth photo"}
                    </div>
                    
                    <button
                      onClick={() => deleteYouthPhoto(photo.id, photo.url)}
                      className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-help mt-4">Photos you add here will appear on the public Youth Ministry page.</div>
          </div> {/* close photos section */}
        </div>
      )}

      {/* MEMBERS - Approve access to private areas (using Supabase profiles) */}
      {activeTab === 'members' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="font-semibold text-2xl">Members — Approve New Access</div>
            <button 
              onClick={fetchMembers} 
              disabled={loadingMembers}
              className="px-4 py-2 text-sm border rounded-full hover:bg-[var(--color-cream)]"
            >
              {loadingMembers ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8">
            {loadingMembers && <div className="text-center py-8 text-[var(--color-stone-light)]">Loading members...</div>}

            {!loadingMembers && realMembers.length === 0 && (
              <div className="text-center py-6 text-[var(--color-stone-light)]">
                No members found yet. When someone signs up, they will appear here as "pending".
              </div>
            )}

            {!loadingMembers && realMembers.map((m: any) => {
              // Build nice display name for couples
              const displayName = m.spouse_name 
                ? `${m.full_name} & ${m.spouse_name}` 
                : m.full_name;

              return (
                <div 
                  key={m.id} 
                  onClick={() => setSelectedMember(m)}
                  className="flex justify-between border-b py-4 last:border-0 items-center gap-4 hover:bg-[var(--color-cream)] cursor-pointer rounded-lg px-2 -mx-2 transition"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-lg">{displayName}</div>
                    
                    <div className="text-xs text-[var(--color-stone-light)] mt-0.5">{m.email}</div>

                    {/* Key dates and phone */}
                    <div className="text-sm mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[var(--color-stone)]">
                      {m.phone && <div>📞 {m.phone}</div>}
                      {m.birthdate && <div>🎂 {m.birthdate}</div>}
                      {m.anniversary && <div>💍 Anniversary: {m.anniversary}</div>}
                      {m.spouse_birthdate && <div>🎂 Spouse: {m.spouse_birthdate}</div>}
                    </div>

                    <div className="text-[10px] mt-1.5 uppercase tracking-wider">
                      Status: <span className={m.role === 'approved' ? 'text-green-600' : m.role === 'admin' ? 'text-[var(--color-gold-dark)]' : 'text-orange-600'}>
                        {m.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {m.role === 'pending' ? (
                      <button 
                        onClick={() => approveRealMember(m.id)} 
                        className="px-5 py-1.5 bg-[var(--color-gold)] text-white rounded-full text-xs font-semibold whitespace-nowrap"
                      >
                        APPROVE MEMBERSHIP
                      </button>
                    ) : (
                      <span className="text-xs px-4 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                        {m.role === 'admin' ? 'Admin' : 'Approved'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-sm">When you approve someone they gain access to the Member Directory, Prayer Bulletin, and other private areas.</div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMember(null)}>
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-8 relative" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-2xl leading-none text-[var(--color-stone-light)] hover:text-[var(--color-navy)]"
            >
              ×
            </button>

            <div className="font-semibold text-2xl mb-1">
              {selectedMember.spouse_name 
                ? `${selectedMember.full_name} & ${selectedMember.spouse_name}` 
                : selectedMember.full_name}
            </div>
            <div className="text-sm text-[var(--color-stone-light)] mb-6">{selectedMember.email}</div>

            {selectedMember.photo_url && (
              <img 
                src={selectedMember.photo_url} 
                alt="Member photo" 
                className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-4 border-[var(--color-cream)]" 
              />
            )}

            <div className="space-y-3 text-sm">
              {selectedMember.phone && <div><strong>Phone:</strong> {selectedMember.phone}</div>}
              {selectedMember.birthdate && <div><strong>Birthdate:</strong> {selectedMember.birthdate}</div>}
              {selectedMember.anniversary && <div><strong>Anniversary:</strong> {selectedMember.anniversary}</div>}
              {selectedMember.spouse_birthdate && <div><strong>Spouse Birthdate:</strong> {selectedMember.spouse_birthdate}</div>}
              {selectedMember.address && <div><strong>Address:</strong> {selectedMember.address}</div>}
              {selectedMember.notes && (
                <div>
                  <strong>Notes:</strong><br />
                  <span className="text-[var(--color-stone)]">{selectedMember.notes}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              {selectedMember.role === 'pending' && (
                <button 
                  onClick={() => {
                    approveRealMember(selectedMember.id);
                    setSelectedMember(null);
                  }} 
                  className="px-6 py-2 bg-[var(--color-gold)] text-white rounded-full text-sm font-semibold"
                >
                  Approve Membership
                </button>
              )}
              <button 
                onClick={() => setSelectedMember(null)} 
                className="px-6 py-2 border rounded-full text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENTS */}
      {activeTab === 'events' && (
        <div>
          <div className="flex justify-between mb-6">
            <div className="font-semibold text-2xl">Upcoming Events</div>
            <button onClick={() => {
              const title = prompt("Event title?");
              if (!title) return;
              setEvents(e => [...e, { id: Date.now().toString(), title, date: "2025-06-15", description: "New event added from dashboard" }]);
              toast.success("Event added");
            }} className="admin-big-button flex items-center gap-2 bg-[var(--color-navy)] text-white px-6 rounded-2xl"><Plus /> Add Event</button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {events.map(ev => (
              <div key={ev.id} className="border bg-white p-6 rounded-2xl">
                <div className="font-semibold text-xl">{ev.title}</div>
                <div className="text-[var(--color-gold-dark)] mt-1">{ev.date} {ev.time && `at ${ev.time}`}</div>
                <p className="mt-3 text-sm">{ev.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PASTOR QUICK GUIDE TAB */}
      {activeTab === 'guide' && (
        <div className="max-w-3xl">
          <div className="font-semibold text-2xl mb-4">Pastor Quick Guide (One-Page Printable)</div>
          <p className="text-sm mb-6">Click the button below to open a clean printable version. Use your browser’s Print → “Save as PDF”.</p>
          <a href="/admin/quick-guide" target="_blank" className="inline-block bg-[var(--color-gold)] text-white px-8 py-4 rounded-2xl font-semibold">Open Printable Pastor Quick Guide →</a>
          
          <div className="mt-10 text-xs space-y-1 text-[var(--color-stone-light)]">
            <div>• Update Building Progress anytime from the Building tab</div>
            <div>• Maintain the Prayer Bulletin Google Doc for the Prayer Bulletin page</div>
            <div>• Add YouTube links for sermons (embed format preferred)</div>
            <div>• Drag photos directly onto the big drop zones — no file naming required</div>
          </div>
        </div>
      )}
    </div>
  );
}
