import { StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';

export function Divider({ tone = 'subtle' }: { tone?: 'subtle' | 'gold' }) {
  return (
    <View
      style={[
        styles.line,
        { backgroundColor: tone === 'gold' ? colors.gold : colors.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
    marginVertical: 16,
  },
});
