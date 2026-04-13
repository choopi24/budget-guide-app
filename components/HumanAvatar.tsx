/**
 * HumanAvatar — Bull-human hybrid character, finance-app aesthetic.
 * Suit color is configurable. Hat variants include integrated bull horns.
 * The 'toque' hat (chef's hat) is an easter-egg unlock for agentcolex.
 * Animation: Chicago Bulls–inspired charge pulse (quick surge + settle).
 */
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Rect, G, Text as SvgText,
} from 'react-native-svg';

// ─── Public types ────────────────────────────────────────────────────────────
export type SkinToneId     = 's1' | 's2' | 's3' | 's4' | 's5';
export type HairStyleId    = 'clean' | 'sidepart' | 'waves' | 'bun' | 'curly';
export type HairColorId    = 'black' | 'dkbrown' | 'brown' | 'auburn' | 'blonde' | 'gray';
export type SuitColorId    = 'navy' | 'red' | 'blue' | 'green' | 'white' | 'brown' | 'grey';
export type HumanHatId     = 'none' | 'cap' | 'beret' | 'beanie' | 'fedora' | 'toque' | 'gmcap';
export type HumanGlassesId = 'none' | 'round' | 'rect' | 'halfrim' | 'shades';
export type HumanExtraId   = 'none' | 'pin' | 'earring' | 'chain';
export type EyeShapeId     = 'default' | 'happy' | 'mad' | 'serious' | 'silly' | 'wink';

export interface HumanAvatarProps {
  skinTone?:  SkinToneId;
  hairStyle?: HairStyleId;  // kept for API compat — not rendered
  hairColor?: HairColorId;  // kept for API compat — not rendered
  suitColor?: SuitColorId;
  hat?:       HumanHatId;
  glasses?:   HumanGlassesId;
  extra?:     HumanExtraId;
  eyeShape?:  EyeShapeId;
  size?:      number;
  animated?:  boolean;
  ownerName?: string;
}

// ─── Palettes ─────────────────────────────────────────────────────────────────
const SKIN = {
  s1: { base: '#FDDBB4', shadow: '#E8B890', lips: '#D08070', snout: '#F8E8D8' },
  s2: { base: '#EDB87A', shadow: '#CF9050', lips: '#B86050', snout: '#F2CCA0' },
  s3: { base: '#C07840', shadow: '#9A5820', lips: '#904030', snout: '#CC8C58' },
  s4: { base: '#8B4E1E', shadow: '#6A3610', lips: '#602010', snout: '#9A5E2C' },
  s5: { base: '#4A2408', shadow: '#341A04', lips: '#301008', snout: '#5C3014' },
} as const;

// Suit palettes — dark/mid/light drive the jacket; tie colours complement each
const SUIT_PALETTES: Record<SuitColorId, {
  dark: string; mid: string; light: string;
  shirt: string; tie: string; tieKnt: string; tieSch: string;
}> = {
  navy:  { dark: '#1A2535', mid: '#243040', light: '#2D3A4C', shirt: '#F4F6F8', tie: '#2F7D57', tieKnt: '#1E5C3E', tieSch: '#256648' },
  red:   { dark: '#6E1212', mid: '#8C1A1A', light: '#AA2424', shirt: '#F4F6F8', tie: '#1A2535', tieKnt: '#101820', tieSch: '#182030' },
  blue:  { dark: '#1A3070', mid: '#254090', light: '#3050A8', shirt: '#F4F6F8', tie: '#C9A227', tieKnt: '#A07818', tieSch: '#8A6010' },
  green: { dark: '#1A4A22', mid: '#256030', light: '#30783E', shirt: '#F4F6F8', tie: '#C9A227', tieKnt: '#A07818', tieSch: '#8A6010' },
  white: { dark: '#BEBEBE', mid: '#D0D0D0', light: '#E2E2E2', shirt: '#FFFFFF',  tie: '#1A2535', tieKnt: '#101820', tieSch: '#182030' },
  brown: { dark: '#4A2808', mid: '#6B3A12', light: '#8A5020', shirt: '#F4F6F8', tie: '#2F7D57', tieKnt: '#1E5C3E', tieSch: '#256648' },
  grey:  { dark: '#363636', mid: '#4E4E4E', light: '#666666', shirt: '#F4F6F8', tie: '#6E1212', tieKnt: '#4E0C0C', tieSch: '#5E1010' },
};

