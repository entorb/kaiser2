// Design tokens for the medieval UI: dark wood/leather surround, parchment
// panels, gold accents and dark ink text. Colors are numeric so they can be
// used directly with Phaser Graphics; use `css()` for Text styles.

export const COLORS = {
  /** Dark walnut surround behind the parchment panels. */
  bg: 0x24_18_10,
  /** Parchment panel fill. */
  surface: 0xf3_e6_c8,
  /** Aged parchment: recessed fields, tracks, alternate rows. */
  surfaceAlt: 0xe4_d3_ad,
  hover: 0xd9_c6_9c,
  /** Dark wood / ink outline. */
  border: 0x6b_4a_2b,
  /** Dark ink text on parchment. */
  text: 0x2c_1e_10,
  /** Faded sepia for secondary labels. */
  muted: 0x7b_62_45,
  /** Heraldic gold. */
  accent: 0xc0_8a_1e,
  accentHover: 0xd8_a6_3a,
  accentText: 0x2a_1a_06,
  /** Forest green. */
  success: 0x3d_7a_34,
  /** Heraldic red. */
  danger: 0x9c_2b_24,
  /** Heraldic blue. */
  info: 0x2e_5a_86,
  /** Leather/wood accents for chrome (darker than `border`). */
  wood: 0x4a_32_18,
  woodDark: 0x2f_1f_0f,
  /** Text drawn directly on the dark wood backdrop (not on a panel). */
  onWood: 0xe6_d6_ae,
  /** Plowed land on the Land map, legend and Ranking icon. */
  acre: 0xd8_b1_3a,
  /** Building land (stone) on the Land map, legend and Ranking icon. */
  building: 0x8d_8d_8d,
} as const

/** Slight bevel, not a modern pill. */
export const RADIUS = 3

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 20, xl: 32 } as const

/** Body/labels: an old-style serif. */
export const FONT_UI = '"EB Garamond", Georgia, "Times New Roman", serif'
/** Titles/buttons: Roman inscriptional capitals. */
export const FONT_DISPLAY = '"Cinzel", "EB Garamond", Georgia, serif'
/** Numbers and tables: the game monospace. */
export const FONT_MONO =
  '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/**
 * Font sizes in design units. The canvas is fitted to the window, so a phone
 * (about 390 css px high for the 576 design units) shows them at ~0.68: the
 * smallest size must stay at 18 to read as at least 12 css px.
 */
export const FS = {
  title: 34,
  heading: 24,
  body: 21,
  small: 18,
  mono: 22,
} as const

/** Numeric color → `#rrggbb` string for Phaser Text styles. */
export function css(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`
}
