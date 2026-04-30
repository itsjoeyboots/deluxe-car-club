/**
 * Membership model — caps and copy that drive the scarcity vibe.
 * If founders ever change the caps, change them here.
 */
export const MEMBERSHIP = {
  approvedCap: 200,
  paidCap: 100,
  applicationFeeUsd: 100,
  drivers: {
    monthly: 100,
    annual: 1000,
    label: 'Drivers',
  },
  collector: {
    monthly: 200,
    annual: 2000,
    label: 'Collector',
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
