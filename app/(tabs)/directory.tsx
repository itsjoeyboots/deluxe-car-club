import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  Card,
  MemberRow,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { useMembers } from '@/hooks/use-members';
import { colors, fonts, radii } from '@/lib/theme';

type TierFilter = 'all' | 'drivers' | 'collector';

export default function DirectoryScreen() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');
  const { members, total, loading, error } = useMembers({ search, tier });

  const isApproved =
    profile?.status === 'approved' || profile?.status === 'paid';

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
      <View>
        <Text variant="eyebrow" tone="terracotta">
          The Roster
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Member Directory
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
          {total} approved member{total === 1 ? '' : 's'} so far. Tap a card
          to see their cars and badges.
        </Text>
      </View>

      {!isApproved ? (
        <Card variant="inset">
          <Text variant="bodyBold">Approval required</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Once your application is approved, you{'’'}ll see the full roster.
          </Text>
        </Card>
      ) : null}

      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, city, car…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pill active={tier === 'all'} label="All" onPress={() => setTier('all')} />
        <Pill
          active={tier === 'drivers'}
          label="Drivers"
          onPress={() => setTier('drivers')}
        />
        <Pill
          active={tier === 'collector'}
          label="Collector"
          onPress={() => setTier('collector')}
        />
      </View>

      {error ? (
        <Card variant="inset">
          <Text tone="muted">Couldn{'’'}t load directory: {error}</Text>
        </Card>
      ) : loading ? (
        <Card variant="inset">
          <Text tone="muted">Loading members…</Text>
        </Card>
      ) : members.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">
            {total === 0 ? 'No approved members yet.' : 'No matches.'}
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {total === 0
              ? 'Once founders approve applications, they will show up here.'
              : 'Try a different search or tier.'}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Pill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? colors.terracottaDeep : 'transparent',
          borderColor: active ? colors.terracottaDeep : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.sandLight : colors.textSecondary,
          fontFamily: fonts.sansBold,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 15,
    paddingVertical: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
});
