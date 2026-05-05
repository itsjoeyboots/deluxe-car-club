import { StyleSheet, View } from 'react-native';
import QRCodeSvg from 'react-native-qrcode-svg';
import { colors, radii } from '@/lib/theme';

type Props = {
  value: string;
  size?: number;
  /** Tint of the dark dots. Defaults to ink for proper scanner contrast. */
  color?: string;
  /** Card background. Defaults to white — required for reliable scanning. */
  backgroundColor?: string;
};

export function QRCode({
  value,
  size = 220,
  color = colors.ink,
  backgroundColor = '#FFFFFF',
}: Props) {
  return (
    <View style={[styles.frame, { backgroundColor }]}>
      <QRCodeSvg
        value={value || ' '}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        ecl="M"
        quietZone={8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    padding: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
