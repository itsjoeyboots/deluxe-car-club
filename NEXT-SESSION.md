# Next Session — pick up here

**Last touched:** 2026-05-05 (commit `03b4cae`)
**Live:** https://app.desertsocialaz.com (GitHub Pages → CNAME `itsjoeyboots.github.io`)
**Repo:** https://github.com/itsjoeyboots/deluxe-car-club (public)
**Auto-deploy:** every push to `master` runs `.github/workflows/deploy.yml`

---

## 🟡 Open: iOS PWA — black gap between content and tab bar

**Symptom:** After "Add to Home Screen" on iPhone Safari, opening the standalone app shows a thin black strip *between the bottom of the page content and the top of the tab bar*. Two CSS layers in `app/+html.tsx` were added but **didn't fully fix it**.

### What's already in place (in `app/+html.tsx`)

```css
[role="tablist"] {
  padding-bottom: env(safe-area-inset-bottom) !important;
  height: calc(64px + env(safe-area-inset-bottom)) !important;
  background-color: #13131A !important;
}
body::after {
  content: '';
  position: fixed; bottom: 0; left: 0; right: 0;
  height: env(safe-area-inset-bottom);
  background-color: #13131A;
}
```

### Most likely reasons it still leaves a gap

1. **The selector is wrong.** React Navigation v7's web tab bar may not actually expose `role="tablist"` — could be a wrapper `<div>` with a different role or none at all. **First step next session: connect Safari DevTools to the iPhone and inspect the actual DOM around the tab bar.**
2. **The gap is between content and tab bar, not below tab bar.** Our fix only addresses the area *below* the tab bar (home-indicator strip). If the gap is *above* the tab bar, that's coming from somewhere else — likely:
   - `Screen.tsx` using `SafeAreaView edges={['top', 'left', 'right']}` — content stops at bottom safe-area edge, leaving body bg visible
   - `(tabs)/_layout.tsx` `tabBarStyle` not including a `position: absolute` over the safe area
3. **Tab bar height calc fights the React Navigation default** — the `!important` may not win against an inline style React Navigation injects later.

### Things to try next, in order

1. Inspect the rendered DOM via Safari Web Inspector → find the *actual* selector for the tab bar bg.
2. If gap is *above* the tab bar, change `Screen.tsx` `edges={['top', 'left', 'right']}` → `edges={['top', 'left', 'right', 'bottom']}` and let the tab bar sit on top of the safe area, OR set `body { background-color: #13131A }` so body matches tab bar surface and any gap blends in.
3. If `[role="tablist"]` selector doesn't match, try `nav[aria-label]` or class-based selectors React Navigation injects (`.css-...`).

### Files involved
- `app/+html.tsx` — the CSS hack
- `app/(tabs)/_layout.tsx` — `tabBarStyle` config
- `components/dsc/Screen.tsx` — `SafeAreaView` edges

---

## 📋 Other deferred items (priority order)

1. **Real Stripe activation flows** for $100/yr base · $500/yr Marketplace · $200/mo Season Pass. Currently the Activate buttons show a placeholder alert telling admins to grant via `/admin/members`. Edge functions in `supabase/functions/stripe-checkout/` are scaffolded; need price IDs + webhook to set `*_until` columns.
2. **Native iOS app via TestFlight.** Apple Developer Program ($99/yr) → `npx eas build --platform ios` → distribute via TestFlight. Codebase is already React Native; should mostly Just Work.
3. **`expo-notifications` for native push.** Currently stubbed in `lib/push.ts`. Web browser pings work via the Notification API. Swap-in instructions are in the file.
4. **Logo upgrade.** `assets/images/dcc-logo.jpg` is 60×60 — soft on retina + home-screen icons. Drop in a 1024×1024 PNG and rebuild.
5. **Anniversary points cron** (+250 pts / year per member). Needs `pg_cron` or a Supabase scheduled edge function.
6. **Renewal reminders.** Same cron pattern — scan `base_paid_until` / `marketplace_addon_until` / `season_pass_until` and notify when within 7 days of expiry.
7. **Auto-prorate / refund** on admin-revoke of paid add-ons (currently just nulls the `*_until`).

---

## 🛠️ Saved admin SQL

```sql
-- Make someone a fully-empowered founder (admin + every add-on for 5 years)
update profiles
   set role = 'admin', status = 'paid', tier = 'collector',
       base_paid_until = now() + interval '5 years',
       marketplace_addon_until = now() + interval '5 years',
       season_pass_until = now() + interval '5 years',
       paid_since = coalesce(paid_since, now())
 where email = 'someone@example.com';

-- Standard tester (paid base only, 1 year)
update profiles
   set status = 'paid',
       base_paid_until = now() + interval '1 year',
       paid_since = coalesce(paid_since, now())
 where email = 'tester@example.com';

-- Just admin role (no paid status change)
update profiles set role = 'admin' where email = 'someone@example.com';
```

---

## ✅ What's working as of last session

- Phase 1–14 shipped (see `CHANGELOG.md`)
- Deploys auto-trigger on push to `master`
- Custom domain + SSL on `app.desertsocialaz.com`
- PWA installable on iPhone (Add to Home Screen — works, just has the gap above)
- All admin tools live: `/admin/members` with grant/revoke add-ons, `/admin/redemptions`, `/admin/announcements`, `/admin/builds`, `/admin/analytics`, etc.
