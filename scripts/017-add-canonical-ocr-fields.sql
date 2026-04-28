-- Add canonical OCR fields while keeping legacy columns intact.
-- This supports storing file-derived OCR text, extracted title, extracted abstract,
-- and job completion/error timestamps in a production-safe way.

ALTER TABLE IF EXISTS public.ocr_results
  ADD COLUMN IF NOT EXISTS ocr_text TEXT,
  ADD COLUMN IF NOT EXISTS extracted_title TEXT,
  ADD COLUMN IF NOT EXISTS extracted_abstract TEXT;

ALTER TABLE IF EXISTS public.ocr_jobs
  ADD COLUMN IF NOT EXISTS ocr_error TEXT,
  ADD COLUMN IF NOT EXISTS ocr_completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
      AND column_name = 'full_text'
  ) THEN
    EXECUTE '
      UPDATE public.ocr_results
      SET ocr_text = COALESCE(ocr_text, full_text)
      WHERE ocr_text IS NULL AND full_text IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
      AND column_name = 'title'
  ) THEN
    EXECUTE '
      UPDATE public.ocr_results
      SET extracted_title = COALESCE(extracted_title, title, title_hint)
      WHERE extracted_title IS NULL
    ';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
      AND column_name = 'title_hint'
  ) THEN
    EXECUTE '
      UPDATE public.ocr_results
      SET extracted_title = COALESCE(extracted_title, title_hint)
      WHERE extracted_title IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
      AND column_name = 'abstract_text'
  ) THEN
    EXECUTE '
      UPDATE public.ocr_results
      SET extracted_abstract = COALESCE(extracted_abstract, abstract_text)
      WHERE extracted_abstract IS NULL AND abstract_text IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_jobs'
      AND column_name = 'error_message'
  ) THEN
    EXECUTE '
      UPDATE public.ocr_jobs
      SET ocr_error = COALESCE(ocr_error, error_message)
      WHERE ocr_error IS NULL AND error_message IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_jobs'
      AND column_name = 'updated_at'
  ) THEN
    EXECUTE '
      UPDATE public.ocr_jobs
      SET ocr_completed_at = COALESCE(ocr_completed_at, updated_at)
      WHERE ocr_completed_at IS NULL
        AND status IN (''done'', ''failed'')
    ';
  END IF;
END $$;
