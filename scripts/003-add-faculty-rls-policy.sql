-- Add RLS policy to allow faculty to view all capstones (pending, approved, rejected)
CREATE POLICY "Faculty can view all capstones" ON capstones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('faculty', 'admin')
    )
  );

-- Add RLS policy to allow faculty to update capstone status (approve/reject)
CREATE POLICY "Faculty can update capstones" ON capstones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('faculty', 'admin')
    )
  );
