-- ============================================
-- FIRST BAPTIST CHURCH PINEDALE - SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor once
-- ============================================

-- PROFILES (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text default 'pending' check (role in ('pending','approved','admin')),
  photo_url text,
  phone text,
  address text,
  joined_date date,
  prayer_auto_approve boolean default false,   -- If true, this member's prayer submissions go live immediately (no review)
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- SERMONS
create table if not exists sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  preacher text not null,
  date date not null,
  video_url text not null,
  thumbnail_url text not null,
  description text,
  is_public boolean default false,  -- curated/selected for public (non-login) viewing
  created_at timestamptz default now()
);

-- RLS for sermons: public can see curated (is_public) ones; approved members see everything; only admins manage.
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view curated (is_public) sermons" ON sermons;
CREATE POLICY "Public can view curated (is_public) sermons"
ON sermons FOR SELECT
TO anon, authenticated
USING (is_public = true);

DROP POLICY IF EXISTS "Approved members can view all sermons" ON sermons;
CREATE POLICY "Approved members can view all sermons"
ON sermons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'approved' OR profiles.role = 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can manage sermons" ON sermons;
CREATE POLICY "Admins can manage sermons"
ON sermons FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Grants so anon can read curated sermons
GRANT SELECT ON public.sermons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sermons TO authenticated;

-- BUILDING PHOTOS
create table if not exists building_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  uploaded_at timestamptz default now()
);

-- BUILDING PROGRESS (single row)
create table if not exists building_progress (
  id int primary key default 1,
  physical_percent int default 0,
  funds_raised numeric default 0,
  funds_goal numeric default 0,
  physical_note text,
  updated_at timestamptz default now()
);

insert into building_progress (id) values (1) on conflict do nothing;

-- PRAYER REQUESTS (LEGACY - Old Prayer Wall feature, replaced by Prayer Bulletin Google Doc)
-- The table below and its policies are no longer used by the application.
-- See supabase/cleanup-old-prayer-system.sql to drop it.
create table if not exists prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  requester_name text not null,
  request_text text not null,
  is_anonymous boolean default false,
  photo_url text,
  status text default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz default now()
);

-- EVENTS
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  description text,
  location text,
  image_url text,
  created_at timestamptz default now()
);

-- Simple starter policies (tighten for production)
create policy "Public can read approved profiles" on profiles for select using (role = 'approved' or role = 'admin');
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);

-- Allow new users (right after auth.signUp) to create their own pending profile row.
-- This is required for pending membership flow to work reliably on refresh.
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow admins to insert profiles (e.g. manual creation if needed).
-- IMPORTANT: For INSERT policies, ONLY WITH CHECK is allowed. USING is invalid for INSERT.
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- =====================================================
-- PRAYER REQUESTS — RLS + GRANTS (LEGACY - see cleanup-old-prayer-system.sql)
-- =====================================================

-- Enable RLS
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Grant table privileges to the Supabase roles.
-- Without these, you get "permission denied for table prayer_requests" (code 42501)
-- even if RLS policies exist. This was the root cause of the 403s.
GRANT SELECT ON public.prayer_requests TO anon, authenticated;
GRANT INSERT ON public.prayer_requests TO authenticated;
GRANT UPDATE ON public.prayer_requests TO authenticated;
GRANT DELETE ON public.prayer_requests TO authenticated;

-- Profiles: allow authenticated users to read (own + approved via policies) and insert their own on signup.
-- Critical for pending membership creation + refresh stability.
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;
-- Admins get full via their policies (select/update/insert covered above)

-- Clean up old policies
DROP POLICY IF EXISTS "Anyone can read approved prayers" ON prayer_requests;
DROP POLICY IF EXISTS "Authenticated users can insert pending prayers" ON prayer_requests;
DROP POLICY IF EXISTS "Admins can read all prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Admins can update prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Admins can delete prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "public_can_read_approved_prayers" ON prayer_requests;
DROP POLICY IF EXISTS "authenticated_can_insert_pending" ON prayer_requests;
DROP POLICY IF EXISTS "admin_all_access" ON prayer_requests;

-- 1. Anyone (public visitors + members) can read ONLY approved prayers
CREATE POLICY "public_can_read_approved_prayers"
ON prayer_requests FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- 2. Logged-in users can submit new prayers.
-- Normal members must use status='pending' (goes to review queue).
-- Trusted members (prayer_auto_approve = true) are allowed to insert directly as 'approved'.
CREATE POLICY "authenticated_can_insert_pending_or_trusted"
ON prayer_requests FOR INSERT
TO authenticated
WITH CHECK (
  (status = 'pending')
  OR
  (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.prayer_auto_approve = true
    )
  )
);

-- 3. Admins get full access (read all statuses, approve, hide, delete)
CREATE POLICY "admin_all_access"
ON prayer_requests FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
);

-- Storage buckets you must create in the Supabase dashboard:
-- building-photos, sermons, youth-photos, member-photos (make them public)

-- YOUTH EVENTS (Upcoming events for youth, editable in admin youth tab)
create table if not exists youth_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date,
  description text,
  image_url text,
  link_url text,
  created_at timestamptz default now()
);

-- Add calendar embed for Heath's youth events (editable in admin)
-- This will be added to sermon_settings table via migration.

-- RLS for youth_events: public can view, admins manage (any admin, not just Heath)
ALTER TABLE youth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view youth events" ON youth_events;
CREATE POLICY "Public can view youth events"
ON youth_events FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage youth events" ON youth_events;
CREATE POLICY "Admins can manage youth events"
ON youth_events FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT ON public.youth_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_events TO authenticated;

-- YOUTH ALBUMS (publicly visible photo albums for all visitors)
CREATE TABLE IF NOT EXISTS youth_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE youth_albums ENABLE ROW LEVEL SECURITY;

-- Public read for all visitors (albums are not members-only)
DROP POLICY IF EXISTS "Public can view youth albums" ON youth_albums;
CREATE POLICY "Public can view youth albums"
ON youth_albums FOR SELECT
TO anon, authenticated
USING (true);

-- Any admin can manage
DROP POLICY IF EXISTS "Admins can manage youth albums" ON youth_albums;
CREATE POLICY "Admins can manage youth albums"
ON youth_albums FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT ON public.youth_albums TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_albums TO authenticated;

-- YOUTH PHOTOS (tied to albums or uncategorized; public gallery)
CREATE TABLE IF NOT EXISTS youth_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  album_id uuid REFERENCES youth_albums(id) ON DELETE CASCADE,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE youth_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view youth photos" ON youth_photos;
CREATE POLICY "Public can view youth photos"
ON youth_photos FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert youth photos" ON youth_photos;
CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete youth photos" ON youth_photos;
CREATE POLICY "Admins can delete youth photos"
ON youth_photos FOR DELETE
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "Admins can update youth photos" ON youth_photos;
CREATE POLICY "Admins can update youth photos"
ON youth_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT ON public.youth_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;

-- Ensure sermon_settings public read includes youth calendar / notes etc.
GRANT SELECT ON public.sermon_settings TO anon, authenticated;
