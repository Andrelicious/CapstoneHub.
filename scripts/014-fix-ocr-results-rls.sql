-- Fix RLS so authenticated owners can write OCR results.
-- Supports both schema variants: ocr_results.dataset_id or ocr_results.submission_id.

ALTER TABLE IF EXISTS public.ocr_results ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.ocr_results TO authenticated;

DO $$
DECLARE
  id_col text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
      AND column_name = 'dataset_id'
  ) THEN
    id_col := 'dataset_id';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
      AND column_name = 'submission_id'
  ) THEN
    id_col := 'submission_id';
  ELSE
    RAISE EXCEPTION 'ocr_results needs dataset_id or submission_id column for RLS fix';
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS ocr_results_owner_read ON public.ocr_results';
  EXECUTE 'DROP POLICY IF EXISTS ocr_results_owner_insert ON public.ocr_results';
  EXECUTE 'DROP POLICY IF EXISTS ocr_results_owner_update ON public.ocr_results';

  EXECUTE format(
    'CREATE POLICY ocr_results_owner_read ON public.ocr_results
       FOR SELECT
       USING (
         EXISTS (
           SELECT 1
           FROM public.datasets d
           WHERE d.id = ocr_results.%I
             AND d.user_id = auth.uid()
         )
         OR EXISTS (
           SELECT 1
           FROM public.profiles p
           WHERE p.id = auth.uid()
             AND p.role::text IN (''admin'', ''adviser'')
         )
       )',
    id_col
  );

  EXECUTE format(
    'CREATE POLICY ocr_results_owner_insert ON public.ocr_results
       FOR INSERT
       WITH CHECK (
         EXISTS (
           SELECT 1
           FROM public.datasets d
           WHERE d.id = ocr_results.%I
             AND d.user_id = auth.uid()
         )
       )',
    id_col
  );

  EXECUTE format(
    'CREATE POLICY ocr_results_owner_update ON public.ocr_results
       FOR UPDATE
       USING (
         EXISTS (
           SELECT 1
           FROM public.datasets d
           WHERE d.id = ocr_results.%I
             AND d.user_id = auth.uid()
         )
       )
       WITH CHECK (
         EXISTS (
           SELECT 1
           FROM public.datasets d
           WHERE d.id = ocr_results.%I
             AND d.user_id = auth.uid()
         )
       )',
    id_col, id_col
  );
END $$;