import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Rect, G, Text as SvgText,
} from 'react-native-svg';

export type HatId = 'none' | 'tophat' | 'crown' | 'cowboy' | 'cap' | 'graduation';
export type GlassesId = 'none' | 'round' | 'shades' | 'monocle';
export type ExtraId = 'none' | 'chain' | 'medal' | 'star';

export interface BullAvatarProps {
  hat?: HatId;
  glasses?: GlassesId;
  extra?: ExtraId;
  size?: number;
  animated?: boolean;
  ownerName?: string;
}

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  // Bull
  body:        '#9C6F47',
  bodyDark:    '#7A5234',
  bodyLight:   '#C8956C',
  innerEar:    '#D4A070',
  snout:       '#B87A54',
  nostril:     '#5C2E10',
  // Horns — ivory/cream/yellowish
  horn:        '#EDE0A0',
  hornTip:     '#D4C478',
  hornShadow:  '#C8B060',
  // Eyes
  eyeWhite:    '#FFFFFF',
  eyeIris:     '#2C1206',
  eyePupil:    '#0A0500',
  eyeShine:    '#FFFFFF',
  // Suit
  suitDark:    '#1A2535',
  suitMid:     '#243040',
  suitLight:   '#2D3A4C',
  shirt:       '#F4F6F8',
  tie:         '#2F7D57',
  tieKnot:     '#1E5C3E',
  tieLine:     '#256648',
  // Hats
  topHat:      '#1A1A2A',
  topHatBand:  '#C9A227',
  crownGold:   '#F0C040',
  crownDark:   '#C8A000',
  crownGem:    '#D94040',
  crownGem2:   '#4C79B5',
  cowboy:      '#8B6030',
  cowboyLight: '#A87840',
  cap:         '#2F7D57',
  capVisor:    '#1E5C3E',
  gradBlack:   '#1A1A2A',
  gradBoard:   '#2A2A2A',
  tassGold:    '#C9A227',
  // Glasses
  glassFrame:  '#2C2C2C',
  shadeBlue:   '#1A253A',
  monocleGold: '#C9A227',
  // Extras
  chainGold:   '#F0C040',
  medalBlue:   '#4C79B5',
  starYellow:  '#F0C040',
};

