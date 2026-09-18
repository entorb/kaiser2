import { type GameObjects, Math as PhaserMath } from "phaser";
import { playFanfare } from "../audio/music";
import { toHighscore } from "../flow";
import { t } from "../i18n/i18n";
import { FocusGroup } from "../ui/focus";
import { CANVAS_H, CANVAS_W, MARGIN } from "../ui/layout";
import { panelFrame } from "../ui/ornament";
import { label } from "../ui/text";
import { COLORS } from "../ui/theme";
import { GameScene } from "./base";
import { continueAction } from "./common";

interface CoronationData {
  name: string;
}

// The throne room is drawn in the coordinates of the C64 screenshot it is
// modelled on (718x470) inside one container that is scaled to fit a framed
// panel, using the UI's own parchment / walnut / gold / heraldic palette.
const W = 718;
const H = 470;
const PAD = 12;
const GOLD = COLORS.accent;
const GOLD_HI = COLORS.accentHover;
const PARCH = COLORS.surface;
const STONE = COLORS.surfaceAlt;
const WOOD = COLORS.wood;
const WOOD_DK = COLORS.woodDark;
const RED = COLORS.danger;
const BLUE = COLORS.info;
const WALL_TOP = 0x3b1a17;
const WALL_BOTTOM = 0x63302a;
const VELVET = 0x6f1f1b;
const SHADOW = 0x120b06;
const SKIN = 0xe2b48c;
const HAIR = 0x3a2410;
const GLASS = 0x6c9bc8;
const FLASH = 0xfff0b0;

const CROWN_X = 352;
const CROWN_START_Y = 100;
/** Resting height: the crown band sits on the ruler's hair. */
const CROWN_END_Y = 198;
const DESCENT_MS = 8000;
const FLOOR_Y = 418;
const BANNER_MID_Y = 35;

/** Deterministic pseudo-random in [0,1), so the art needs no RNG. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const vectors = (points: number[][]) =>
  points.map(([x, y]) => new PhaserMath.Vector2(x, y));

export function poly(
  g: GameObjects.Graphics,
  points: number[][],
  fill: number,
) {
  g.fillStyle(fill, 1);
  g.fillPoints(vectors(points), true);
}

/** Fluted stone column with a gold-trimmed capital and base. */
function pillar(g: GameObjects.Graphics, x: number, top: number) {
  const h = FLOOR_Y - top;
  g.fillStyle(STONE, 1);
  g.fillRect(x, top + 8, 36, h - 8);
  g.fillStyle(0xc9b78a, 1);
  g.fillRect(x + 25, top + 8, 11, h - 8);
  g.lineStyle(1, COLORS.border, 0.5);
  for (const dx of [8, 17, 25])
    g.lineBetween(x + dx, top + 10, x + dx, FLOOR_Y - 8);
  for (const y of [top, FLOOR_Y - 9]) {
    g.fillStyle(PARCH, 1);
    g.fillRect(x - 6, y, 48, 9);
    g.fillStyle(GOLD, 1);
    g.fillRect(x - 6, y + (y === top ? 7 : 0), 48, 2);
  }
}

