import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Avatar,
  Button,
  Card,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { useInbox, type InboxRow } from '@/hooks/use-messaging';
import { colors, fonts, radii } from '@/lib/theme';

export default function InboxScreen() {
  const { profile, session } = useAuth();
  const { rows, loading, error } = useInbox();

  const canMessage =
    profile?.status === 'paid' || profile?.role === 'admin';

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
      <Stack.Screen options={{ title: 'Messages', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Direct
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Messages
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
          DMs are a paid-tier perk. Open someone{'’'}s profile to start a
          thread.
        </Text>
      </View>

      {!canMessage ? (
        <Card variant="inset">
          <Text variant="bodyBold">Paid members only</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Threads stay open for everyone you{'’'}ve already chatted with.
            New threads require a paid membership.
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card variant="inset">
          <Text tone="muted">Couldn{'’'}t load: {error}</Text>
        </Card>
      ) : loading ? (
        <Card variant="inset">
          <Text tone="muted">Loading…</Text>
        </Card>
      ) : rows.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">No conversations yet.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Open the Directory and tap **Message** on any member.
          </Text>
          <Button
            label="Open Directory"
            variant="secondary"
            size="sm"
            style={{ marginTop: 12 }}
            onPress={() => router.replace('/(tabs)/directory')}
          />
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {rows.map((r) => (
            <ConversationRow
              key={r.peer_id}
              row={r}
              meId={session?.user.id ?? ''}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ConversationRow({ row, meId }: { row: InboxRow; meId: string }) {
  const fromMe = row.last_message_sender_id === meId;
  const time = new Date(row.last_message_created_at).toLocaleTimeString(
    undefined,
    { hour: 'numeric', minute: '2-digit' },
  );
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/inbox/[id]', params: { id: row.peer_id } })
      }
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.9 : 1 }]}
    >
      <Avatar
        url={row.peer_profile_photo_url}
        name={row.peer_full_name}
        size="lg"
      />
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
            {row.peer_full_name ?? 'Member'}
          </Text>
          <Text variant="caption" tone="muted">
            {time}
          </Text>
        </View>
        <Text
          variant="small"
          tone={row.unread_count > 0 ? 'primary' : 'muted'}
          numberOfLines={1}
          style={{ marginTop: 2 }}
        >
          {fromMe ? 'You: ' : ''}
          {row.last_message_content}
        </Text>
      </View>
      {row.unread_count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{row.unread_count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
});
