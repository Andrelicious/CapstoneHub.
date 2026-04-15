-- Allow students to delete their own non-approved submissions
-- within 30 days of creation, while keeping approved records protected.

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS datasets_student_delete ON datasets;

CREATE POLICY datasets_student_delete ON datasets
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status <> 'approved'
    AND created_at >= (now() - interval '30 days')
  );
