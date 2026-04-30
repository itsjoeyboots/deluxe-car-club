/**
 * DCC Achievement catalog. Server (`check_achievements_for_user`) is the
 * source of truth for *unlocking* — this catalog drives display copy and
 * locked-state hints.
 */

export type AchievementKey =
  | 'first_event'
  | 'sunrise_crew'
  | 'rally_veteran'
  | 'founding_50'
  | 'year_one'
  | 'builder'
  | 'connector'
  | 'track_day_warrior'
  | 'welcome_wagon';

export type AchievementDef = {
  key: AchievementKey;
  title: string;
  description: string;
  /** Minimum tier the achievement is reachable at. */
  tierGate?: 'approved' | 'collector';
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'first_event',
    title: 'First Event',
    description: 'Checked in to your first DCC event.',
  },
  {
    key: 'sunrise_crew',
    title: 'Sunrise Crew',
    description: 'Made it to 5 morning meets.',
  },
  {
    key: 'rally_veteran',
    title: 'Rally Veteran',
    description: 'Attended 3 DCC rallies.',
    tierGate: 'collector',
  },
  {
    key: 'founding_50',
    title: 'Founding 50',
    description: 'One of the first 50 approved DCC members.',
  },
  {
    key: 'year_one',
    title: 'Year One',
    description: 'A full year of DCC membership.',
  },
  {
    key: 'builder',
    title: 'Builder',
    description: 'Posted 10 build updates on your car.',
  },
  {
    key: 'connector',
    title: 'Connector',
    description: 'Three of your referrals were approved.',
  },
  {
    key: 'track_day_warrior',
    title: 'Track Day Warrior',
    description: 'Survived 5 DCC track days.',
  },
  {
    key: 'welcome_wagon',
    title: 'Welcome Wagon',
    description: 'Showed up to every cars & coffee in a quarter.',
  },
];
