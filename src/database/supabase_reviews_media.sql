-- LOWA: Review media support (max 2 files per review)
-- Run this in Supabase SQL Editor.

-- 1) Add media_urls to reviews
alter table if exists public.product_reviews
add column if not exists media_urls jsonb not null default '[]'::jsonb;

-- 2) Enforce max 2 media files per review
alter table if exists public.product_reviews
  drop constraint if exists product_reviews_media_max_2;

alter table if exists public.product_reviews
  add constraint product_reviews_media_max_2
  check (
    jsonb_typeof(media_urls) = 'array'
    and jsonb_array_length(media_urls) <= 2
  );

-- 3) Create storage bucket for review media (public read)
insert into storage.buckets (id, name, public)
values ('review-media', 'review-media', true)
on conflict (id) do nothing;

-- 4) Storage policies
-- Public read for review media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'review_media_public_read'
  ) THEN
    CREATE POLICY review_media_public_read
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'review-media');
  END IF;
END $$;

-- Authenticated upload to own folder: <user_id>/<product_id>/<file>
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'review_media_auth_insert_own'
  ) THEN
    CREATE POLICY review_media_auth_insert_own
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'review-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Authenticated update/delete only on own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'review_media_auth_update_delete_own'
  ) THEN
    CREATE POLICY review_media_auth_update_delete_own
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'review-media'
      AND owner = auth.uid()
    )
    WITH CHECK (
      bucket_id = 'review-media'
      AND owner = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'review_media_auth_delete_own'
  ) THEN
    CREATE POLICY review_media_auth_delete_own
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'review-media'
      AND owner = auth.uid()
    );
  END IF;
END $$;
