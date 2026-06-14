// Legacy barrel file. The default-exported `supabase` client instance has been removed
// to eliminate "Multiple GoTrueClient instances" warnings and auth token pollution.
// 
// All client components should now use:
//   import { createClient } from '@/lib/supabase/client';
//   const supabase = createClient();
// 
// Server components use:
//   import { createClient } from '@/lib/supabase/server';
//
// Types below are kept for convenience.

// Database types for TypeScript (update as you add tables)
export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'pending' | 'approved' | 'admin';
  created_at: string;
};

export type Sermon = {
  id: string;
  title: string;
  preacher: string;
  date: string;
  video_url: string; // YouTube embed URL or ID
  thumbnail_url: string;
  description?: string;
  is_public?: boolean; // curated for public (non-members) view
  created_at: string;
};

export type SermonSettings = {
  id: number;
  pastor_note?: string | null;
  upcoming_title?: string | null;
  upcoming_reference?: string | null;
  upcoming_date?: string | null;
  sunday_school_lesson?: string | null;
  sunday_school_reference?: string | null;
  youth_sunday_school_lesson?: string | null;
  youth_sunday_school_reference?: string | null;
  youth_sunday_school_date?: string | null;
  youth_pastor_note?: string | null;
  youth_google_doc_url?: string | null;
  live_video_id?: string | null;
  live_stream_active?: boolean;
  updated_at?: string;
};

export type BuildingPhoto = {
  id: string;
  url: string;
  caption: string;
  uploaded_at: string;
};

export type BuildingProgress = {
  id: string;
  physical_percent: number;
  funds_raised: number;
  funds_goal: number;
  physical_note?: string | null;
  updated_at?: string;
};

// PrayerRequest type removed - old Prayer Wall feature has been replaced by Prayer Bulletin (Google Doc)

export type Event = {
  id: string;
  title: string;
  date: string;
  time?: string;
  description: string;
  location?: string;
  image_url?: string;
  created_at: string;
};

// Note: The old DirectoryMember and Family types were removed as the site
// moved to Google Docs for the Member Directory.

export type YouthAlbum = {
  id: string;
  title: string;
  date: string | null;
  created_at: string;
};

export type YouthPhoto = {
  id: string;
  url: string;
  caption: string | null;
  album_id: string | null;
  uploaded_at: string;
};

export type YouthEvent = {
  id: string;
  title: string;
  date: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  created_at?: string;
};

