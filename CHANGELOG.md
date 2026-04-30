# Changelog

## Phase 3 — Application Flow (2026-04-29)

The funnel from guest → pending → approved is fully wired in-app. Stripe is scaffolded but not deployed; until you add a Stripe key the app uses dev-skip mode.

**What works**

- `/apply` — 5-step application form (intro, personal, car, motivation, review). Edits run-of-the-mill profile fields (name, city, phone, IG) plus inserts an `applications` row with motivation and `heard_via`.
- `lib/stripe.ts` — `startApplicationCheckout()` calls the `stripe-checkout` edge function when `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set; falls back to dev-skip mode (marks the application paid locally) when it isn't.
- `/apply/confirmation` — receipt screen showing submission date, payment status, and a "what's next" panel.
- `/admin` — admin-only queue of pending applications. Approve calls `approve_application(app_id)` RPC which atomically assigns the next sequential `app_number`, sets `profile.status = 'approved'`, stamps `approved_at`, and updates the application row. Reject calls `reject_application(app_id, reason)` and sets the profile to `rejected`.
- Home dashboard pulls live counts from `membership_counts()` RPC — scarcity counter is real now.
- Profile tab shows an "Application Pending" callout for `status='pending'` users and an "Open Admin" button for `role='admin'` accounts.
- Application fee bumped to **$100** in `lib/membership.ts`.
- Migration `0003_application_extras.sql` adds `applications.heard_via`, `applications.payment_intent_id`, and the three RPCs (`approve_application`, `reject_application`, `membership_counts`).
- `supabase/functions/stripe-checkout/` and `supabase/functions/stripe-webhook/` ship as Deno templates with full README; deploy them when you're ready to take real money.

**What's stubbed**

- **Stripe is not deployed.** Without `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` and the two edge functions, the app uses dev-skip mode and writes `payment_intent_id = 'dev_skip_<ts>'`. Read `supabase/functions/README.md` for deploy steps.
- **Email notifications** on approval/rejection — not wired. Hook this into a Postgres trigger or a third edge function (Resend / Postmark / SES) in a follow-up.
- **App-number reservation** is naive (`max+1`); fine for low concurrency but should be replaced with a Postgres sequence if you ever expect simultaneous approvals.
- The "Approved" digital welcome card with the formatted app number lives on the profile tab already, but it just shows the number — no QR yet (Phase 5).

**What to test before moving on**

1. Run `0003_application_extras.sql` against Supabase (SQL Editor → paste → Run). Verify with `select proname from pg_proc where proname in ('approve_application','reject_application','membership_counts');` — should return 3 rows.
2. As a fresh signed-up user, tap **Start Application** on home → walk through the 5 steps → submit. With no Stripe key set, you should land on the confirmation screen and your profile status should flip to `pending`.
3. Promote your test account to admin: `update profiles set role = 'admin' where email = '<you>';`
4. Reload the app. Profile tab should show **Open Admin**. Tap into it.
5. Approve one of the pending apps. Verify: profile.status flips to `approved`, profile.app_number is set, application.status = approved.
6. Reject another pending app with a reason. Verify: profile.status = `rejected`, application.notes = reason.
7. Home scarcity counter should now read `1 / 200 approved`.

**Decisions made**

- **One screen, internal step state** for the application form instead of multiple route files. Simpler navigation, easier validation, and the user can press the OS back button without losing progress.
- **Dev-skip mode** instead of "Stripe required" — lets us test the approval flow without a Stripe account. The flag is the presence of `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Switching modes is a one-line env change.
- **`approve_application` is `SECURITY DEFINER`** so admins can update applications + profiles atomically without needing every individual UPDATE policy to allow admin writes. Authorization is enforced by the `is_admin()` check at the top.
- **App number assigned at approval, not application** — keeps the sequence dense (no gaps from rejected applicants) and matches the spec ("Approved applicants get a digital welcome card with their app number").

## Phase 2 — Profiles & Garage (2026-04-29)

The member profile fills out: avatar uploads, a finish-your-profile checklist on home, a garage you can add cars to, and a photo gallery per car.

**What works**

- `app/profile/edit` — name, city, phone, Instagram + avatar upload (square crop, stored in `avatars` bucket under `{userId}/`)
- `app/cars/new` and `app/cars/[id]` — full car CRUD via shared `CarForm` (year/make/model/nickname, in-progress vs complete, primary toggle that auto-demotes other primary cars)
- `CarGallery` on the car edit page — adds, deletes, and re-orders photos in `car_photos`; first photo is the cover, "Make Cover" promotes any other photo, photos stored in `car-photos` bucket under `{userId}/{carId}/`
- `CarRow` shows the cover photo when one exists, falls back to the make-initial placeholder otherwise
- `useMyCars` joins `car_photos` and exposes a `cover_url` per car
- Home checklist routes "Finish Setup" to `/cars/new` when the missing required item is the primary car, otherwise `/profile/edit`
- After creating a car, the form replaces the route with `/cars/{id}` so the user can immediately add photos
- Storage migration `0002_storage.sql` provisions the `avatars` (public read, owner write) and `car-photos` (approved+ read, owner write) buckets with per-user folder RLS
- `pickAndUploadAvatar` and `pickAndUploadCarPhoto` helpers in `lib/uploads.ts` (expo-image-picker → ArrayBuffer → Supabase Storage)
- `lib/profile-completeness.ts` with shared checklist + completion math, used on home

**What's stubbed**

- Mods entry, build update timeline, likes, comments — those are Phase 8 (Build Galleries)
- Other members can't see your cars yet — directory is Phase 7
- The home screen's `Discover` / `Featured Builds` / `Partner Deals` are still placeholders

**What to test before moving on**

1. Sign in, open Profile → Edit Profile → upload an avatar → save. Avatar should appear on the home greeting and the profile tab.
2. From Profile, tap **Add Car**. Fill year/make/model and save. You should land on the car edit page.
3. On the edit page, tap **Add Photo**, pick an image. It should appear in the gallery with a `COVER` badge.
4. Add a second photo, then tap **Make Cover** on it. The badge should move.
5. Go back to Profile. The car row should show the cover photo as a thumbnail.
6. On the Home tab, the "Finish your profile" card should disappear once full name, photo, city, phone, and a primary car are all set.
7. Run `0002_storage.sql` against the Supabase project before testing — without the buckets, uploads will fail with a "bucket not found" error.

**Decisions made**

- **`car_photos` rows + storage objects, not a `cover_url` column on `cars`**: keeps the schema flexible for the Phase 8 build gallery and avoids a denormalized field that can drift. The cover is whichever photo has `display_order = 0`.
- **"Make Cover" rewrites all `display_order` values rather than swapping two**: simpler invariant — order positions are always 0..n-1 with no gaps, so deletes don't need a renumber pass to keep cover semantics correct.
- **`router.replace('/cars/{id}')` after create instead of `router.back()`**: lets the user keep adding photos to the freshly-created car without re-navigating.

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
