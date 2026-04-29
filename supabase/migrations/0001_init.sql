-- =====================================================================
-- Desert Social Club — initial schema
-- Run this against your Supabase project's SQL editor.
-- It creates the full data model, indexes, RLS policies, and seed helpers.
-- =====================================================================

-- ------------------- ENUMS -------------------------------------------
create type member_role as enum ('member', 'admin');
create type member_status as enum ('guest', 'pending', 'approved', 'rejected', 'paid');
create type member_tier as enum ('none', 'drivers', 'collector');
create type billing_cycle as enum ('monthly', 'annual');
create type application_status as enum ('pending', 'approved', 'rejected', 'waitlisted');
create type build_status as enum ('in_progress', 'complete');
create type mod_category as enum ('engine','suspension','exterior','interior','wheels','audio','other');
create type event_status as enum ('upcoming','full','past','cancelled');
create type event_tier as enum ('approved','drivers','collector');
create type rsvp_status as enum ('going','waitlist','cancelled');
create type redemption_status as enum ('pending','fulfilled','cancelled');

-- ------------------- USERS / PROFILES --------------------------------
-- Supabase Auth gives us auth.users; this `profiles` table extends it.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  phone text,
  full_name text,
  profile_photo_url text,
  instagram_handle text,
  city text,
  role member_role not null default 'member',
  status member_status not null default 'guest',
  tier member_tier not null default 'none',
  billing_cycle billing_cycle,
  applied_at timestamptz,
  approved_at timestamptz,
  paid_since timestamptz,
  app_number int unique,
  points_balance int not null default 0,
  notification_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_status_idx on profiles(status);
create index profiles_tier_idx on profiles(tier);
create index profiles_role_idx on profiles(role);

-- Auto-create a profile row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Helper: is the calling user an admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: is the calling user a paid member?
create or replace function is_paid_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'paid'
  );
$$;

-- Helper: is the calling user at least approved?
create or replace function is_approved_or_paid() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
     where id = auth.uid() and status in ('approved','paid')
  );
$$;

-- ------------------- APPLICATIONS ------------------------------------
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  primary_car text,
  motivation_text text,
  referred_by uuid references profiles(id) on delete set null,
  payment_status text not null default 'pending', -- 'pending'|'paid'|'refunded'|'failed'
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  status application_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create index applications_user_idx on applications(user_id);
create index applications_status_idx on applications(status);

-- ------------------- CARS / BUILDS -----------------------------------
create table cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  year int,
  make text,
  model text,
  nickname text,
  status build_status not null default 'in_progress',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index cars_user_idx on cars(user_id);

