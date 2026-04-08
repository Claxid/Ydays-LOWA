-- LOWA - Migration to support half-star ratings (e.g., 4.5)
-- Run this in Supabase SQL Editor

alter table public.product_reviews
  alter column rating type numeric(2,1)
  using rating::numeric;

alter table public.product_reviews
  drop constraint if exists product_reviews_rating_check;

alter table public.product_reviews
  add constraint product_reviews_rating_check
  check (
    rating >= 1
    and rating <= 5
    and rating * 2 = trunc(rating * 2)
  );
