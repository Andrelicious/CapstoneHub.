-- Persist the minimal OCR structured output: title and abstract.
-- Full text stays as the canonical OCR artifact; preview/reference fields are not used.

ALTER TABLE ocr_results
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS abstract_text TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
      AND column_name = 'title_hint'
  ) THEN
    EXECUTE 'UPDATE public.ocr_results SET title = COALESCE(title, title_hint) WHERE title IS NULL';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_ocr_results_title_hint;

CREATE INDEX IF NOT EXISTS idx_ocr_results_title ON ocr_results(title);