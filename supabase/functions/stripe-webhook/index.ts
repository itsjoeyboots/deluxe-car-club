// Supabase Edge Function: receives Stripe events and marks DSC
// applications as paid (or failed).
//
// Deploy:
//   npx supabase functions deploy stripe-webhook --no-verify-jwt
//
// Required secrets:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET            — from `stripe listen` or the dashboard
//   SUPABASE_SERVICE_ROLE_KEY        — for server-side Supabase writes
//   SUPABASE_URL                     — your project URL
//
// Configure the matching webhook in the Stripe dashboard with this URL:
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// Subscribe to: checkout.session.completed, checkout.session.expired

// @ts-expect-error Deno runtime types are provided by Supabase at runtime
import Stripe from 'https://esm.sh/stripe@14?target=deno';
// @ts-expect-error Deno runtime types are provided by Supabase at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: { env: { get(k: string): string | undefined } };

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req: Request) => {
  const sig = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      WEBHOOK_SECRET,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'invalid signature';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string; metadata?: Record<string, string> };
    const applicationId = session.metadata?.application_id;
    if (applicationId) {
      const { error } = await supabase
        .from('applications')
        .update({
          payment_status: 'paid',
          payment_intent_id: session.id,
        })
        .eq('id', applicationId);
      if (error) console.error('[stripe-webhook] update failed', error);
    }
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object as { id: string; metadata?: Record<string, string> };
    const applicationId = session.metadata?.application_id;
    if (applicationId) {
      await supabase
        .from('applications')
        .update({ payment_status: 'failed' })
        .eq('id', applicationId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
