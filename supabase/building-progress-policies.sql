-- RLS Policies for building_progress table
-- Run this in Supabase SQL Editor

-- Make sure RLS is enabled
ALTER TABLE building_progress ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for the public Building Project page and home page)
CREATE POLICY "Public can view building progress"
ON building_progress
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to update progress
-- (The admin dashboard already restricts this to admins client-side)
CREATE POLICY "Authenticated users can update building progress"
ON building_progress
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Optional: Allow authenticated users to insert if the row doesn't exist
CREATE POLICY "Authenticated users can insert building progress"
ON building_progress
FOR INSERT
TO authenticated
WITH CHECK (true);
