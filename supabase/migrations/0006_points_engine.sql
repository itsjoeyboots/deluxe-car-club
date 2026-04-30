-- =====================================================================
-- Desert Social Club — points engine
-- Adds:
--   - redeem_reward(reward_id) RPC: spends points, creates a redemption row.
--   - check_achievements_for_user(uid) RPC: idempotently inserts qualifying
--     achievement rows based on the user's stats.
--   - Triggers: re-evaluate achievements after check-in and after points
--     transactions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- redeem_reward: caller is the redeeming user; checks balance + reward
-- availability, inserts redemption (status=pending) and a negative
-- points_transactions row. The bump_points_balance trigger handles the
-- subtraction on profiles.points_balance.
-- ---------------------------------------------------------------------
create or replace function redeem_reward(reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  cost int;
  reward_name text;
  reward_available boolean;
  current_balance int;
  redemption_id uuid;
begin
  if caller is null then
    raise exception 'not signed in';
  end if;
  if not is_approved_or_paid() then
    raise exception 'approval required to redeem rewards';
  end if;

  select point_cost, name, available
    into cost, reward_name, reward_available
    from rewards where id = reward_id;
  if cost is null then
    raise exception 'reward not found';
  end if;
  if not reward_available then
    raise exception 'reward unavailable';
  end if;

  select points_balance into current_balance from profiles where id = caller;
  if current_balance < cost then
    raise exception 'not enough points (have %, need %)', current_balance, cost;
  end if;

  insert into reward_redemptions (user_id, reward_id, status)
       values (caller, reward_id, 'pending')
    returning id into redemption_id;

  insert into points_transactions (user_id, amount, reason, related_type, related_id)
       values (caller, -cost, 'reward_redemption: ' || reward_name, 'reward', reward_id);

  return redemption_id;
end;
$$;

grant execute on function redeem_reward(uuid) to authenticated;

-- Allow self-insert on reward_redemptions so the RPC can write rows
-- when called by the caller (SECURITY DEFINER bypasses RLS, but be
-- explicit so admins/end-users can read their own).
drop policy if exists "self reads own redemptions" on reward_redemptions;
create policy "self reads own redemptions"
  on reward_redemptions for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- check_achievements_for_user: examines user stats and inserts any
-- achievements they have just qualified for. Safe to call repeatedly
-- (unique key dedupes).
--
-- Achievement keys (mirror constants in lib/achievements.ts):
--   first_event       — 1 event check-in
--   sunrise_crew      — 5 morning events (start hour < 11)
--   rally_veteran     — 3 events whose title contains 'rally' (collector)
--   founding_50       — app_number <= 50
--   year_one          — 1 year since approved_at
--   builder           — 10 build_updates rows
--   connector         — 3 referred members approved (notes contains 'Referrer:')
--   track_day_warrior — 5 events whose title contains 'track'
--   welcome_wagon     — every cars-and-coffee in a calendar quarter
--                       (heuristic: 6+ checked-in cars-and-coffee events)
-- ---------------------------------------------------------------------
create or replace function check_achievements_for_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  app_num int;
  approved_ts timestamptz;
  checkin_count int;
  morning_count int;
  rally_count int;
  track_count int;
  cnc_count int;
  build_update_count int;
begin
  if uid is null then return; end if;

  select app_number, approved_at into app_num, approved_ts
    from profiles where id = uid;

  -- first_event + sunrise_crew + rally_veteran + track_day_warrior + welcome_wagon
  select
    count(*),
    count(*) filter (where extract(hour from e.starts_at) < 11),
    count(*) filter (where lower(e.title) like '%rally%'),
    count(*) filter (where lower(e.title) like '%track%'),
    count(*) filter (where lower(e.title) like '%cars%coffee%' or lower(e.title) like '%c&c%')
    into checkin_count, morning_count, rally_count, track_count, cnc_count
    from event_rsvps r
    join events e on e.id = r.event_id
   where r.user_id = uid and r.checked_in_at is not null;

  if checkin_count >= 1 then
    insert into achievements (user_id, achievement_key)
      values (uid, 'first_event') on conflict do nothing;
  end if;
  if morning_count >= 5 then
    insert into achievements (user_id, achievement_key)
      values (uid, 'sunrise_crew') on conflict do nothing;
  end if;
  if rally_count >= 3 then
    insert into achievements (user_id, achievement_key)
      values (uid, 'rally_veteran') on conflict do nothing;
  end if;
  if track_count >= 5 then
    insert into achievements (user_id, achievement_key)
      values (uid, 'track_day_warrior') on conflict do nothing;
  end if;
  if cnc_count >= 6 then
    insert into achievements (user_id, achievement_key)
      values (uid, 'welcome_wagon') on conflict do nothing;
  end if;

  -- founding_50
  if app_num is not null and app_num <= 50 then
    insert into achievements (user_id, achievement_key)
      values (uid, 'founding_50') on conflict do nothing;
  end if;

  -- year_one
  if approved_ts is not null and approved_ts <= now() - interval '1 year' then
    insert into achievements (user_id, achievement_key)
      values (uid, 'year_one') on conflict do nothing;
  end if;

  -- builder
  select count(*) into build_update_count
    from build_updates where user_id = uid;
  if build_update_count >= 10 then
    insert into achievements (user_id, achievement_key)
      values (uid, 'builder') on conflict do nothing;
  end if;

  -- connector: 3 approved profiles with applications.notes containing 'Referrer:'
  -- and matching the user's name or instagram. Heuristic — real referral linking
  -- ships with the referral system later; this lights the badge for now.
  -- Skipped until referral linking exists.
end;
$$;

grant execute on function check_achievements_for_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Triggers — keep achievements current without app-side coordination.
-- ---------------------------------------------------------------------
create or replace function tg_check_after_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.checked_in_at is not null
     and (old.checked_in_at is distinct from new.checked_in_at) then
    perform check_achievements_for_user(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_event_rsvp_checkin on event_rsvps;
create trigger on_event_rsvp_checkin
  after update on event_rsvps
  for each row execute procedure tg_check_after_checkin();

create or replace function tg_check_after_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.app_number is distinct from old.app_number
     or new.approved_at is distinct from old.approved_at
     or new.status is distinct from old.status then
    perform check_achievements_for_user(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_milestone on profiles;
create trigger on_profile_milestone
  after update on profiles
  for each row execute procedure tg_check_after_profile_update();
