import { StyleSheet, View } from 'react-native';
import { colors, fonts, radii } from '@/lib/theme';
import {
  ACHIEVEMENTS,
  type AchievementKey,
} from '@/lib/achievements';
import { Text } from './Text';

export function AchievementsGrid({
  unlockedKeys,
}: {
  unlockedKeys: Set<AchievementKey>;
}) {
  const unlockedCount = unlockedKeys.size;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.header}>
        <Text variant="h3">Achievements</Text>
        <Text variant="caption" tone="muted">
          {unlockedCount} OF {ACHIEVEMENTS.length} UNLOCKED
        </Text>
      </View>
      <View style={styles.grid}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedKeys.has(a.key);
          return (
            <View
              key={a.key}
              style={[
                styles.tile,
                {
                  backgroundColor: unlocked ? colors.surfaceRaised : colors.sand,
                  borderColor: unlocked ? colors.gold : colors.border,
                  opacity: unlocked ? 1 : 0.6,
                },
              ]}
            >
              <View
                style={[
                  styles.medal,
                  {
                    backgroundColor: unlocked ? colors.terracottaDeep : colors.ink,
                  },
                ]}
              >
                <Text style={styles.medalLetter}>
                  {a.title.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                style={[
                  styles.title,
                  { color: unlocked ? colors.textPrimary : colors.textMuted },
                ]}
                numberOfLines={2}
              >
                {a.title}
              </Text>
              <Text
                style={[
                  styles.desc,
                  { color: unlocked ? colors.textSecondary : colors.textMuted },
                ]}
                numberOfLines={3}
              >
                {a.description}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 12,
    minHeight: 130,
  },
  medal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  medalLetter: {
    color: colors.goldBright,
    fontFamily: fonts.serif,
    fontSize: 16,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    marginBottom: 4,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 15,
  },
});
