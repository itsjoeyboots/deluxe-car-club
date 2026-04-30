/**
 * Stripe Checkout helper for the application fee.
 *
 * The actual Stripe call happens in a Supabase Edge Function (see
 * `supabase/functions/stripe-checkout/`). This module decides between:
 *   - Production: invoke the edge function, get a checkout URL, open it.
 *   - Dev (no Stripe configured): skip payment locally and immediately
 *     mark the application paid. Lets us test the rest of Phase 3
 *     before the user wires up Stripe.
 */

import { Linking, Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

export const isStripeConfigured =
  !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export type StartCheckoutInput = {
  applicationId: string;
  userId: string;
  email?: string | null;
};

export type StartCheckoutResult =
  | { ok: true; mode: 'stripe'; url: string }
  | { ok: true; mode: 'dev-skip' }
  | { ok: false; error: string };

/**
 * Kicks off the application-fee checkout. In production, this calls a
 * Supabase Edge Function which creates a Stripe Checkout Session and
 * returns the hosted URL. In dev (no Stripe key), it short-circuits and
 * marks the application as paid so we can test approval flows.
 */
export async function startApplicationCheckout(
  input: StartCheckoutInput,
): Promise<StartCheckoutResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase not configured' };
  }

  if (!isStripeConfigured) {
    // Dev-skip: record a fake payment so the rest of the flow works.
    const { error } = await supabase
      .from('applications')
      .update({
        payment_status: 'paid',
        payment_intent_id: `dev_skip_${Date.now()}`,
      })
      .eq('id', input.applicationId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: 'dev-skip' };
  }

  // Real Stripe flow: invoke the edge function.
  const { data, error } = await supabase.functions.invoke<{
    url?: string;
    error?: string;
  }>('stripe-checkout', {
    body: {
      application_id: input.applicationId,
      user_id: input.userId,
      email: input.email ?? null,
    },
  });

  if (error) return { ok: false, error: error.message };
  if (!data?.url) {
    return { ok: false, error: data?.error ?? 'No checkout URL returned' };
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.assign(data.url);
    }
  } else {
    await Linking.openURL(data.url);
  }
  return { ok: true, mode: 'stripe', url: data.url };
}
