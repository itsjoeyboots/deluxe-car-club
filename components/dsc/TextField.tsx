import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, fonts, radii } from '@/lib/theme';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
};

export function TextField({
  label,
  helperText,
  errorText,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = errorText
    ? colors.danger
    : focused
      ? colors.terracotta
      : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="eyebrow" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          { borderColor, backgroundColor: colors.surfaceRaised },
          style,
        ]}
      />
      {errorText ? (
        <Text variant="caption" style={{ color: colors.danger, marginTop: 4 }}>
          {errorText}
        </Text>
      ) : helperText ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
