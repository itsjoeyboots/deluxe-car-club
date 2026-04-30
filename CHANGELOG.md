# Changelog

## Phase 8 — Build Galleries (2026-04-30)

The cars-tab social loop. Mods, build update timeline with photos, likes, comments, +25 points per update (weekly cap), and a real Featured Builds carousel on home.

**What works**

- Cars routing split: `/cars/[id]` is now a **public viewer** for any approved+ member; `/cars/[id]/edit` is owner-only and contains the existing `CarForm` + `CarGallery` + the new `ModsEditor`.
- Public viewer page renders: cover hero, title + status, owner card (taps to `/u/[id]`), photo gallery strip, mods grouped by category, build update timeline with likes + comments.
- `ModsEditor`: per-category pill picker (engine / suspension / exterior / interior / wheels / audio / other), inline add field, remove × button. Calls `add_mod` / `delete_mod` RPCs.
- Build update composer (owner only) on the viewer: caption + multi-photo upload using existing `pickAndUploadCarPhoto`. Calls `post_build_update` RPC.
- `BuildUpdateCard`: caption + photo strip + heart toggle (count from `toggle_build_update_like` RPC) + comment expander with author avatars and inline add-comment input.
- Migration `0008_builds.sql` adds:
  - `post_build_update(car_id, content, photo_urls)` — owner-checked, awards +25 points if no other update by user in the last 7 days (matches the spec's weekly cap).
  - `add_mod(car_id, category, description)` and `delete_mod(mod_id)` — owner-checked.
  - `toggle_build_update_like(update_id)` — idempotent, returns the new like count for instant UI updates.
- Home screen Featured Builds: real horizontal carousel of the 5 most recent build updates, each tile linking to its car viewer.
- `/u/[id]` car cards are now tappable and route to the new viewer.
- After creating a car, the form deep-links to `/cars/{id}/edit` so the user lands ready to add photos + mods immediately.

**What's stubbed**

- **Featured Build of the Month** admin pick (linked to the 25,000-pt reward) — Phase 11 admin polish. The home carousel uses recency for now.
- **Build update editing/deleting** — owners can post but not edit/delete their own update. Easy follow-up: add `update_build_update` and `delete_build_update` RPCs + the UI.
- **@-mention notifications** in comments — out of scope for Phase 8. Lands with the messaging/notification work in Phase 10.
- **Push notifications when someone likes/comments on your update** — same; deferred with the rest of push.

**What to test before moving on**

1. Run `0008_builds.sql` in the Supabase SQL Editor. Verify:
   ```sql
   select proname from pg_proc
    where proname in ('post_build_update', 'add_mod', 'delete_mod', 'toggle_build_update_like');
   ```
   Should return 4 rows.
2. From your Profile tab, tap your car → you'll land on the new viewer.
3. Tap **Edit Car** at the top → confirm photos + mods editor render. Add a couple of mods across different categories.
4. Back on the viewer, scroll to **Build Timeline**. Type a caption, optionally add a photo, **Post Update**.
5. The update should appear at the top of the timeline. SQL spot-check:
   ```sql
   select reason, amount from points_transactions
    where user_id = '<you>' and reason = 'build_update' order by created_at desc;
   ```
   First post should give +25; a second post within 7 days should *not* add another row (weekly cap).
6. Tap the heart → count increments and stays terracotta on next refresh.
7. Tap the comment count → write a comment → it appears with your avatar.
8. Visit Home — the Featured Builds carousel should now show the build update you just posted.
9. Visit `/u/<your-id>` — your car cards should now be tappable and route to the public viewer.

**Decisions made**

- **Two-route split (`/cars/[id]` viewer vs `/cars/[id]/edit` editor)** instead of a "self vs other" toggle on a single page. Cleaner mental model, easier to wire deep links from search results / featured carousels later, and the URL itself communicates whether you're editing.
- **`SECURITY DEFINER` RPCs for the writes** rather than direct INSERT statements with RLS. The points-on-build-update logic + walk-up RSVPs need server-side trust; keeping the pattern consistent with check-in / approval RPCs.
- **Weekly cap is implemented as `count(...) where created_at > now() - interval '7 days'`** rather than a fancy points-eligibility table. Simple, correct enough, and reads like the spec ("max once per week").
- **Comments don't paginate yet.** Threads will be small at the club's scale; revisit if a single update ever crosses ~50 comments.
- **Featured Builds carousel uses recency** for the v1. The "Featured Build of the Month" admin pick is documented in stubs above; trivial to swap once the admin tool exists.

## Rebrand — Deluxe Car Club (2026-04-30)

The app is now **Deluxe Car Club** (DCC). Visual identity flipped from desert/cream/terracotta to dark luxury matte black with a turquoise accent (lifted from the DCC logo). Internal package name (`dsc-app`) is intentionally left alone.

**What changed**

- `lib/theme.ts` repurposed in place. Token names retained so the 36 component files cascade automatically; values rewritten dark.
  - `terracotta` `#C4622D` → `#22D3DA` (turquoise accent)
  - `terracottaDeep` `#8B3A1B` → `#0EA8B5`
  - `sand` `#F5E6C8` → `#13131A` (dark surface)
  - `sandLight` `#FAF0DC` → `#1C1C26`
  - `ink` `#1C1008` → `#0B0B0D` (deepest matte black)
  - `gold` `#C8982A` → `#E5E5E2` (metallic silver / ivory)
  - `goldBright` `#E8C060` → `#7AECEF` (bright cyan glow)
- `tailwind.config.js` mirrors the new values.
- `lib/nav-theme.ts` → dark React Navigation theme; `dscNavTheme` renamed to `dccNavTheme`. `StatusBar` flipped to `light`.
- Component palette fixes:
  - `Button` primary now turquoise with **ink text** for sharp contrast (was light cream text on terracotta — would have been invisible).
  - `TierBadge` palettes rewritten for dark mode: drivers uses `textOnDark` ivory text on turquoise deep; the rgba tints flipped to white-on-dark / turquoise-tinted.
  - `ProgressBar` track color flipped from rgba(28,16,8,0.10) to rgba(255,255,255,0.10).
  - `Screen` SafeArea bg switched from `colors.sand` to `colors.background` so the page is the deepest matte black.
  - Tab bar uses `terracotta` (turquoise) active tint, `textSecondary` inactive, `surface` background.
  - Hardcoded warning-banner colors on sign-in / sign-up swapped to theme tokens.
- App icon / splash: `app.json` splash and Android adaptive icon backgrounds set to `#0B0B0D`.
- Strings: "Desert Social Club" → "Deluxe Car Club"; "DSC" → "DCC" across user-facing copy. The welcome screen hero copy now says "Luxury · Community · Excellence" with a generic luxury automotive tagline (location-specific copy retired).
- Stripe checkout edge function product name updated to "Deluxe Car Club — Application Fee".
- Migration `0007_dcc_rebrand.sql` updates the seed `rewards` rows so "DSC Sticker Pack" → "DCC Sticker Pack" etc. Idempotent — safe to re-run.
- README rewritten with the DCC name, dark palette table, and the up-to-date phase status.

**What's stubbed**

- **Logo asset** isn't bundled into the app yet — splash and app icon are still the Expo defaults. Easy follow-up: drop the DCC logo PNG into `assets/images/icon.png`, `splash-icon.png`, `adaptive-icon.png` and rebuild.
- **Email-verification copy** in Supabase still references whatever you have configured — change it in Supabase → Authentication → Email Templates if it still says "Desert Social Club".
- **Stripe product name** updates only on new checkout sessions. Already-saved sessions in the Stripe dashboard keep their old name.

**What to test before moving on**

1. Run `0007_dcc_rebrand.sql` in the Supabase SQL Editor.
2. Reload the app (clear browser cache / hard refresh). The welcome screen should be deep matte black with turquoise headline and ivory text.
3. Sign in. Tab bar bottom should be a slightly lighter dark surface with turquoise active tint.
4. Profile tab — member card should render dark with silver border, turquoise/cyan QR. Achievements grid shows ivory text and turquoise primary.
5. Browse the Directory — member rows should read clearly on dark.
6. Open an event detail page — RSVP card uses the gold (now silver) accent border, QR scans clean as dark-on-dark with cyan glow.

**Decisions made**

- **Token names retained** even though they no longer match their literal English meanings (`sand` is now dark, `gold` is now silver). The names are aesthetic aliases now. This avoided a 36-file rename and let one `theme.ts` swap cascade everywhere.
- **`SECURITY DEFINER` RPCs and migrations 0001–0006 left alone.** They're applied to the live database. Migration 0007 handles only the rebrand-affected seed data.
- **Package directory + slug stay `dsc-app`** per your call. Saves a churny rename without user impact.
- **Welcome screen tagline went generic** ("Luxury · Community · Excellence") instead of the East Valley copy. The DSC site was Arizona-specific; DCC's positioning isn't tied to a metro on the website you pointed at, so the generic luxury copy fits until you tell me otherwise.

## Phase 7 — Member Directory (2026-04-29)

The Directory tab is no longer a placeholder. Approved members can browse the roster, filter by tier, search by name/city/car, and tap into a public profile that shows the other member's garage, achievements, and points lifetime.

**What works**

- Directory tab: search bar, three-pill tier filter (All / Drivers / Collector), live count of approved members.
- `MemberRow` cards: avatar, full name + applicant number, primary car line, city, tier pill (gold for Collector, terracotta for Drivers, ink for plain Approved). Tap routes to `/u/[id]`.
- `useMembers` hook fetches approved + paid profiles with the primary car (joined with `car_photos` to surface a cover thumbnail), client-side filters across name / city / car / IG handle.
- `/u/[id]` public profile: avatar + applicant number + display name + city, tier badge + points chip + "MEMBER SINCE month year", tappable Instagram card that opens instagram.com/handle, full Garage section with photo gallery per car, and the same `AchievementsGrid` used on Profile (locked vs unlocked).
- Privacy by default: phone and email are not rendered on the public profile.
- Approved-required gate copy when a still-pending user opens the tab.
- Existing RLS (`approved+ can browse profiles`) already enforces the access boundary; nothing new needed in SQL.

**What's stubbed**

- **Privacy controls UI** — the spec calls out per-field opt-in/out (hide phone, hide email, hide IG). For now phone/email are simply never shown on `/u/[id]`. Toggleable visibility is a Phase 11 polish item — needs a `privacy` jsonb column on profiles + a toggle screen.
- **Direct messaging** — Phase 10 in the original build order. Members tab will get a "Message" button on `/u/[id]` once `messages` table + Supabase Realtime are wired.
- **Server-side filtering** — current filters run client-side over the full roster fetch. Fine while the cap is 200 members; swap for query-side filters once we cross a few hundred.
- **Mod listings on the public profile car card** — schema has `mods` table; not rendered yet (lands with the build galleries phase).

**What to test before moving on**

1. Reload the app at http://localhost:8082 (no migration needed for this phase).
2. As your approved admin, tap the **Directory** tab. Should show 1+ members (at least your own approved account if you approved your own application).
3. Type your name into the search — your row should remain. Type a non-match — empty state.
4. Tap a row → public profile opens with avatar, app number, tier, points, and the Garage section shows your car + cover photo if any.
5. If you set an Instagram handle in Edit Profile, the IG card should open `instagram.com/<handle>` when tapped.
6. Visit your own `/u/[id]` (tap your own row) — should show an **Edit My Profile** button at the bottom (only visible to self).
7. As a non-approved user (sign up a fresh account), the Directory tab should show the "Approval required" callout instead of the roster.

**Decisions made**

- **Cap at-fetch is 200 rows max** in practice via the membership cap, so client-side filter is fine and avoids a more complex Postgres `ts_vector` setup.
- **Self detection on `/u/[id]`** uses `viewer.id === id` — simpler than a separate `/me` route. Keeps a single profile rendering path.
- **No phone/email on public profile by default** — sidesteps the missing privacy-flags work without leaking PII. The owner can still see their own card with everything filled in via the Profile tab.
- **Tier pill colors are different on `MemberRow` vs `TierBadge`** intentionally: row uses solid fills for at-a-glance scanning, the badge uses gold-on-cream for the marquee profile header.

## Phase 6 — Points Engine (2026-04-29)

The full earn-and-spend loop. Members can browse the rewards catalog, redeem with their balance, see a transaction ledger, and unlock achievement badges automatically as they hit milestones.

**What works**

- `/rewards` — branded catalog page reading from the seeded `rewards` table. Each card shows name, description, point cost, and a Redeem button that's disabled when the balance is short (`Need 320 more`) or the reward is sold out. Recent redemptions list at the bottom.
- `/points` — lifetime ledger of `points_transactions` with humanized reasons (e.g. `event_checkin_first` → "First-event bonus", `reward_redemption: DSC Sticker Pack` → "Redeemed: DSC Sticker Pack"), color-coded amounts, and a current/lifetime summary card.
- `AchievementsGrid` on the Profile tab — shows all 9 achievement tiles, unlocked ones in full color, locked ones grayed out. Counter "X of 9 unlocked".
- Home dashboard's Points card now has Browse Rewards + History buttons.
- Migration `0006_points_engine.sql`:
  - `redeem_reward(reward_id)` `SECURITY DEFINER` RPC: validates approved+ status, balance, and reward availability; inserts `reward_redemptions` row + negative `points_transactions` row. The existing `bump_points_balance` trigger handles the balance subtraction.
  - `check_achievements_for_user(uid)` RPC: idempotent (unique index on `(user_id, achievement_key)` dedupes). Inspects check-in stats, app number, approval date, and build-update count.
  - Triggers: `on_event_rsvp_checkin` re-runs the check after every `event_rsvps.checked_in_at` update; `on_profile_milestone` runs it after `app_number`/`approved_at`/`status` changes (catches Founding 50 the moment an admin approves).
- `lib/achievements.ts` — client-side catalog of 9 achievements (title, description, optional tier gate). Server stays the source of truth for *unlocking*; this drives display copy.

**What's stubbed**

- **Anniversary bonus (250 pts/year)** — needs a daily cron. Plan: add a Postgres `pg_cron` job or a Supabase scheduled edge function in Phase 11 polish.
- **Build update points (25 / week, max one)** — wires up in Phase 8 when the build update creation UI lands. The achievement check is already counting `build_updates`, so the badge will light up on its own.
- **Referral points (Connector achievement)** — the achievement key exists, the rule isn't wired. Needs a referral-link system: applicant says "I was referred by @joey", admin approves it, the link gets recorded in a new column. Probably its own mini-phase later.
- **Annual renewal bonus (1,000)** — depends on the paid-tier subscription state, which lands when the membership upgrade flow ships (post-Phase 3 follow-up).
- **Reward fulfillment workflow** — redemptions land with `status='pending'`. There's no admin UI yet to mark them "fulfilled" or "cancelled". One more admin screen in Phase 11.

**What to test before moving on**

1. Run `0006_points_engine.sql` in Supabase SQL Editor. Verify:
   ```sql
   select proname from pg_proc where proname in ('redeem_reward','check_achievements_for_user'); -- 2 rows
   select tgname from pg_trigger where tgname in ('on_event_rsvp_checkin','on_profile_milestone'); -- 2 rows
   ```
2. As an approved member, open Home → tap **Browse Rewards**. The catalog should render with the 7 seeded rewards.
3. Manually grant yourself enough points to redeem the sticker pack:
   ```sql
   insert into points_transactions (user_id, amount, reason)
     values ('<your-user-id>', 1000, 'manual_grant');
   ```
4. Refresh Rewards. The sticker pack button should turn primary/terracotta. Tap → confirm → expect "Redeemed" alert and balance drops by 500.
5. Tap **History** from Home. Should see the +1000 grant, +150 from the earlier check-in test, and -500 redemption with humanized labels.
6. Profile tab — the Achievements section should show **First Event** (you scanned in earlier) and possibly **Founding 50** (if your app_number ≤ 50) lit up; everything else gray.
7. Approve another test applicant — when their `app_number` lands ≤ 50 the trigger should auto-unlock Founding 50 for them, no extra calls.

**Decisions made**

- **Negative points_transactions for spends** rather than two separate columns or a different table. One ledger covers both directions, the existing trigger handles the balance, and the lifetime sum is just `sum(amount)`.
- **`check_achievements_for_user` is idempotent** by design — every trigger calls it without worrying about double-firing. The `unique (user_id, achievement_key)` constraint with `on conflict do nothing` makes inserts safe to repeat.
- **Tier-gated achievements still appear in the locked grid** (e.g. Rally Veteran shows for Drivers members too) so members can see what's possible at higher tiers — drives the upgrade decision the original spec calls out.
- **Reward image_url is wired in the schema but ignored by the UI for now** — placeholder reward art is more work than the v1 needs. Easy to drop in once we have the actual stickers and tees photographed.

## Phase 5 — QR Codes & Scanner (2026-04-29)

Real QR codes everywhere they were stubbed, plus a camera-based admin scanner that handles check-in, dedupe, and points in one server-side RPC.

**What works**

- `MemberCard` component on the Profile tab — gold-bordered digital card with applicant number, tier badge, full name + city, and a 200px QR encoding `profiles.member_qr_token`. Only renders for approved/paid members.
- Real QR (via `react-native-qrcode-svg`) on `/events/[id]` for any RSVP'd member, replacing the text token block. Shows `CHECKED IN · 9:42 AM` once a founder has scanned them.
- `/admin/scan` — camera-based scanner using `expo-camera` `CameraView` with `barcodeTypes: ['qr']`. Auto-decodes, calls `checkin_member` RPC, shows result for ~1.8s, then resets to scan the next member.
- Manual fallback: if the camera can't lock on, paste a token in the input below the camera view.
- Web fallback: web doesn't expose camera scanning here, so the camera frame shows a "use the iOS/Android app" message and the manual input still works for testing.
- Per-event scan entry: admin's `/events/[id]` has a **Scan Attendees** button that deep-links to `/admin/scan?event=<id>&eventTitle=<title>`, locking the scanner to that event.
- Migration `0005_qr_checkin.sql`:
  - Adds `profiles.member_qr_token` (unique, auto-generated via `gen_random_uuid()` on insert + backfill for existing rows).
  - Updates `handle_new_user` to also generate a token at signup.
  - Adds `checkin_member(qr_data, target_event)` `SECURITY DEFINER` RPC. Resolves the QR to a user (member token first, then RSVP token), inserts an RSVP for walk-ups, dedupes via `event_rsvps.checked_in_at`, awards 100 points (+50 first-event bonus), and returns a row the scanner UI uses to render success copy.

**What's stubbed**

- **Geofence enforcement** — the original spec marks this optional. Not wired; scans work anywhere.
- **Push notifications** — still deferred. The check-in API is in place so the points-milestone push will be easy to add when notifications land.
- **Admin "list all check-ins for this event"** view. Easy follow-up but not in Phase 5 scope.

**What to test before moving on**

1. Run `0005_qr_checkin.sql` in Supabase SQL Editor. Verify:
   ```sql
   select count(*) from profiles where member_qr_token is null;            -- 0
   select proname from pg_proc where proname = 'checkin_member';           -- 1 row
   ```
2. As an approved member, open the Profile tab. The DSC member card should render with a real QR.
3. RSVP to an event, open the event page. The QR card should now show a code instead of the old text token.
4. As an admin, open the same event → tap **Scan Attendees** → on a real device, point at the QR. On web, paste the token into the manual input.
5. First scan: should show "Checked in · 150 points · first event bonus" (or 100 if you've already attended others).
6. Re-scan the same member: should show "Already checked in. No points awarded." Verify `select * from points_transactions where user_id = ...` returns only one row for that event.
7. As an admin, open the Profile tab and confirm your member card has the same QR you've been scanning.

**Decisions made**

- **One RPC handles everything (`checkin_member`)** instead of separate endpoints for "scan member token" vs "scan RSVP token." Saves a round-trip and lets us walk up unregistered approved members at the door without a manual RSVP step.
- **Walk-up insert** when no RSVP exists: creates `event_rsvps` with `qr_code_token = 'walkup_…'` so we never lose the audit trail. The scanner doesn't reject a member for not RSVPing — founders aren't going to send people away at the door.
- **Permanent member QR token (`profiles.member_qr_token`)** instead of regenerating on every scan. Members can screenshot their card and use it forever. If we ever need to rotate (lost phone), we add an admin "reset token" button later.
- **Web shows the camera fallback message** rather than trying `getUserMedia` — keeps the bundle smaller and avoids platform-specific permission UX. Manual entry still works on web for testing the RPC.

## Phase 4 — Events & RSVP (2026-04-29)

The events tab is no longer a placeholder. Members can browse upcoming and past events, RSVP, get a unique check-in token per event, and admins can create events end-to-end (form + hero image upload).

**What works**

- Events tab: Upcoming / Past toggle, refresh button, Admin sees a `New Event` shortcut.
- `EventCard` component: hero image (with placeholder when missing), date/time, title, location, tier-required badge, RSVP indicator, going/capacity counter.
- `/events/[id]`: hero, full description, date/time, capacity counter, tier gate copy, tappable location card that opens Apple Maps / Google Maps, RSVP / Cancel button, and a token display block (real QR rendering ships in Phase 5).
- RSVP flow: `rsvpToEvent()` checks capacity client-side, generates a `qr_code_token` via `crypto.randomUUID()`, inserts an `event_rsvps` row with `status = 'going'` or `'waitlist'` accordingly. Cancel sets status to `'cancelled'` (soft delete so the QR token stays auditable).
- Tier gating in the detail page: approved-only events visible to anyone approved+, drivers events RSVP-locked unless tier ≥ drivers, collector events locked to collector. Locked state shows clear "what tier you need" copy.
- `/admin/events/new`: title, description, start/end time, location, address, capacity, tier, guest passes, hero image upload to the new `events-public` bucket.
- Migration `0004_events_storage.sql` provisions the `events-public` bucket — public read, admin-only write — with RLS policies.
- Home dashboard now renders the next 3 upcoming events instead of the placeholder.

**What's stubbed**

- **QR rendering** — the token is shown as text. Phase 5 swaps in `react-native-qrcode-svg` and adds the camera-based scanner.
- **Push notifications** — 24-hour reminders are not wired. Needs `expo-notifications` setup + a scheduled job (Postgres pg_cron or an edge function on a cron trigger). Plan to do this with the points engine since both rely on event check-in.
- **Calendar month-grid view** — the spec mentions a list/grid toggle. List view only for now; can add `react-native-calendars` later if the request comes up.
- **Past event recaps** — placeholder copy. Photo galleries land in Phase 8.
- **Admin event editing/cancelling** — only creation right now; editing existing events is a quick follow-up if needed.

**What to test before moving on**

1. Run `0004_events_storage.sql` in the Supabase SQL Editor. Verify with:
   ```sql
   select id, public from storage.buckets where id = 'events-public';
   select policyname from pg_policies where tablename = 'objects' and policyname like 'events:%';
   ```
   Should return 1 bucket and 4 policies.
2. As an admin, tap the **Events** tab → **New Event**. Fill it in, upload a hero, hit Create. You should land on the new event page.
3. As a regular approved member (or your own admin account), tap **RSVP**. Card should flip to "You're going" with the token.
4. Cancel the RSVP. Re-RSVP — capacity counter should update.
5. Create an event with capacity = 1 and have two accounts RSVP. The second should land on the waitlist.
6. Create a `tier_required = 'drivers'` event and confirm an approved (but unpaid) member sees the locked state.
7. Past events: edit `starts_at` to a date in the past via SQL — `update events set starts_at = '2026-01-01' where id = '<id>';` — and confirm it moves to the Past tab.

**Decisions made**

- **`crypto.randomUUID()` for the event QR token** rather than a database-generated value. The token only has to be unique within `event_rsvps`; doing it client-side avoids an extra round-trip and keeps the migration simpler. The DB would still catch a duplicate via the unique index if there ever is one.
- **Cancelling soft-deletes (`status = 'cancelled'`)** instead of hard-deleting the row. Keeps the QR history intact and lets us run "no-show" analytics later. Re-RSVP creates a new row.
- **Capacity check is best-effort, client-side** — a determined user could race two RSVPs to fill the last seat. For Phase 4 that's acceptable since events are tens of people, not thousands. Tighten this with a Postgres trigger if the club ever runs an event with real demand.
- **No `expo-notifications` yet** — adding it pulls in iOS push setup (APNs key, certificates) that's better done as one focused step after the points engine is in. Calling it out here so it doesn't get forgotten.

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