const GOLD = { base: '#C9A227', hi: '#F0D060' };

// Ivory–cream horns
const HORN = { base: '#EDE0A0', shadow: '#C8B060', hi: '#F8F2CC' };

// ─── Reusable horn shapes ─────────────────────────────────────────────────────
// Both horns root at y=37 (hairline) and curve upward.
function HornLeft({ base, shadow, hi }: typeof HORN) {
  return (
    <G>
      <Path d="M 29 37 Q 12 22 10 8 Q 18 5 22 12 Q 24 24 34 36 Z"               fill={base} />
      <Path d="M 29 37 Q 16 24 14 10 Q 12 8 14 9 Q 16 13 18 22 Q 22 30 32 37 Z" fill={shadow} opacity={0.5} />
      <Path d="M 28 37 Q 16 24 18 13 Q 20 8 22 12"
        stroke={hi} strokeWidth={1.2} fill="none" opacity={0.55} strokeLinecap="round"
      />
    </G>
  );
}
function HornRight({ base, shadow, hi }: typeof HORN) {
  return (
    <G>
      <Path d="M 71 37 Q 88 22 90 8 Q 82 5 78 12 Q 76 24 66 36 Z"               fill={base} />
      <Path d="M 71 37 Q 84 24 86 10 Q 88 8 86 9 Q 84 13 82 22 Q 78 30 68 37 Z" fill={shadow} opacity={0.5} />
      <Path d="M 72 37 Q 84 24 82 13 Q 80 8 78 12"
        stroke={hi} strokeWidth={1.2} fill="none" opacity={0.55} strokeLinecap="round"
      />
    </G>
  );
}

// ─── Eye shapes ──────────────────────────────────────────────────────────────
type SkinEntry = { base: string; shadow: string; lips: string; snout: string };

