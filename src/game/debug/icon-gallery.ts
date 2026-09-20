import { type Game, type GameObjects, Scene } from "phaser";
import {
  drawAcreIcon,
  drawArrowIcon,
  drawBuildingIcon,
  drawCathedralIcon,
  drawCityIcon,
  drawCoinsIcon,
  drawCrowdIcon,
  drawDownloadIcon,
  drawEventIcon,
  drawExpandIcon,
  drawGearIcon,
  drawGrainIcon,
  drawKontorIcon,
  drawPalaceIcon,
  drawPointsIcon,
  drawShareIcon,
  drawShield,
  drawSoundOffIcon,
  drawSoundOnIcon,
  drawStockIcon,
  drawTradeIcon,
  drawWeatherIcon,
  EVENT_ICONS,
  ICON_COUNT,
} from "../ui/icon";
import { RENDER_SCALE } from "../ui/layout";
import { panelFrame } from "../ui/ornament";
import { label } from "../ui/text";
import { COLORS, FS } from "../ui/theme";
import { bootGallery } from "./gallery";

type DrawFn = (
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
) => void;

export interface IconSpec {
  /** Export name, shown as the card title. */
  name: string;
  /** Where it is used, shown under the card. */
  note: string;
  draw: DrawFn;
  /** Variant for the wood swatch, when the default ink would vanish there. */
  drawOnWood?: DrawFn;
}

export interface IconSection {
  title: string;
  icons: IconSpec[];
}

const WEATHER_LEVELS = 10;

export const ICON_SECTIONS: IconSection[] = [
  {
    title: "Units",
    icons: [
      {
        name: "drawPointsIcon",
        note: "score unit: status bar, Ranking",
        draw: drawPointsIcon,
      },
      {
        name: "drawCrowdIcon",
        note: "population: status bar, Chronicle, Ranking",
        draw: drawCrowdIcon,
        drawOnWood: (g, x, y, s) =>
          drawCrowdIcon(g, x, y, s, {
            bg: COLORS.woodDark,
            ink: COLORS.onWood,
          }),
      },
      {
        name: "drawCoinsIcon",
        note: "money unit: status bar, StatRow, slider cost, Ranking, Chronicle",
        draw: drawCoinsIcon,
      },
      {
        name: "drawTradeIcon +",
        note: "Slider maxIcon",
        draw: (g, x, y, s) => drawTradeIcon(g, x, y, s, 1),
      },
      {
        name: "drawTradeIcon −",
        note: "Slider minIcon",
        draw: (g, x, y, s) => drawTradeIcon(g, x, y, s, -1),
      },
    ],
  },
  {
    title: "Grain and land",
    icons: [
      {
        name: "drawGrainIcon",
        note: "grain unit, Grain StatRows",
        draw: drawGrainIcon,
      },
      { name: "drawAcreIcon", note: "farmland, Ranking", draw: drawAcreIcon },
      {
        name: "drawBuildingIcon",
        note: "building land, Ranking",
        draw: drawBuildingIcon,
      },
      { name: "drawCityIcon", note: "cities, Ranking", draw: drawCityIcon },
    ],
  },
  {
    title: "Menu and buildings",
    icons: [
      {
        name: "drawArrowIcon",
        note: "Button icon: advance (replaces Weiter)",
        draw: drawArrowIcon,
      },
      {
        name: "drawGearIcon",
        note: "Button icon: pause menu",
        draw: drawGearIcon,
      },
      {
        name: "drawSoundOnIcon",
        note: "Button icon: music on (Menu, pause menu)",
        draw: drawSoundOnIcon,
      },
      {
        name: "drawSoundOffIcon",
        note: "Button icon: music off",
        draw: drawSoundOffIcon,
      },
      {
        name: "drawShareIcon",
        note: "Button icon: Menu share",
        draw: drawShareIcon,
      },
      {
        name: "drawDownloadIcon",
        note: "Button icon: Menu install",
        draw: drawDownloadIcon,
      },
      {
        name: "drawExpandIcon",
        note: "Button icon: fullscreen",
        draw: drawExpandIcon,
      },
      {
        name: "drawStockIcon",
        note: "Table cell icon: partner stock (TradePartner)",
        draw: drawStockIcon,
      },
      {
        name: "drawKontorIcon",
        note: "Row icon: trading house (TradingHouse, SecretService)",
        draw: drawKontorIcon,
      },
      {
        name: "drawPalaceIcon",
        note: "ListMenu icon: Business",
        draw: drawPalaceIcon,
      },
      {
        name: "drawCathedralIcon",
        note: "ListMenu icon: Business",
        draw: drawCathedralIcon,
      },
    ],
  },
  {
    title: "Chronicle events",
    icons: EVENT_ICONS.map((kind) => ({
      name: `event.${kind}`,
      note: "Chronicle row",
      draw: (g, x, y, s) => drawEventIcon(g, x, y, s, kind),
    })),
  },
  {
    title: "Weather",
    icons: Array.from({ length: WEATHER_LEVELS }, (_, i) => ({
      name: `weather.${i + 1}`,
      note: "Grain panel, wetter level",
      draw: (g, x, y, s) => drawWeatherIcon(g, x, y, s, i + 1),
    })),
  },
  {
    title: "Ruler shields",
    icons: Array.from({ length: ICON_COUNT }, (_, i) => ({
      name: `shield.${i}`,
      note: "Status bar, NewGame",
      draw: (g, x, y, s) => drawShield(g, x, y, s, i),
    })),
  },
];

