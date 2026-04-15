-- Add Row Level Security policies for datasets table used by submission wizard
-- This fixes student-owned status transitions like draft -> ocr_processing -> pending_admin_review

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid duplicates/conflicts
DROP POLICY IF EXISTS datasets_student_insert ON datasets;
DROP POLICY IF EXISTS datasets_student_read ON datasets;
DROP POLICY IF EXISTS datasets_student_update ON datasets;
DROP POLICY IF EXISTS datasets_admin_all ON datasets;
DROP POLICY IF EXISTS datasets_adviser_read ON datasets;

-- Students can create their own datasets
CREATE POLICY datasets_student_insert ON datasets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Students can read their own datasets; everyone can read approved/public datasets
CREATE POLICY datasets_student_read ON datasets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR status = 'approved'
    OR is_public = true
  );

-- Students can update their own datasets
CREATE POLICY datasets_student_update ON datasets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Advisers can read approved/public datasets
CREATE POLICY datasets_adviser_read ON datasets
  FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'adviser'
      )
    )
    AND (status = 'approved' OR is_public = true)
  );

-- Admins can do everything on datasets
CREATE POLICY datasets_admin_all ON datasets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
