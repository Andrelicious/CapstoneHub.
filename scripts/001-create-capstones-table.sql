-- Create capstones table for storing capstone projects
CREATE TABLE IF NOT EXISTS capstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  pdf_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_capstones_status ON capstones(status);
CREATE INDEX IF NOT EXISTS idx_capstones_category ON capstones(category);
CREATE INDEX IF NOT EXISTS idx_capstones_year ON capstones(year);
CREATE INDEX IF NOT EXISTS idx_capstones_uploader ON capstones(uploader_id);

-- Enable Row Level Security
ALTER TABLE capstones ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved capstones
CREATE POLICY "Anyone can view approved capstones"
  ON capstones FOR SELECT
  USING (status = 'approved');

-- Policy: Authenticated users can view their own submissions (any status)
CREATE POLICY "Users can view own submissions"
  ON capstones FOR SELECT
  TO authenticated
  USING (uploader_id = auth.uid());

-- Policy: Authenticated users can insert their own capstones
CREATE POLICY "Users can insert own capstones"
  ON capstones FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid());

-- Policy: Users can update their own pending capstones
CREATE POLICY "Users can update own pending capstones"
  ON capstones FOR UPDATE
  TO authenticated
  USING (uploader_id = auth.uid() AND status = 'pending')
  WITH CHECK (uploader_id = auth.uid());

-- Policy: Admins can do everything (we'll check role in profiles table)
CREATE POLICY "Admins have full access"
  ON capstones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_capstones_updated_at
  BEFORE UPDATE ON capstones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