/** Hall: wall, banner, curtain, brackets, pillars, window, throne. */
function drawHall(g: GameObjects.Graphics) {
  g.fillGradientStyle(WALL_TOP, WALL_TOP, WALL_BOTTOM, WALL_BOTTOM, 1);
  g.fillRect(0, 0, W, H);

  // Stone courses with staggered joints.
  for (let row = 0; row * 38 + 72 < 380; row++) {
    const y = row * 38 + 72;
    g.lineStyle(2, 0x000000, 0.16);
    g.lineBetween(0, y, W, y);
    for (let j = 0; j < 6; j++) {
      const x = hash(row * 11 + j) * W;
      g.lineBetween(x, y, x, y + 38);
    }
  }

  // Parchment banner (filled in by the proclamation) above a wood rail.
  panelFrame(g, 8, 8, W - 16, 54);
  g.fillStyle(WOOD_DK, 1);
  g.fillRect(0, 66, W, 8);
  g.fillStyle(GOLD, 1);
  g.fillRect(0, 72, W, 2);

  // Carved wooden brackets, gold-edged, reaching in from both sides.
  for (const m of [1, -1]) {
    const x = (v: number) => (m === 1 ? v : W - v);
    const bracket = [
      [x(0), 82],
      [x(150), 82],
      [x(112), 100],
      [x(70), 116],
      [x(0), 122],
    ];
    poly(g, bracket, WOOD);
    g.lineStyle(2, GOLD, 1);
    g.strokePoints(vectors(bracket.slice(1, 4)), false);
  }

  // Curtain: velvet drape with light and dark folds.
  poly(
    g,
    [
      [96, 84],
      [274, 84],
      [190, 246],
      [136, 348],
      [88, 348],
    ],
    VELVET,
  );
  poly(
    g,
    [
      [150, 84],
      [200, 84],
      [136, 300],
      [112, 300],
    ],
    RED,
  );
  g.lineStyle(3, WOOD_DK, 0.7);
  for (const [x0, y0, x1, y1] of [
    [268, 86, 176, 240],
    [236, 86, 140, 310],
    [206, 86, 124, 340],
    [172, 86, 110, 330],
    [124, 88, 96, 340],
  ] as const) {
    g.lineBetween(x0, y0, x1, y1);
  }

  for (const x of [52, 122]) pillar(g, x, x === 52 ? 222 : 236);
  for (const x of [560, 630]) pillar(g, x, x === 560 ? 235 : 222);

  // Gothic window with a soft shaft of daylight.
  const arch = (inset: number) => [
    [462 + inset, 258 - inset],
    [462 + inset, 180 + inset * 0.6],
    [492, 122 + inset * 1.8],
    [522 - inset, 180 + inset * 0.6],
    [522 - inset, 258 - inset],
  ];
  poly(g, arch(0), GOLD);
  poly(g, arch(4), WOOD_DK);
  poly(g, arch(7), GLASS);
  g.fillStyle(BLUE, 1);
  g.fillRect(470, 200, 44, 54);
  g.fillStyle(WOOD_DK, 1);
  g.fillRect(490, 134, 4, 120);
  for (const y of [186, 210, 232]) g.fillRect(468, y, 48, 3);
  g.fillStyle(FLASH, 0.07);
  g.fillPoints(
    vectors([
      [468, 254],
      [516, 254],
      [470, 400],
      [372, 400],
    ]),
    true,
  );

  // Throne: gold posts and arch, velvet back, wooden armrests.
  g.fillStyle(VELVET, 1);
  g.fillRect(296, 218, 114, FLOOR_Y - 218);
  g.lineStyle(2, GOLD, 1);
  g.strokeRect(300, 224, 106, FLOOR_Y - 232);
  g.fillStyle(GOLD, 1);
  g.fillRect(280, 168, 16, FLOOR_Y - 168);
  g.fillRect(410, 168, 16, FLOOR_Y - 168);
  g.fillStyle(GOLD_HI, 1);
  g.fillRect(282, 168, 4, FLOOR_Y - 168);
  g.fillRect(412, 168, 4, FLOOR_Y - 168);
  g.lineStyle(6, GOLD, 1);
  g.beginPath();
  g.moveTo(296, 218);
  for (let i = 1; i <= 16; i++) {
    const u = i / 16;
    g.lineTo(296 + 114 * u, 218 - 46 * Math.sin(Math.PI * u) + 2 * u);
  }
  g.strokePath();
  g.fillStyle(GOLD_HI, 1);
  for (const x of [288, 418]) g.fillCircle(x, 168, 10);
  for (const x of [265, 410]) {
    g.fillStyle(WOOD, 1);
    g.fillRect(x, 312, 35, FLOOR_Y - 312);
    g.lineStyle(2, GOLD, 1);
    g.strokeRect(x + 1, 313, 33, FLOOR_Y - 314);
  }
  g.fillStyle(GOLD, 1);
  g.fillRect(262, FLOOR_Y - 8, 186, 8);

  // Floor line behind the crowd.
  g.fillStyle(WOOD_DK, 1);
  g.fillRect(0, 380, W, 4);
  g.fillStyle(GOLD, 0.6);
  g.fillRect(0, 384, W, 1);
}

