import { Platform } from 'react-native';

// Space Grotesk — loaded in app/_layout.tsx via @expo-google-fonts/space-grotesk.
// Apply to: hero numbers, major screen titles, grade displays.
//
// Mono — platform-native (Menlo on iOS, Roboto Mono on Android).
// Apply to: verdict strips, financial metadata, pace indicators,
//           anywhere precision-numeric alignment matters.
//
// UI / body text uses the system default (SF Pro on iOS, Roboto on Android).
// Omit fontFamily entirely for body copy — the system font is the right call.

export const fonts = {
  bold:     'SpaceGrotesk_700Bold',
  semiBold: 'SpaceGrotesk_600SemiBold',
  mono:     Platform.select({
    ios:     'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
} as const;
