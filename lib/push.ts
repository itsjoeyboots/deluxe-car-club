/**
 * Push notifications wrapper.
 *
 * Web: uses the browser Notification API to show local pings when the
 *      `useNotifications` realtime subscription receives a new row.
 *      Works without any extra packages or credentials.
 *
 * Native (iOS / Android): expo-notifications is not yet installed in this
 *      project. When you `npm install expo-notifications` and rebuild a dev
 *      client, swap the stubbed `registerExpoPush()` for the live import.
 *      Production iOS push needs an APNs key configured in EAS; Android
 *      needs an FCM project. The Expo Push API itself is free and proxies
 *      both platforms.
 */

import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export async function getPushPermission(): Promise<PushPermission> {
  if (Platform.OS !== 'web') return 'unsupported';
  if (typeof window === 'undefined' || !('Notification' in window))
    return 'unsupported';
  return window.Notification.permission as PushPermission;
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (Platform.OS !== 'web') return 'unsupported';
  if (typeof window === 'undefined' || !('Notification' in window))
    return 'unsupported';
  if (window.Notification.permission === 'granted') return 'granted';
  if (window.Notification.permission === 'denied') return 'denied';
  const result = await window.Notification.requestPermission();
  return result as PushPermission;
}

export function showLocalPush(title: string, body?: string | null) {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    new window.Notification(title, {
      body: body ?? undefined,
      tag: 'dcc-' + Date.now(),
      icon: '/favicon.ico',
    });
  } catch {
    // Some browsers (Safari iOS) require user gesture; fail silently
  }
}

/**
 * Stub for native Expo push registration. Replace the body with:
 *
 *   import * as Notifications from 'expo-notifications';
 *   const { status } = await Notifications.requestPermissionsAsync();
 *   if (status !== 'granted') return null;
 *   const { data } = await Notifications.getExpoPushTokenAsync({
 *     projectId: Constants.expoConfig?.extra?.eas?.projectId,
 *   });
 *   return data;
 *
 * once expo-notifications is installed.
 */
export async function registerExpoPush(): Promise<string | null> {
  return null;
}

export async function syncPushToken(userId: string) {
  if (!isSupabaseConfigured) return;
  const token = await registerExpoPush();
  if (!token) return;
  await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);
}
