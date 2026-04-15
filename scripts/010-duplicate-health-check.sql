-- Duplicate protection health check for datasets
--
-- Returns:
-- 1) index_present: whether DB unique index exists
-- 2) duplicate_group_count: how many canonical duplicate groups currently exist
-- 3) total_duplicate_rows: how many rows are involved in duplicate groups (excluding one keeper per group)

with canonicalized as (
  select
    regexp_replace(regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9 ]', '', 'g'), '[[:space:]]+', ' ', 'g') as norm_title,
    lower(trim(coalesce(doc_type, ''))) as norm_doc_type,
    lower(trim(coalesce(program, ''))) as norm_program,
    lower(trim(coalesce(school_year, ''))) as norm_school_year
  from public.datasets
),
duplicate_groups as (
  select
    norm_title,
    norm_doc_type,
    norm_program,
    norm_school_year,
    count(*) as row_count
  from canonicalized
  group by 1,2,3,4
  having count(*) > 1
),
index_check as (
  select exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'datasets'
      and indexname = 'idx_datasets_unique_submission_key'
  ) as index_present
)
select
  index_check.index_present,
  coalesce((select count(*) from duplicate_groups), 0)::int as duplicate_group_count,
  coalesce((select sum(row_count - 1) from duplicate_groups), 0)::int as total_duplicate_rows
from index_check;
