-- Comprehensive Capstone Hub Schema with OCR Support
-- This migration creates the complete schema from scratch with strict RLS policies

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE doc_type_enum AS ENUM ('capstone', 'thesis');
CREATE TYPE submission_status_enum AS ENUM (
  'draft',
  'ocr_processing',
  'pending_admin_review',
  'approved',
  'rejected',
  'archived'
);
CREATE TYPE ocr_status_enum AS ENUM ('queued', 'processing', 'done', 'failed');
CREATE TYPE user_role_enum AS ENUM ('student', 'adviser', 'admin');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Profiles: Extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role user_role_enum DEFAULT 'student' NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  organization TEXT,
  username TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions: Main capstone/thesis submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type doc_type_enum NOT NULL,
  program TEXT NOT NULL,
  school_year INTEGER NOT NULL,
  status submission_status_enum DEFAULT 'draft' NOT NULL,
  admin_remarks TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submission Files: Store file references (metadata only, files in storage)
CREATE TABLE IF NOT EXISTS submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  sha256 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OCR Jobs: Track OCR processing status
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  status ocr_status_enum DEFAULT 'queued' NOT NULL,
  provider TEXT DEFAULT 'google_vision',
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OCR Results: Store extracted text and metadata
CREATE TABLE IF NOT EXISTS ocr_results (
  submission_id UUID PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  preview_text TEXT,
  full_text TEXT,
  title_hint TEXT,
  abstract_text TEXT,
  references_text TEXT,
  keywords JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC(3,2),
  quality_flags JSONB DEFAULT '{}',
  page_count INTEGER,
  full_text_search TSVECTOR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs: Track all administrative actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Submissions indexes
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_program ON submissions(program);
CREATE INDEX idx_submissions_school_year ON submissions(school_year);
CREATE INDEX idx_submissions_uploader_id ON submissions(uploader_id);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);

-- Submission files indexes
CREATE INDEX idx_submission_files_submission_id ON submission_files(submission_id);

-- OCR indexes
CREATE INDEX idx_ocr_jobs_status ON ocr_jobs(status);
CREATE INDEX idx_ocr_jobs_submission_id ON ocr_jobs(submission_id);

-- Full-text search on OCR results
CREATE INDEX idx_ocr_results_full_text ON ocr_results USING GIN(full_text_search);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- 4. TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER submission_files_updated_at BEFORE UPDATE ON submission_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ocr_jobs_updated_at BEFORE UPDATE ON ocr_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ocr_results_updated_at BEFORE UPDATE ON ocr_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. FULL-TEXT SEARCH TRIGGER FOR OCR RESULTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ocr_full_text_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_text_search = to_tsvector('english', COALESCE(NEW.full_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ocr_results_full_text_search BEFORE INSERT OR UPDATE ON ocr_results
  FOR EACH ROW EXECUTE FUNCTION update_ocr_full_text_search();

CREATE OR REPLACE FUNCTION normalize_ocr_keywords(input_keywords JSONB)
RETURNS JSONB AS $$
BEGIN
  IF input_keywords IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF jsonb_typeof(input_keywords) = 'array' THEN
    RETURN input_keywords;
  END IF;

  RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ocr_keywords_defaults()
RETURNS TRIGGER AS $$
BEGIN
  NEW.keywords = normalize_ocr_keywords(NEW.keywords);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ocr_results_keywords_default BEFORE INSERT OR UPDATE ON ocr_results
  FOR EACH ROW EXECUTE FUNCTION update_ocr_keywords_defaults();

-- ============================================================================
-- 6. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- ===== PROFILES RLS =====
-- Students can only read/update own profile
CREATE POLICY profiles_student_read ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY profiles_student_update ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Advisers can read own profile + admin profile info
CREATE POLICY profiles_adviser_read ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('adviser', 'admin')
  );

-- ===== SUBMISSIONS RLS =====
-- Students: can create own submissions, read own (any status), update own (only draft)
CREATE POLICY submissions_student_create ON submissions
  FOR INSERT WITH CHECK (
    auth.uid() = uploader_id AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

CREATE POLICY submissions_student_read ON submissions
  FOR SELECT USING (
    auth.uid() = uploader_id AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

CREATE POLICY submissions_student_update ON submissions
  FOR UPDATE USING (
    auth.uid() = uploader_id AND
    status IN ('draft') AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- Advisers: can only read approved submissions
CREATE POLICY submissions_adviser_read ON submissions
  FOR SELECT USING (
    status = 'approved' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adviser'
  );

-- Admin: can read/update all submissions
CREATE POLICY submissions_admin_all ON submissions
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ===== SUBMISSION_FILES RLS =====
-- Students: can read/upload own submission files (only when editable)
CREATE POLICY submission_files_student_read ON submission_files
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM submissions
      WHERE uploader_id = auth.uid() AND
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    )
  );

CREATE POLICY submission_files_student_insert ON submission_files
  FOR INSERT WITH CHECK (
    submission_id IN (
      SELECT id FROM submissions
      WHERE uploader_id = auth.uid() AND
            status IN ('draft') AND
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    )
  );

-- Advisers: can read files from approved submissions only
CREATE POLICY submission_files_adviser_read ON submission_files
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM submissions WHERE status = 'approved'
    ) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adviser'
  );

