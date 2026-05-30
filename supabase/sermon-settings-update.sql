-- Run this to add new fields for Sermon + Sunday School (main service) and Youth Sunday School
-- to the existing sermon_settings table

ALTER TABLE sermon_settings 
  ADD COLUMN IF NOT EXISTS sunday_school_lesson text,
  ADD COLUMN IF NOT EXISTS sunday_school_reference text,
  ADD COLUMN IF NOT EXISTS youth_sunday_school_lesson text,
  ADD COLUMN IF NOT EXISTS youth_sunday_school_reference text,
  ADD COLUMN IF NOT EXISTS youth_sunday_school_date date;

-- Note: upcoming_date already exists for the main upcoming sermon date.
-- You can use it for the specific date the user requested.