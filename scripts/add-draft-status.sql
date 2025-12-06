-- Add 'draft' to the capstones status check constraint
-- First drop the existing constraint, then add it back with 'draft' included

ALTER TABLE capstones DROP CONSTRAINT IF EXISTS capstones_status_check;

ALTER TABLE capstones ADD CONSTRAINT capstones_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'draft'));
