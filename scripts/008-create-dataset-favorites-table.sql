-- Dataset favorites for all authenticated users (student, adviser, admin)

create table if not exists public.dataset_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, dataset_id)
);

create index if not exists idx_dataset_favorites_user_id on public.dataset_favorites(user_id);
create index if not exists idx_dataset_favorites_dataset_id on public.dataset_favorites(dataset_id);

alter table public.dataset_favorites enable row level security;

create policy "Users can read own favorites"
  on public.dataset_favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.dataset_favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.dataset_favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);
