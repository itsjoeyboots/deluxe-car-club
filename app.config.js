// Dynamic Expo config so EXPO_PUBLIC_* env vars are baked into the
// `expoConfig.extra` block at build time. This works around `expo export`
// not inlining `process.env.X` references on every platform/setup.
//
// Reads `app.json` for everything else, then layers an `extra` block.
// The Supabase anon key is public-by-design (RLS on the server protects
// data); fine to commit as a fallback if you really need to.

const baseConfig = require('./app.json').expo;

module.exports = ({ config }) => ({
  ...config,
  ...baseConfig,
  extra: {
    ...(baseConfig.extra ?? {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  },
});
