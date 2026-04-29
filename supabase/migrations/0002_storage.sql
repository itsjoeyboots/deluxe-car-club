-- =====================================================================
-- Desert Social Club — storage buckets
-- Creates the avatars + car-photos buckets and RLS policies so each user
-- can only write under a folder named after their own user id.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

-- ---- avatars ----
create policy "avatars: anyone can view"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: user can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: user can update own files"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: user can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---- car-photos ----
create policy "car-photos: approved+ can view"
  on storage.objects for select
  using (bucket_id = 'car-photos' and is_approved_or_paid());

create policy "car-photos: user can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'car-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "car-photos: user can update own files"
  on storage.objects for update
  using (
    bucket_id = 'car-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "car-photos: user can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'car-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
