-- Run in Supabase SQL Editor after creating the project.
-- Creates storage buckets for attachments and avatars.

insert into storage.buckets (id, name, public)
values
  ('attachments', 'attachments', false),
  ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Service role (backend) has full access via SUPABASE_SERVICE_ROLE_KEY.
-- No extra RLS policies required when all access goes through the API.
