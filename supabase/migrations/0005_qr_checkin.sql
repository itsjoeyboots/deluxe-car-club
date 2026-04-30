-- =====================================================================
-- Desert Social Club — QR check-in
-- Adds:
--   - profiles.member_qr_token (persistent per-member QR payload)
--   - checkin_member(qr_data, event_id)  admin-only RPC
-- =====================================================================

-- ---------------------------------------------------------------------
-- Add the persistent member QR token. Unique per profile, auto-filled
-- on insert via the existing handle_new_user trigger plus a backfill
-- for existing rows.
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists member_qr_token text unique;

update profiles
   set member_qr_token = 'mbr_' || replace(gen_random_uuid()::text, '-', '')
 where member_qr_token is null;

alter table profiles
  alter column member_qr_token set default 'mbr_' || replace(gen_random_uuid()::text, '-', ''),
  alter column member_qr_token set not null;

-- ---------------------------------------------------------------------
-- Re-run handle_new_user so freshly-signed-up profiles also get a token.
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, member_qr_token)
  values (
    new.id,
    new.email,
    'mbr_' || replace(gen_random_uuid()::text, '-', '')
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- checkin_member: admin scanner endpoint. qr_data can be either a
-- profiles.member_qr_token (permanent member card) or an event_rsvps
-- .qr_code_token (per-event ticket). event_id is required either way
-- so we know what to mark attended.
--
-- Returns a row with the resolved member + bonus info so the scanner
-- UI can confirm "Joey checked in (+100)".
-- ---------------------------------------------------------------------
create or replace function checkin_member(qr_data text, target_event uuid)
returns table (
  user_id uuid,
  full_name text,
  app_number int,
  awarded int,
  first_event boolean,
  rsvp_status rsvp_status,
  already_checked_in boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user uuid;
  rsvp_row event_rsvps%rowtype;
  prior_count int;
  bonus int := 0;
  base int := 100;
  was_already boolean := false;
begin
  if not is_admin() then
    raise exception 'forbidden: admin role required';
  end if;
  if qr_data is null or length(qr_data) = 0 then
    raise exception 'qr_data is required';
  end if;
  if target_event is null then
    raise exception 'target_event is required';
  end if;

  -- Resolve the QR to a user. Try member token first, then event RSVP token.
  select id into resolved_user
    from profiles where member_qr_token = qr_data;

  if resolved_user is null then
    select user_id into resolved_user
      from event_rsvps where qr_code_token = qr_data;
  end if;

  if resolved_user is null then
    raise exception 'unknown QR code';
  end if;

  -- Find or create the RSVP for this event.
  select * into rsvp_row
    from event_rsvps
   where event_id = target_event and event_rsvps.user_id = resolved_user
   order by created_at desc
   limit 1;

  if rsvp_row.id is null then
    -- Walk-up check-in (no prior RSVP). Insert one as 'going'.
    insert into event_rsvps (event_id, user_id, status, qr_code_token, checked_in_at)
    values (
      target_event,
      resolved_user,
      'going',
      'walkup_' || replace(gen_random_uuid()::text, '-', ''),
      now()
    )
    returning * into rsvp_row;
  elsif rsvp_row.checked_in_at is not null then
    was_already := true;
  else
    update event_rsvps
       set checked_in_at = now(),
           status = 'going'
     where id = rsvp_row.id
    returning * into rsvp_row;
  end if;

  if not was_already then
    -- First-event bonus: 50 extra if this is the user's first ever check-in.
    select count(*) into prior_count
      from event_rsvps
     where event_rsvps.user_id = resolved_user
       and checked_in_at is not null
       and id <> rsvp_row.id;

    if prior_count = 0 then
      bonus := 50;
    end if;

    insert into points_transactions (user_id, amount, reason, related_type, related_id)
    values (
      resolved_user,
      base + bonus,
      case when bonus > 0 then 'event_checkin_first' else 'event_checkin' end,
      'event',
      target_event
    );
  end if;

  return query
    select
      p.id,
      p.full_name,
      p.app_number,
      case when was_already then 0 else base + bonus end,
      bonus > 0,
      rsvp_row.status,
      was_already
    from profiles p
    where p.id = resolved_user;
end;
$$;

grant execute on function checkin_member(text, uuid) to authenticated;
