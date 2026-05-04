-- =====================================================================
-- Deluxe Car Club — admin tools
-- Adds the featured-build pick column and an analytics RPC for the
-- founders dashboard.
-- =====================================================================

alter table build_updates
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_at timestamptz;

create index if not exists build_updates_featured_idx
  on build_updates(is_featured, featured_at desc);

-- ---------------------------------------------------------------------
-- admin_analytics: returns one wide row of counts/aggregates for the
-- admin dashboard. Admin-only.
-- ---------------------------------------------------------------------
create or replace function admin_analytics()
returns table (
  member_total int,
  member_pending int,
  member_approved int,
  member_paid int,
  member_drivers int,
  member_collector int,
  applications_pending int,
  applications_approved int,
  applications_rejected int,
  events_upcoming int,
  events_past int,
  rsvps_total int,
  checkins_total int,
  build_updates_total int,
  build_updates_featured int,
  partners_total int,
  partners_featured int,
  partner_suggestions_unreviewed int,
  points_awarded int,
  points_spent int,
  redemptions_pending int,
  redemptions_fulfilled int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from profiles),
    (select count(*)::int from profiles where status = 'pending'),
    (select count(*)::int from profiles where status = 'approved'),
    (select count(*)::int from profiles where status = 'paid'),
    (select count(*)::int from profiles where tier = 'drivers'),
    (select count(*)::int from profiles where tier = 'collector'),
    (select count(*)::int from applications where status = 'pending'),
    (select count(*)::int from applications where status = 'approved'),
    (select count(*)::int from applications where status = 'rejected'),
    (select count(*)::int from events where starts_at >= now() and status <> 'cancelled'),
    (select count(*)::int from events where starts_at < now()),
    (select count(*)::int from event_rsvps where status <> 'cancelled'),
    (select count(*)::int from event_rsvps where checked_in_at is not null),
    (select count(*)::int from build_updates),
    (select count(*)::int from build_updates where is_featured),
    (select count(*)::int from partners),
    (select count(*)::int from partners where featured),
    (select count(*)::int from partner_suggestions where not reviewed),
    (select coalesce(sum(amount), 0)::int from points_transactions where amount > 0),
    (select coalesce(sum(-amount), 0)::int from points_transactions where amount < 0),
    (select count(*)::int from reward_redemptions where status = 'pending'),
    (select count(*)::int from reward_redemptions where status = 'fulfilled');
$$;

grant execute on function admin_analytics() to authenticated;

-- ---------------------------------------------------------------------
-- Helper: stamp featured_at when toggling is_featured. Idempotent.
-- ---------------------------------------------------------------------
create or replace function set_build_featured(update_id uuid, value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'forbidden: admin role required'; end if;
  update build_updates
     set is_featured = value,
         featured_at = case when value then now() else null end
   where id = update_id;
end;
$$;

grant execute on function set_build_featured(uuid, boolean) to authenticated;
