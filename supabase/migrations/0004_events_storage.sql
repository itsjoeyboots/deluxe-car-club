-- =====================================================================
-- Desert Social Club — events storage
-- Public read for the events-public bucket (hero images appear in marketing
-- copy). Only admins can upload/replace.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('events-public', 'events-public', true)
on conflict (id) do nothing;

create policy "events: anyone can view"
  on storage.objects for select
  using (bucket_id = 'events-public');

create policy "events: admin can upload"
  on storage.objects for insert
  with check (bucket_id = 'events-public' and is_admin());

create policy "events: admin can update"
  on storage.objects for update
  using (bucket_id = 'events-public' and is_admin());

create policy "events: admin can delete"
  on storage.objects for delete
  using (bucket_id = 'events-public' and is_admin());