const PER_ROW = 5;
const CARD_W = 180;
const CARD_H = 132;
const TILE_H = 76;
const GAP = 16;
const PAD = 24;
const SECTION_H = 44;
const SIZES = [44, 24, 16, 12];
const SWATCH = 32;

const WIDTH = PAD * 2 + PER_ROW * CARD_W + (PER_ROW - 1) * GAP;

function rows(section: IconSection): number {
  return Math.ceil(section.icons.length / PER_ROW);
}

function galleryHeight(): number {
  return ICON_SECTIONS.reduce(
    (h, s) => h + SECTION_H + rows(s) * (CARD_H + GAP),
    PAD * 2,
  );
}

class IconGallery extends Scene {
  constructor() {
    super("IconGallery");
  }

  create(): void {
    // Same RENDER_SCALE trick as GameScene: design units in, crisp canvas out.
    const camera = this.cameras.main;
    camera.setZoom(RENDER_SCALE);
    camera.centerOn(WIDTH / 2, galleryHeight() / 2);
    const g = this.add.graphics();
    let y = PAD;
    for (const section of ICON_SECTIONS) {
      label(this, PAD, y, section.title, {
        size: FS.heading,
        weight: "bold",
        display: true,
        color: COLORS.accent,
      });
      y += SECTION_H;
      section.icons.forEach((spec, i) => {
        const x = PAD + (i % PER_ROW) * (CARD_W + GAP);
        this.card(g, spec, x, y + Math.floor(i / PER_ROW) * (CARD_H + GAP));
      });
      y += rows(section) * (CARD_H + GAP);
    }
  }

  private card(
    g: GameObjects.Graphics,
    spec: IconSpec,
    x: number,
    y: number,
  ): void {
    panelFrame(g, x, y, CARD_W, TILE_H);
    const cy = y + TILE_H / 2;
    let cx = x + 10;
    for (const size of SIZES) {
      spec.draw(g, cx + size / 2, cy, size);
      cx += size + 8;
    }
    const swatchX = x + CARD_W - 12 - SWATCH;
    g.fillStyle(COLORS.woodDark, 1);
    g.fillRect(swatchX, cy - SWATCH / 2, SWATCH, SWATCH);
    (spec.drawOnWood ?? spec.draw)(g, swatchX + SWATCH / 2, cy, 24);
    label(this, x, y + TILE_H + 6, spec.name, {
      size: FS.small,
      weight: "bold",
      color: COLORS.accent,
    });
    label(this, x, y + TILE_H + 22, spec.note, {
      size: FS.small,
      color: COLORS.muted,
      wrap: CARD_W,
    });
  }
}

/** Boot the gallery into `parent`. */
export function startGallery(parent: string): Promise<Game> {
  return bootGallery(parent, WIDTH, galleryHeight(), IconGallery);
}
