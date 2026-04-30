/**
 * Hand-written DB types for the Deluxe Car Club schema (supabase/migrations/0001_init.sql).
 * Replace with `supabase gen types typescript` once the project is provisioned.
 */

export type MemberRole = 'member' | 'admin';
export type MemberStatus = 'guest' | 'pending' | 'approved' | 'rejected' | 'paid';
export type MemberTier = 'none' | 'drivers' | 'collector';
export type BillingCycle = 'monthly' | 'annual';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted';
export type BuildStatus = 'in_progress' | 'complete';
export type ModCategory =
  | 'engine'
  | 'suspension'
  | 'exterior'
  | 'interior'
  | 'wheels'
  | 'audio'
  | 'other';
export type EventStatus = 'upcoming' | 'full' | 'past' | 'cancelled';
export type EventTier = 'approved' | 'drivers' | 'collector';
export type RsvpStatus = 'going' | 'waitlist' | 'cancelled';
export type RedemptionStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
  instagram_handle: string | null;
  city: string | null;
  role: MemberRole;
  status: MemberStatus;
  tier: MemberTier;
  billing_cycle: BillingCycle | null;
  applied_at: string | null;
  approved_at: string | null;
  paid_since: string | null;
  app_number: number | null;
  points_balance: number;
  member_qr_token: string;
  notification_prefs: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  primary_car: string | null;
  motivation_text: string | null;
  referred_by: string | null;
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  payment_intent_id: string | null;
  heard_via: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
}

export interface Car {
  id: string;
  user_id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  nickname: string | null;
  status: BuildStatus;
  is_primary: boolean;
  created_at: string;
}

export interface CarPhoto {
  id: string;
  car_id: string;
  url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export interface Mod {
  id: string;
  car_id: string;
  category: ModCategory;
  description: string;
  created_at: string;
}

export interface BuildUpdate {
  id: string;
  car_id: string;
  user_id: string;
  content: string;
  photo_urls: string[];
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  hero_image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  tier_required: EventTier;
  guest_passes_allowed: boolean;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  qr_code_token: string;
  checked_in_at: string | null;
  guests_count: number;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  hero_image_url: string | null;
  description: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  service_categories: string[];
  discount_terms: string | null;
  contact_info: Record<string, unknown>;
  featured: boolean;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  point_cost: number;
  image_url: string | null;
  available: boolean;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  redeemed_at: string;
  status: RedemptionStatus;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
}