create table car_photos (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  url text not null,
  caption text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index car_photos_car_idx on car_photos(car_id);

create table mods (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  category mod_category not null,
  description text not null,
  created_at timestamptz not null default now()
);
create index mods_car_idx on mods(car_id);

create table build_updates (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index build_updates_car_idx on build_updates(car_id);
create index build_updates_user_idx on build_updates(user_id);

create table build_update_likes (
  build_update_id uuid not null references build_updates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (build_update_id, user_id)
);

create table build_update_comments (
  id uuid primary key default gen_random_uuid(),
  build_update_id uuid not null references build_updates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index buc_update_idx on build_update_comments(build_update_id);

-- ------------------- EVENTS ------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  hero_image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,
  capacity int,
  tier_required event_tier not null default 'approved',
  guest_passes_allowed boolean not null default false,
  status event_status not null default 'upcoming',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_starts_idx on events(starts_at desc);
create index events_status_idx on events(status);

create table event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status rsvp_status not null default 'going',
  qr_code_token text not null default encode(gen_random_bytes(16), 'hex'),
  checked_in_at timestamptz,
  guests_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index event_rsvps_event_idx on event_rsvps(event_id);
create index event_rsvps_user_idx on event_rsvps(user_id);

-- ------------------- PARTNERS ----------------------------------------
create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hero_image_url text,
  description text,
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,
  service_categories text[] not null default '{}',
  discount_terms text,
  contact_info jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index partners_featured_idx on partners(featured);

-- ------------------- POINTS / REWARDS / ACHIEVEMENTS -----------------
create table points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  reason text not null,
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now()
);
create index pts_user_idx on points_transactions(user_id, created_at desc);

create table rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  point_cost int not null,
  image_url text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  reward_id uuid not null references rewards(id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  status redemption_status not null default 'pending'
);
create index rr_user_idx on reward_redemptions(user_id);

create table achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

-- Adjust points_balance whenever a transaction is added
create or replace function bump_points_balance()
returns trigger language plpgsql as $$
begin
  update profiles
     set points_balance = points_balance + new.amount,
         updated_at = now()
   where id = new.user_id;
  return new;
end;
$$;

create trigger on_points_transaction
  after insert on points_transactions
  for each row execute procedure bump_points_balance();

-- ------------------- MESSAGES / NOTIFICATIONS ------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_pair_idx on messages(sender_id, recipient_id, created_at desc);
create index messages_recipient_idx on messages(recipient_id, read_at);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table applications enable row level security;
alter table cars enable row level security;
alter table car_photos enable row level security;
alter table mods enable row level security;
alter table build_updates enable row level security;
alter table build_update_likes enable row level security;
alter table build_update_comments enable row level security;
alter table events enable row level security;
alter table event_rsvps enable row level security;
alter table partners enable row level security;
alter table points_transactions enable row level security;
alter table rewards enable row level security;
alter table reward_redemptions enable row level security;
alter table achievements enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- ---- profiles ----
create policy "self can view profile"
  on profiles for select using (auth.uid() = id);
create policy "approved+ can browse profiles"
  on profiles for select using (is_approved_or_paid());
create policy "admin can view all profiles"
  on profiles for select using (is_admin());
create policy "self can update profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin can update any profile"
  on profiles for update using (is_admin()) with check (is_admin());

-- ---- applications ----
create policy "self can view own application"
  on applications for select using (auth.uid() = user_id);
create policy "self can insert own application"
  on applications for insert with check (auth.uid() = user_id);
create policy "admin can view applications"
  on applications for select using (is_admin());
create policy "admin can update applications"
  on applications for update using (is_admin()) with check (is_admin());

-- ---- cars / car_photos / mods / build_updates ----
create policy "owner manages own cars"
  on cars for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "approved+ can read cars"
  on cars for select using (is_approved_or_paid());

create policy "owner manages car photos"
  on car_photos for all using (
    exists (select 1 from cars where cars.id = car_photos.car_id and cars.user_id = auth.uid())
  );
create policy "approved+ can read car photos"
  on car_photos for select using (is_approved_or_paid());

create policy "owner manages mods"
  on mods for all using (
    exists (select 1 from cars where cars.id = mods.car_id and cars.user_id = auth.uid())
  );
create policy "approved+ can read mods"
  on mods for select using (is_approved_or_paid());

create policy "owner manages build updates"
  on build_updates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "approved+ can read build updates"
  on build_updates for select using (is_approved_or_paid());

create policy "approved+ can like"
  on build_update_likes for all using (auth.uid() = user_id) with check (is_approved_or_paid() and auth.uid() = user_id);
create policy "approved+ can read likes"
  on build_update_likes for select using (is_approved_or_paid());

create policy "approved+ can comment"
  on build_update_comments for insert with check (is_approved_or_paid() and auth.uid() = user_id);
create policy "approved+ can read comments"
  on build_update_comments for select using (is_approved_or_paid());
create policy "owner can edit own comment"
  on build_update_comments for update using (auth.uid() = user_id);
create policy "owner can delete own comment"
  on build_update_comments for delete using (auth.uid() = user_id);

-- ---- events ----
create policy "approved+ can read events"
  on events for select using (is_approved_or_paid());
create policy "admin manages events"
  on events for all using (is_admin()) with check (is_admin());

-- ---- event rsvps ----
create policy "self can manage own rsvp"
  on event_rsvps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin can manage rsvps"
  on event_rsvps for all using (is_admin()) with check (is_admin());
create policy "approved+ can read rsvps"
  on event_rsvps for select using (is_approved_or_paid());

-- ---- partners ----
create policy "anyone signed in reads partners"
  on partners for select using (auth.uid() is not null);
create policy "admin manages partners"
  on partners for all using (is_admin()) with check (is_admin());

-- ---- points ----
create policy "self reads own points"
  on points_transactions for select using (auth.uid() = user_id);
create policy "admin reads all points"
  on points_transactions for select using (is_admin());
create policy "admin awards points"
  on points_transactions for insert with check (is_admin());

-- ---- rewards ----
create policy "anyone signed in reads rewards"
  on rewards for select using (auth.uid() is not null);
create policy "admin manages rewards"
  on rewards for all using (is_admin()) with check (is_admin());

-- ---- redemptions ----
create policy "self reads own redemptions"
  on reward_redemptions for select using (auth.uid() = user_id);
create policy "self redeems"
  on reward_redemptions for insert with check (auth.uid() = user_id and is_approved_or_paid());
create policy "admin manages redemptions"
  on reward_redemptions for all using (is_admin()) with check (is_admin());

-- ---- achievements ----
create policy "self reads own achievements"
  on achievements for select using (auth.uid() = user_id);
create policy "approved+ reads achievements"
  on achievements for select using (is_approved_or_paid());
create policy "admin manages achievements"
  on achievements for all using (is_admin()) with check (is_admin());

-- ---- messages ----
create policy "endpoints can read message"
  on messages for select using (auth.uid() in (sender_id, recipient_id));
create policy "paid can send message"
  on messages for insert with check (
    auth.uid() = sender_id and is_paid_member()
  );
create policy "recipient can mark read"
  on messages for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- ---- notifications ----
create policy "self reads own notifications"
  on notifications for select using (auth.uid() = user_id);
create policy "self updates own notifications"
  on notifications for update using (auth.uid() = user_id);
create policy "admin sends notifications"
  on notifications for insert with check (is_admin());

-- =====================================================================
-- SEED REWARDS CATALOG
-- =====================================================================
insert into rewards (name, description, point_cost) values
  ('DSC Sticker Pack', 'Pack of branded vinyl stickers for your toolbox or windshield.', 500),
  ('Branded T-Shirt', 'Heavyweight DSC tee, terracotta on cream.', 1500),
  ('Hat or Hoodie', 'Choose a stamped DSC hat or premium hoodie.', 3000),
  ('Free Guest Pass', 'One guest pass to a Drivers-tier event.', 5000),
  ('Free Month of Membership', 'One month of your current tier credited to your account.', 10000),
  ('Featured Build of the Month', 'Get your build featured across DSC channels for a month.', 25000),
  ('Free Annual Renewal', 'A full year of membership renewal on the house.', 50000)
on conflict do nothing;
