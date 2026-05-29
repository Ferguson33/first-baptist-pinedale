-- ============================================
-- FAMILY-CENTRIC MODEL FOR CHURCH DIRECTORY
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the families table (this is what shows in the directory)
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                          -- e.g. "The Johnson Family" or "Mike & Sarah Johnson"
  photo_url text,
  address text,
  notes text,
  member_count integer DEFAULT 1,
  primary_contact_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add family_id to profiles (so adults with logins can be linked to a family)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);

-- 3. Create a simple table for additional family members (children, etc.)
-- These people do NOT need logins
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) NOT NULL,
  name text NOT NULL,
  birthdate date,
  relationship text DEFAULT 'child',           -- 'child', 'other', etc.
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);

-- 5. Enable RLS (we'll set policies later)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE families IS 'Main family units shown in the Member Directory';
COMMENT ON TABLE family_members IS 'Additional family members who do not have logins (mostly children)';