// ─── Easter-egg check ────────────────────────────────────────────────────────
function isAgentColex(name?: string): boolean {
  return (name ?? '').trim().toLowerCase() === 'agentcolex';
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BullAvatar({
  hat = 'none',
  glasses = 'none',
  extra = 'none',
  size = 120,
  animated: doAnimate = true,
  ownerName,
}: BullAvatarProps) {
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!doAnimate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.025, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1,     duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [doAnimate]);

  const vbW = 120;
  const vbH = 150;
  const svgH = size * (vbH / vbW);
  const special = isAgentColex(ownerName);
  const activeHat = special ? '__wz_beret__' : hat;

  return (
    <Animated.View style={{ transform: [{ scale: breathe }] }}>
      <Svg width={size} height={svgH} viewBox={`0 0 ${vbW} ${vbH}`}>

        {/* ══════════════════════════════════════════════
            LAYER 1 — Horns (ivory/cream, behind head)
        ══════════════════════════════════════════════ */}
        {/* Left horn */}
        <Path
          d="M 38 52 L 20 14 Q 18 6 28 5 Q 36 6 38 18 L 44 52 Z"
          fill={C.horn}
        />
        {/* Left horn shadow/depth */}
        <Path
          d="M 42 52 L 32 20 Q 30 12 36 10 Q 38 12 38 18 L 44 52 Z"
          fill={C.hornShadow}
          opacity={0.4}
        />
        {/* Right horn */}
        <Path
          d="M 82 52 L 100 14 Q 102 6 92 5 Q 84 6 82 18 L 76 52 Z"
          fill={C.horn}
        />
        {/* Right horn shadow/depth */}
        <Path
          d="M 78 52 L 88 20 Q 90 12 84 10 Q 82 12 82 18 L 76 52 Z"
          fill={C.hornShadow}
          opacity={0.4}
        />

        {/* ══════════════════════════════════════════════
            LAYER 2 — Ears (behind head)
        ══════════════════════════════════════════════ */}
        <Circle cx={21} cy={68} r={13} fill={C.body} />
        <Circle cx={99} cy={68} r={13} fill={C.body} />
        <Ellipse cx={21} cy={68} rx={7.5} ry={8} fill={C.innerEar} />
        <Ellipse cx={99} cy={68} rx={7.5} ry={8} fill={C.innerEar} />

        {/* ══════════════════════════════════════════════
            LAYER 3 — Head (human-bull face)
        ══════════════════════════════════════════════ */}
        <Circle cx={60} cy={70} r={34} fill={C.body} />

        {/* ── Eyes ── */}
        <Circle cx={47} cy={64} r={9}   fill={C.eyeWhite} />
        <Circle cx={73} cy={64} r={9}   fill={C.eyeWhite} />
        <Circle cx={48} cy={65} r={6}   fill={C.eyeIris} />
        <Circle cx={74} cy={65} r={6}   fill={C.eyeIris} />
        <Circle cx={49} cy={66} r={3}   fill={C.eyePupil} />
        <Circle cx={75} cy={66} r={3}   fill={C.eyePupil} />
        {/* Shine */}
        <Circle cx={52} cy={62} r={1.8} fill={C.eyeShine} />
        <Circle cx={78} cy={62} r={1.8} fill={C.eyeShine} />

        {/* ── Eyebrows (serious/business) ── */}
        <Path d="M 38 55 Q 44 52 50 54" stroke={C.bodyDark} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Path d="M 70 54 Q 76 52 82 55" stroke={C.bodyDark} strokeWidth={2.2} fill="none" strokeLinecap="round" />

        {/* ── Snout ── */}
        <Ellipse cx={60} cy={82} rx={19} ry={13} fill={C.snout} />
        <Ellipse cx={52} cy={84} rx={4.5} ry={3.5} fill={C.nostril} />
        <Ellipse cx={68} cy={84} rx={4.5} ry={3.5} fill={C.nostril} />
        {/* Smile */}
        <Path d="M 53 91 Q 60 96 67 91" stroke={C.bodyDark} strokeWidth={1.8} fill="none" strokeLinecap="round" />

        {/* ══════════════════════════════════════════════
            LAYER 4 — Human-like suit body with arms
        ══════════════════════════════════════════════ */}

        {/* Short neck */}
        <Rect x={50} y={100} width={20} height={12} rx={4} fill={C.body} />

        {/* Main jacket body */}
        <Path
          d="M 0 150 L 0 122 Q 14 108 60 106 Q 106 108 120 122 L 120 150 Z"
          fill={C.suitDark}
        />

        {/* Left arm sleeve */}
        <Path
          d="M 0 124 Q 2 111 16 108 L 22 112 L 22 150 L 0 150 Z"
          fill={C.suitMid}
        />
        {/* Left arm highlight/fold */}
        <Path
          d="M 4 118 Q 10 112 18 110 L 20 114"
          stroke={C.suitLight}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* Right arm sleeve */}
        <Path
          d="M 120 124 Q 118 111 104 108 L 98 112 L 98 150 L 120 150 Z"
          fill={C.suitMid}
        />
        {/* Right arm highlight/fold */}
        <Path
          d="M 116 118 Q 110 112 102 110 L 100 114"
          stroke={C.suitLight}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* Left shirt cuff */}
        <Rect x={1}  y={138} width={21} height={12} rx={6} fill={C.shirt} />
        {/* Right shirt cuff */}
        <Rect x={98} y={138} width={21} height={12} rx={6} fill={C.shirt} />

        {/* White shirt front */}
        <Path d="M 51 108 L 55 124 L 60 128 L 65 124 L 69 108 Z" fill={C.shirt} />

        {/* Shirt collar (V shape at neck) */}
        <Path
          d="M 51 108 L 56 103 L 60 101 L 64 103 L 69 108"
          stroke={C.shirt}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left lapel */}
        <Path d="M 0 122 L 51 108 L 55 124 L 16 140 Z" fill={C.suitMid} />
        {/* Right lapel */}
        <Path d="M 120 122 L 69 108 L 65 124 L 104 140 Z" fill={C.suitMid} />

        {/* Suit buttons */}
        <Circle cx={60} cy={133} r={2}   fill={C.suitLight} />
        <Circle cx={60} cy={142} r={2}   fill={C.suitLight} />

        {/* Pocket square (left breast) */}
        <Path
          d="M 28 118 L 38 115 L 40 119 L 30 122 Z"
          fill={C.shirt}
          opacity={0.7}
        />

        {/* ── Tie ── */}
        {/* Knot */}
        <Path d="M 56 108 L 64 108 L 62 114 L 60 116 L 58 114 Z" fill={C.tieKnot} />
        {/* Blade */}
        <Path d="M 58 114 L 60 116 L 62 114 L 65 127 L 60 132 L 55 127 Z" fill={C.tie} />
        {/* Tie centre stitch */}
        <Path d="M 60 118 L 60 129" stroke={C.tieLine} strokeWidth={0.8} strokeDasharray="2,2" fill="none" />

        {/* ══════════════════════════════════════════════
            LAYER 5 — Extras
        ══════════════════════════════════════════════ */}
        {extra === 'chain' && (
          <>
            <Path d="M 24 114 Q 60 128 96 114" stroke={C.chainGold} strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M 24 114 Q 60 132 96 114" stroke={C.chainGold} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.5} />
            <Circle cx={60} cy={130} r={5} fill={C.chainGold} />
            <Circle cx={60} cy={130} r={2.5} fill={C.tieKnot} />
          </>
        )}

        {extra === 'medal' && (
          <>
            <Rect x={57} y={108} width={6} height={20} rx={1} fill={C.medalBlue} />
            <Circle cx={60} cy={132} r={8}   fill={C.chainGold} />
            <Circle cx={60} cy={132} r={5.5} fill="#F8D060" />
            <Circle cx={60} cy={132} r={2}   fill={C.tieKnot} opacity={0.4} />
          </>
        )}

        {extra === 'star' && (
          <Path
            d="M 22 56 L 24 62 L 30 62 L 25.4 65.8 L 27.4 71.8 L 22 68 L 16.6 71.8 L 18.6 65.8 L 14 62 L 20 62 Z"
            fill={C.starYellow}
          />
        )}

        {/* ══════════════════════════════════════════════
            LAYER 6 — Glasses
        ══════════════════════════════════════════════ */}
        {glasses === 'round' && (
          <G>
            <Circle cx={47} cy={64} r={11} stroke={C.glassFrame} strokeWidth={2.5} fill="none" />
            <Circle cx={73} cy={64} r={11} stroke={C.glassFrame} strokeWidth={2.5} fill="none" />
            <Path d="M 58 64 L 62 64" stroke={C.glassFrame} strokeWidth={2} fill="none" />
            <Path d="M 36 61 L 30 58" stroke={C.glassFrame} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Path d="M 84 61 L 90 58" stroke={C.glassFrame} strokeWidth={2} fill="none" strokeLinecap="round" />
          </G>
        )}

        {glasses === 'shades' && (
          <G>
            <Rect x={34} y={56} width={25} height={16} rx={6} fill={C.shadeBlue} opacity={0.92} />
            <Rect x={61} y={56} width={25} height={16} rx={6} fill={C.shadeBlue} opacity={0.92} />
            <Path d="M 59 64 L 61 64" stroke="#555" strokeWidth={2} fill="none" />
            <Path d="M 34 62 L 28 59" stroke="#555" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M 86 62 L 92 59" stroke="#555" strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d="M 37 59 L 44 59" stroke="white" strokeWidth={1.2} opacity={0.35} strokeLinecap="round" fill="none" />
            <Path d="M 64 59 L 71 59" stroke="white" strokeWidth={1.2} opacity={0.35} strokeLinecap="round" fill="none" />
          </G>
        )}

        {glasses === 'monocle' && (
          <G>
            <Circle cx={73} cy={64} r={12} stroke={C.monocleGold} strokeWidth={2.5} fill="none" />
            <Path d="M 73 76 Q 78 84 84 88" stroke={C.monocleGold} strokeWidth={1.5} fill="none" strokeLinecap="round" />
            <Circle cx={84} cy={88} r={2} fill={C.monocleGold} />
          </G>
        )}

        {/* ══════════════════════════════════════════════
            LAYER 7 — Hat (always on top)
        ══════════════════════════════════════════════ */}

        {/* ── Standard hats ── */}
        {activeHat === 'tophat' && (
          <G>
            <Rect x={32}  y={4}  width={56} height={36} rx={4} fill={C.topHat} />
            <Rect x={32}  y={32} width={56} height={6}  rx={0} fill={C.topHatBand} />
            <Rect x={18}  y={38} width={84} height={8}  rx={4} fill={C.topHat} />
          </G>
        )}

        {activeHat === 'crown' && (
          <G>
            <Path d="M 26 46 L 26 26 L 40 38 L 60 18 L 80 38 L 94 26 L 94 46 Z" fill={C.crownGold} />
            <Path d="M 26 46 L 26 26 L 40 38 L 60 18 L 80 38 L 94 26 L 94 46 Z" stroke={C.crownDark} strokeWidth={1.5} fill="none" />
            <Circle cx={60} cy={22} r={5}   fill={C.crownGem} />
            <Circle cx={40} cy={38} r={3.5} fill={C.crownGem2} />
            <Circle cx={80} cy={38} r={3.5} fill={C.crownGem2} />
            <Rect x={26} y={40} width={68} height={6} rx={2} fill={C.crownDark} />
          </G>
        )}

        {activeHat === 'cowboy' && (
          <G>
            <Path d="M 32 44 Q 30 22 60 20 Q 90 22 88 44 Z" fill={C.cowboy} />
            <Ellipse cx={60} cy={44} rx={42} ry={9} fill={C.cowboy} />
            <Ellipse cx={60} cy={42} rx={32} ry={5} fill={C.cowboyLight} opacity={0.6} />
            <Path d="M 34 42 Q 60 38 86 42" stroke="#4A2E00" strokeWidth={2.5} fill="none" />
            <Path d="M 46 26 Q 60 22 74 26" stroke={C.cowboyLight} strokeWidth={2} fill="none" strokeLinecap="round" />
          </G>
        )}

        {activeHat === 'cap' && (
          <G>
            <Path d="M 24 48 Q 22 24 60 22 Q 98 24 96 48 Z" fill={C.cap} />
            <Path d="M 24 48 Q 50 56 88 50 L 96 46 Q 80 52 24 48 Z" fill={C.capVisor} />
            <Path d="M 60 22 L 60 48" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} fill="none" />
            <Circle cx={60} cy={35} r={5} fill={C.capVisor} />
            <Circle cx={60} cy={35} r={3} fill={C.tassGold} opacity={0.9} />
          </G>
        )}

        {activeHat === 'graduation' && (
          <G>
            <Path d="M 28 48 Q 26 28 60 26 Q 94 28 92 48 Z" fill={C.gradBlack} />
            <Rect x={24} y={42} width={72} height={7} rx={2} fill={C.gradBoard} />
            <Rect x={34} y={38} width={52} height={5} rx={2} fill={C.gradBoard} />
            <Circle cx={60} cy={40} r={3} fill={C.tassGold} />
            <Path d="M 88 44 Q 94 38 98 46" stroke={C.tassGold} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Circle cx={98} cy={46} r={2.5} fill={C.tassGold} />
            <Path d="M 96 48 L 94 56 M 98 48 L 98 56 M 100 48 L 102 56" stroke={C.tassGold} strokeWidth={1} fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ── Easter-egg: AgentColex WZ Beret (hardcoded, permanent) ── */}
        {activeHat === '__wz_beret__' && (
          <G>
            {/* Beret main body — flopped right, white */}
            <Path
              d="M 28 44 Q 24 16 62 10 Q 98 10 94 40 Q 78 26 50 34 Z"
              fill="white"
            />
            {/* Beret inner shading for depth */}
            <Path
              d="M 62 12 Q 92 14 90 38 Q 78 26 62 30 Z"
              fill="rgba(0,0,0,0.06)"
            />
            {/* Stitch top */}
            <Circle cx={63} cy={11} r={2.5} fill="#E0E0E0" />
            {/* Beret band — hugs the forehead */}
            <Path
              d="M 28 44 Q 60 36 94 40"
              stroke="#CCCCCC"
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 30 43 Q 60 36 92 40"
              stroke="white"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              opacity={0.8}
            />
            {/* WZ label */}
            <SvgText
              x={62}
              y={30}
              fontSize={14}
              fontWeight="bold"
              fill="#2F7D57"
              textAnchor="middle"
            >
              WZ
            </SvgText>
          </G>
        )}

      </Svg>
    </Animated.View>
  );
}