/** The seated ruler in heraldic red and ermine; the crown comes later. */
function drawRuler(g: GameObjects.Graphics) {
  const robe = [
    [318, 262],
    [388, 262],
    [412, 405],
    [294, 405],
  ];
  poly(g, robe, RED);
  g.lineStyle(3, WOOD_DK, 1);
  g.strokePoints(vectors(robe), true);
  g.lineStyle(3, GOLD_HI, 1);
  g.lineBetween(298, 392, 408, 392);
  g.lineStyle(2, WOOD_DK, 0.6);
  g.lineBetween(352, 300, 352, 390);

  // Hair, face, ermine collar.
  poly(
    g,
    [
      [330, 206],
      [374, 206],
      [386, 282],
      [318, 282],
    ],
    HAIR,
  );
  g.fillStyle(SKIN, 1);
  g.fillEllipse(352, 230, 34, 46);
  g.fillStyle(HAIR, 1);
  g.fillEllipse(352, 212, 40, 16);
  g.fillStyle(WOOD_DK, 1);
  g.fillRect(343, 227, 4, 3);
  g.fillRect(358, 227, 4, 3);
  g.fillRect(347, 242, 10, 2);
  for (const m of [1, -1]) {
    const x = (v: number) => 352 + m * v;
    poly(
      g,
      [
        [x(40), 252],
        [x(22), 250],
        [x(4), 292],
        [x(14), 298],
        [x(36), 276],
      ],
      PARCH,
    );
    g.fillStyle(WOOD_DK, 1);
    for (const [dx, dy] of [
      [26, 262],
      [16, 274],
      [10, 286],
      [32, 268],
    ] as const) {
      g.fillRect(x(dx) - 1, dy, 3, 5);
    }
  }
  g.lineStyle(3, GOLD_HI, 1);
  g.strokePoints(
    vectors([
      [336, 284],
      [344, 300],
      [352, 306],
      [360, 300],
      [368, 284],
    ]),
    false,
  );

  // Orb with cross, and a sword across the lap.
  g.lineStyle(5, 0xcfd3d8, 1);
  g.lineBetween(322, 334, 398, 324);
  g.lineStyle(4, GOLD_HI, 1);
  g.lineBetween(322, 327, 322, 341);
  g.fillStyle(GOLD_HI, 1);
  g.fillCircle(372, 316, 7);
  g.fillRect(370, 292, 4, 20);
  g.fillRect(364, 298, 16, 4);

  g.fillStyle(WOOD_DK, 1);
  g.fillEllipse(333, 410, 24, 9);
  g.fillEllipse(378, 410, 24, 9);
}

/** Kneeling crowd, spears and banners as dark silhouettes with gold tips. */
function drawCrowd(g: GameObjects.Graphics) {
  g.fillStyle(SHADOW, 1);
  g.fillRect(0, 404, W, H - 404);
  for (let i = 0; i < 25; i++) {
    g.fillCircle(i * 27 + 20, 408, 12 + hash(i) * 8);
  }
  g.fillEllipse(30, 350, 22, 30);
  g.fillRect(28, 350, 4, 60);
  g.fillRect(184, 330, 4, 80);
  g.fillRect(226, 320, 4, 90);
  g.fillRect(538, 340, 5, 70);
  poly(
    g,
    [
      [186, 312],
      [200, 336],
      [172, 336],
    ],
    SHADOW,
  );
  poly(
    g,
    [
      [228, 280],
      [242, 322],
      [214, 322],
    ],
    SHADOW,
  );
  poly(
    g,
    [
      [540, 282],
      [566, 300],
      [556, 342],
      [520, 346],
      [534, 318],
    ],
    SHADOW,
  );
  g.lineStyle(4, SHADOW, 1);
  g.lineBetween(692, 336, 660, 410);
  g.fillStyle(GOLD, 1);
  g.fillTriangle(186, 312, 190, 322, 182, 322);
  g.fillTriangle(228, 280, 232, 292, 224, 292);
}

