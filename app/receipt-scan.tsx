import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { extractReceiptData, ReceiptExtractionError } from '../lib/receipts';
import { hapticLight } from '../lib/haptics';
import { setPendingReceiptUri } from '../lib/receiptImageState';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/tokens';

type Status = 'idle' | 'loading' | 'error';

const IMAGE_PICKER_OPTIONS = {
  mediaTypes: 'images' as const,
  quality: 0.75,   // lower quality keeps base64 size manageable
  base64: true,    // required for direct API upload
} satisfies ImagePicker.ImagePickerOptions;

export default function ReceiptScanScreen() {
  const router = useRouter();
  const [status,       setStatus]       = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Core processing ──────────────────────────────────────────────────────────

  async function processBase64(base64: string, imageUri?: string) {
    setStatus('loading');
    if (imageUri) setPendingReceiptUri(imageUri);
    try {
      const result = await extractReceiptData(base64);
      router.replace({
        pathname: '/receipt-review' as any,
        params: {
          merchant:         result.merchant              ?? '',
          amount:           result.amount    != null     ? String(result.amount) : '',
          date:             result.date                  ?? '',
          category:         result.categorySuggestion   ?? '',
          items:            JSON.stringify(result.items ?? []),
          confidence:       result.confidence != null   ? String(Math.round(result.confidence * 100)) : '',
          amountConfidence: result.amountConfidence != null ? String(Math.round(result.amountConfidence * 100)) : '',
        },
      });
    } catch (err: any) {
      setErrorMessage(
        err instanceof ReceiptExtractionError
          ? err.message
          : 'Could not analyze the receipt. Please try again.'
      );
      setStatus('error');
    }
  }

  async function handleCamera() {
    hapticLight();
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.base64) {
      await processBase64(asset.base64, asset.uri);
    } else {
      setErrorMessage('Could not read the image. Please try again.');
      setStatus('error');
    }
  }

  async function handleGallery() {
    hapticLight();
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.base64) {
      await processBase64(asset.base64, asset.uri);
    } else {
      setErrorMessage('Could not read the image. Please try again.');
      setStatus('error');
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <AppScreen>
        <View style={styles.centeredWrap}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.loadingTitle}>Analyzing receipt…</Text>
            <Text style={styles.loadingBody}>
              Reading merchant, amount, and date.
            </Text>
          </View>
        </View>
      </AppScreen>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (status === 'error') {
    return (
      <AppScreen>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.cancelPressed}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.centeredWrap}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
            </View>
            <Text style={styles.errorTitle}>{"Couldn't read receipt"}</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>

            <Pressable
              onPress={() => setStatus('idle')}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={16} color={colors.white} />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/expense-new' as any)}
              style={({ pressed }) => [styles.manualBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.manualBtnText}>Enter Manually Instead</Text>
            </Pressable>
          </View>
        </View>
      </AppScreen>
    );
  }

  // ── Idle state: picker ────────────────────────────────────────────────────────

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => pressed && styles.cancelPressed}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.heroIcon}>
            <Ionicons name="scan-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>Scan Receipt</Text>
          <Text style={styles.body}>
            Take a photo or pick an image from your library.{'\n'}
            {"We'll extract the details for you."}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleCamera}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Take a photo of a receipt"
          >
            <View style={[styles.actionIcon, styles.actionIconPrimary]}>
              <Ionicons name="camera-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Take Photo</Text>
              <Text style={styles.actionHint}>Use your camera to photograph a receipt</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </Pressable>

          <Pressable
            onPress={handleGallery}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed && styles.actionBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Choose a receipt photo from your gallery"
          >
            <View style={[styles.actionIcon, styles.actionIconSecondary]}>
              <Ionicons name="images-outline" size={26} color={colors.textMuted} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Choose from Library</Text>
              <Text style={styles.actionHint}>Select an existing photo from your library</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'flex-end',
    marginBottom: spacing[3],
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  cancelPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[12],
  },

  // ── Centered wrapper (loading + error) ───────────────────────────────────────
  centeredWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[4],
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: spacing[10],
    paddingHorizontal: spacing[4],
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ── Action buttons ───────────────────────────────────────────────────────────
  actions: {
    gap: spacing[3],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4] + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionBtnSecondary: {
    backgroundColor: colors.background,
  },
  actionBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconPrimary: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  actionIconSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { flex: 1 },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  actionHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // ── Loading card ─────────────────────────────────────────────────────────────
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 260,
    ...shadows.md,
  },
  spinner: {
    marginBottom: spacing[5],
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  loadingBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Error card ───────────────────────────────────────────────────────────────
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing[6],
    paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '30',
    width: '100%',
    ...shadows.md,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[6],
    marginBottom: spacing[3],
    width: '100%',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  manualBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    width: '100%',
    alignItems: 'center',
  },
  manualBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
