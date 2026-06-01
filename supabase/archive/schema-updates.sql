-- ============================================
-- FAMILY-CENTRIC DIRECTORY MODEL
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create families table (the main unit shown in the directory)
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- e.g. "The Johnson Family" or "Mike & Sarah Johnson"
  photo_url text,
  address text,
  notes text,
  member_count integer DEFAULT 1,
  primary_contact_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add family_id to existing profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);

-- 3. Create family_members table for children and other non-login members
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) NOT NULL,
  name text NOT NULL,
  birthdate date,
  relationship text DEFAULT 'child',     -- 'child', 'other', etc.
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);

-- 5. Enable Row Level Security (we'll tighten policies later)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Note: We will add proper RLS policies in a follow-up step
