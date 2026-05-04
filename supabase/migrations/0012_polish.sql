-- =====================================================================
-- Deluxe Car Club — Phase 12 polish
-- Adds the per-field privacy preferences column on profiles. The /u/[id]
-- page reads this jsonb to gate phone / email / instagram visibility.
-- =====================================================================

alter table profiles
  add column if not exists privacy_prefs jsonb not null default '{}'::jsonb;

comment on column profiles.privacy_prefs is
  'Per-field public-profile flags. Recognized keys: show_phone (bool, default false), show_email (bool, default false), hide_instagram (bool, default false).';
