/**
 * Membership model — DCC's flat-base + à-la-carte add-on system.
 * Prices may change; tweak here. The DB stores time-bounded *_until
 * timestamps and helper functions (has_active_base, has_marketplace_addon,
 * has_season_pass) derive everything from those.
 */
export const MEMBERSHIP = {
  approvedCap: 200,
  paidCap: 100,
  applicationFeeUsd: 0, // application is free; fee was retired
  base: {
    annual: 100,
    label: 'Base Membership',
    blurb: 'Annual dues for approved members. Unlocks the full app.',
  },
  marketplaceAddon: {
    annual: 500,
    label: 'Marketplace Add-on',
    blurb:
      'Unlock partner shop directory + DCC member discounts at every shop.',
  },
  seasonPass: {
    monthly: 200,
    label: 'Season Pass',
    blurb:
      'Complete access to every event — rallies, garage hangs, tech nights, shop tours, member-only meets.',
  },
} as const;

export const POINTS = {
  attendEvent: 100,
  firstEventBonus: 50,
  buildUpdate: 25,
  inviteApproved: 100,
  inviteUpgraded: 500,
  annualRenewal: 1000,
  anniversaryPerYear: 250,
} as const;

export type MembershipState = {
  hasActiveBase: boolean;
  hasMarketplaceAddon: boolean;
  hasSeasonPass: boolean;
  basePaidUntil: string | null;
  marketplaceAddonUntil: string | null;
  seasonPassUntil: string | null;
};

export function deriveMembershipState(profile: {
  base_paid_until?: string | null;
  marketplace_addon_until?: string | null;
  season_pass_until?: string | null;
} | null | undefined): MembershipState {
  const now = Date.now();
  const isActive = (iso: string | null | undefined) =>
    !!iso && Date.parse(iso) > now;
  return {
    hasActiveBase: isActive(profile?.base_paid_until),
    hasMarketplaceAddon: isActive(profile?.marketplace_addon_until),
    hasSeasonPass: isActive(profile?.season_pass_until),
    basePaidUntil: profile?.base_paid_until ?? null,
    marketplaceAddonUntil: profile?.marketplace_addon_until ?? null,
    seasonPassUntil: profile?.season_pass_until ?? null,
  };
}

export function formatUntil(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
