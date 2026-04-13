import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import HumanAvatar, {
  type EyeShapeId,
  type HumanExtraId,
  type HumanGlassesId,
  type HumanHatId,
  type SkinToneId,
  type SuitColorId,
} from '../components/HumanAvatar';
import { useAvatarDb } from '../db/avatar';
import { useProfileDb } from '../db/profile';
import { colors } from '../theme/colors';

// ─── Category definitions ─────────────────────────────────────────────────────
type TabId = 'look' | 'eyes' | 'hat' | 'glasses' | 'extras';

const TABS: { id: TabId; label: string }[] = [
  { id: 'look',    label: 'Look'    },
  { id: 'eyes',    label: 'Eyes'    },
  { id: 'hat',     label: 'Hat'     },
  { id: 'glasses', label: 'Glasses' },
  { id: 'extras',  label: 'Extras'  },
];

const SKIN_TONES: { id: SkinToneId; color: string }[] = [
  { id: 's1', color: '#FDDBB4' },
  { id: 's2', color: '#EDB87A' },
  { id: 's3', color: '#C07840' },
  { id: 's4', color: '#8B4E1E' },
  { id: 's5', color: '#4A2408' },
];

const SUIT_COLORS: { id: SuitColorId; label: string; swatch: string }[] = [
  { id: 'navy',  label: 'Navy',  swatch: '#1A2535' },
  { id: 'red',   label: 'Red',   swatch: '#8C1A1A' },
  { id: 'blue',  label: 'Blue',  swatch: '#254090' },
  { id: 'green', label: 'Green', swatch: '#256030' },
  { id: 'white', label: 'White', swatch: '#D0D0D0' },
  { id: 'brown', label: 'Brown', swatch: '#6B3A12' },
  { id: 'grey',  label: 'Grey',  swatch: '#4E4E4E' },
];

const BASE_HATS: { id: HumanHatId; label: string }[] = [
  { id: 'none',   label: 'None'   },
  { id: 'cap',    label: 'Cap'    },
  { id: 'beret',  label: 'Beret'  },
  { id: 'beanie', label: 'Beanie' },
  { id: 'fedora', label: 'Fedora' },
];

const GLASSES: { id: HumanGlassesId; label: string }[] = [
  { id: 'none',    label: 'None'      },
  { id: 'round',   label: 'Round'     },
  { id: 'rect',    label: 'Rectangle' },
  { id: 'halfrim', label: 'Half-rim'  },
  { id: 'shades',  label: 'Shades'    },
];

const EXTRAS: { id: HumanExtraId; label: string }[] = [
  { id: 'none',    label: 'None'      },
  { id: 'earring', label: 'Earring'   },
  { id: 'pin',     label: 'Lapel Pin' },
  { id: 'chain',   label: 'Chain'     },
];

