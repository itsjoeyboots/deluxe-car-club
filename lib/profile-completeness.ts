import type { Profile } from '@/types/db';

export type ProfileChecklistItem = {
  key:
    | 'full_name'
    | 'profile_photo_url'
    | 'city'
    | 'phone'
    | 'instagram_handle'
    | 'primary_car';
  label: string;
  done: boolean;
  required: boolean;
};

export function profileChecklist(
  profile: Profile | null,
  hasPrimaryCar: boolean,
): ProfileChecklistItem[] {
  return [
    {
      key: 'full_name',
      label: 'Add your full name',
      done: !!profile?.full_name?.trim(),
      required: true,
    },
    {
      key: 'profile_photo_url',
      label: 'Upload a profile photo',
      done: !!profile?.profile_photo_url,
      required: true,
    },
    {
      key: 'city',
      label: 'Set your home city',
      done: !!profile?.city?.trim(),
      required: true,
    },
    {
      key: 'phone',
      label: 'Add your phone (for the WhatsApp channel)',
      done: !!profile?.phone?.trim(),
      required: true,
    },
    {
      key: 'instagram_handle',
      label: 'Link your Instagram (optional)',
      done: !!profile?.instagram_handle?.trim(),
      required: false,
    },
    {
      key: 'primary_car',
      label: 'Add your primary car',
      done: hasPrimaryCar,
      required: true,
    },
  ];
}

export function profileCompletion(items: ProfileChecklistItem[]): {
  done: number;
  total: number;
  pctRequired: number;
  isComplete: boolean;
} {
  const required = items.filter((i) => i.required);
  const requiredDone = required.filter((i) => i.done).length;
  const totalDone = items.filter((i) => i.done).length;
  return {
    done: totalDone,
    total: items.length,
    pctRequired: required.length === 0 ? 1 : requiredDone / required.length,
    isComplete: requiredDone === required.length,
  };
}
