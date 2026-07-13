"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Upload, Users, BookOpen, Image, Calendar, TrendingUp, 
  CheckCircle, XCircle, Trash2, Edit2, Plus 
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { SERMON_EMBED_MODE_LABELS, normalizeEmbedMode, type SermonEmbedMode } from '@/lib/sermon-display';
import { formatAlbumDate, formatLocalDate, todayLocalDateString } from '@/lib/format-date';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/youtube';
import { ensureAccessToken, uploadFileViaApi, withAdminSessionRetry, type UploadProgress } from '@/lib/storage-upload';
import { UploadProgressBanner } from '@/components/UploadProgressBanner';

// Types for admin
type AdminTab = 'overview' | 'sermons' | 'building' | 'youth' | 'members' | 'events' | 'guide';

interface LocalBuildingPhoto {
  id: string;
  url: string;
  caption: string;
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
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  // Redirect non-admins. This lives in the thin shell so we never mount the heavy
  // AdminDashboardContent (with 100+ lines of useState, effects, controlled forms,
  // lists, and JSX) while the AuthProvider is still settling on hard refresh.
  // The separate component mount happens only after the provider's startTransition
  // updates have committed, which is the reliable way to avoid React #310.
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
      toast.error("Admin access only. Please sign in with an administrator account.");
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return <div className="min-h-[60vh] flex items-center justify-center">Checking permissions…</div>;
  }

  // Auth is good and stable. Mount the heavy dashboard content in its own component.
  // This breaks the timing where provider updates (even in startTransition) could
  // coincide with the initial render of the giant admin tree.
  return <AdminDashboardContent />;
}

