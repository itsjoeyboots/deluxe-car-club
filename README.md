# Desert Social Club — Mobile App

Cross-platform (iOS / Android / web) app for **Desert Social Club**, an automotive lifestyle membership club in Arizona's East Valley.

> Where Arizona comes to connect.

## Stack

- **Expo SDK 54** + **expo-router** (file-based routing)
- **TypeScript** (strict)
- **NativeWind v4** (Tailwind for RN) — cross-platform utility styling
- **Supabase** — Postgres, auth (email + magic link), realtime, storage
- **Stripe** — application fee + paid memberships (wired in Phase 3)
- **Playfair Display** + **Inter** via `@expo-google-fonts`

## Project layout

```
app/                  expo-router routes
  (auth)/             Welcome, sign-in, sign-up — for unauthenticated users
  (tabs)/             Home, Events, Directory, Marketplace, Profile
components/
  dsc/                DSC-branded design system (Button, Card, Text, etc.)
  ui/                 Carry-overs from the Expo template (icons, etc.)
lib/
  theme.ts            Canonical design tokens (colors, fonts, radii, shadow)
  nav-theme.ts        React Navigation theme
  supabase.ts         Supabase client (lazy — gracefully boots without env)
  auth-context.tsx    Auth provider + useAuth hook
  membership.ts       Caps, tier prices, points table
types/
  db.ts               Hand-written types matching the SQL schema
supabase/
  migrations/0001_init.sql   Full schema + RLS policies + seeds
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
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys (used in Phase 3) |

Server-only secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are **not** added to the app bundle. Set them on whatever runs the application-fee webhook — likely a Supabase Edge Function.

### Set up the Supabase database

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and paste the contents of `supabase/migrations/0001_init.sql`.
3. Run it. This creates:
   - `profiles`, `applications`, `cars`, `car_photos`, `mods`, `build_updates`, `build_update_likes`, `build_update_comments`
   - `events`, `event_rsvps`
   - `partners`
   - `points_transactions`, `rewards`, `reward_redemptions`, `achievements`
   - `messages`, `notifications`
   - Triggers: auto-create profile on signup, auto-update points balance
   - **Row Level Security policies** for guest / approved / paid / admin roles
   - Seeds the rewards catalog
4. To make yourself a founder/admin, run after signing up:

   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

## Membership model (drives everything)

| Stage | Cost | Cap |
|---|---|---|
| Application | $50 one-time | — |
| Approved Applicant | (after review) | **200 total** |
| Drivers Tier | $100/mo or $1,000/yr | (combined ↓) |
| Collector Tier | $200/mo or $2,000/yr | **100 paid spots combined** |

When a paid spot opens, approved applicants on the waitlist are notified in priority order.

## Build phases

| Phase | Status |
|---|---|
| 1. Foundation (Expo, Supabase, brand, auth shell, tab nav) | ✅ Done |
| 2. User profiles (photo, primary car, completion flow) | ⏭️ Next |
| 3. Application flow (multi-step form, Stripe, admin queue, emails) | ⏭️ |
| 4. Events (list, calendar, RSVP, push reminders) | ⏭️ |
| 5. QR system (member QR, event QR, scanner, check-in) | ⏭️ |
| 6. Points engine (transactions, achievements, rewards catalog) | ⏭️ |
| 7. Member directory (browse, filter, profile views) | ⏭️ |
| 8. Build galleries (cars, photos, timelines, likes/comments) | ⏭️ |
| 9. Marketplace (partner directory, member discount card) | ⏭️ |
| 10. Messaging (real-time DMs, paid-tier only) | ⏭️ |
| 11. Admin panel (queue, members, events, scanner, analytics) | ⏭️ |
| 12. Polish (loading, empty, error, animations, a11y) | ⏭️ |

See `CHANGELOG.md` for what's actually shipped.

## Brand quick reference

Tokens live in `lib/theme.ts` and are mirrored in `tailwind.config.js`.

| Token | Hex |
|---|---|
| `terracotta` | `#C4622D` |
| `terracottaDeep` | `#8B3A1B` |
| `sand` | `#F5E6C8` |
| `sandLight` | `#FAF0DC` |
| `ink` | `#1C1008` |
| `inkMuted` | `#2A2418` |
| `gold` | `#C8982A` |
| `goldBright` | `#E8C060` |

Headlines: Playfair Display 700, slightly wider letter-spacing for the "stamped" feel.
Body: Inter 400/500/700.

The vibe: aged stamped leather meets a vintage automotive magazine. Warm, premium, lived-in.
