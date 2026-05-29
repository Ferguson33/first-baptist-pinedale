import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT-ID.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY-HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types for TypeScript (update as you add tables)
export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'pending' | 'approved' | 'admin';
  photo_url?: string;
  phone?: string;
  address?: string;
  joined_date?: string;
  prayer_auto_approve?: boolean;
  created_at: string;

  // Extended profile fields for member directory
  spouse_name?: string;
  birthdate?: string;
  anniversary?: string;
  spouse_birthdate?: string;
  notes?: string;
};

export type Sermon = {
  id: string;
  title: string;
  preacher: string;
  date: string;
  video_url: string; // YouTube embed URL or ID
  thumbnail_url: string;
  description?: string;
  created_at: string;
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
  updated_at: string;
};

export type PrayerRequest = {
  id: string;
  user_id: string;
  requester_name: string;
  request_text: string;
  is_anonymous: boolean;
  photo_url?: string;
  status: 'pending' | 'approved' | 'hidden';
  created_at: string;
};

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

export type DirectoryMember = {
  id: string;
  name: string;
  spouse?: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  notes?: string;
  approved: boolean;
  created_at: string;
};
