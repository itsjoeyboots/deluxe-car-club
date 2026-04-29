# Changelog

## Phase 1 — Foundation (2026-04-28)

The app boots, authenticates, and looks like Desert Social Club — not a generic Expo template.

**What works**

- Expo SDK 54 + expo-router (file-based routing) + TypeScript strict
- NativeWind v4 + Tailwind v3 wired through metro/babel; brand tokens mirrored in `tailwind.config.js`
- Custom navigation theme using DSC palette
- Playfair Display + Inter loaded from `@expo-google-fonts`, with splash screen held until fonts are ready
- Reusable component library in `components/dsc`: `Text`, `Button`, `Card`, `TextField`, `TierBadge`, `PointsChip`, `ProgressBar`, `Screen`, `Divider`, `ScarcityCounter`
- Supabase client wrapper with AsyncStorage persistence (mobile) / cookie persistence (web), boots gracefully without env vars
- `AuthProvider` context: session + profile loading, sign-in / sign-up / magic link / sign-out
- `(auth)` route group: branded welcome screen, sign-in screen, sign-up screen — auto-redirects authenticated users to tabs
- `(tabs)` route group with auth gate, 5 tabs: Home, Events, Directory, Marketplace, Profile
- Home screen renders: greeting, tier badge, points card with next-reward progress copy, scarcity counter (X/200 approved, X/100 paid), application CTA for guests/pending, placeholder discover sections
- Profile screen renders: tier badge, points chip, member card details, sign-out
- Full SQL migration (`supabase/migrations/0001_init.sql`) with all 17 tables, triggers (profile auto-create, points balance auto-update), RLS policies for guest / approved / paid / admin, and rewards catalog seed
- README + `.env.example` documenting setup

**What's stubbed**

- Live data — Supabase env vars need to be configured and the migration needs to be run; the home dashboard's scarcity counts and reward progress will read from the database in Phase 6/7
- Application flow — the "Start Application" button is wired up in Phase 3 (Stripe + multi-step form + admin queue)
- Events, Directory, Marketplace screens — placeholder content explaining what's coming in their respective phases

**What to test before moving on**

1. `npm install && npm run web` boots without errors
2. The welcome screen renders with the DSC brand (terracotta + sand + Playfair headlines)
3. Sign-up form validates, shows the "Supabase not configured" banner if env vars are missing
4. Once Supabase is configured + migration run: a brand-new sign-up creates a `profiles` row automatically (via the `handle_new_user` trigger) and lands the user on the home dashboard
5. The home dashboard reads the profile and shows the right tier badge ("Guest" by default for fresh signups)

**Decisions made**

- **NativeWind for styling, but components written with `StyleSheet.create`**: NativeWind is wired up so Tailwind utility classes work, but the in-house component library uses `StyleSheet` for predictable cross-platform layout. Use NativeWind for screen-level styling.
- **Hand-written DB types in `types/db.ts`** instead of `supabase gen types`: avoids needing the Supabase CLI in this repo. Once a real project exists, swap to generated types.
- **Auth context, not Zustand/Redux**: a small `AuthProvider` is enough for now. Reach for a state lib in a later phase if other domains end up sharing a lot of state.
- **Fonts loaded from `@expo-google-fonts`** (no font files in the repo): keeps the bundle smaller and avoids licensing surprises.
