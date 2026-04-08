-- LOWA - Product reviews (real-time)
-- Execute in Supabase SQL Editor

create table if not exists public.product_reviews (
  id bigint primary key generated always as identity,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 5 and 600),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_reviews_product_id_created_at
  on public.product_reviews (product_id, created_at desc);

alter table public.product_reviews enable row level security;

-- Public read
create policy "product_reviews_select_all"
on public.product_reviews
for select
using (true);

-- Authenticated users can insert their own reviews
create policy "product_reviews_insert_auth"
on public.product_reviews
for insert
to authenticated
with check (auth.uid() = user_id);

-- Optional: authors can update/delete their own reviews
create policy "product_reviews_update_own"
on public.product_reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "product_reviews_delete_own"
on public.product_reviews
for delete
to authenticated
using (auth.uid() = user_id);

alter publication supabase_realtime add table public.product_reviews;
