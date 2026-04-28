export const colors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  background:      '#F7F4EF',   // warm paper — root app background
  panel:           '#EDEAE3',   // slightly deeper warm surface — grouped rows, sections
  surface:         '#FFFFFF',   // true white — cards, sheets, modals
  surfaceSoft:     '#F2EFE9',   // warm light wash — inputs, inactive chips
  surfaceElevated: '#FFFFFF',   // elevated modal / sheet surface

  // ── Text ────────────────────────────────────────────────────────────────────
  text:          '#1A1714',     // warm near-black — primary text on light surfaces
  textMuted:     '#6E6860',     // warm gray — secondary / label text
  textTertiary:  '#A09990',     // warm light gray — placeholder, hint, caption
  // "textInverse" means "the primary readable text for the current bg" so screens
  // that used it for text-on-dark now get dark text on the paper background.
  textInverse:   '#1A1714',

  // ── Borders ─────────────────────────────────────────────────────────────────
  border: '#DDD9D2',            // warm hairline border / divider

  // ── Brand ───────────────────────────────────────────────────────────────────
  primary:        '#00B48A',    // mint — slightly deeper for legibility on light bg
  primaryPressed: '#009E78',

  // ── Ink — dark premium accents (tab bar pill, dark CTA hero moments) ─────────
  ink:       '#1C1915',         // warm near-black pill / hero card bg
  inkPanel:  '#252119',         // secondary dark surface
  inkBorder: '#302C25',         // dark separator / pill border

  // ── Budget categories ───────────────────────────────────────────────────────
  must:     '#2A7A52',          // forest green
  want:     '#C07828',          // warm amber
  keep:     '#3A6AA6',          // slate blue

  mustSoft:  '#ECF6F0',         // light mint wash — active chip, meter fill
  wantSoft:  '#FAF1E4',         // light amber wash
  keepSoft:  '#E9EFF8',         // light blue wash

  // ── Status ──────────────────────────────────────────────────────────────────
  danger:     '#D44F38',
  dangerSoft: '#FDEEE9',

  // ── Misc ────────────────────────────────────────────────────────────────────
  buttonDisabled: '#D5D1CB',    // warm mid-gray for disabled fill
  switchTrackOn:  '#009E78',
  white: '#FFFFFF',

  // ── League accent — used ONLY for the league name on Profile.
  gold: '#E5C07B',
};