function Eyes({ shape, s }: { shape: EyeShapeId; s: SkinEntry }) {
  if (shape === 'happy') {
    return (
      <G>
        <Path d="M 34.5 46 Q 37 41 40 40.2 Q 43 41 45.5 46 Q 40 48.8 34.5 46 Z" fill="white" />
        <Path d="M 34.5 46 Q 37 41 40 40.2 Q 43 41 45.5 46"
          stroke={s.shadow} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M 54.5 46 Q 57 41 60 40.2 Q 63 41 65.5 46 Q 60 48.8 54.5 46 Z" fill="white" />
        <Path d="M 54.5 46 Q 57 41 60 40.2 Q 63 41 65.5 46"
          stroke={s.shadow} strokeWidth={2} fill="none" strokeLinecap="round" />
      </G>
    );
  }

  if (shape === 'mad') {
    return (
      <G>
        <Ellipse cx={40} cy={44} rx={5.5} ry={4.8} fill="white" />
        <Ellipse cx={60} cy={44} rx={5.5} ry={4.8} fill="white" />
        <Circle cx={40} cy={44.5} r={3.2} fill="#1A1A2A" />
        <Circle cx={60} cy={44.5} r={3.2} fill="#1A1A2A" />
        <Circle cx={40} cy={44.5} r={1.6} fill="#0A0A14" />
        <Circle cx={60} cy={44.5} r={1.6} fill="#0A0A14" />
        <Circle cx={41.5} cy={43} r={1.1} fill="white" />
        <Circle cx={61.5} cy={43} r={1.1} fill="white" />
        {/* Angled skin cover — inner corner low, outer corner high → \ / angry formation */}
        <Path d="M 34 39.2 L 46 39.2 L 45.5 41.5 L 34.5 44.8 Z" fill={s.base} />
        <Path d="M 54 39.2 L 66 39.2 L 65.5 44.8 L 54.5 41.5 Z" fill={s.base} />
        <Path d="M 34.5 44.6 L 45.5 41.2" stroke={s.shadow} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Path d="M 54.5 41.2 L 65.5 44.6" stroke={s.shadow} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      </G>
    );
  }

  if (shape === 'serious') {
    return (
      <G>
        <Ellipse cx={40} cy={44} rx={5.5} ry={4.8} fill="white" />
        <Ellipse cx={60} cy={44} rx={5.5} ry={4.8} fill="white" />
        <Circle cx={40} cy={45.5} r={2.8} fill="#1A1A2A" />
        <Circle cx={60} cy={45.5} r={2.8} fill="#1A1A2A" />
        <Circle cx={40} cy={45.5} r={1.4} fill="#0A0A14" />
        <Circle cx={60} cy={45.5} r={1.4} fill="#0A0A14" />
        <Circle cx={41.2} cy={44.5} r={0.9} fill="white" />
        <Circle cx={61.2} cy={44.5} r={0.9} fill="white" />
        {/* Flat hooded lid covers top of each eye */}
        <Rect x={34.5} y={39.2} width={11} height={5} fill={s.base} />
        <Rect x={54.5} y={39.2} width={11} height={5} fill={s.base} />
        <Path d="M 34.5 44.2 L 45.5 44.2" stroke={s.shadow} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Path d="M 54.5 44.2 L 65.5 44.2" stroke={s.shadow} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      </G>
    );
  }

  if (shape === 'silly') {
    return (
      <G>
        <Ellipse cx={40} cy={44} rx={5.5} ry={4.8} fill="white" />
        <Ellipse cx={60} cy={44} rx={5.5} ry={4.8} fill="white" />
        <Path d="M 36 40.5 L 44 47.5 M 44 40.5 L 36 47.5"
          stroke="#1A1A2A" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Path d="M 56 40.5 L 64 47.5 M 64 40.5 L 56 47.5"
          stroke="#1A1A2A" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      </G>
    );
  }

  if (shape === 'wink') {
    return (
      <G>
        {/* Left eye — normal */}
        <Ellipse cx={40} cy={44} rx={5.5} ry={4.8} fill="white" />
        <Circle cx={40} cy={44.5} r={3.2} fill="#1A1A2A" />
        <Circle cx={40} cy={44.5} r={1.6} fill="#0A0A14" />
        <Circle cx={41.5} cy={43} r={1.1} fill="white" />
        {/* Right eye — wink */}
        <Path d="M 54.5 44.5 Q 60 39.5 65.5 44.5"
          stroke={s.shadow} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M 57.5 41.8 L 57 40.5 M 60 41.2 L 60 39.8 M 62.5 41.8 L 63 40.5"
          stroke={s.shadow} strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.55} />
      </G>
    );
  }

  // default
  return (
    <G>
      <Ellipse cx={40} cy={44} rx={5.5} ry={4.8} fill="white" />
      <Ellipse cx={60} cy={44} rx={5.5} ry={4.8} fill="white" />
      <Circle cx={40} cy={44.5} r={3.2} fill="#1A1A2A" />
      <Circle cx={60} cy={44.5} r={3.2} fill="#1A1A2A" />
      <Circle cx={40} cy={44.5} r={1.6} fill="#0A0A14" />
      <Circle cx={60} cy={44.5} r={1.6} fill="#0A0A14" />
      <Circle cx={41.5} cy={43} r={1.1} fill="white" />
      <Circle cx={61.5} cy={43} r={1.1} fill="white" />
    </G>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HumanAvatar({
  skinTone   = 's2',
  hairStyle:  _hairStyle,
  hairColor:  _hairColor,
  suitColor  = 'navy',
  hat        = 'none',
  glasses    = 'none',
  extra      = 'none',
  eyeShape   = 'default',
  size       = 100,
  animated: doAnimate = true,
  ownerName,
}: HumanAvatarProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const lean  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!doAnimate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.028, duration: 750,  useNativeDriver: true }),
          Animated.timing(lean,  { toValue: -2.8,  duration: 750,  useNativeDriver: true }),
        ]),
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1,   duration: 1500, useNativeDriver: true }),
          Animated.timing(lean,  { toValue: 0,   duration: 1500, useNativeDriver: true }),
        ]),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [doAnimate]);

  const s    = SKIN[skinTone];
  const SUIT = SUIT_PALETTES[suitColor];

  return (
    <Animated.View style={{ transform: [{ scale: pulse }, { translateY: lean }] }}>
      <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">

        {/* ══ 1. SUIT BODY ═══════════════════════════════════════════════════ */}
        <Path d="M 4 120 L 4 84 Q 18 74 50 74 Q 82 74 96 84 L 96 120 Z" fill={SUIT.dark} />
        {/* Sleeves */}
        <Path d="M 4 86 Q 2 78 10 74 L 18 77 L 20 120 L 4 120 Z"    fill={SUIT.mid} />
        <Path d="M 96 86 Q 98 78 90 74 L 82 77 L 80 120 L 96 120 Z" fill={SUIT.mid} />
        {/* Shirt cuffs */}
        <Rect x={3}  y={108} width={17} height={10} rx={5} fill={SUIT.shirt} />
        <Rect x={80} y={108} width={17} height={10} rx={5} fill={SUIT.shirt} />
        {/* Shirt front */}
        <Path d="M 42 76 L 46 92 L 50 95 L 54 92 L 58 76 Z" fill={SUIT.shirt} />
        {/* Lapels */}
        <Path d="M 4 84 L 42 76 L 46 92 L 16 106 Z"  fill={SUIT.mid} />
        <Path d="M 96 84 L 58 76 L 54 92 L 84 106 Z" fill={SUIT.mid} />
        {/* Jacket fold highlights */}
        <Path d="M 8 90 Q 14 84 20 80"  stroke={SUIT.light} strokeWidth={1.5} fill="none" opacity={0.6} strokeLinecap="round" />
        <Path d="M 92 90 Q 86 84 80 80" stroke={SUIT.light} strokeWidth={1.5} fill="none" opacity={0.6} strokeLinecap="round" />
        {/* Pocket square */}
        <Path d="M 22 88 L 30 86 L 31 90 L 23 92 Z" fill={SUIT.shirt} opacity={0.65} />
        {/* Buttons */}
        <Circle cx={50} cy={102} r={1.8} fill={SUIT.mid} />
        <Circle cx={50} cy={110} r={1.8} fill={SUIT.mid} />
        {/* Tie */}
        <Path d="M 44 76 L 56 76 L 54 83 L 50 85 L 46 83 Z" fill={SUIT.tieKnt} />
        <Path d="M 46 83 L 50 85 L 54 83 L 56 98 L 50 102 L 44 98 Z" fill={SUIT.tie} />
        <Path d="M 50 87 L 50 96" stroke={SUIT.tieSch} strokeWidth={0.8} strokeDasharray="2,2" fill="none" />

        {/* ══ 2. NECK ════════════════════════════════════════════════════════ */}
        <Rect x={41} y={66} width={18} height={14} rx={3} fill={s.base} />
        <Path d="M 41 76 L 46 70 L 50 68 L 54 70 L 59 76"
          stroke={SUIT.shirt} strokeWidth={2.8} fill="none"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {/* ══ 3. BULL EARS ═══════════════════════════════════════════════════ */}
        <Path d="M 27 46 Q 10 42 10 52 Q 10 62 28 60 Q 30 54 27 46 Z" fill={s.base} />
        <Path d="M 26 49 Q 14 46 14 53 Q 14 59 26 58 Z"                fill={s.shadow} opacity={0.28} />
        <Path d="M 73 46 Q 90 42 90 52 Q 90 62 72 60 Q 70 54 73 46 Z" fill={s.base} />
        <Path d="M 74 49 Q 86 46 86 53 Q 86 59 74 58 Z"                fill={s.shadow} opacity={0.28} />

        {/* ══ 4. HEAD ════════════════════════════════════════════════════════ */}
        {/* Head top is y=23; at y=37 (hat-base) the head spans x=27–73 */}
        <Ellipse cx={50} cy={46} rx={25} ry={23} fill={s.base} />
        <Ellipse cx={50} cy={64} rx={18} ry={7}  fill={s.shadow} opacity={0.12} />
        <Ellipse cx={35} cy={52} rx={7}  ry={5}  fill={s.lips}   opacity={0.09} />
        <Ellipse cx={65} cy={52} rx={7}  ry={5}  fill={s.lips}   opacity={0.09} />

        {/* ══ 5. SNOUT ═══════════════════════════════════════════════════════ */}
        <Ellipse cx={50} cy={58} rx={15} ry={9.5} fill={s.snout} />
        <Ellipse cx={50} cy={55} rx={11} ry={5}   fill="white"   opacity={0.12} />
        <Ellipse cx={44} cy={58} rx={3.2} ry={2.5} fill={s.shadow} opacity={0.62} />
        <Ellipse cx={56} cy={58} rx={3.2} ry={2.5} fill={s.shadow} opacity={0.62} />
        <Path d="M 43 63 Q 50 67 57 63"
          stroke={s.shadow} strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={0.50}
        />

        {/* ══ 6. HAT + INTEGRATED HORNS ═════════════════════════════════════
             Hat base aligns to head width at y=37 (x=27–73).
             No hat → standalone horns.
             Hat worn → horns integrated into hat design.              ══════ */}

        {/* ── No hat ── */}
        {hat === 'none' && (
          <G>
            <HornLeft  {...HORN} />
            <HornRight {...HORN} />
          </G>
        )}

        {/* ── Cap ── */}
        {hat === 'cap' && (
          <G>
            {/* Crown — base spans full head width at y=37 */}
            <Path d="M 27 37 Q 26 22 50 21 Q 74 22 73 37 Q 62 33 50 33 Q 38 33 27 37 Z" fill="#2F7D57" />
            {/* Brim */}
            <Path d="M 27 37 Q 50 43 73 37 L 70 34 Q 50 40 30 34 Z" fill="#1E5C3E" />
            {/* Center seam */}
            <Path d="M 50 21 L 50 37" stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} fill="none" />
            {/* Button */}
            <Circle cx={50} cy={26} r={5} fill="#1E5C3E" />
            <Circle cx={50} cy={26} r={3} fill={GOLD.base} opacity={0.85} />
            {/* Horns pierce through cap sides */}
            <HornLeft  {...HORN} />
            <HornRight {...HORN} />
          </G>
        )}

        {/* ── Beret ── */}
        {hat === 'beret' && (
          <G>
            {/* Horns first — band covers their bases */}
            <HornLeft  {...HORN} />
            <HornRight {...HORN} />
            {/* Beret body — spans x=27–74, droops right */}
            <Path d="M 27 37 Q 26 13 52 8 Q 76 10 74 35 Q 64 22 52 26 Z" fill="#607090" />
            <Ellipse cx={62} cy={14} rx={10} ry={7} fill="#7080A0" opacity={0.35} />
            {/* Band covers horn bases */}
            <Path d="M 27 37 Q 52 30 74 35" stroke="#808090" strokeWidth={7}   fill="none" strokeLinecap="round" />
            <Path d="M 29 36.5 Q 52 30 72 34" stroke="white" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.5} />
            <Circle cx={52} cy={9} r={2} fill="#8080A0" />
          </G>
        )}

        {/* ── Beanie ── */}
        {hat === 'beanie' && (
          <G>
            {/* Horns first — band covers their bases */}
            <HornLeft  {...HORN} />
            <HornRight {...HORN} />
            {/* Beanie body — base x=28–72 */}
            <Path d="M 28 37 Q 26 16 50 13 Q 74 16 72 37 Q 62 34 50 34 Q 38 34 28 37 Z" fill="#8B4A3A" />
            <Path d="M 30 34 Q 50 32 70 34 M 28 29 Q 50 27 72 29 M 28 23 Q 50 21 72 23"
              stroke="rgba(255,255,255,0.11)" strokeWidth={1.5} fill="none"
            />
            {/* Band covers horn bases */}
            <Path d="M 28 37 Q 50 34 72 37" stroke="#6B3A2A" strokeWidth={7}   fill="none" strokeLinecap="round" />
            <Path d="M 28 37 Q 50 34 72 37" stroke="#7A4A38" strokeWidth={3.2} fill="none" strokeLinecap="round" />
            {/* Pom-pom */}
            <Circle cx={50} cy={6} r={7} fill="#8B4A3A" />
            <Circle cx={50} cy={6} r={4} fill="#A06050" opacity={0.55} />
          </G>
        )}

        {/* ── Fedora ── */}
        {hat === 'fedora' && (
          <G>
            {/* Crown — narrower than brim by design */}
            <Path d="M 32 37 Q 30 22 50 21 Q 70 22 68 37 Q 62 33 50 33 Q 38 33 32 37 Z" fill="#2C2C3A" />
            <Path d="M 44 26 Q 50 22 56 26" stroke="rgba(255,255,255,0.07)" strokeWidth={2} fill="none" />
            {/* Brim spans x=28–72, matching head width */}
            <Ellipse cx={50} cy={37} rx={22} ry={5} fill="#22222E" />
            <Path d="M 34 36 Q 50 33 66 36" stroke={GOLD.base} strokeWidth={2.5} fill="none" />
            {/* Horns pierce through brim */}
            <HornLeft  {...HORN} />
            <HornRight {...HORN} />
          </G>
        )}

        {/* ── GM Cap — insider status cap, agentcolex exclusive ── */}
        {hat === 'gmcap' && (
          <G>
            {/* Crown — off-white premium 6-panel cap */}
            <Path d="M 27 37 Q 26 22 50 21 Q 74 22 73 37 Q 62 33 50 33 Q 38 33 27 37 Z" fill="#F4F4F0" />
            {/* Panel seams: center + two side seams for 6-panel silhouette */}
            <Path d="M 50 21 L 50 37"         stroke="#E2E2DE" strokeWidth={0.9} fill="none" />
            <Path d="M 50 21 Q 43 27 40 37"   stroke="#E2E2DE" strokeWidth={0.7} fill="none" opacity={0.7} />
            <Path d="M 50 21 Q 57 27 60 37"   stroke="#E2E2DE" strokeWidth={0.7} fill="none" opacity={0.7} />
            {/* Front panel shadow — subtle depth */}
            <Path d="M 40 37 Q 39 25 50 23 Q 61 25 60 37 Q 57 34 50 34 Q 43 34 40 37 Z"
              fill="rgba(0,0,0,0.03)"
            />
            {/* WZ gold embroidery — center front panel */}
            <SvgText x={50} y={31} fontSize={7} fontWeight="bold" fill={GOLD.base}
              textAnchor="middle" letterSpacing={1.5}>WZ</SvgText>
            {/* Thin gold rule under monogram */}
            <Path d="M 44.5 33 L 55.5 33" stroke={GOLD.base} strokeWidth={0.8} fill="none" opacity={0.55} />
            {/* Brim — slightly darker white */}
            <Path d="M 27 37 Q 50 43 73 37 L 70 34 Q 50 40 30 34 Z" fill="#E8E8E4" />
            {/* Gold brim edge */}
            <Path d="M 27 37 Q 50 43.5 73 37"
              stroke={GOLD.base} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.65}
            />
            {/* Sweatband — thin line at base */}
            <Path d="M 29 37 Q 50 35.5 71 37"
              stroke="#DCDCD8" strokeWidth={2.5} fill="none" strokeLinecap="round"
            />
            {/* Horns pierce through sides */}
            <HornLeft  {...HORN} />
            <HornRight {...HORN} />
          </G>
        )}

        {/* ── Toque (chef's hat) — easter egg for agentcolex ── */}
        {hat === 'toque' && (
          <G>
            {/* Horns first — band covers their bases */}
            <HornLeft  {...HORN} />
            <HornRight {...HORN} />
            {/* Cylinder body */}
            <Rect x={36} y={10} width={28} height={27} fill="white" />
            {/* Pleating lines */}
            <Path d="M 41 10 L 41 37 M 46 10 L 46 37 M 50 10 L 50 37 M 54 10 L 54 37 M 59 10 L 59 37"
              stroke="#E0E0E0" strokeWidth={0.8} fill="none"
            />
            {/* Puffy dome top */}
            <Ellipse cx={50} cy={10} rx={16} ry={9} fill="white" />
            <Ellipse cx={50} cy={10} rx={13} ry={6} fill="white" />
            {/* Dome shadow */}
            <Ellipse cx={50} cy={18} rx={13} ry={3} fill="rgba(0,0,0,0.05)" />
            {/* Dome highlight */}
            <Ellipse cx={46} cy={6}  rx={6}  ry={3} fill="white" opacity={0.7} />
            {/* Band — covers horn bases */}
            <Rect x={30} y={33} width={40} height={6} rx={2} fill="#E8E8E8" />
            <Rect x={30} y={33} width={40} height={2} rx={1} fill="rgba(0,0,0,0.06)" />
            {/* WZ monogram on band */}
            <SvgText x={50} y={38} fontSize={5} fontWeight="bold" fill="#2F7D57" textAnchor="middle">WZ</SvgText>
          </G>
        )}

        {/* ══ 7. FACE FEATURES ════════════════════════════════════════════════ */}
        <Eyes shape={eyeShape} s={s} />

        {/* ══ 8. GLASSES ════════════════════════════════════════════════════ */}
        {glasses === 'round' && (
          <G>
            <Circle cx={40} cy={44} r={9}   stroke="#2C2C2C" strokeWidth={2}   fill="none" />
            <Circle cx={60} cy={44} r={9}   stroke="#2C2C2C" strokeWidth={2}   fill="none" />
            <Path d="M 49 44 L 51 44"       stroke="#2C2C2C" strokeWidth={2}   fill="none" />
            <Path d="M 31 42 L 27 40"       stroke="#2C2C2C" strokeWidth={1.8} fill="none" strokeLinecap="round" />
            <Path d="M 69 42 L 73 40"       stroke="#2C2C2C" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </G>
        )}
        {glasses === 'rect' && (
          <G>
            <Rect x={29} y={39} width={19} height={12} rx={3} stroke="#2C2C2C" strokeWidth={2} fill="none" />
            <Rect x={52} y={39} width={19} height={12} rx={3} stroke="#2C2C2C" strokeWidth={2} fill="none" />
            <Path d="M 48 44 L 52 44"       stroke="#2C2C2C" strokeWidth={1.5} fill="none" />
            <Path d="M 29 43 L 25 41"       stroke="#2C2C2C" strokeWidth={1.8} fill="none" strokeLinecap="round" />
            <Path d="M 71 43 L 75 41"       stroke="#2C2C2C" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </G>
        )}
        {glasses === 'halfrim' && (
          <G>
            <Path d="M 31 39 Q 40 35 49 39" stroke={GOLD.base} strokeWidth={2.2} fill="none" />
            <Path d="M 51 39 Q 60 35 69 39" stroke={GOLD.base} strokeWidth={2.2} fill="none" />
            <Path d="M 31 39 L 27 38"       stroke={GOLD.base} strokeWidth={1.8} fill="none" strokeLinecap="round" />
            <Path d="M 69 39 L 73 38"       stroke={GOLD.base} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </G>
        )}
        {glasses === 'shades' && (
          <G>
            <Rect x={29} y={40} width={20} height={11} rx={5} fill="#1A253A" opacity={0.92} />
            <Rect x={51} y={40} width={20} height={11} rx={5} fill="#1A253A" opacity={0.92} />
            <Path d="M 49 45 L 51 45"       stroke="#555" strokeWidth={1.5} fill="none" />
            <Path d="M 29 44 L 25 42"       stroke="#555" strokeWidth={1.8} strokeLinecap="round" fill="none" />
            <Path d="M 71 44 L 75 42"       stroke="#555" strokeWidth={1.8} strokeLinecap="round" fill="none" />
            <Path d="M 32 43 L 38 43"       stroke="white" strokeWidth={0.8} opacity={0.2} strokeLinecap="round" fill="none" />
            <Path d="M 54 43 L 60 43"       stroke="white" strokeWidth={0.8} opacity={0.2} strokeLinecap="round" fill="none" />
          </G>
        )}

        {/* ══ 9. ACCESSORIES ════════════════════════════════════════════════ */}
        {extra === 'earring' && (
          <G>
            <Circle cx={79} cy={54} r={3.2} fill={GOLD.base} />
            <Circle cx={79} cy={54} r={1.6} fill={GOLD.hi}   />
          </G>
        )}
        {extra === 'pin' && (
          <G>
            <Circle cx={26} cy={92} r={3.8} fill={GOLD.base} />
            <Circle cx={26} cy={92} r={2}   fill={GOLD.hi}   />
            <Path d="M 26 95.8 L 26 101" stroke={GOLD.base} strokeWidth={1.5} strokeLinecap="round" fill="none" />
          </G>
        )}
        {extra === 'chain' && (
          <G>
            <Path d="M 36 76 Q 50 88 64 76" stroke={GOLD.base} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Path d="M 36 76 Q 50 92 64 76" stroke={GOLD.base} strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.45} />
            <Circle cx={50} cy={89} r={4}   fill={GOLD.base} />
            <Circle cx={50} cy={89} r={2.2} fill={GOLD.hi}   />
          </G>
        )}

      </Svg>
    </Animated.View>
  );
}