/** A small candle flame, origin at its foot. */
function drawFlame(g: GameObjects.Graphics) {
  g.fillStyle(GOLD_HI, 1);
  g.fillTriangle(-5, 0, 5, 0, 0, -20);
  g.fillCircle(0, -4, 5);
  g.fillStyle(PARCH, 1);
  g.fillTriangle(-2, 0, 2, 0, 0, -9);
}

/** Gold crown with red jewels and pearls. */
function drawCrown(g: GameObjects.Graphics) {
  g.fillStyle(GOLD_HI, 1);
  g.fillRect(-22, 4, 44, 10);
  for (const x of [-16, 0, 16]) {
    const tip = x === 0 ? -18 : -14;
    g.fillTriangle(x - 7, 4, x + 7, 4, x, tip);
  }
  g.fillRect(-2, -34, 4, 12);
  g.fillRect(-6, -30, 12, 4);
  g.fillStyle(GOLD, 1);
  g.fillRect(-22, 11, 44, 3);
  g.fillStyle(PARCH, 1);
  for (const x of [-16, 0, 16]) g.fillCircle(x, (x === 0 ? -18 : -14) - 2, 3);
  g.fillStyle(RED, 1);
  for (const x of [-14, -2, 10]) g.fillRect(x, 6, 4, 4);
}

/** Two dotted wings of golden sparks, spread `flap` (0..1) upward. */
function drawWings(g: GameObjects.Graphics, time: number, flap: number) {
  g.clear();
  for (const m of [1, -1]) {
    for (let i = 0; i < 9; i++) {
      const rows = 4 - Math.floor(i / 3);
      for (let r = 0; r < rows; r++) {
        if (hash(i * 7 + r * 3 + Math.floor(time / 110) * m) < 0.25) continue;
        g.fillStyle((i + r) % 2 ? GOLD_HI : PARCH, 1);
        const x = m * (30 + i * 6);
        const y = 4 + r * 6 - i * (1.2 + 2.6 * flap);
        g.fillRect(x - 1, y - 1, 3, 3);
      }
    }
  }
}

/** Darkening toward the picture edges, like the wood backdrop's vignette. */
function drawVignette(g: GameObjects.Graphics) {
  for (let i = 0; i < 8; i++) {
    g.lineStyle(8, 0x000000, 0.06);
    g.strokeRect(i * 8, i * 8, W - i * 16, H - i * 16);
  }
  g.lineStyle(4, WOOD_DK, 1);
  g.strokeRect(0, 0, W, H);
}

/**
 * Coronation: shown once, when a ruler reaches Kaiser (KAISER6 PROC KROENUNG).
 * A winged crown drifts slowly down onto the enthroned ruler, then the
 * proclamation appears in the banner.
 */
export class Coronation extends GameScene {
  private wings?: GameObjects.Graphics;
  private crown?: GameObjects.Container;
  private crownFlying = true;

  constructor() {
    super("Coronation");
  }

