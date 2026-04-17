import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

type AppScreenProps = {
  children: ReactNode;
  /** Wraps content in a ScrollView with keyboard handling */
  scroll?: boolean;
  /**
   * Remove horizontal/vertical padding from the content wrapper.
   * Useful for tab screens that manage their own insets.
   */
  noPad?: boolean;
};

/**
 * Root screen wrapper.
 *
 * Handles:
 *  - SafeAreaView (correct insets on iPhone notch / home-indicator)
 *  - KeyboardAvoidingView (pushes content up when keyboard opens on iOS)
 *  - Optional ScrollView with sensible keyboard behaviour
 *
 * Usage:
 *   <AppScreen>…</AppScreen>           — fixed layout, padded
 *   <AppScreen scroll>…</AppScreen>    — scrollable, padded
 *   <AppScreen noPad>…</AppScreen>     — fixed layout, no padding
 */
export function AppScreen({ children, scroll = false, noPad = false }: AppScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, noPad && styles.zeroPad]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, noPad && styles.zeroPad]}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[5],  // 20
    paddingTop:        spacing[3],  // 12
    paddingBottom:     spacing[6],  // 24
  },
  scrollContent: {
    paddingHorizontal: spacing[5],  // 20
    paddingTop:        spacing[3],  // 12
    paddingBottom:     spacing[10], // 40
    flexGrow: 1,
  },
  zeroPad: {
    paddingHorizontal: 0,
    paddingTop:        0,
    paddingBottom:     0,
  },
});
