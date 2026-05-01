-- =====================================================================
-- Deluxe Car Club — partners storage + suggestions
-- Adds:
--   - partner-images storage bucket (public read, admin write)
--   - partner_suggestions table for member submissions
-- =====================================================================

-- ---------------------------------------------------------------------
-- Partner hero image bucket
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('partner-images', 'partner-images', true)
on conflict (id) do nothing;

create policy "partners: anyone can view"
  on storage.objects for select
  using (bucket_id = 'partner-images');

create policy "partners: admin can upload"
  on storage.objects for insert
  with check (bucket_id = 'partner-images' and is_admin());

create policy "partners: admin can update"
  on storage.objects for update
  using (bucket_id = 'partner-images' and is_admin());

create policy "partners: admin can delete"
  on storage.objects for delete
  using (bucket_id = 'partner-images' and is_admin());

-- ---------------------------------------------------------------------
-- partner_suggestions: members nominate shops, admins triage.
-- ---------------------------------------------------------------------
create table if not exists partner_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null references profiles(id) on delete cascade,
  name text not null,
  why text,
  contact_info text,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists partner_suggestions_reviewed_idx
  on partner_suggestions(reviewed, created_at desc);

alter table partner_suggestions enable row level security;

create policy "self submits suggestions"
  on partner_suggestions for insert
  with check (auth.uid() = suggested_by and is_approved_or_paid());

create policy "self reads own suggestions"
  on partner_suggestions for select
  using (auth.uid() = suggested_by);

create policy "admin reads suggestions"
  on partner_suggestions for select
  using (is_admin());

create policy "admin updates suggestions"
  on partner_suggestions for update
  using (is_admin()) with check (is_admin());
