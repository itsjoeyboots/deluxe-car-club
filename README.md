# Deluxe Car Club — Mobile App

Cross-platform (iOS / Android / web) app for **Deluxe Car Club**, a members-only automotive lifestyle club.

> Luxury · Community · Excellence

(The internal package directory is still named `dsc-app` from the project's earlier life as Desert Social Club. The app is now Deluxe Car Club / DCC; the directory name is intentional churn-avoidance.)

## Stack

- **Expo SDK 54** + **expo-router** (file-based routing)
- **TypeScript** (strict)
- **NativeWind v4** (Tailwind for RN) — cross-platform utility styling
- **Supabase** — Postgres, auth (email + magic link), realtime, storage
- **Stripe** — application fee + paid memberships (wired in Phase 3, Edge Function templates included)
- **Playfair Display** + **Inter** via `@expo-google-fonts`

## Project layout

```
app/                  expo-router routes
  (auth)/             Welcome, sign-in, sign-up — for unauthenticated users
  (tabs)/             Home, Events, Directory, Marketplace, Profile
  apply/              Multi-step application flow + confirmation
  admin/              Admin queue, scanner, event creation
  cars/, events/, profile/, rewards/, points/, u/
components/
  dsc/                DCC-branded design system (Button, Card, Text, etc.)
  ui/                 Carry-overs from the Expo template (icons, etc.)
hooks/
  use-events.ts, use-members.ts, use-my-cars.ts
lib/
  theme.ts            Canonical design tokens (colors, fonts, radii, shadow)
  nav-theme.ts        React Navigation theme
  supabase.ts         Supabase client (lazy — gracefully boots without env)
  auth-context.tsx    Auth provider + useAuth hook
  membership.ts       Caps, tier prices, points table
  achievements.ts     Achievement catalog (display copy)
  stripe.ts           Stripe checkout helper (real or dev-skip mode)
  uploads.ts          Avatar / car photo / event hero uploaders
types/
  db.ts               Hand-written types matching the SQL schema
supabase/
  migrations/         0001_init through 0006_points_engine
  functions/          Edge Function templates: stripe-checkout, stripe-webhook
```

## First-run setup

```bash
npm install
cp .env.example .env.local       # fill in Supabase + Stripe keys
npm run web                      # or `npm run ios` / `npm run android`
```

The app boots without env vars — the welcome / sign-in / sign-up screens will render and you'll see a yellow banner that auth isn't wired up yet. Real auth + data calls require the env values below.

### Required env vars (`.env.local`)

| Var | Where to get it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API → anon public key |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys (Phase 3+) |

Server-only secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are **not** added to the app bundle. Set them on the Supabase Edge Functions that run the checkout + webhook.

### Set up the Supabase database

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run each migration in `supabase/migrations/` in order: `0001_init.sql` → `0002_storage.sql` → `0003_application_extras.sql` → `0004_events_storage.sql` → `0005_qr_checkin.sql` → `0006_points_engine.sql`.
3. To make yourself a founder/admin, run after signing up:

   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

## Membership model (drives everything)

| Stage | Cost | Cap |
|---|---|---|
| Application | $100 one-time | — |
| Approved Applicant | (after review) | **200 total** |
| Drivers Tier | $100/mo or $1,000/yr | (combined ↓) |
| Collector Tier | $200/mo or $2,000/yr | **100 paid spots combined** |

When a paid spot opens, approved applicants on the waitlist are notified in priority order.

## Build phases

| Phase | Status |
|---|---|
| 1. Foundation (Expo, Supabase, brand, auth shell, tab nav) | ✅ Done |
| 2. User profiles (photo, primary car, completion flow) | ✅ Done |
| 3. Application flow (multi-step form, Stripe scaffold, admin queue) | ✅ Done |
| 4. Events (list, RSVP, capacity, admin create/cancel/delete) | ✅ Done |
| 5. QR system (member card QR, event QR, scanner, check-in) | ✅ Done |
| 6. Points engine (transactions, rewards catalog, achievements) | ✅ Done |
| 7. Member directory (browse, filter, public profiles) | ✅ Done |
| 8. Build galleries (cars, photos, timelines, likes/comments) | ⏭️ Next |
| 9. Marketplace (partner directory, member discount card) | ⏭️ |
| 10. Messaging (real-time DMs, paid-tier only) | ⏭️ |
| 11. Admin panel (full queue, members, events, scanner, analytics) | ⏭️ |
| 12. Polish (loading, empty, error, animations, a11y) | ⏭️ |

See `CHANGELOG.md` for what's actually shipped.

## Brand quick reference

Tokens live in `lib/theme.ts` and are mirrored in `tailwind.config.js`. As of the DCC rebrand, the palette is dark-luxury with a turquoise accent.

| Token | Hex | Use |
|---|---|---|
| `terracotta` | `#22D3DA` | Turquoise primary accent |
| `terracottaDeep` | `#0EA8B5` | Pressed/hover |
| `sand` | `#13131A` | Default dark surface |
| `sandLight` | `#1C1C26` | Raised dark surface |
| `ink` | `#0B0B0D` | Page background, deep fills |
| `inkMuted` | `#15151B` | Slightly lighter than ink |
| `gold` | `#E5E5E2` | Metallic silver / ivory |
| `goldBright` | `#7AECEF` | Bright cyan glow |

Headlines: Playfair Display 700, slightly wider letter-spacing for the "stamped" feel.
Body: Inter 400/500/700.

Vibe: matte black, polished chrome, electric turquoise glow. Luxury automotive after dark.
