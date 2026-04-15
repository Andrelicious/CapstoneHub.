-- Soft-delete flow for student removals:
-- 1) student clicks Remove -> row is marked deleted_at = now()
-- 2) row is hidden from normal reads/updates
-- 3) permanent delete can happen after 30 days

ALTER TABLE datasets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_datasets_deleted_at ON datasets(deleted_at);

-- Recreate read policy so students can see their own removed rows in Trash
-- while normal dashboard queries can continue filtering deleted_at IS NULL.
DROP POLICY IF EXISTS datasets_student_read ON datasets;
CREATE POLICY datasets_student_read ON datasets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      (status = 'approved' OR is_public = true)
      AND deleted_at IS NULL
    )
  );

-- Recreate update policy so removed rows cannot be edited.
DROP POLICY IF EXISTS datasets_student_update ON datasets;
CREATE POLICY datasets_student_update ON datasets
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (user_id = auth.uid());

-- Keep owner delete capability only for rows already soft-deleted for >= 30 days.
DROP POLICY IF EXISTS datasets_student_delete ON datasets;
CREATE POLICY datasets_student_delete ON datasets
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status <> 'approved'
    AND deleted_at IS NOT NULL
    AND deleted_at <= (now() - interval '30 days')
  );
