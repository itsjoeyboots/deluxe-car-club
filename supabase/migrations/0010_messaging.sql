-- =====================================================================
-- Deluxe Car Club — messaging
-- Allows admins to send messages alongside paid members, and adds two
-- helper RPCs (get_inbox, mark_thread_read) plus realtime publication.
-- =====================================================================

-- Allow admins to send (for moderation / testing) — paid members were
-- already covered by the original policy.
drop policy if exists "paid can send message" on messages;
create policy "paid or admin can send message"
  on messages for insert with check (
    auth.uid() = sender_id and (is_paid_member() or is_admin())
  );

-- ---------------------------------------------------------------------
-- get_inbox: returns one row per conversation peer with the latest
-- message + unread count.
-- ---------------------------------------------------------------------
create or replace function get_inbox()
returns table (
  peer_id uuid,
  peer_full_name text,
  peer_profile_photo_url text,
  last_message_id uuid,
  last_message_content text,
  last_message_created_at timestamptz,
  last_message_sender_id uuid,
  last_message_read_at timestamptz,
  unread_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as id
  ),
  pairs as (
    select
      m.id,
      m.content,
      m.created_at,
      m.sender_id,
      m.recipient_id,
      m.read_at,
      case when m.sender_id = (select id from me) then m.recipient_id else m.sender_id end as peer_id
    from messages m
    where m.sender_id = (select id from me) or m.recipient_id = (select id from me)
  ),
  latest as (
    select distinct on (peer_id)
      peer_id, id, content, created_at, sender_id, read_at
    from pairs
    order by peer_id, created_at desc
  ),
  unread as (
    select sender_id as peer_id, count(*)::int as unread_count
    from messages
    where recipient_id = (select id from me) and read_at is null
    group by sender_id
  )
  select
    l.peer_id,
    p.full_name,
    p.profile_photo_url,
    l.id,
    l.content,
    l.created_at,
    l.sender_id,
    l.read_at,
    coalesce(u.unread_count, 0)
  from latest l
  left join unread u on u.peer_id = l.peer_id
  left join profiles p on p.id = l.peer_id
  order by l.created_at desc;
$$;

grant execute on function get_inbox() to authenticated;

-- ---------------------------------------------------------------------
-- mark_thread_read: marks every message FROM peer TO me as read.
-- ---------------------------------------------------------------------
create or replace function mark_thread_read(peer_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  affected int;
begin
  if caller is null then return 0; end if;
  update messages
     set read_at = now()
   where recipient_id = caller
     and sender_id = peer_id
     and read_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function mark_thread_read(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime: opt the messages table into the supabase_realtime
-- publication so postgres_changes events fire on insert/update.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table messages;
