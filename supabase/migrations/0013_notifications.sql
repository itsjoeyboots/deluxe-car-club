-- =====================================================================
-- Deluxe Car Club — Phase 13: notifications + push scaffolding
-- Adds profiles.expo_push_token, a notify() helper, and triggers that
-- fan in/out notifications on the key events the app cares about:
--   - DM received          (messages INSERT)
--   - Application status   (applications UPDATE on status)
--   - Achievement unlocked (achievements INSERT)
--   - Build liked          (build_update_likes INSERT)
--   - Build commented      (build_update_comments INSERT)
--   - New event posted     (events INSERT — broadcast to approved+)
--   - New partner added    (partners INSERT — broadcast to approved+)
--
-- All inserts respect notification_prefs: if a member sets prefs[type]
-- = false, that notification is skipped entirely (no inbox row, no push).
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles.expo_push_token: stored when the device registers for push.
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists expo_push_token text;

create index if not exists profiles_push_token_idx
  on profiles(expo_push_token) where expo_push_token is not null;

-- ---------------------------------------------------------------------
-- notify(user_id, type, title, body, related_id):
--   inserts one row, gated by notification_prefs[type] != false.
-- Returns the inserted notification id (or null if suppressed).
-- ---------------------------------------------------------------------
create or replace function notify(
  user_id_in uuid,
  type_in text,
  title_in text,
  body_in text default null,
  related_id_in uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  pref jsonb;
  new_id uuid;
begin
  select notification_prefs into pref
    from profiles
   where id = user_id_in;

  -- if prefs[type] is explicitly false, suppress
  if pref is not null and pref ? type_in
     and (pref ->> type_in)::boolean is false then
    return null;
  end if;

  insert into notifications (user_id, type, title, body, related_id)
    values (user_id_in, type_in, title_in, body_in, related_id_in)
    returning id into new_id;
  return new_id;
end;
$$;

grant execute on function notify(uuid, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- notify_approved(type, title, body, related_id): broadcast to all
-- approved/paid members. Used for new events + new partners.
-- ---------------------------------------------------------------------
create or replace function notify_approved(
  type_in text,
  title_in text,
  body_in text default null,
  related_id_in uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int := 0;
begin
  with eligible as (
    select id from profiles
     where status in ('approved', 'paid')
       and (
         notification_prefs is null
         or not (notification_prefs ? type_in)
         or (notification_prefs ->> type_in)::boolean is not false
       )
  )
  insert into notifications (user_id, type, title, body, related_id)
  select id, type_in, title_in, body_in, related_id_in from eligible;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function notify_approved(text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Trigger: DM received → notify recipient
-- ---------------------------------------------------------------------
create or replace function on_message_insert_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select coalesce(full_name, 'A member') into sender_name
    from profiles where id = new.sender_id;
  perform notify(
    new.recipient_id,
    'message',
    sender_name || ' sent you a message',
    case
      when length(new.content) > 80
        then substring(new.content from 1 for 78) || '…'
      else new.content
    end,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_message_insert on messages;
create trigger on_message_insert
  after insert on messages
  for each row execute function on_message_insert_notify();

-- ---------------------------------------------------------------------
-- Trigger: applications.status changed → notify the applicant
-- ---------------------------------------------------------------------
create or replace function on_application_status_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  app_status text;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;
  app_status := new.status;
  perform notify(
    new.user_id,
    'application_status',
    case
      when app_status = 'approved' then 'You’re in.'
      when app_status = 'rejected' then 'Application update'
      when app_status = 'waitlisted' then 'You’re on the waitlist'
      else 'Application update'
    end,
    case
      when app_status = 'approved'
        then 'Welcome to Deluxe Car Club. Your member card is live.'
      when app_status = 'rejected'
        then 'Founders reviewed your application. Check the app for next steps.'
      when app_status = 'waitlisted'
        then 'You’ve been waitlisted for a paid spot. We’ll ping you when one opens.'
      else 'Status updated to ' || app_status
    end,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_application_status on applications;
create trigger on_application_status
  after update of status on applications
  for each row execute function on_application_status_notify();

-- ---------------------------------------------------------------------
-- Trigger: achievement unlocked → notify the user
-- ---------------------------------------------------------------------
create or replace function on_achievement_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform notify(
    new.user_id,
    'achievement',
    'Achievement unlocked',
    new.achievement_key,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_achievement_insert on achievements;
create trigger on_achievement_insert
  after insert on achievements
  for each row execute function on_achievement_notify();

-- ---------------------------------------------------------------------
-- Trigger: build update liked → notify the update's author
-- ---------------------------------------------------------------------
create or replace function on_build_like_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_id uuid;
  liker_name text;
begin
  select user_id into author_id from build_updates where id = new.build_update_id;
  if author_id is null or author_id = new.user_id then
    return new; -- skip self-likes / orphan rows
  end if;
  select coalesce(full_name, 'Someone') into liker_name
    from profiles where id = new.user_id;
  perform notify(
    author_id,
    'build_like',
    liker_name || ' liked your build update',
    null,
    new.build_update_id
  );
  return new;
end;
$$;

drop trigger if exists on_build_like on build_update_likes;
create trigger on_build_like
  after insert on build_update_likes
  for each row execute function on_build_like_notify();

-- ---------------------------------------------------------------------
-- Trigger: build update commented → notify the update's author
-- ---------------------------------------------------------------------
create or replace function on_build_comment_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_id uuid;
  commenter_name text;
begin
  select user_id into author_id from build_updates where id = new.build_update_id;
  if author_id is null or author_id = new.user_id then
    return new;
  end if;
  select coalesce(full_name, 'Someone') into commenter_name
    from profiles where id = new.user_id;
  perform notify(
    author_id,
    'build_comment',
    commenter_name || ' commented on your build',
    case
      when length(new.content) > 80 then substring(new.content from 1 for 78) || '…'
      else new.content
    end,
    new.build_update_id
  );
  return new;
end;
$$;

drop trigger if exists on_build_comment on build_update_comments;
create trigger on_build_comment
  after insert on build_update_comments
  for each row execute function on_build_comment_notify();

-- ---------------------------------------------------------------------
-- Trigger: new event → broadcast to approved+
-- ---------------------------------------------------------------------
create or replace function on_event_insert_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' then return new; end if;
  perform notify_approved(
    'event_new',
    'New event: ' || new.title,
    coalesce(new.location_name, '') ||
      case when new.starts_at is not null
        then ' · ' || to_char(new.starts_at, 'Mon DD')
        else ''
      end,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_event_insert on events;
create trigger on_event_insert
  after insert on events
  for each row execute function on_event_insert_notify();

-- ---------------------------------------------------------------------
-- Trigger: new partner → broadcast to approved+
-- ---------------------------------------------------------------------
create or replace function on_partner_insert_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform notify_approved(
    'partner_new',
    'New partner: ' || new.name,
    coalesce(new.discount_terms, new.location_name),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_partner_insert on partners;
create trigger on_partner_insert
  after insert on partners
  for each row execute function on_partner_insert_notify();

-- ---------------------------------------------------------------------
-- Realtime: surface notifications to subscribed clients.
-- Idempotent: only adds if not already a member of the publication.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end$$;

-- ---------------------------------------------------------------------
-- Self-insert RLS for testing: allow approved+ to insert their own
-- notifications (used by the Admin announcements composer per-recipient
-- via the notify_approved RPC, and by clients dispatching local pushes).
-- The default policy already allows admin to insert; this adds a self
-- escape hatch that mirrors how notify() inserts run.
-- ---------------------------------------------------------------------
drop policy if exists "self can insert own notifications" on notifications;
create policy "self can insert own notifications"
  on notifications for insert
  with check (auth.uid() = user_id);
