import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export type ScreenProps = ViewProps & {
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentContainerStyle?: ViewProps['style'];
};

export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  edges = ['top', 'left', 'right'],
}: ScreenProps) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      <Wrapper
        style={scroll ? undefined : styles.container}
        contentContainerStyle={
          scroll ? [styles.scrollContent, contentContainerStyle] : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