  create(data: CoronationData) {
    this.crownFlying = true;
    const group = new FocusGroup(this);
    continueAction(this, group, () => toHighscore(this.scene));

    // Picture in a parchment panel, like every other screen's content.
    const scale = (CANVAS_H - 2 * MARGIN - 72 - PAD * 2) / H;
    const panelW = W * scale + PAD * 2;
    const panelX = (CANVAS_W - panelW) / 2;
    panelFrame(
      this.add.graphics(),
      panelX,
      MARGIN,
      panelW,
      H * scale + PAD * 2,
    );
    const pic = this.add.container(panelX + PAD, MARGIN + PAD).setScale(scale);

    const hall = this.add.graphics();
    drawHall(hall);
    pic.add(hall);

    const crowd = this.add.container(0, 0);
    const crowdArt = this.add.graphics();
    drawCrowd(crowdArt);
    crowd.add(crowdArt);
    const ruler = this.add.graphics();
    drawRuler(ruler);
    pic.add(crowd);
    pic.add(ruler);
    this.tweens.add({
      targets: crowd,
      y: 3,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    for (const [x, y, ms] of [
      [288, 158, 170],
      [418, 158, 210],
      [352, 176, 190],
    ] as const) {
      const flame = this.add.graphics({ x, y });
      drawFlame(flame);
      pic.add(flame);
      this.tweens.add({
        targets: flame,
        scaleY: 1.3,
        scaleX: 0.85,
        duration: ms,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    const banner = label(
      this,
      W / 2,
      BANNER_MID_Y,
      t("coronation.text", { name: data.name }),
      {
        size: 26,
        weight: "bold",
        display: true,
        color: COLORS.text,
        origin: 0.5,
      },
    );
    banner.setAlpha(0);
    banner.setScale(Math.min(1, (W - 48) / banner.width));
    pic.add(banner);

    this.wings = this.add.graphics();
    const crownArt = this.add.graphics();
    drawCrown(crownArt);
    this.crown = this.add.container(CROWN_X, CROWN_START_Y, [
      this.wings,
      crownArt,
    ]);
    pic.add(this.crown);

    const vignette = this.add.graphics();
    drawVignette(vignette);
    pic.add(vignette);

    const flash = this.add.rectangle(W / 2, H / 2, W, H, FLASH, 0);
    pic.add(flash);

    this.tweens.add({
      targets: this.crown,
      y: CROWN_END_Y,
      duration: DESCENT_MS,
      ease: "Sine.inOut",
      onComplete: () => this.land(pic, banner, flash),
    });
    this.tweens.add({
      targets: this.crown,
      x: CROWN_X + 6,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => this.trail(pic),
    });
  }

  update(time: number) {
    if (!this.wings || !this.crownFlying) return;
    drawWings(this.wings, time, 0.5 + 0.5 * Math.sin(time / 130));
  }

  /** A short-lived golden speck falling away behind the crown. */
  private trail(pic: GameObjects.Container) {
    if (!this.crown || !this.crownFlying) return;
    const seed = this.time.now;
    const x = this.crown.x + (hash(seed) - 0.5) * 70;
    const y = this.crown.y + 6 + hash(seed + 1) * 16;
    const dot = this.add.rectangle(x, y, 3, 3, GOLD_HI);
    pic.add(dot);
    this.tweens.add({
      targets: dot,
      y: y + 34,
      alpha: 0,
      duration: 900,
      onComplete: () => dot.destroy(),
    });
  }

  /** Crown rests on the head: flash, spark burst, fanfare, proclamation. */
  private land(
    pic: GameObjects.Container,
    banner: GameObjects.Text,
    flash: GameObjects.Rectangle,
  ) {
    this.crownFlying = false;
    this.wings?.destroy();
    this.wings = undefined;
    playFanfare();

    flash.setAlpha(0.55);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700 });
    this.tweens.add({ targets: banner, alpha: 1, duration: 900, delay: 400 });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const reach = 50 + hash(i) * 40;
      const dot = this.add.rectangle(
        CROWN_X,
        CROWN_END_Y - 6,
        4,
        4,
        i % 2 ? GOLD_HI : PARCH,
      );
      pic.add(dot);
      this.tweens.add({
        targets: dot,
        x: CROWN_X + Math.cos(angle) * reach,
        y: CROWN_END_Y - 6 + Math.sin(angle) * reach * 0.8,
        alpha: 0,
        duration: 1100,
        ease: "Cubic.out",
        onComplete: () => dot.destroy(),
      });
    }
  }
}
