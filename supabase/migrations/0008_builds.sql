-- =====================================================================
-- Deluxe Car Club — build galleries
-- Adds owner-checked RPCs for posting build updates (with weekly points
-- cap), managing mods, and toggling likes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- post_build_update: owner posts an update with optional photos.
-- Awards +25 points if the user hasn't posted another update in the
-- last 7 days. Returns the new update id.
-- ---------------------------------------------------------------------
create or replace function post_build_update(
  car_id_in uuid,
  content_in text,
  photo_urls_in text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  owner uuid;
  recent_count int;
  new_id uuid;
begin
  if caller is null then
    raise exception 'not signed in';
  end if;
  if content_in is null or length(trim(content_in)) = 0 then
    raise exception 'content is required';
  end if;

  select user_id into owner from cars where id = car_id_in;
  if owner is null then
    raise exception 'car not found';
  end if;
  if owner <> caller then
    raise exception 'forbidden: not your car';
  end if;

  insert into build_updates (car_id, user_id, content, photo_urls)
       values (car_id_in, caller, trim(content_in), coalesce(photo_urls_in, '{}'))
    returning id into new_id;

  -- Weekly cap on +25 points
  select count(*) into recent_count
    from build_updates
   where user_id = caller
     and id <> new_id
     and created_at > now() - interval '7 days';

  if recent_count = 0 then
    insert into points_transactions (user_id, amount, reason, related_type, related_id)
         values (caller, 25, 'build_update', 'build_update', new_id);
  end if;

  return new_id;
end;
$$;

grant execute on function post_build_update(uuid, text, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- add_mod / delete_mod: owner-checked CRUD for mods on a car.
-- ---------------------------------------------------------------------
create or replace function add_mod(
  car_id_in uuid,
  category_in mod_category,
  description_in text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  owner uuid;
  new_id uuid;
begin
  if caller is null then raise exception 'not signed in'; end if;
  if description_in is null or length(trim(description_in)) = 0 then
    raise exception 'description is required';
  end if;

  select user_id into owner from cars where id = car_id_in;
  if owner is null then raise exception 'car not found'; end if;
  if owner <> caller then raise exception 'forbidden: not your car'; end if;

  insert into mods (car_id, category, description)
       values (car_id_in, category_in, trim(description_in))
    returning id into new_id;
  return new_id;
end;
$$;

grant execute on function add_mod(uuid, mod_category, text) to authenticated;

create or replace function delete_mod(mod_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  owner uuid;
begin
  if caller is null then raise exception 'not signed in'; end if;
  select c.user_id into owner
    from mods m
    join cars c on c.id = m.car_id
   where m.id = mod_id;
  if owner is null then raise exception 'mod not found'; end if;
  if owner <> caller then raise exception 'forbidden'; end if;

  delete from mods where id = mod_id;
end;
$$;

grant execute on function delete_mod(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- toggle_build_update_like: idempotent like / unlike. Returns the new
-- like-count for the update so the UI can render without a refetch.
-- ---------------------------------------------------------------------
create or replace function toggle_build_update_like(update_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  exists_already boolean;
  new_count int;
begin
  if caller is null then raise exception 'not signed in'; end if;
  if not is_approved_or_paid() then
    raise exception 'approval required to react';
  end if;

  select exists (
    select 1 from build_update_likes
     where build_update_id = update_id and user_id = caller
  ) into exists_already;

  if exists_already then
    delete from build_update_likes
     where build_update_id = update_id and user_id = caller;
  else
    insert into build_update_likes (build_update_id, user_id)
         values (update_id, caller);
  end if;

  select count(*)::int into new_count
    from build_update_likes
   where build_update_id = update_id;
  return new_count;
end;
$$;

grant execute on function toggle_build_update_like(uuid) to authenticated;

-- Self-insert + select on comments so the existing RLS approves the
-- standard add-comment flow from the client.
drop policy if exists "self reads own comments" on build_update_comments;
create policy "self reads own comments"
  on build_update_comments for select using (auth.uid() = user_id);
