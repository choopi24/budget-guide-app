import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type {
  SkinToneId,
  HairStyleId,
  HairColorId,
  SuitColorId,
  HumanHatId,
  HumanGlassesId,
  HumanExtraId,
  EyeShapeId,
} from '../components/HumanAvatar';

export type {
  SkinToneId,
  HairStyleId,
  HairColorId,
  SuitColorId,
  HumanHatId,
  HumanGlassesId,
  HumanExtraId,
  EyeShapeId,
};

export type AvatarConfig = {
  skinTone:  SkinToneId;
  hairStyle: HairStyleId;
  hairColor: HairColorId;
  suitColor: SuitColorId;
  hat:       HumanHatId;
  glasses:   HumanGlassesId;
  extra:     HumanExtraId;
  eyeShape:  EyeShapeId;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skinTone:  's2',
  hairStyle: 'clean',
  hairColor: 'dkbrown',
  suitColor: 'navy',
  hat:       'none',
  glasses:   'none',
  extra:     'none',
  eyeShape:  'default',
};

export function useAvatarDb() {
  const db = useSQLiteContext();

  const getAvatarConfig = useCallback(async (): Promise<AvatarConfig> => {
    const row = await db.getFirstAsync<{
      skin_tone:  string;
      hair_style: string;
      hair_color: string;
      suit_color: string;
      hat:        string;
      glasses:    string;
      extra:      string;
      eye_shape:  string;
    }>(`SELECT skin_tone, hair_style, hair_color, suit_color, hat, glasses, extra, eye_shape
        FROM avatar_config WHERE id = 1`);

    if (!row) return DEFAULT_AVATAR;

    const VALID_SKIN_TONES:  readonly string[] = ['s1','s2','s3','s4','s5'];
    const VALID_HAIR_STYLES: readonly string[] = ['clean','sidepart','waves','bun','curly'];
    const VALID_HAIR_COLORS: readonly string[] = ['black','dkbrown','brown','auburn','blonde','gray'];
    const VALID_SUIT_COLORS: readonly string[] = ['navy','red','blue','green','white','brown','grey'];
    const VALID_HATS:        readonly string[] = ['none','cap','beret','beanie','fedora','toque','gmcap'];
    const VALID_GLASSES:     readonly string[] = ['none','round','rect','halfrim','shades'];
    const VALID_EXTRAS:      readonly string[] = ['none','pin','earring','chain'];
    const VALID_EYE_SHAPES:  readonly string[] = ['default','happy','mad','serious','silly','wink'];

    return {
      skinTone:  (VALID_SKIN_TONES.includes(row.skin_tone)   ? row.skin_tone  : 's2')        as SkinToneId,
      hairStyle: (VALID_HAIR_STYLES.includes(row.hair_style) ? row.hair_style : 'clean')     as HairStyleId,
      hairColor: (VALID_HAIR_COLORS.includes(row.hair_color) ? row.hair_color : 'dkbrown')   as HairColorId,
      suitColor: (VALID_SUIT_COLORS.includes(row.suit_color) ? row.suit_color : 'navy')      as SuitColorId,
      hat:       (VALID_HATS.includes(row.hat)               ? row.hat        : 'none')       as HumanHatId,
      glasses:   (VALID_GLASSES.includes(row.glasses)        ? row.glasses    : 'none')       as HumanGlassesId,
      extra:     (VALID_EXTRAS.includes(row.extra)           ? row.extra      : 'none')       as HumanExtraId,
      eyeShape:  (VALID_EYE_SHAPES.includes(row.eye_shape)   ? row.eye_shape  : 'default')   as EyeShapeId,
    };
  }, [db]);

  const saveAvatarConfig = useCallback(async (cfg: AvatarConfig): Promise<void> => {
    await db.runAsync(
      `INSERT INTO avatar_config (id, skin_tone, hair_style, hair_color, suit_color, hat, glasses, extra, eye_shape)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         skin_tone  = excluded.skin_tone,
         hair_style = excluded.hair_style,
         hair_color = excluded.hair_color,
         suit_color = excluded.suit_color,
         hat        = excluded.hat,
         glasses    = excluded.glasses,
         extra      = excluded.extra,
         eye_shape  = excluded.eye_shape`,
      cfg.skinTone, cfg.hairStyle, cfg.hairColor, cfg.suitColor, cfg.hat, cfg.glasses, cfg.extra, cfg.eyeShape
    );
  }, [db]);

  return { getAvatarConfig, saveAvatarConfig };
}