const EYE_SHAPES: { id: EyeShapeId; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'happy',   label: 'Happy'   },
  { id: 'mad',     label: 'Mad'     },
  { id: 'serious', label: 'Serious' },
  { id: 'silly',   label: 'Silly'   },
  { id: 'wink',    label: 'Wink'    },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AvatarEditScreen() {
  const router = useRouter();
  const { getAvatarConfig, saveAvatarConfig } = useAvatarDb();
  const { getProfile } = useProfileDb();

  const [skinTone,  setSkinTone]  = useState<SkinToneId>('s2');
  const [suitColor, setSuitColor] = useState<SuitColorId>('navy');
  const [hat,       setHat]       = useState<HumanHatId>('none');
  const [glasses,   setGlasses]   = useState<HumanGlassesId>('none');
  const [extra,     setExtra]     = useState<HumanExtraId>('none');
  const [eyeShape,  setEyeShape]  = useState<EyeShapeId>('default');
  const [activeTab, setActiveTab] = useState<TabId>('look');
  const [ownerName, setOwnerName] = useState('');
  const [saving,    setSaving]    = useState(false);

  const bounce = useRef(new Animated.Value(1)).current;

  function triggerBounce() {
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.06, duration: 100, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  }

  function select<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); triggerBounce(); };
  }

  useEffect(() => {
    getAvatarConfig().then((cfg) => {
      setSkinTone(cfg.skinTone);
      setSuitColor(cfg.suitColor);
      setHat(cfg.hat);
      setGlasses(cfg.glasses);
      setExtra(cfg.extra);
      setEyeShape(cfg.eyeShape);
    });
    getProfile().then((p) => setOwnerName(p.name ?? ''));
  }, [getAvatarConfig, getProfile]);

  // The toque (chef's hat) is only available to agentcolex
  const isColex = ownerName.trim().toLowerCase() === 'agentcolex';
  const hats = isColex
    ? [
        ...BASE_HATS,
        { id: 'gmcap' as HumanHatId, label: 'Insider Cap' },
        { id: 'toque' as HumanHatId, label: "Chef's Hat"  },
      ]
    : BASE_HATS;

  async function handleSave() {
    setSaving(true);
    try {
      await saveAvatarConfig({
        skinTone,
        hairStyle: 'clean',
        hairColor: 'dkbrown',
        suitColor,
        hat,
        glasses,
        extra,
        eyeShape,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* ── Top bar ─────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.topTitle}>Edit Avatar</Text>
        <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      {/* ── Live preview ────────────────────────────── */}
      <View style={styles.previewArea}>
        <Animated.View style={{ transform: [{ scale: bounce }] }}>
          <HumanAvatar
            skinTone={skinTone}
            suitColor={suitColor}
            hat={hat}
            glasses={glasses}
            extra={extra}
            eyeShape={eyeShape}
            size={160}
            animated
            ownerName={ownerName}
          />
        </Animated.View>
        <View style={styles.chipRow}>
          {eyeShape !== 'default' && <TraitChip label={EYE_SHAPES.find(x => x.id === eyeShape)?.label ?? eyeShape} />}
          {hat      !== 'none'    && <TraitChip label={hats.find(x => x.id === hat)?.label ?? hat}                 />}
          {glasses  !== 'none'    && <TraitChip label={GLASSES.find(x => x.id === glasses)?.label ?? glasses}      />}
          {extra    !== 'none'    && <TraitChip label={EXTRAS.find(x => x.id === extra)?.label ?? extra}           />}
        </View>
      </View>

      {/* ── Category tabs ───────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setActiveTab(t.id)}
            style={[styles.tab, activeTab === t.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Options panel ───────────────────────────── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── LOOK TAB ── */}
        {activeTab === 'look' && (
          <>
            {/* Skin tone */}
            <Text style={styles.sectionLabel}>Skin Tone</Text>
            <View style={styles.swatchRow}>
              {SKIN_TONES.map((st) => (
                <Pressable
                  key={st.id}
                  onPress={() => select<SkinToneId>(setSkinTone)(st.id)}
                  style={[
                    styles.skinSwatch,
                    { backgroundColor: st.color },
                    skinTone === st.id && styles.swatchSelected,
                  ]}
                >
                  {skinTone === st.id && <View style={styles.swatchCheck} />}
                </Pressable>
              ))}
            </View>

            {/* Suit color */}
            <Text style={styles.sectionLabel}>Suit Color</Text>
            <View style={styles.suitColorGrid}>
              {SUIT_COLORS.map((sc) => (
                <Pressable
                  key={sc.id}
                  onPress={() => select<SuitColorId>(setSuitColor)(sc.id)}
                  style={[
                    styles.suitColorCard,
                    suitColor === sc.id && styles.suitColorCardSelected,
                  ]}
                >
                  <View style={[styles.suitSwatch, { backgroundColor: sc.swatch }]} />
                  <Text style={[styles.suitColorLabel, suitColor === sc.id && styles.suitColorLabelActive]}>
                    {sc.label}
                  </Text>
                  {suitColor === sc.id && <View style={styles.selectedDot} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── EYES TAB ── */}
        {activeTab === 'eyes' && (
          <View style={styles.optionGrid}>
            {EYE_SHAPES.map((item) => (
              <AvatarOptionCard
                key={item.id}
                label={item.label}
                selected={eyeShape === item.id}
                onPress={() => select<EyeShapeId>(setEyeShape)(item.id)}
              >
                <HumanAvatar skinTone={skinTone} suitColor={suitColor} eyeShape={item.id} size={72} animated={false} />
              </AvatarOptionCard>
            ))}
          </View>
        )}

        {/* ── HAT TAB ── */}
        {activeTab === 'hat' && (
          <View style={styles.optionGrid}>
            {hats.map((item) => (
              <AvatarOptionCard
                key={item.id}
                label={item.label}
                selected={hat === item.id}
                onPress={() => select<HumanHatId>(setHat)(item.id)}
                isNone={item.id === 'none'}
              >
                <HumanAvatar skinTone={skinTone} suitColor={suitColor} hat={item.id} size={72} animated={false} />
              </AvatarOptionCard>
            ))}
          </View>
        )}

        {/* ── GLASSES TAB ── */}
        {activeTab === 'glasses' && (
          <View style={styles.optionGrid}>
            {GLASSES.map((item) => (
              <AvatarOptionCard
                key={item.id}
                label={item.label}
                selected={glasses === item.id}
                onPress={() => select<HumanGlassesId>(setGlasses)(item.id)}
                isNone={item.id === 'none'}
              >
                <HumanAvatar skinTone={skinTone} suitColor={suitColor} glasses={item.id} size={72} animated={false} />
              </AvatarOptionCard>
            ))}
          </View>
        )}

        {/* ── EXTRAS TAB ── */}
        {activeTab === 'extras' && (
          <View style={styles.optionGrid}>
            {EXTRAS.map((item) => (
              <AvatarOptionCard
                key={item.id}
                label={item.label}
                selected={extra === item.id}
                onPress={() => select<HumanExtraId>(setExtra)(item.id)}
                isNone={item.id === 'none'}
              >
                <HumanAvatar skinTone={skinTone} suitColor={suitColor} extra={item.id} size={72} animated={false} />
              </AvatarOptionCard>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TraitChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function AvatarOptionCard({
  label, selected, onPress, isNone, children,
}: {
  label: string; selected: boolean; onPress: () => void;
  isNone?: boolean; children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected  && styles.optionCardSelected,
        pressed   && styles.optionCardPressed,
      ]}
    >
      {isNone ? (
        <View style={styles.noneSlot}>
          <Text style={styles.noneIcon}>✕</Text>
        </View>
      ) : (
        <View style={styles.optionPreview}>{children}</View>
      )}
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
        {label}
      </Text>
      {selected && <View style={styles.selectedDot} />}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    backgroundColor: colors.background,
  },
  cancelText: { fontSize: 15, fontWeight: '500', color: colors.textMuted, minWidth: 56 },
  topTitle:   { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 8, minWidth: 56, alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

  previewArea: { backgroundColor: colors.text, alignItems: 'center', paddingTop: 24, paddingBottom: 18 },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
    marginTop: 10, minHeight: 28, paddingHorizontal: 20,
  },
  chip: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 },

  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    paddingHorizontal: 16, gap: 4,
  },
  tab:         { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:   { borderBottomColor: colors.primary },
  tabText:     { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },

  panel:        { flex: 1, backgroundColor: colors.background },
  panelContent: { paddingHorizontal: 20, paddingTop: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
    color: colors.textMuted, marginBottom: 12, marginTop: 4,
  },

  // Skin swatches
  swatchRow:    { flexDirection: 'row', gap: 12, marginBottom: 24 },
  skinSwatch: {
    width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  swatchCheck: { width: 10, height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.8)' },

  // Suit color grid
  suitColorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  suitColorCard: {
    width: '30.5%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8,
    position: 'relative',
  },
  suitColorCardSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceSoft },
  suitSwatch:   { width: 36, height: 36, borderRadius: 999, marginBottom: 6 },
  suitColorLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  suitColorLabelActive: { color: colors.primary },

  // Option cards grid (hats / glasses / extras)
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  optionCard: {
    width: '30.5%', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4,
    position: 'relative',
  },
  optionCardSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceSoft },
  optionCardPressed:  { opacity: 0.85, transform: [{ scale: 0.97 }] },
  optionPreview:      { overflow: 'hidden', marginBottom: 2 },
  noneSlot:   { width: 72, height: 86.4, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  noneIcon:   { fontSize: 20, color: colors.border, fontWeight: '300' },
  optionLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  optionLabelSelected: { color: colors.primary },
  selectedDot: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
    borderRadius: 999, backgroundColor: colors.primary,
  },
});
