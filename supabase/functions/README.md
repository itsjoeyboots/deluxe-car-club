# Supabase Edge Functions

Server-side handlers for things the client can't do safely (Stripe secrets, webhooks).

## stripe-checkout

Creates a Stripe Checkout Session for the $100 DCC application fee. The mobile/web app calls this via `supabase.functions.invoke('stripe-checkout', { body: { application_id, user_id, email } })` and gets back a hosted Stripe URL to redirect the applicant to.

## stripe-webhook

Listens for Stripe events. On `checkout.session.completed`, marks the matching `applications` row as paid. On `checkout.session.expired`, marks it failed.

---

## Setup

1. **Install the Supabase CLI** (one-time): https://supabase.com/docs/guides/cli
2. **Link the project** (one-time):
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
3. **Set secrets**:
   ```bash
   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   npx supabase secrets set APP_RETURN_URL=https://your-app.com/apply/confirmation
   npx supabase secrets set APP_CANCEL_URL=https://your-app.com/apply
   ```
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

4. **Deploy**:
   ```bash
   npx supabase functions deploy stripe-checkout
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```

5. **Configure the Stripe webhook**: in the Stripe dashboard add an endpoint
   ```
   https://<project-ref>.functions.supabase.co/stripe-webhook
   ```
   Subscribe to `checkout.session.completed` and `checkout.session.expired`. Copy the signing secret it gives you and rerun step 3 to set `STRIPE_WEBHOOK_SECRET`.

6. **Add the Stripe publishable key** to `.env.local`:
   ```
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
   The app uses the presence of this var to switch from dev-skip to real Stripe checkout.

## Dev-skip mode

When `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is empty, the app marks the application as paid locally instead of calling Stripe. Useful for testing approval flows before Stripe is wired up.
