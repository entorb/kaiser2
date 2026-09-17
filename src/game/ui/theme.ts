// Design tokens for the medieval UI: dark wood/leather surround, parchment
// panels, gold accents and dark ink text. Colors are numeric so they can be
// used directly with Phaser Graphics; use `css()` for Text styles.

export const COLORS = {
  /** Dark walnut surround behind the parchment panels. */
  bg: 0x241810,
  /** Parchment panel fill. */
  surface: 0xf3e6c8,
  /** Aged parchment: recessed fields, tracks, alternate rows. */
  surfaceAlt: 0xe4d3ad,
  hover: 0xd9c69c,
  /** Dark wood / ink outline. */
  border: 0x6b4a2b,
  /** Dark ink text on parchment. */
  text: 0x2c1e10,
  /** Faded sepia for secondary labels. */
  muted: 0x7b6245,
  /** Heraldic gold. */
  accent: 0xc08a1e,
  accentHover: 0xd8a63a,
  accentText: 0x2a1a06,
  /** Forest green. */
  success: 0x3d7a34,
  /** Heraldic red. */
  danger: 0x9c2b24,
  /** Heraldic blue. */
  info: 0x2e5a86,
  /** Leather/wood accents for chrome (darker than `border`). */
  wood: 0x4a3218,
  woodDark: 0x2f1f0f,
  /** Text drawn directly on the dark wood backdrop (not on a panel). */
  onWood: 0xe6d6ae,
} as const;

/** Slight bevel, not a modern pill. */
export const RADIUS = 3;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 20, xl: 32 } as const;

/** Body/labels: an old-style serif. */
export const FONT_UI = '"EB Garamond", Georgia, "Times New Roman", serif';
/** Titles/buttons: Roman inscriptional capitals. */
export const FONT_DISPLAY = '"Cinzel", "EB Garamond", Georgia, serif';
/** Numbers and tables: the game monospace. */
export const FONT_MONO =
  '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const FS = {
  title: 28,
  heading: 18,
  body: 15,
  small: 12,
  mono: 16,
} as const;

/** Numeric color → `#rrggbb` string for Phaser Text styles. */
export function css(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
