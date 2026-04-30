-- =====================================================================
-- Desert Social Club — application extras
-- Adds:
--   - applications.heard_via    (free-text "how did you hear about us")
--   - applications.payment_intent_id  (Stripe Checkout Session id)
--   - approve_application(app_id)     (admin-only RPC)
--   - reject_application(app_id, notes) (admin-only RPC)
-- =====================================================================

alter table applications
  add column if not exists heard_via text,
  add column if not exists payment_intent_id text;

-- ---------------------------------------------------------------------
-- approve_application: marks app + profile approved, assigns next
-- sequential app_number, sets timestamps. Caller must be an admin.
-- ---------------------------------------------------------------------
create or replace function approve_application(app_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  next_num int;
begin
  if not is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  select user_id into target_user
    from applications where id = app_id;
  if target_user is null then
    raise exception 'application not found';
  end if;

  -- Reserve the next app number atomically.
  select coalesce(max(app_number), 0) + 1 into next_num from profiles;

  update profiles
     set status = 'approved',
         approved_at = coalesce(approved_at, now()),
         app_number = coalesce(app_number, next_num)
   where id = target_user;

  update applications
     set status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = app_id;

  return target_user;
end;
$$;

-- ---------------------------------------------------------------------
-- reject_application: marks app rejected, profile back to guest.
-- ---------------------------------------------------------------------
create or replace function reject_application(app_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
begin
  if not is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  select user_id into target_user
    from applications where id = app_id;
  if target_user is null then
    raise exception 'application not found';
  end if;

  update applications
     set status = 'rejected',
         notes = coalesce(reason, notes),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = app_id;

  -- Send the profile back to guest so they can re-apply later if invited.
  update profiles
     set status = 'rejected'
   where id = target_user;
end;
$$;

grant execute on function approve_application(uuid) to authenticated;
grant execute on function reject_application(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Convenience: count of approved profiles (for the scarcity UI).
-- ---------------------------------------------------------------------
create or replace function membership_counts()
returns table (approved_count int, paid_count int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from profiles where status in ('approved','paid')),
    (select count(*)::int from profiles where status = 'paid');
$$;

grant execute on function membership_counts() to authenticated, anon;
