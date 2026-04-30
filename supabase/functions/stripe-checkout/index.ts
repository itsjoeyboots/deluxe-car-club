// Supabase Edge Function: create a Stripe Checkout Session for the
// $100 DSC application fee.
//
// Deploy:
//   npx supabase functions deploy stripe-checkout
//
// Required secrets (set with `npx supabase secrets set ...`):
//   STRIPE_SECRET_KEY      — Stripe secret key (sk_live_... or sk_test_...)
//   APP_RETURN_URL         — e.g. https://dsc.example.com/apply/confirmation
//   APP_CANCEL_URL         — e.g. https://dsc.example.com/apply
//
// The client invokes this with { application_id, user_id, email }.

// @ts-expect-error Deno runtime types are provided by Supabase at runtime
import Stripe from 'https://esm.sh/stripe@14?target=deno';

declare const Deno: { env: { get(k: string): string | undefined } };

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const RETURN_URL = Deno.env.get('APP_RETURN_URL') ?? '';
const CANCEL_URL = Deno.env.get('APP_CANCEL_URL') ?? '';
const FEE_USD = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { application_id, user_id, email } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: FEE_USD * 100,
            product_data: {
              name: 'Desert Social Club — Application Fee',
              description:
                'One-time, non-refundable. Covers welcome kit, hand review, and your spot in line.',
            },
          },
        },
      ],
      customer_email: email ?? undefined,
      metadata: {
        application_id,
        user_id,
      },
      success_url: `${RETURN_URL}?app=${application_id}`,
      cancel_url: `${CANCEL_URL}?app=${application_id}`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