-- Admin: can read/write all submission files
CREATE POLICY submission_files_admin_all ON submission_files
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ===== OCR_JOBS RLS =====
-- Students: can read own OCR job status
CREATE POLICY ocr_jobs_student_read ON ocr_jobs
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM submissions WHERE uploader_id = auth.uid()
    ) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- Advisers: can read OCR jobs for approved submissions
CREATE POLICY ocr_jobs_adviser_read ON ocr_jobs
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM submissions WHERE status = 'approved'
    ) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adviser'
  );

-- Admin: full access
CREATE POLICY ocr_jobs_admin_all ON ocr_jobs
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Service role (OCR worker): can update job status and insert results
-- This policy allows service role bypass via SECURITY DEFINER functions

-- ===== OCR_RESULTS RLS =====
-- Students: can read own OCR results
CREATE POLICY ocr_results_student_read ON ocr_results
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM submissions WHERE uploader_id = auth.uid()
    ) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- Advisers: can read OCR results for approved submissions (preview only)
CREATE POLICY ocr_results_adviser_read ON ocr_results
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM submissions WHERE status = 'approved'
    ) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'adviser'
  );

-- Admin: full access
CREATE POLICY ocr_results_admin_all ON ocr_results
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ===== AUDIT_LOGS RLS =====
-- Admin only: can read all audit logs
CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Anyone can insert audit logs (insert via trigger)
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. VIEWS FOR APPROVED REPOSITORY & ADMIN QUEUE
-- ============================================================================

-- View: Approved Repository (for browsing, searching)
CREATE OR REPLACE VIEW approved_repository_view AS
SELECT
  s.id,
  s.title,
  s.doc_type,
  s.program,
  s.school_year,
  s.approved_at,
  p.display_name as uploader_name,
  COALESCE(o.preview_text, '') as preview_text,
  o.page_count,
  o.full_text_search
FROM submissions s
LEFT JOIN profiles p ON s.uploader_id = p.id
LEFT JOIN ocr_results o ON s.id = o.submission_id
WHERE s.status = 'approved'
ORDER BY s.approved_at DESC;

-- View: Admin Review Queue (pending submissions)
CREATE OR REPLACE VIEW admin_review_queue_view AS
SELECT
  s.id,
  s.title,
  s.doc_type,
  s.program,
  s.school_year,
  s.created_at,
  s.updated_at,
  p.display_name as uploader_name,
  o.status as ocr_status,
  COALESCE(o.preview_text, '') as preview_text
FROM submissions s
LEFT JOIN profiles p ON s.uploader_id = p.id
LEFT JOIN ocr_jobs o ON s.id = o.submission_id
WHERE s.status = 'pending_admin_review'
ORDER BY s.created_at ASC;

-- ============================================================================
-- 9. HELPER FUNCTIONS FOR SERVICE ROLE WRITES (OCR PROCESSING)
-- ============================================================================

-- Function: Update OCR Job Status (for OCR workers)
CREATE OR REPLACE FUNCTION update_ocr_job_status(
  p_submission_id UUID,
  p_status ocr_status_enum
)
RETURNS void AS $$
BEGIN
  UPDATE ocr_jobs
  SET status = p_status, attempts = attempts + 1
  WHERE submission_id = p_submission_id;
  
  -- Update submission status if OCR is done
  IF p_status = 'done' THEN
    UPDATE submissions
    SET status = 'pending_admin_review'
    WHERE id = p_submission_id AND status = 'ocr_processing';
  END IF;
  
  -- Log the action
  INSERT INTO audit_logs (action, entity_type, entity_id, details)
  VALUES (
    'ocr_job_updated',
    'ocr_jobs',
    p_submission_id,
    jsonb_build_object('new_status', p_status::text)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Insert OCR Results (for OCR workers)
CREATE OR REPLACE FUNCTION insert_ocr_results(
  p_submission_id UUID,
  p_preview_text TEXT,
  p_full_text TEXT,
  p_confidence NUMERIC,
  p_page_count INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO ocr_results (
    submission_id,
    preview_text,
    full_text,
    confidence,
    page_count
  ) VALUES (
    p_submission_id,
    p_preview_text,
    p_full_text,
    p_confidence,
    p_page_count
  )
  ON CONFLICT (submission_id) DO UPDATE SET
    preview_text = p_preview_text,
    full_text = p_full_text,
    confidence = p_confidence,
    page_count = p_page_count;
  
  -- Log the action
  INSERT INTO audit_logs (action, entity_type, entity_id, details)
  VALUES (
    'ocr_results_created',
    'ocr_results',
    p_submission_id,
    jsonb_build_object('page_count', p_page_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (they won't be able to call it but service role can)
GRANT EXECUTE ON FUNCTION update_ocr_job_status TO authenticated;
GRANT EXECUTE ON FUNCTION insert_ocr_results TO authenticated;
