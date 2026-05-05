-- =====================================================================
-- Deluxe Car Club — membership model overhaul
-- Replaces the tiered Drivers/Collector system with:
--   - Base membership ($100/yr, after admin approval)
--   - Marketplace add-on ($500/yr) — gates marketplace tab
--   - Season Pass add-on ($200/mo) — full event access
--
-- All three are time-bounded via *_until timestamps. The legacy `tier`
-- column stays in place for now but is no longer authoritative; helpers
-- below derive everything from the *_until columns.
-- =====================================================================

-- ---------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists base_paid_until timestamptz,
  add column if not exists marketplace_addon_until timestamptz,
  add column if not exists season_pass_until timestamptz;

create index if not exists profiles_base_paid_until_idx
  on profiles(base_paid_until) where base_paid_until is not null;

create index if not exists profiles_season_pass_until_idx
  on profiles(season_pass_until) where season_pass_until is not null;

create index if not exists profiles_marketplace_addon_until_idx
  on profiles(marketplace_addon_until) where marketplace_addon_until is not null;

-- ---------------------------------------------------------------------
-- Backfill: anyone currently paid keeps a forward-dated base subscription
-- so they don't lose access. Anyone on the legacy "collector" tier also
-- gets the season pass forward-dated.
-- ---------------------------------------------------------------------
update profiles
   set base_paid_until = greatest(coalesce(base_paid_until, now()), now() + interval '1 year')
 where status = 'paid' and base_paid_until is null;

update profiles
   set season_pass_until = greatest(coalesce(season_pass_until, now()), now() + interval '1 year')
 where status = 'paid' and tier = 'collector' and season_pass_until is null;

-- ---------------------------------------------------------------------
-- Helper SQL: derived membership predicates. SECURITY DEFINER so they're
-- safe to call from RLS without granting select on the underlying table.
-- ---------------------------------------------------------------------
create or replace function has_active_base(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
     where id = uid and base_paid_until is not null and base_paid_until > now()
  );
$$;

create or replace function has_marketplace_addon(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
     where id = uid
       and marketplace_addon_until is not null
       and marketplace_addon_until > now()
  );
$$;

create or replace function has_season_pass(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
     where id = uid
       and season_pass_until is not null
       and season_pass_until > now()
  );
$$;

grant execute on function has_active_base(uuid) to authenticated;
grant execute on function has_marketplace_addon(uuid) to authenticated;
grant execute on function has_season_pass(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Admin grant/revoke RPCs. Admin-only via is_admin() check. Each takes
-- months (or years for base) to extend; pass 0 to revoke immediately.
-- ---------------------------------------------------------------------
create or replace function admin_set_base(target uuid, months int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_until timestamptz;
begin
  if not is_admin() then raise exception 'forbidden: admin role required'; end if;
  if months <= 0 then
    update profiles set base_paid_until = null where id = target
      returning base_paid_until into new_until;
  else
    update profiles
       set base_paid_until = greatest(coalesce(base_paid_until, now()), now())
                              + (months || ' months')::interval,
           status = case when status in ('approved','paid') then 'paid' else status end,
           paid_since = coalesce(paid_since, now())
     where id = target
     returning base_paid_until into new_until;
  end if;
  return new_until;
end;
$$;

create or replace function admin_set_marketplace_addon(target uuid, months int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_until timestamptz;
begin
  if not is_admin() then raise exception 'forbidden: admin role required'; end if;
  if months <= 0 then
    update profiles set marketplace_addon_until = null where id = target
      returning marketplace_addon_until into new_until;
  else
    update profiles
       set marketplace_addon_until = greatest(coalesce(marketplace_addon_until, now()), now())
                                       + (months || ' months')::interval
     where id = target
     returning marketplace_addon_until into new_until;
  end if;
  return new_until;
end;
$$;

create or replace function admin_set_season_pass(target uuid, months int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_until timestamptz;
begin
  if not is_admin() then raise exception 'forbidden: admin role required'; end if;
  if months <= 0 then
    update profiles set season_pass_until = null where id = target
      returning season_pass_until into new_until;
  else
    update profiles
       set season_pass_until = greatest(coalesce(season_pass_until, now()), now())
                                 + (months || ' months')::interval
     where id = target
     returning season_pass_until into new_until;
  end if;
  return new_until;
end;
$$;

grant execute on function admin_set_base(uuid, int) to authenticated;
grant execute on function admin_set_marketplace_addon(uuid, int) to authenticated;
grant execute on function admin_set_season_pass(uuid, int) to authenticated;
