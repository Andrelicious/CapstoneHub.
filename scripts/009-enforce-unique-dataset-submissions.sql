-- Enforce unique submissions across the whole system by canonicalized
-- (title, doc_type, program, school_year).
--
-- This migration first removes existing duplicates (keeps one best row per key),
-- then creates a unique index so future duplicates are blocked at DB level.

with ranked as (
  select
    id,
    regexp_replace(regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9 ]', '', 'g'), '[[:space:]]+', ' ', 'g') as norm_title,
    lower(trim(coalesce(doc_type, ''))) as norm_doc_type,
    lower(trim(coalesce(program, ''))) as norm_program,
    lower(trim(coalesce(school_year, ''))) as norm_school_year,
    row_number() over (
      partition by
        regexp_replace(regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9 ]', '', 'g'), '[[:space:]]+', ' ', 'g'),
        lower(trim(coalesce(doc_type, ''))),
        lower(trim(coalesce(program, ''))),
        lower(trim(coalesce(school_year, '')))
      order by
        case
          when status = 'approved' then 1
          when status = 'pending_admin_review' then 2
          when status = 'ocr_processing' then 3
          when status = 'draft' then 4
          when status = 'rejected' then 5
          else 6
        end,
        created_at desc,
        id desc
    ) as rn
  from public.datasets
),
duplicates as (
  select id
  from ranked
  where rn > 1
)
delete from public.datasets d
using duplicates x
where d.id = x.id;

create unique index if not exists idx_datasets_unique_submission_key
on public.datasets (
  regexp_replace(regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9 ]', '', 'g'), '[[:space:]]+', ' ', 'g'),
  lower(trim(coalesce(doc_type, ''))),
  lower(trim(coalesce(program, ''))),
  lower(trim(coalesce(school_year, '')))
);