function AdminDashboardContent() {
  const supabase = createClient();
  const { profile } = useAuth(); // re-consume cheaply for the welcome name in header
  const router = useRouter(); // local if needed (redirect is handled in shell)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  // Note: We intentionally always start on 'overview' (no sessionStorage or auto-restore).
  // This is the safe default that prevents the #310 crash on hard refresh inside admin.
  // Refreshing the admin dashboard will land you back here — this is acceptable per current requirements.

  // Client-only mounted flag inside the content. We use it only to gate the
  // data-loading useEffects (so fetches don't start on the absolute first render
  // of the heavy tree). The UI itself is already protected by the shell.
  const [isMounted, setIsMounted] = useState(false);

  const [buildingPhotos, setBuildingPhotos] = useState<any[]>([]);
  const [youthPhotos, setYouthPhotos] = useState<any[]>([]);
  const [youthAlbums, setYouthAlbums] = useState<any[]>([]);
  const [selectedYouthAlbumId, setSelectedYouthAlbumId] = useState<string | null>(null);
  const [youthEvents, setYouthEvents] = useState<any[]>([]);
  const [showYouthEventForm, setShowYouthEventForm] = useState(false);
  const [editingYouthEvent, setEditingYouthEvent] = useState<any>(null);
  const [youthEventForm, setYouthEventForm] = useState({
    title: "",
    date: "",
    description: "",
    image_url: "",
    link_url: "",
  });
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const [uploadingBuilding, setUploadingBuilding] = useState(false);
  const [uploadingYouth, setUploadingYouth] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [lastFailedUpload, setLastFailedUpload] = useState<{
    files: File[];
    type: string;
    caption?: string;
  } | null>(null);
  const [savingYouthEvent, setSavingYouthEvent] = useState(false);

  // Album form (nice modal instead of prompt() — fixes bugginess)
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<any>(null);
  const [albumForm, setAlbumForm] = useState({ title: "", date: "" });
  const [savingAlbum, setSavingAlbum] = useState(false);

  // General spotlight event form (nice modal, replaces old prompts)
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({ title: "", date: "", time: "", description: "", location: "" });
  const [savingEvent, setSavingEvent] = useState(false);

  const [events, setEvents] = useState<any[]>([]);

  const [progress, setProgress] = useState({ 
    physical_percent: 68, 
    funds_raised: 250000, 
    funds_goal: 451000 
  });
  const [progressNote, setProgressNote] = useState("");

  // Sermon Settings (Pastor Note + Upcoming Sermon + Sunday School for homepage)
  // IMPORTANT: The initializer MUST list every key that loadSermonSettings() or
  // the various onChange handlers (including the events_google_doc_url one in the
  // Events tab) will ever set. Otherwise TS infers a narrow type and the
  // "object literal may only specify known properties" error appears at build time.
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
    events_google_doc_url: "",
    prayer_bulletin_google_doc_url: "",
    nursery_schedule_google_doc_url: "",
    live_video_id: "",
    live_stream_active: false,
    live_stream_public: false,
    welcome_video_id: "",
    pastor_york_video_id: "",
    pastor_holmes_video_id: "",
  });
  const [savingSermonSettings, setSavingSermonSettings] = useState(false);

  // Real members from Supabase (for approval / access control)
  const [realMembers, setRealMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null); // For viewing full profile in modal

  // Real sermons from Supabase (for Admin management)
  const [realSermons, setRealSermons] = useState<any[]>([]);
  const [loadingSermons, setLoadingSermons] = useState(false);

  // Form state for adding/editing sermon (replaces old prompt-based add)
  const [showSermonForm, setShowSermonForm] = useState(false);
  const [editingSermon, setEditingSermon] = useState<any>(null);
  const [sermonForm, setSermonForm] = useState({
    title: "",
    preacher: "Pastor Ted York",
    date: todayLocalDateString(),
    video_url: "",
    description: "",
    is_public: false,
    embed_mode: 'auto' as SermonEmbedMode,
  });
  // Keep these with other sermon state (not late in the file) so save handlers always close over stable hooks.
  const [deletingSermonId, setDeletingSermonId] = useState<string | null>(null);
  const [savingSermon, setSavingSermon] = useState(false);

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
      fetchMembers();
    }
  }

  async function removeMemberAccount(
    userId: string,
    memberName: string,
    action: 'deny' | 'delete'
  ) {
    const verb = action === 'deny' ? 'deny membership for' : 'remove';
    const confirmed = confirm(
      `${action === 'deny' ? 'Deny' : 'Remove'} ${memberName}?\n\nThis deletes their login and profile. They will lose member access and must sign up again to rejoin. This cannot be undone.`
    );
    if (!confirmed) return;

    setMemberActionId(userId);
    try {
      const accessToken = await ensureAccessToken(supabase);

      const res = await fetch('/api/admin/members/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(result.error || `Failed to ${verb} member`);
        return;
      }

      toast.success(
        action === 'deny'
          ? `${memberName} was denied and removed from the member list.`
          : `${memberName} was removed from the church member accounts.`
      );
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      console.error('removeMemberAccount error:', err);
      toast.error(`Failed to ${verb} member`);
    } finally {
      setMemberActionId(null);
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

  function resetFileInput(id: string) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.value = '';
  }

  const handleImageUpload = async (
    files: FileList | null,
    type: string,
    options: { caption?: string; isRetry?: boolean } = {}
  ) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (fileArray.length === 0) {
      toast.error('Please upload an image or video file (JPG, PNG, MP4, etc.)');
      return;
    }

    if (type === 'sermon-thumb') {
      toast.info('Thumbnail selected. Fill out the form below and save.');
      return;
    }

    if (type === 'building') {
      const prompted =
        options.caption ??
        prompt("Enter a short caption for this photo (e.g. 'Roof trusses installed')");

      if (prompted === null) return;

      const caption = prompted.trim() || 'New construction photo';

      setUploadingBuilding(true);
      setLastFailedUpload(null);

      try {
        for (const file of fileArray) {
          const result = await uploadFileViaApi(supabase, file, {
            bucket: 'building-photos',
            caption,
            target: 'building',
            onProgress: setUploadProgress,
          });

          setBuildingPhotos((prev) => [
            ...prev,
            {
              id: result.id,
              url: result.url,
              caption,
            },
          ]);
        }

        setUploadProgress({ phase: 'done', percent: 100, message: 'Upload complete' });
        toast.success('Photo uploaded successfully!');
        fetch('/api/revalidate?path=/building-project', { method: 'POST' }).catch(() => {});
        resetFileInput('building-upload');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Upload error:', error);
        setUploadProgress({ phase: 'error', percent: 0, message });
        setLastFailedUpload({ files: fileArray, type, caption });
        toast.error(`Failed to upload: ${message}`);
      } finally {
        setUploadingBuilding(false);
        window.setTimeout(() => setUploadProgress(null), 4000);
      }

      return;
    }

    if (type === 'youth') {
      const albumId = selectedYouthAlbumId;
      setUploadingYouth(true);
      setLastFailedUpload(null);

      try {
        for (const file of fileArray) {
          const result = await uploadFileViaApi(supabase, file, {
            bucket: 'youth-photos',
            albumId,
            target: 'album',
            onProgress: setUploadProgress,
          });

          if (result.id) {
            setYouthPhotos((prev) => [
              {
                id: result.id,
                url: result.url,
                caption: null,
                album_id: albumId || null,
              },
              ...prev,
            ]);
          }
        }

        setUploadProgress({ phase: 'done', percent: 100, message: 'All uploads complete' });
        toast.success(fileArray.length > 1 ? 'Photos uploaded!' : 'Photo uploaded!');
        await fetchYouthPhotos();
        resetFileInput('youth-upload');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Youth upload error:', error);
        setUploadProgress({ phase: 'error', percent: 0, message });
        setLastFailedUpload({ files: fileArray, type });
        toast.error(`Upload failed: ${message}`);
      } finally {
        setUploadingYouth(false);
        window.setTimeout(() => setUploadProgress(null), 4000);
      }
    }
  };

  async function retryLastUpload() {
    if (!lastFailedUpload) return;

    const dt = new DataTransfer();
    lastFailedUpload.files.forEach((file) => dt.items.add(file));
    await handleImageUpload(dt.files, lastFailedUpload.type, {
      caption: lastFailedUpload.caption,
      isRetry: true,
    });
  }

  async function refreshPublicPages() {
    const res = await fetch('/api/revalidate?all=1', { method: 'POST' });
    if (res.ok) {
      toast.success('Site pages refreshed.');
    } else {
      toast.error("Refresh didn't complete. Please try again.");
    }
  }

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

  // Mark this content component as mounted after the first client effect tick.
  // The data-loading useEffects are guarded with && isMounted so fetches (which
  // perform setState) only start after the heavy tree has mounted. The shell
  // already ensures we only mount this content when auth is settled.
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (isMounted) {
      loadBuildingProgress();
      fetchBuildingPhotos();
      fetchMembers();
      fetchRealSermons();
    }
  }, [isMounted]);

  // Fetch building photos when the building tab is active (helps when returning to the page)
  useEffect(() => {
    if (activeTab === 'building' && isMounted) {
      fetchBuildingPhotos();
      loadBuildingProgress();
    }
  }, [activeTab, isMounted]);

  // Fetch events data when the events tab is active (so data loads on tab switch and on refresh if tab is restored)
  useEffect(() => {
    if (activeTab === 'events' && isMounted) {
      fetchEvents();
      // Load schedule Google Doc URL from DB so it can be edited remotely in admin
      loadSermonSettings();
    }
  }, [activeTab, isMounted]);

  // Auto-load data for other tabs on activation or restore after auth
  useEffect(() => {
    if (activeTab === 'members' && isMounted) {
      fetchMembers();
    }
  }, [activeTab, isMounted]);

  useEffect(() => {
    if (activeTab === 'sermons' && isMounted) {
      loadSermonSettings();
      fetchRealSermons();
    }
  }, [activeTab, isMounted]);

  useEffect(() => {
    if (activeTab === 'youth' && isMounted) {
      fetchYouthPhotos();
      fetchYouthAlbums();
      loadSermonSettings();
      fetchYouthEvents();
    }
  }, [activeTab, isMounted]);

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
    // Data loading for each tab is handled by dedicated useEffects below (triggered when activeTab changes, after auth is ready).
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

  // Helper to make pasting Google Doc embeds user-friendly.
  // Users often copy the entire <iframe src="..."> tag from Google's "Publish to web" dialog.
  // This extracts just the URL so the input always ends up with a clean publish link.
  function extractGoogleDocEmbedUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // If it contains an iframe tag, pull out the src attribute
    if (trimmed.toLowerCase().includes('<iframe')) {
      const match = trimmed.match(/src\s*=\s*["']([^"']+)["']/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Otherwise assume they already gave us the bare URL
    return trimmed;
  }

  async function fetchYouthAlbums() {
    const { data, error } = await supabase
      .from('youth_albums')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching youth albums:', error);
    } else {
      setYouthAlbums(data || []);
    }
  }

  async function fetchYouthEvents() {
    const { data, error } = await supabase
      .from('youth_events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching youth events:', error);
    } else {
      setYouthEvents(data || []);
    }
  }

  async function deleteYouthAlbum(id: string, title: string) {
    if (!confirm(`Delete album "${title}" and all its photos? This cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('youth_albums').delete().eq('id', id);

      if (error) throw error;

      toast.success("Album deleted");
      setYouthAlbums(prev => prev.filter((a: any) => a.id !== id));

      if (selectedYouthAlbumId === id) {
        setSelectedYouthAlbumId(null);
      }

      fetchYouthPhotos();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to delete album: " + (error.message || "Unknown error"));
    }
  }

  // Youth Events management (for Upcoming Events on /youth-ministry page)
  function openYouthEventForm(ev?: any) {
    if (ev) {
      setEditingYouthEvent(ev);
      setYouthEventForm({
        title: ev.title || "",
        date: ev.date || "",
        description: ev.description || "",
        image_url: ev.image_url || "",
        link_url: ev.link_url || "",
      });
    } else {
      setEditingYouthEvent(null);
      setYouthEventForm({
        title: "",
        date: "",
        description: "",
        image_url: "",
        link_url: "",
      });
    }
    setShowYouthEventForm(true);
  }

  function closeYouthEventForm() {
    setShowYouthEventForm(false);
    setEditingYouthEvent(null);
  }

  async function saveYouthEvent() {
    if (!youthEventForm.title) {
      toast.error("Title is required.");
      return;
    }

    setSavingYouthEvent(true);
    try {
      const payload = { ...youthEventForm };

      let error;
      if (editingYouthEvent) {
        ({ error } = await supabase.from('youth_events').update(payload).eq('id', editingYouthEvent.id));
      } else {
        ({ error } = await supabase.from('youth_events').insert(payload));
      }

      if (error) {
        console.error('Youth event save error:', error);
        toast.error("Failed to save event: " + (error.message || "Unknown error"));
      } else {
        toast.success(editingYouthEvent ? "Event updated!" : "Event added!");
        closeYouthEventForm();
        fetchYouthEvents();
        // Remote update for public youth page
        fetch('/api/revalidate?path=/youth-ministry', { method: 'POST' }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Unexpected error saving youth event:', err);
      toast.error("Failed to save youth event. Please try again.");
    } finally {
      setSavingYouthEvent(false);
    }
  }

  async function deleteYouthEvent(id: string, title: string) {
    if (!confirm(`Delete event "${title}"?`)) return;

    const { error } = await supabase.from('youth_events').delete().eq('id', id);

    if (error) {
      toast.error("Failed to delete event: " + error.message);
    } else {
      toast.success("Event deleted");
      fetchYouthEvents();
    }
  }

  // === Nice Album modal (replaces prompt-based create/edit for reliability) ===
  function openAlbumForm(album?: any) {
    if (album) {
      setEditingAlbum(album);
      setAlbumForm({ title: album.title || "", date: album.date || "" });
    } else {
      setEditingAlbum(null);
      setAlbumForm({ title: "", date: todayLocalDateString() });
    }
    setShowAlbumForm(true);
  }

  function closeAlbumForm() {
    setShowAlbumForm(false);
    setEditingAlbum(null);
  }

  async function saveAlbum() {
    if (!albumForm.title.trim()) {
      toast.error("Album title is required.");
      return;
    }
    setSavingAlbum(true);

    const payload = {
      title: albumForm.title.trim(),
      date: albumForm.date || null,
    };

    let error;
    if (editingAlbum) {
      ({ error } = await supabase.from('youth_albums').update(payload).eq('id', editingAlbum.id));
    } else {
      ({ error } = await supabase.from('youth_albums').insert(payload));
    }

    setSavingAlbum(false);

    if (error) {
      toast.error("Failed to save album: " + error.message);
    } else {
      toast.success(editingAlbum ? "Album updated!" : "Album created!");
      closeAlbumForm();
      fetchYouthAlbums();
    }
  }

  // Override old prompt versions with nice modal versions (kept for backward calls in UI)
  async function createYouthAlbum() {
    openAlbumForm();
  }

  async function editYouthAlbum(album: any) {
    openAlbumForm(album);
  }

  // Upload image for youth event (reuses youth upload api but for event target)
  async function uploadYouthEventImage(file: File) {
    setUploadingEventImage(true);
    setUploadProgress(null);

    try {
      const result = await uploadFileViaApi(supabase, file, {
        bucket: 'youth-photos',
        target: 'event',
        onProgress: setUploadProgress,
      });

      setYouthEventForm((prev) => ({ ...prev, image_url: result.url }));
      setUploadProgress({ phase: 'done', percent: 100, message: 'Image ready for event' });
      toast.success('Image uploaded for event');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Event image upload error:', err);
      setUploadProgress({ phase: 'error', percent: 0, message });
      toast.error(`Failed to upload image: ${message}`);
    } finally {
      setUploadingEventImage(false);
      window.setTimeout(() => setUploadProgress(null), 4000);
    }
  }

  // === Events (Spotlight / Special Events for public Events page) ===
  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        toast.error("Failed to load events: " + (error.message || error));
      } else {
        setEvents(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error in fetchEvents:', err);
      toast.error("Failed to load events: " + (err?.message || 'Unknown error'));
    }
  }

  // Nice modal handlers for general spotlight events (no more prompts)
  function openEventForm(ev?: any) {
    if (ev) {
      setEditingEvent(ev);
      setEventForm({
        title: ev.title || "",
        date: ev.date || "",
        time: ev.time || "",
        description: ev.description || "",
        location: ev.location || "",
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: "",
        date: todayLocalDateString(),
        time: "",
        description: "",
        location: "",
      });
    }
    setShowEventForm(true);
  }

  function closeEventForm() {
    setShowEventForm(false);
    setEditingEvent(null);
  }

  async function saveGeneralEvent() {
    if (!eventForm.title.trim() || !eventForm.date) {
      toast.error("Title and date are required.");
      return;
    }
    setSavingEvent(true);

    try {
      const payload = {
        title: eventForm.title.trim(),
        date: eventForm.date,
        time: eventForm.time || null,
        description: eventForm.description || null,
        location: eventForm.location || null,
      };

      const { error } = await withAdminSessionRetry(supabase, async () => {
        if (editingEvent) {
          return supabase.from('events').update(payload).eq('id', editingEvent.id);
        }
        return supabase.from('events').insert(payload);
      });

      if (error) {
        toast.error("Failed to save event: " + error.message);
      } else {
        toast.success(editingEvent ? "Event updated!" : "Event added!");
        closeEventForm();
        fetchEvents();
        fetch('/api/revalidate?path=/events', { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      console.error('saveGeneralEvent error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to save event. Please try again.");
    } finally {
      setSavingEvent(false);
    }
  }

  // Legacy names kept for any old calls, now open the nice form
  function addEvent() { openEventForm(); }
  function editEvent(ev: any) { openEventForm(ev); }

  async function deleteEvent(id: string, title: string) {
    try {
      if (!confirm(`Delete event "${title}"?`)) return;

      const { error } = await supabase.from('events').delete().eq('id', id);

      if (error) {
        console.error('Failed to delete event:', error);
        toast.error("Failed to delete event");
      } else {
        toast.success("Event deleted");
        fetchEvents();

        // Trigger public page refresh (non-blocking)
        fetch('/api/revalidate?path=/events', { method: 'POST' }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Unexpected error in deleteEvent:', err);
      toast.error("Failed to delete event");
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
        events_google_doc_url: data.events_google_doc_url || "",
        prayer_bulletin_google_doc_url: data.prayer_bulletin_google_doc_url || "",
        nursery_schedule_google_doc_url: data.nursery_schedule_google_doc_url || "",
        live_video_id: data.live_video_id || "",
        live_stream_active: data.live_stream_active || false,
        live_stream_public: data.live_stream_public || false,
        welcome_video_id: data.welcome_video_id || "",
        pastor_york_video_id: data.pastor_york_video_id || "",
        pastor_holmes_video_id: data.pastor_holmes_video_id || "",
      });
    }
  }

  function normalizedYouTubeId(urlOrId: string): string | null {
    return extractYouTubeVideoId(urlOrId) || urlOrId?.trim() || null;
  }

  function normalizedLiveVideoId(): string | null {
    return normalizedYouTubeId(sermonSettings.live_video_id);
  }

  function strictYouTubeId(urlOrId: string): string | null {
    const trimmed = urlOrId.trim();
    if (!trimmed) return null;
    return extractYouTubeVideoId(trimmed);
  }

  function normalizedHomepageVideoIds() {
    return {
      welcome: strictYouTubeId(sermonSettings.welcome_video_id),
      york: strictYouTubeId(sermonSettings.pastor_york_video_id),
      holmes: strictYouTubeId(sermonSettings.pastor_holmes_video_id),
    };
  }

  async function saveSermonSettings(successMessage = 'Homepage content updated!') {
    setSavingSermonSettings(true);
    try {
      const liveVideoId = normalizedLiveVideoId();
      const homepageVideos = normalizedHomepageVideoIds();
      const { error } = await withAdminSessionRetry(supabase, async () =>
        supabase
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
            events_google_doc_url: sermonSettings.events_google_doc_url || null,
            prayer_bulletin_google_doc_url: sermonSettings.prayer_bulletin_google_doc_url || null,
            nursery_schedule_google_doc_url: sermonSettings.nursery_schedule_google_doc_url || null,
            live_video_id: liveVideoId,
            live_stream_active: sermonSettings.live_stream_active && !!liveVideoId,
            live_stream_public: sermonSettings.live_stream_public && !!liveVideoId,
            welcome_video_id: homepageVideos.welcome,
            pastor_york_video_id: homepageVideos.york,
            pastor_holmes_video_id: homepageVideos.holmes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1)
      );

      if (error) {
        console.error('Failed to save sermon settings:', error);
        toast.error("Couldn't save settings. Please try again, or contact the site administrator if this continues.");
      } else {
        setSermonSettings((prev) => ({
          ...prev,
          live_video_id: liveVideoId || '',
          welcome_video_id: homepageVideos.welcome || '',
          pastor_york_video_id: homepageVideos.york || '',
          pastor_holmes_video_id: homepageVideos.holmes || '',
        }));
        toast.success(successMessage);
        fetch('/api/revalidate?paths=/,/sermons,/youth-ministry', { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      console.error('saveSermonSettings error:', err);
      toast.error(err instanceof Error ? err.message : "Couldn't save settings. Please try again.");
    } finally {
      setSavingSermonSettings(false);
    }
  }

  async function saveLiveStreamSettings() {
    const liveVideoId = normalizedLiveVideoId();
    if (sermonSettings.live_stream_active && !liveVideoId) {
      toast.error('Paste a YouTube link or video ID before turning on the live stream.');
      return;
    }
    await saveSermonSettings(
      sermonSettings.live_stream_active
        ? sermonSettings.live_stream_public
          ? 'Live stream is on and public on the Sermons page.'
          : 'Live stream is on for members only on the Sermons page.'
        : 'Live stream is off.'
    );
  }

  async function saveHomepageVideos() {
    const homepageVideos = normalizedHomepageVideoIds();
    const invalidFields: string[] = [];

    if (sermonSettings.welcome_video_id.trim() && !homepageVideos.welcome) {
      invalidFields.push('Welcome video');
    }
    if (sermonSettings.pastor_york_video_id.trim() && !homepageVideos.york) {
      invalidFields.push('Pastor York intro');
    }
    if (sermonSettings.pastor_holmes_video_id.trim() && !homepageVideos.holmes) {
      invalidFields.push('Pastor Holmes intro');
    }

    if (invalidFields.length > 0) {
      toast.error(`Could not read a valid YouTube link for: ${invalidFields.join(', ')}.`);
      return;
    }

    await saveSermonSettings('Homepage videos updated!');
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

  // Open form for new or edit
  function openSermonForm(sermon?: any) {
    if (sermon) {
      setEditingSermon(sermon);
      setSermonForm({
        title: sermon.title || "",
        preacher: sermon.preacher || "Pastor Ted York",
        date: sermon.date || todayLocalDateString(),
        video_url: sermon.video_url || "",
        description: sermon.description || "",
        is_public: sermon.is_public || false,
        embed_mode: normalizeEmbedMode(sermon.embed_mode),
      });
    } else {
      setEditingSermon(null);
      setSermonForm({
        title: "",
        preacher: "Pastor Ted York",
        date: todayLocalDateString(),
        video_url: "",
        description: "",
        is_public: false,
        embed_mode: 'auto',
      });
    }
    setShowSermonForm(true);
  }

  function closeSermonForm() {
    setShowSermonForm(false);
    setEditingSermon(null);
  }

  async function saveRealSermon() {
    if (!sermonForm.title?.trim() || !sermonForm.video_url?.trim()) {
      toast.error("Title and YouTube URL are required.");
      return;
    }

    const videoId = extractYouTubeVideoId(sermonForm.video_url);
    if (!videoId) {
      toast.error("Could not read a valid YouTube link or 11-character video ID. Check the link and try again.");
      return;
    }

    setSavingSermon(true);
    try {
      const payload = {
        title: sermonForm.title.trim(),
        preacher: (sermonForm.preacher || "Pastor Ted York").trim(),
        date: sermonForm.date || todayLocalDateString(),
        video_url: sermonForm.video_url.trim(),
        // thumbnail_url is NOT NULL in the DB — always send a real YouTube thumb.
        thumbnail_url: getYouTubeThumbnailUrl(videoId, 'hq'),
        description: sermonForm.description || "",
        is_public: sermonForm.is_public,
        embed_mode: sermonForm.embed_mode,
      };

      // ensureAccessToken + one automatic retry: same class of first-attempt
      // JWT/RLS failures we already fixed for photo uploads.
      const { error } = await withAdminSessionRetry(supabase, async () => {
        if (editingSermon) {
          return supabase.from('sermons').update(payload).eq('id', editingSermon.id);
        }
        return supabase.from('sermons').insert(payload);
      });

      if (error) {
        toast.error("Failed to save sermon: " + error.message);
      } else {
        toast.success(editingSermon ? "Sermon updated!" : "Sermon added!");
        closeSermonForm();
        fetchRealSermons();
        // Bust public sermons (curated + live settings affect homepage too)
        fetch('/api/revalidate?paths=/sermons,/', { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      console.error('saveRealSermon error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to save sermon. Please try again.");
    } finally {
      setSavingSermon(false);
    }
  }

  // Legacy add kept for backward but now opens form (can remove later)
  function addRealSermon() {
    openSermonForm();
  }

  async function deleteRealSermon(id: string, title: string) {
    if (!confirm(`Delete sermon "${title}"?\n\nThis cannot be undone.`)) return;

    setDeletingSermonId(id);

    try {
      // Note: If you later store real thumbnails in Supabase Storage (instead of YouTube thumbnails),
      // you would also delete the file here using supabase.storage.from('sermons').remove([...])
      const { error } = await withAdminSessionRetry(supabase, async () =>
        supabase.from('sermons').delete().eq('id', id)
      );

      if (error) {
        toast.error("Failed to delete sermon: " + error.message);
      } else {
        toast.success("Sermon deleted");
        fetchRealSermons();
      }
    } catch (err) {
      console.error('deleteRealSermon error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to delete sermon. Please try again.");
    } finally {
      setDeletingSermonId(null);
    }
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
      toast.success("Progress note saved.");
      // Also update local progress state
      setProgress(prev => ({ ...prev, physical_note: progressNote || null }));
      // Remote cache bust so public sees it immediately
      fetch('/api/revalidate?path=/building-project', { method: 'POST' }).catch(() => {});
      fetch('/api/revalidate?path=/', { method: 'POST' }).catch(() => {});
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
          <p className="text-[var(--color-stone-light)] mt-1">Welcome back, {profile?.full_name?.split(' ')[0] || 'Pastor'}.</p>
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
              <div className="flex justify-between"><span>Current Members</span><span className="font-semibold">{realMembers.filter((m: any) => m.role === 'approved' || m.role === 'admin').length || '—'}</span></div>
              <div className="flex justify-between"><span>Pending Member Approvals</span><span className="font-semibold">{realMembers.filter((m: any) => m.role === 'pending').length || '—'}</span></div>
              <div className="flex justify-between"><span>Sermons Published</span><span className="font-semibold">{realSermons.length}</span></div>
              <div className="flex justify-between"><span>Building Progress</span><span className="font-semibold">{progress.physical_percent}%</span></div>
            </div>
            <div className="text-xs mt-6 text-[var(--color-stone-light)]">Saved changes usually appear right away for members and visitors.</div>
          </div>

          <div className="admin-section bg-white p-8 rounded-3xl">
            <div className="font-semibold mb-4 text-lg">Getting Started</div>
            <ol className="space-y-3 text-sm text-[var(--color-stone)] list-decimal list-inside">
              <li>Upload new construction photos in the Building tab</li>
              <li>Add this week’s sermon (title + YouTube link)</li>
              <li>Approve new members in the Members tab</li>
              <li>Update building progress percentages anytime</li>
            </ol>
            <p className="mt-6 text-xs text-[var(--color-stone-light)]">Open the Pastor Quick Guide tab for a printable one-page reference.</p>
          </div>

          <div className="admin-section bg-white p-8 rounded-3xl md:col-span-2">
            <div className="font-semibold mb-2 text-lg">Refresh Site Pages</div>
            <p className="text-sm text-[var(--color-stone)] mb-4">
              If a page still shows old content after saving, refresh all public pages here. Most saves update automatically.
            </p>
            <button
              onClick={refreshPublicPages}
              className="px-6 py-2.5 bg-[var(--color-navy)] text-white rounded-2xl text-sm font-medium"
            >
              Refresh All Pages
            </button>
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
                <p className="text-xs text-[var(--color-stone-light)] mt-1">Shown on the homepage.</p>
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
                onClick={() => saveSermonSettings()}
                disabled={savingSermonSettings}
                className="w-full md:w-auto px-8 py-3 bg-[var(--color-navy)] text-white rounded-2xl font-medium disabled:opacity-60"
              >
                {savingSermonSettings ? "Saving..." : "Save All Homepage Content"}
              </button>
            </div>
          </div>

          {/* Homepage Videos */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Homepage Videos</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                Paste YouTube links for the welcome Short and optional pastor intro videos. Leave a field blank to hide that section on the homepage.
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 space-y-6">
              <div>
                <label className="block font-medium mb-2 text-sm">Welcome video (YouTube Short)</label>
                <input
                  type="text"
                  value={sermonSettings.welcome_video_id}
                  onChange={(e) => setSermonSettings({ ...sermonSettings, welcome_video_id: e.target.value })}
                  className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm font-mono"
                  placeholder="https://www.youtube.com/shorts/xxxx or video ID"
                />
                <p className="text-xs text-[var(--color-stone-light)] mt-1">
                  Shown in the &quot;Welcome to First Baptist Church&quot; section on the homepage.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium mb-2 text-sm">Pastor Ted &amp; Teresa York intro (optional)</label>
                  <input
                    type="text"
                    value={sermonSettings.pastor_york_video_id}
                    onChange={(e) => setSermonSettings({ ...sermonSettings, pastor_york_video_id: e.target.value })}
                    className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm font-mono"
                    placeholder="YouTube URL or video ID"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm">Pastor Heath &amp; Tessa Holmes intro (optional)</label>
                  <input
                    type="text"
                    value={sermonSettings.pastor_holmes_video_id}
                    onChange={(e) => setSermonSettings({ ...sermonSettings, pastor_holmes_video_id: e.target.value })}
                    className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm font-mono"
                    placeholder="YouTube URL or video ID"
                  />
                </div>
              </div>

              <p className="text-xs text-[var(--color-stone-light)]">
                Pastor intro videos appear in the &quot;Meet the Pastors&quot; section. Shorts and regular videos both work.
              </p>

              <button
                onClick={saveHomepageVideos}
                disabled={savingSermonSettings}
                className="px-6 py-2.5 bg-[var(--color-navy)] text-white rounded-2xl text-sm font-medium disabled:opacity-60"
              >
                {savingSermonSettings ? 'Saving...' : 'Save Homepage Videos'}
              </button>
            </div>
          </div>

          {/* Live Stream Management */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Live Stream</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                Paste the YouTube live link, choose Public or Private, then save.
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-2">
                <label className="block font-medium text-sm">Live YouTube Video ID or URL</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sermonSettings.live_stream_active}
                    onChange={(e) => setSermonSettings({ ...sermonSettings, live_stream_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Live stream active
                </label>
              </div>
              <input
                type="text"
                value={sermonSettings.live_video_id}
                onChange={(e) => setSermonSettings({ ...sermonSettings, live_video_id: e.target.value })}
                className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm font-mono"
                placeholder="e.g. abc123XYZ or https://www.youtube.com/watch?v=abc123XYZ"
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={sermonSettings.live_stream_public}
                  onChange={(e) => setSermonSettings({ ...sermonSettings, live_stream_public: e.target.checked })}
                  className="w-4 h-4"
                />
                Public — show to everyone (unchecked = members only)
              </label>
              <p className="text-xs text-[var(--color-stone-light)] mt-2">
                Check &quot;Live stream active&quot;, paste the YouTube link, then click Save Live Stream.
              </p>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
                For &quot;Watch Here&quot; on the site to work: in YouTube Studio open the live stream → Details →
                Show more → turn on <strong>Allow embedding</strong>. If that is off, visitors can still use
                &quot;Watch on YouTube.&quot;
              </p>
              <button
                onClick={saveLiveStreamSettings}
                disabled={savingSermonSettings}
                className="mt-4 px-6 py-2.5 bg-[var(--color-navy)] text-white rounded-2xl text-sm font-medium disabled:opacity-60"
              >
                {savingSermonSettings ? 'Saving...' : 'Save Live Stream'}
              </button>
            </div>
          </div>

          {/* Real Archived Sermons Management */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="font-semibold text-2xl">Archived Sermons</div>
                <div className="text-sm text-[var(--color-stone-light)]">Add title, date, and YouTube link. Newest sermon embeds automatically.</div>
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

            {/* Sermon Add/Edit Form Modal */}
            {showSermonForm && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={closeSermonForm}>
                <div className="bg-white rounded-3xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
                  <div className="font-semibold text-xl mb-4">{editingSermon ? "Edit Sermon" : "Add New Sermon"}</div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <input type="text" value={sermonForm.title} onChange={e => setSermonForm({...sermonForm, title: e.target.value})} className="w-full mt-1 border rounded-xl p-3" placeholder="Sermon Title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Preacher</label>
                        <input type="text" value={sermonForm.preacher} onChange={e => setSermonForm({...sermonForm, preacher: e.target.value})} className="w-full mt-1 border rounded-xl p-3" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Date</label>
                        <input type="date" value={sermonForm.date} onChange={e => setSermonForm({...sermonForm, date: e.target.value})} className="w-full mt-1 border rounded-xl p-3" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">YouTube URL or Video ID</label>
                      <input type="text" value={sermonForm.video_url} onChange={e => setSermonForm({...sermonForm, video_url: e.target.value})} className="w-full mt-1 border rounded-xl p-3 font-mono text-sm" placeholder="https://youtu.be/xxxx or ID" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (optional)</label>
                      <textarea value={sermonForm.description} onChange={e => setSermonForm({...sermonForm, description: e.target.value})} className="w-full mt-1 border rounded-xl p-3" rows={3} placeholder="Scripture reference or summary..." />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={sermonForm.is_public} onChange={e => setSermonForm({...sermonForm, is_public: e.target.checked})} />
                      Show to visitors without login
                    </label>
                    <div>
                      <label className="text-sm font-medium">Display on Sermons page</label>
                      <select
                        value={sermonForm.embed_mode}
                        onChange={(e) => setSermonForm({ ...sermonForm, embed_mode: e.target.value as SermonEmbedMode })}
                        className="w-full mt-1 border rounded-xl p-3 text-sm bg-white"
                      >
                        {(Object.entries(SERMON_EMBED_MODE_LABELS) as [SermonEmbedMode, string][]).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 justify-end">
                    <button onClick={closeSermonForm} className="px-6 py-2 border rounded-full text-sm" disabled={savingSermon}>Cancel</button>
                    <button 
                      onClick={saveRealSermon} 
                      disabled={savingSermon}
                      className="px-6 py-2 bg-[var(--color-navy)] text-white rounded-full text-sm font-semibold disabled:opacity-60"
                    >
                      {savingSermon ? "Saving..." : "Save Sermon"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loadingSermons ? (
              <div className="text-center py-8 text-[var(--color-stone-light)]">Loading...</div>
            ) : realSermons.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {realSermons.map((s: any) => {
                  const isDeleting = deletingSermonId === s.id;
                  return (
                    <div key={s.id} className="bg-white border rounded-2xl p-5 relative group">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-75 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => openSermonForm(s)}
                          className="p-1.5 rounded-full bg-[var(--color-cream)] text-[var(--color-navy)] hover:bg-[var(--color-gold)] hover:text-white"
                          title="Edit sermon"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => deleteRealSermon(s.id, s.title)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                          title="Delete this sermon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="font-semibold text-[var(--color-navy)] pr-16">{s.title}</div>
                      <div className="text-sm mt-1 text-[var(--color-stone)]">
                        {s.preacher} • {formatLocalDate(s.date)}
                      </div>
                      <div className="text-xs mt-2 text-[var(--color-gold-dark)] truncate font-mono">{s.video_url}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {s.is_public && (
                          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded">Public / Curated</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          normalizeEmbedMode(s.embed_mode) === 'embed'
                            ? 'bg-[var(--color-navy)] text-white'
                            : normalizeEmbedMode(s.embed_mode) === 'link'
                              ? 'bg-[var(--color-cream)] text-[var(--color-stone)]'
                              : 'bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)]'
                        }`}>
                          {SERMON_EMBED_MODE_LABELS[normalizeEmbedMode(s.embed_mode)]}
                        </span>
                      </div>

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

          </div>
        </div>
      )}

      {/* BUILDING PROJECT TAB - DRAG & DROP */}
      {activeTab === 'building' && (
        <div>
          <div className="flex justify-between mb-6">
            <div>
              <div className="font-semibold text-2xl">Building Project Management</div>
              <div className="text-sm text-[var(--color-stone-light)]">Update progress and add construction photos for the Building Project page.</div>
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
              <div className="font-medium mb-2">Physical Progress Note</div>
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

          <div className="mb-4">
            <UploadProgressBanner
              progress={uploadingBuilding ? uploadProgress : null}
              onRetry={lastFailedUpload?.type === 'building' ? retryLastUpload : undefined}
            />
          </div>

          {/* BIG DRAG & DROP ZONE */}
          <div 
            className={`dropzone dropzone-large mb-6 ${uploadingBuilding ? 'opacity-60 pointer-events-none' : ''}`}
            onDragOver={uploadingBuilding ? undefined : handleDragOver} 
            onDragLeave={uploadingBuilding ? undefined : handleDragLeave}
            onDrop={(e) => { if (uploadingBuilding) return; e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleImageUpload(e.dataTransfer.files, 'building'); }}
            onClick={() => { if (!uploadingBuilding) document.getElementById('building-upload')?.click(); }}
          >
            <Upload className="w-10 h-10 text-[var(--color-gold-dark)] mb-4" />
            <div className="font-semibold text-xl">
              {uploadingBuilding ? 'Uploading…' : 'Drag & Drop New Construction Photos Here'}
            </div>
            <div className="text-[var(--color-stone-light)] mt-1">or click to browse • JPG, PNG, or MP4</div>
            <div className="text-xs text-[var(--color-stone-light)] mt-2">Large phone photos are optimized automatically before upload</div>
            <input id="building-upload" type="file" accept="image/*,video/*" className="hidden" disabled={uploadingBuilding} onChange={(e) => handleImageUpload(e.target.files, 'building')} />
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
                  className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-60 group-hover:opacity-100 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="admin-help mt-4">Photos appear on the Building Project page in a masonry layout.</div>
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
                A short note for teens and families on the Youth Ministry page.
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
              <p className="text-xs text-[var(--color-stone-light)] mt-2">Leave blank to hide this section.</p>
            </div>
          </div>

          {/* Google Doc Embed for Youth Page */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Youth Google Doc Embed</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                Optional Google Doc embed for the Youth Ministry page. In the doc: File → Share → Publish to web, then paste the embed URL (or full iframe tag).
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8">
              <label className="block font-medium mb-2 text-sm">Google Doc Publish Link (embed URL)</label>
              <input
                type="text"
                value={sermonSettings.youth_google_doc_url}
                onChange={(e) => {
                  const url = extractGoogleDocEmbedUrl(e.target.value);
                  setSermonSettings({ ...sermonSettings, youth_google_doc_url: url });
                }}
                className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm"
                placeholder="https://docs.google.com/document/d/e/XXXXXXXXXXXXXXXX/pub?embedded=true"
              />
              <p className="text-xs text-[var(--color-stone-light)] mt-2">
                Paste the "Publish to web" embed link here. Leave blank to hide the section on the Youth page.
              </p>
            </div>
            <button
              onClick={() => saveSermonSettings()}
              disabled={savingSermonSettings}
              className="mt-3 px-6 py-2 bg-[var(--color-navy)] text-white rounded-2xl text-sm font-medium disabled:opacity-60"
            >
              {savingSermonSettings ? "Saving..." : "Save Note + Google Doc"}
            </button>
          </div>

          {/* Youth Sunday School - same structure as main service */}
          <div>
            <div className="mb-4">
              <div className="font-semibold text-2xl">Youth Sunday School (Homepage)</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                Lesson details shown in the Youth section on the homepage.
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
                onClick={() => saveSermonSettings()}
                disabled={savingSermonSettings}
                className="mt-6 w-full md:w-auto px-8 py-3 bg-[var(--color-navy)] text-white rounded-2xl font-medium disabled:opacity-60"
              >
                {savingSermonSettings ? "Saving..." : "Save Youth Sunday School to Homepage"}
              </button>
            </div>
          </div>

          {/* Photos section - Albums support */}
          <div>
            <div className="flex justify-between mb-6">
              <div>
                <div className="font-semibold text-2xl">Youth Ministry Photos (Albums)</div>
                <div className="text-sm text-[var(--color-stone-light)]">Create albums, then select one and drag photos into it.</div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => openAlbumForm()}
                  className="admin-big-button px-4 bg-[var(--color-navy)] text-white rounded-2xl text-sm"
                >
                  + Create New Album
                </button>
                <button 
                  onClick={async () => {
                    await fetchYouthPhotos();
                    await fetchYouthAlbums();
                    toast.success("Youth data refreshed");
                  }} 
                  className="admin-big-button px-4 border border-[var(--color-gold)] text-[var(--color-navy)] rounded-2xl text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Album selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Upload photos to this album:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedYouthAlbumId(null)}
                  className={`px-4 py-2 rounded-full text-sm border ${!selectedYouthAlbumId ? 'bg-[var(--color-navy)] text-white' : 'hover:bg-[var(--color-cream)]'}`}
                >
                  No Album (Uncategorized)
                </button>
                {youthAlbums.map((album: any) => (
                  <button
                    key={album.id}
                    onClick={() => setSelectedYouthAlbumId(album.id)}
                    className={`px-4 py-2 rounded-full text-sm border ${selectedYouthAlbumId === album.id ? 'bg-[var(--color-navy)] text-white' : 'hover:bg-[var(--color-cream)]'}`}
                  >
                    {album.title}
                    {album.date && ` — ${formatAlbumDate(album.date)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Manage Albums */}
            {youthAlbums.length > 0 && (
              <div className="mb-6 bg-white border border-[var(--color-gold)]/20 rounded-3xl p-6">
                <div className="font-medium mb-3 text-sm">Manage Albums</div>
                <div className="space-y-2">
                  {youthAlbums.map((album: any) => (
                    <div key={album.id} className="flex items-center justify-between border rounded-xl px-4 py-2 text-sm">
                      <div>
                        <span className="font-medium">{album.title}</span>
                        {album.date && <span className="ml-2 text-[var(--color-stone-light)]">{formatAlbumDate(album.date)}</span>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAlbumForm(album)}
                          className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteYouthAlbum(album.id, album.title)}
                          className="text-red-600 hover:text-red-700 text-xs px-3 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-stone-light)] mt-3">Deleting an album will also delete all photos inside it.</p>
              </div>
            )}

            <div className="mb-4">
              <UploadProgressBanner
                progress={uploadingYouth ? uploadProgress : null}
                onRetry={lastFailedUpload?.type === 'youth' ? retryLastUpload : undefined}
              />
            </div>

            {/* Drag & Drop Zone */}
            <div 
              className={`dropzone dropzone-large mb-6 ${uploadingYouth ? 'opacity-60 pointer-events-none' : ''}`}
              onDragOver={uploadingYouth ? undefined : handleDragOver} 
              onDragLeave={uploadingYouth ? undefined : handleDragLeave}
              onDrop={(e) => { 
                if (uploadingYouth) return;
                e.preventDefault(); 
                e.currentTarget.classList.remove('dragover'); 
                handleImageUpload(e.dataTransfer.files, 'youth'); 
              }}
              onClick={() => { if (!uploadingYouth) document.getElementById('youth-upload')?.click(); }}
            >
              <Upload className="w-10 h-10 text-[var(--color-gold-dark)] mb-4" />
              <div className="font-semibold text-xl">
                {uploadingYouth
                  ? 'Uploading…'
                  : selectedYouthAlbumId 
                    ? `Add Photos to Selected Album` 
                    : "Drag & Drop Youth Photos Here"}
              </div>
              <div className="text-[var(--color-stone-light)] mt-1">
                {selectedYouthAlbumId 
                  ? "Photos will be added to the selected album (no captions on upload)" 
                  : "or click to browse • JPG, PNG, or MP4"}
              </div>
              <div className="text-xs text-[var(--color-stone-light)] mt-2">Large phone photos are optimized automatically before upload</div>
              <input 
                id="youth-upload" 
                type="file" 
                accept="image/*,video/*" 
                multiple
                disabled={uploadingYouth}
                className="hidden" 
                onChange={(e) => handleImageUpload(e.target.files, 'youth')} 
              />
            </div>

            {/* Current Youth Photos */}
            <div className="bg-white p-8 rounded-3xl">
              <div className="font-semibold mb-4">All Youth Photos</div>
              {youthPhotos.length === 0 ? (
                <div className="text-[var(--color-stone-light)] py-4">No youth photos yet. Create an album above, select it, then drag photos in.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {youthPhotos.map((photo: any) => {
                    const album = youthAlbums.find((a: any) => a.id === photo.album_id);
                    return (
                      <div key={photo.id} className="group relative rounded-2xl overflow-hidden border aspect-video bg-[var(--color-cream)]">
                        <img 
                          src={photo.url} 
                          alt={photo.caption || ""} 
                          className="w-full h-full object-contain p-1" 
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-3 text-xs text-white">
                          {photo.caption || (album ? album.title : "No album")}
                        </div>
                        <button
                          onClick={() => deleteYouthPhoto(photo.id, photo.url)}
                          className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-60 group-hover:opacity-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="admin-help mt-4">Photos appear grouped by album on the Youth Ministry page.</div>
          </div> {/* close photos section */}

          {/* Upcoming Youth Events (editable by any admin) */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="font-semibold text-2xl">Upcoming Youth Events</div>
                <div className="text-sm text-[var(--color-stone-light)]">Upcoming events on the Youth Ministry page. Add an optional image when creating each event.</div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => openYouthEventForm()}
                  className="admin-big-button flex items-center gap-2 bg-[var(--color-navy)] text-white px-6 rounded-2xl"
                >
                  <Plus className="w-5 h-5" /> Add Event
                </button>
                <button 
                  onClick={fetchYouthEvents} 
                  className="admin-big-button px-4 border border-[var(--color-gold)] text-[var(--color-navy)] rounded-2xl text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Youth Event modal is rendered globally below so it works from Events tab too */}

            {/* Album modal is rendered globally below (available in Events tab too) */}

            {youthEvents.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-stone-light)] border border-dashed rounded-3xl">
                No upcoming youth events yet. Click &quot;Add Event&quot; above.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {youthEvents.map((ev: any) => (
                  <div key={ev.id} className="bg-white border rounded-2xl p-5 relative group">
                    {ev.image_url && (
                      <img src={ev.image_url} alt="" className="w-full h-32 object-cover rounded mb-3" />
                    )}
                    <div className="font-semibold text-[var(--color-navy)]">{ev.title}</div>
                    {ev.date && <div className="text-sm text-[var(--color-gold-dark)] mt-1">{formatLocalDate(ev.date)}</div>}
                    {ev.description && <p className="text-sm mt-2 text-[var(--color-stone)] line-clamp-2">{ev.description}</p>}
                    {ev.link_url && <a href={ev.link_url} target="_blank" className="text-xs text-[var(--color-gold-dark)] mt-1 block">Link →</a>}

                    <div className="absolute top-3 right-3 flex gap-1 opacity-75 group-hover:opacity-100">
                      <button onClick={() => openYouthEventForm(ev)} className="p-1.5 rounded bg-[var(--color-cream)] text-xs">Edit</button>
                      <button onClick={() => deleteYouthEvent(ev.id, ev.title)} className="p-1.5 rounded bg-red-50 text-red-600 text-xs">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEMBERS - Approve access to private areas (using Supabase profiles) */}
      {activeTab === 'members' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="font-semibold text-2xl">Members — Approve, Deny, or Remove</div>
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
              return (
                <div 
                  key={m.id} 
                  onClick={() => setSelectedMember(m)}
                  className="flex justify-between border-b py-4 last:border-0 items-center gap-4 hover:bg-[var(--color-cream)] cursor-pointer rounded-lg px-2 -mx-2 transition"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-lg">{m.full_name}</div>
                    
                    <div className="text-xs text-[var(--color-stone-light)] mt-0.5">{m.email}</div>

                    <div className="text-[10px] mt-1.5 uppercase tracking-wider">
                      Status: <span className={m.role === 'approved' ? 'text-green-600' : m.role === 'admin' ? 'text-[var(--color-gold-dark)]' : 'text-orange-600'}>
                        {m.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
                    {m.role === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => removeMemberAccount(m.id, m.full_name, 'deny')}
                          disabled={memberActionId === m.id}
                          className="px-4 py-1.5 border border-red-200 text-red-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-red-50 disabled:opacity-60"
                        >
                          {memberActionId === m.id ? 'Working…' : 'DENY'}
                        </button>
                        <button
                          type="button"
                          onClick={() => approveRealMember(m.id)}
                          disabled={memberActionId === m.id}
                          className="px-5 py-1.5 bg-[var(--color-gold)] text-white rounded-full text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                        >
                          APPROVE
                        </button>
                      </>
                    ) : m.role === 'admin' ? (
                      <span className="text-xs px-4 py-1 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)] whitespace-nowrap">
                        Admin
                      </span>
                    ) : (
                      <>
                        <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                          Approved
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMemberAccount(m.id, m.full_name, 'delete')}
                          disabled={memberActionId === m.id}
                          className="px-4 py-1.5 border border-red-200 text-red-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-red-50 disabled:opacity-60"
                        >
                          {memberActionId === m.id ? 'Working…' : 'REMOVE'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-sm text-[var(--color-stone)] space-y-1">
            <p><strong>Approve</strong> — gives access to the Directory, Prayer Bulletin, and other member areas.</p>
            <p><strong>Deny</strong> — removes a pending signup entirely.</p>
            <p><strong>Remove</strong> — deletes an approved member&apos;s login (they can sign up again later if needed).</p>
            <p>Admin accounts cannot be removed from this screen.</p>
          </div>
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
              {selectedMember.full_name}
            </div>
            <div className="text-sm text-[var(--color-stone-light)] mb-6">{selectedMember.email}</div>

            <div className="mb-6 text-sm text-[var(--color-stone)] capitalize">
              Status: <span className="font-medium">{selectedMember.role}</span>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {selectedMember.role === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => removeMemberAccount(selectedMember.id, selectedMember.full_name, 'deny')}
                    disabled={memberActionId === selectedMember.id}
                    className="px-6 py-2 border border-red-200 text-red-700 rounded-full text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
                  >
                    {memberActionId === selectedMember.id ? 'Working…' : 'Deny Membership'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      approveRealMember(selectedMember.id);
                      setSelectedMember(null);
                    }}
                    disabled={memberActionId === selectedMember.id}
                    className="px-6 py-2 bg-[var(--color-gold)] text-white rounded-full text-sm font-semibold disabled:opacity-60"
                  >
                    Approve Membership
                  </button>
                </>
              )}
              {selectedMember.role === 'approved' && (
                <button
                  type="button"
                  onClick={() => removeMemberAccount(selectedMember.id, selectedMember.full_name, 'delete')}
                  disabled={memberActionId === selectedMember.id}
                  className="px-6 py-2 border border-red-200 text-red-700 rounded-full text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
                >
                  {memberActionId === selectedMember.id ? 'Working…' : 'Remove Member'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-6 py-2 border rounded-full text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENTS - Spotlight / Special Events (visible on public /events page) */}
      {activeTab === 'events' && (
        <div className="space-y-12">
          {/* General Spotlight Events */}
          <div>
            <div className="flex justify-between mb-6">
              <div>
                <div className="font-semibold text-2xl">Spotlight Events</div>
                <div className="text-sm text-[var(--color-stone-light)]">
                  These appear on the public Events page (above the weekly schedule) when added.
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => openEventForm()} className="admin-big-button flex items-center gap-2 bg-[var(--color-navy)] text-white px-6 rounded-2xl">
                  <Plus /> Add Event
                </button>
                <button onClick={fetchEvents} className="admin-big-button px-4 border border-[var(--color-gold)] text-[var(--color-navy)] rounded-2xl text-sm">Refresh</button>
              </div>
            </div>

            {/* General Event Modal */}
            {showEventForm && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={closeEventForm}>
                <div className="bg-white rounded-3xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
                  <div className="font-semibold text-xl mb-4">{editingEvent ? "Edit Spotlight Event" : "Add New Spotlight Event"}</div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <input type="text" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="w-full mt-1 border rounded-xl p-3" placeholder="Special Event Title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Date</label>
                        <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} className="w-full mt-1 border rounded-xl p-3" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Time (optional)</label>
                        <input type="text" value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} className="w-full mt-1 border rounded-xl p-3" placeholder="e.g. 6:00 PM" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Location (optional)</label>
                      <input type="text" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="w-full mt-1 border rounded-xl p-3" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (optional)</label>
                      <textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="w-full mt-1 border rounded-xl p-3" rows={3} />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 justify-end">
                    <button onClick={closeEventForm} className="px-6 py-2 border rounded-full text-sm">Cancel</button>
                    <button onClick={saveGeneralEvent} disabled={savingEvent} className="px-6 py-2 bg-[var(--color-navy)] text-white rounded-full text-sm font-semibold disabled:opacity-60">
                      {savingEvent ? "Saving..." : (editingEvent ? "Save Changes" : "Add Event")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {events.length === 0 ? (
              <div className="text-[var(--color-stone-light)] py-8 text-center border border-dashed rounded-3xl">
                No spotlight events yet. Add rare or special events here — they will show up on the public Events page.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {events
                  .filter((ev: any) => ev && ev.id)
                  .map((ev: any) => {
                    const displayDate = ev.date ? formatLocalDate(ev.date) : 'No date';
                    return (
                      <div key={ev.id} className="border bg-white p-6 rounded-2xl relative group">
                        <div className="font-semibold text-xl">{ev.title || 'Untitled Event'}</div>
                        <div className="text-[var(--color-gold-dark)] mt-1">
                          {displayDate}
                          {ev.time && ` • ${ev.time}`}
                        </div>
                        {ev.location && <div className="text-sm mt-1 text-[var(--color-stone)]">{ev.location}</div>}
                        {ev.description && <p className="mt-3 text-sm">{ev.description}</p>}

                        <div className="absolute top-3 right-3 flex gap-1 opacity-75 group-hover:opacity-100 transition">
                          <button onClick={() => openEventForm(ev)} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Edit</button>
                          <button onClick={() => deleteEvent(ev.id, ev.title || 'Untitled')} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Weekly Schedule Google Doc - editable here for remote management (no code change needed) */}
          <div className="mt-12">
            <div className="mb-4">
              <div className="font-semibold text-2xl">Weekly Schedule Google Doc</div>
              <div className="text-sm text-[var(--color-stone-light)]">
                Weekly schedule embed on the Events page. In the Google Doc: File → Share → Publish to web, then paste the embed URL (or full iframe tag).
              </div>
            </div>

            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8">
              <label className="block font-medium mb-2 text-sm">Google Doc Publish Link (embed URL)</label>
              <input
                type="text"
                value={sermonSettings.events_google_doc_url || ''}
                onChange={(e) => {
                  const url = extractGoogleDocEmbedUrl(e.target.value);
                  setSermonSettings({ ...sermonSettings, events_google_doc_url: url });
                }}
                className="w-full border border-[var(--color-gold)]/30 rounded-2xl px-4 py-3 text-sm font-mono"
                placeholder="https://docs.google.com/document/d/e/XXXXXXXXXXXXXXXX/pub?embedded=true"
              />
              <p className="text-xs text-[var(--color-stone-light)] mt-2">
                Google may take a minute to publish doc changes. Use Refresh Site Pages on the Overview tab if the Events page looks out of date.
              </p>
              <button
                onClick={async () => {
                  await saveSermonSettings();
                  // Revalidate the events page so the new embed URL is picked up immediately
                  fetch('/api/revalidate?path=/events', { method: 'POST' }).catch(() => {});
                }}
                disabled={savingSermonSettings}
                className="mt-3 px-6 py-2 bg-[var(--color-navy)] text-white rounded-2xl text-sm font-medium disabled:opacity-60"
              >
                {savingSermonSettings ? "Saving..." : "Save Events Schedule Embed"}
              </button>
            </div>
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
            <div>• Update building progress and photos from the Building tab</div>
            <div>• Maintain the Prayer Bulletin and Nursery Schedule Google Docs</div>
            <div>• Add sermons with YouTube links; choose Automatic, Always embed, or YouTube link</div>
            <div>• Approve, deny, or remove members from the Members tab</div>
            <div>• Drag photos onto the drop zones — no special file names needed</div>
          </div>
        </div>
      )}

      {/* YOUTH EVENT MODAL (hoisted so it can be opened from the Youth tab) */}
      {showYouthEventForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={closeYouthEventForm}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
            <div className="font-semibold text-xl mb-4">{editingYouthEvent ? "Edit Youth Event" : "Add New Youth Event"}</div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input type="text" value={youthEventForm.title} onChange={e => setYouthEventForm({...youthEventForm, title: e.target.value})} className="w-full mt-1 border rounded-xl p-3" placeholder="Event Title" />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <input type="date" value={youthEventForm.date} onChange={e => setYouthEventForm({...youthEventForm, date: e.target.value})} className="w-full mt-1 border rounded-xl p-3" />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <textarea value={youthEventForm.description} onChange={e => setYouthEventForm({...youthEventForm, description: e.target.value})} className="w-full mt-1 border rounded-xl p-3" rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium">Link URL (optional, e.g. registration or more info)</label>
                <input type="text" value={youthEventForm.link_url} onChange={e => setYouthEventForm({...youthEventForm, link_url: e.target.value})} className="w-full mt-1 border rounded-xl p-3" placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Event Image (optional)</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="file" 
                    accept="image/*,video/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadYouthEventImage(file);
                      e.target.value = '';
                    }} 
                    disabled={uploadingEventImage}
                    className="text-sm"
                  />
                  <UploadProgressBanner progress={uploadingEventImage ? uploadProgress : null} />
                </div>
                {youthEventForm.image_url && (
                  <div className="mt-2">
                    <img src={youthEventForm.image_url} alt="Event preview" className="max-h-32 rounded border" />
                    <button 
                      onClick={() => setYouthEventForm(prev => ({...prev, image_url: ""}))}
                      className="text-xs text-red-600 mt-1"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={closeYouthEventForm} className="px-6 py-2 border rounded-full text-sm">Cancel</button>
              <button 
                onClick={saveYouthEvent} 
                disabled={savingYouthEvent}
                className="px-6 py-2 bg-[var(--color-navy)] text-white rounded-full text-sm font-semibold disabled:opacity-60"
              >
                {savingYouthEvent ? "Saving..." : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALBUM FORM MODAL (hoisted so it can be opened from the Youth tab) */}
      {showAlbumForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={closeAlbumForm}>
          <div className="bg-white rounded-3xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="font-semibold text-xl mb-4">{editingAlbum ? "Edit Youth Album" : "Create New Youth Album"}</div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Album Title</label>
                <input
                  type="text"
                  value={albumForm.title}
                  onChange={e => setAlbumForm({ ...albumForm, title: e.target.value })}
                  className="w-full mt-1 border rounded-xl p-3"
                  placeholder="Summer 2025 Youth Camp"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date (optional, YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={albumForm.date}
                  onChange={e => setAlbumForm({ ...albumForm, date: e.target.value })}
                  className="w-full mt-1 border rounded-xl p-3"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={closeAlbumForm} className="px-6 py-2 border rounded-full text-sm">Cancel</button>
              <button
                onClick={saveAlbum}
                disabled={savingAlbum}
                className="px-6 py-2 bg-[var(--color-navy)] text-white rounded-full text-sm font-semibold disabled:opacity-60"
              >
                {savingAlbum ? "Saving..." : (editingAlbum ? "Save Changes" : "Create Album")}
              </button>
            </div>
            <p className="mt-3 text-[10px] text-[var(--color-stone-light)]">After creating, select the album in the Youth tab and drag photos in. Albums are publicly visible to everyone.</p>
          </div>
        </div>
      )}
    </div>
  );
}
