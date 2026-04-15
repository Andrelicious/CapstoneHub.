-- OCR run telemetry table for observability and troubleshooting.
-- This records queued/processing/done/failed OCR lifecycle events.

CREATE TABLE IF NOT EXISTS public.ocr_run_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	dataset_id UUID,
	submission_id UUID,
	status TEXT NOT NULL,
	source_type TEXT,
	provider_hint TEXT,
	duration_ms INTEGER,
	full_text_chars INTEGER,
	has_title BOOLEAN,
	has_abstract BOOLEAN,
	is_title_only_source BOOLEAN,
	error_message TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_run_events_dataset_id ON public.ocr_run_events(dataset_id);
CREATE INDEX IF NOT EXISTS idx_ocr_run_events_submission_id ON public.ocr_run_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_ocr_run_events_status_created_at ON public.ocr_run_events(status, created_at DESC);

ALTER TABLE IF EXISTS public.ocr_run_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ocr_run_events_owner_read ON public.ocr_run_events;
DROP POLICY IF EXISTS ocr_run_events_admin_adviser_read ON public.ocr_run_events;
DROP POLICY IF EXISTS ocr_run_events_insert ON public.ocr_run_events;

CREATE POLICY ocr_run_events_owner_read ON public.ocr_run_events
	FOR SELECT
	TO authenticated
	USING (
		EXISTS (
			SELECT 1
			FROM public.datasets d
			WHERE d.id = COALESCE(ocr_run_events.dataset_id, ocr_run_events.submission_id)
				AND d.user_id = auth.uid()
		)
	);

CREATE POLICY ocr_run_events_admin_adviser_read ON public.ocr_run_events
	FOR SELECT
	TO authenticated
	USING (
		EXISTS (
			SELECT 1
			FROM public.profiles p
			WHERE p.id = auth.uid()
				AND p.role::text IN ('admin', 'adviser')
		)
	);

CREATE POLICY ocr_run_events_insert ON public.ocr_run_events
	FOR INSERT
	TO authenticated
	WITH CHECK (true);

