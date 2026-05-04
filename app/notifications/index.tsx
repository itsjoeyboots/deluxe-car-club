import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Button,
  Card,
  Screen,
  SkeletonRow,
  Text,
} from '@/components/dsc';
import { useNotifications, type AppNotification } from '@/hooks/use-notifications';
import {
  getPushPermission,
  requestPushPermission,
  type PushPermission,
} from '@/lib/push';
import { colors, fonts, radii } from '@/lib/theme';
import type { NotificationType } from '@/types/db';

const TYPE_LABEL: Record<NotificationType, string> = {
  message: 'DM',
  application_status: 'Status',
  achievement: 'Achievement',
  build_like: 'Build',
  build_comment: 'Build',
  event_new: 'Event',
  event_reminder: 'Event',
  partner_new: 'Partner',
  announcement: 'Announce',
  points_milestone: 'Points',
};

export default function NotificationsScreen() {
  const { notifications, loading, error, markRead } = useNotifications();
  const [permission, setPermission] = useState<PushPermission>('default');

  useEffect(() => {
    getPushPermission().then(setPermission);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // mark everything read when the screen opens
      markRead();
    }, [markRead]),
  );

  async function handleEnable() {
    const next = await requestPushPermission();
    setPermission(next);
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
      <Stack.Screen options={{ title: 'Notifications', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Inbox
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Notifications
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
          Everything DCC has flagged for you. Tap a row to jump in.
        </Text>
      </View>

      {permission === 'default' ? (
        <Card>
          <Text variant="bodyBold">Get browser pings</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Approve once and DCC will ping your browser when something new
            lands — even when this tab isn{'’'}t focused.
          </Text>
          <Button
            label="Enable Pings"
            size="sm"
            style={{ marginTop: 12 }}
            onPress={handleEnable}
          />
        </Card>
      ) : null}
      {permission === 'denied' ? (
        <Card variant="inset">
          <Text variant="small" tone="muted">
            Browser pings are blocked. Re-enable from your browser{'’'}s site
            settings if you change your mind.
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card variant="inset">
          <Text tone="muted">Couldn{'’'}t load: {error}</Text>
        </Card>
      ) : loading ? (
        <View style={{ gap: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : notifications.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">All quiet for now.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            We{'’'}ll ping you when an event drops, you get a DM, your
            application moves, or someone interacts with your build.
          </Text>
          <Button
            label="Open Home"
            variant="secondary"
            size="sm"
            style={{ marginTop: 12 }}
            onPress={() => router.replace('/(tabs)')}
          />
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {notifications.map((n) => (
            <NotificationRow key={n.id} n={n} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const ts = new Date(n.created_at);
  const ago = relativeTime(ts);
  const typeLabel = TYPE_LABEL[n.type as NotificationType] ?? n.type.toUpperCase();

  return (
    <Pressable
      onPress={() => routeFor(n)}
      style={({ pressed }) => [
        styles.row,
        {
          opacity: pressed ? 0.85 : 1,
          borderColor: n.read_at ? colors.border : colors.terracotta,
        },
      ]}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{typeLabel.slice(0, 1)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            variant="caption"
            tone="terracotta"
            style={{ flexShrink: 0 }}
          >
            {typeLabel.toUpperCase()}
          </Text>
          {!n.read_at ? <View style={styles.unreadDot} /> : null}
          <Text variant="caption" tone="muted" style={{ marginLeft: 'auto' }}>
            {ago}
          </Text>
        </View>
        <Text variant="bodyBold" numberOfLines={2} style={{ marginTop: 4 }}>
          {n.title}
        </Text>
        {n.body ? (
          <Text variant="small" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
            {n.body}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
    </Pressable>
  );
}

function routeFor(n: AppNotification) {
  switch (n.type as NotificationType) {
    case 'message':
      // related_id is the message id; sender_id is unknown here. Best we can
      // do without joining is push to the inbox.
      router.push('/inbox');
      return;
    case 'event_new':
    case 'event_reminder':
      if (n.related_id)
        router.push({ pathname: '/events/[id]', params: { id: n.related_id } });
      return;
    case 'partner_new':
      if (n.related_id)
        router.push({ pathname: '/partners/[id]', params: { id: n.related_id } });
      return;
    case 'build_like':
    case 'build_comment':
      // related_id is the build_update id; the car page will surface it.
      router.push('/(tabs)/profile');
      return;
    case 'application_status':
      router.push('/(tabs)/profile');
      return;
    case 'achievement':
    case 'points_milestone':
      router.push('/points');
      return;
    case 'announcement':
    default:
      router.push('/(tabs)');
  }
}

function relativeTime(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.terracottaDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.terracotta,
    fontFamily: fonts.serif,
    fontSize: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.terracotta,
  },
});
