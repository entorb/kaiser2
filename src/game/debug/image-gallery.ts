import { type Game, type GameObjects, Scene } from "phaser";
import { TITLES } from "../model/constants";
import { drawCathedral, drawPalace } from "../scenes/Monument";
import { RENDER_SCALE } from "../ui/layout";
import { panelFrame } from "../ui/ornament";
import { drawPromotionArt } from "../ui/ruler";
import { label } from "../ui/text";
import { COLORS, FS } from "../ui/theme";
import { bootGallery } from "./gallery";

interface ImageSpec {
  /** Card title. */
  name: string;
  /** Where it is used, shown under the card. */
  note: string;
  /** Width and height of the picture in game design pixels. */
  w: number;
  h: number;
  draw: (g: GameObjects.Graphics) => void;
}

interface ImageSection {
  title: string;
  /** Pictures per row. */
  perRow: number;
  /** The pictures are drawn at this fraction of their game size. */
  scale: number;
  images: ImageSpec[];
}

/** Promotion panel of the game at 960x576: content is 900 wide, 326 high. */
const PROMOTION_H = 326;
const PROMOTION_W = 360;

export const IMAGE_SECTIONS: ImageSection[] = [
  {
    title: "Promotion",
    perRow: 4,
    scale: 0.6,
    images: Array.from({ length: 7 }, (_, i) => ({
      name: `${i + 1} ${TITLES[i + 1]}`,
      note: "Promotion, first time a human ruler reaches the title",
      w: PROMOTION_W,
      h: PROMOTION_H,
      draw: (g) =>
        drawPromotionArt(g, PROMOTION_W / 2, PROMOTION_H / 2, 155, i + 1, i),
    })),
  },
  {
    title: "Finished buildings",
    perRow: 2,
    scale: 0.7,
    images: [
      {
        name: "drawPalace",
        note: "Monument, last palace part bought",
        w: 718,
        h: 470,
        draw: drawPalace,
      },
      {
        name: "drawCathedral",
        note: "Monument, last cathedral part bought",
        w: 718,
        h: 470,
        draw: drawCathedral,
      },
    ],
  },
];

const GAP = 24;
const PAD = 24;
const SECTION_H = 44;
const CAPTION_H = 44;
const FRAME = 8;

function cell(section: ImageSection) {
  const [first] = section.images;
  return {
    w: (first?.w ?? 0) * section.scale + FRAME * 2,
    h: (first?.h ?? 0) * section.scale + FRAME * 2 + CAPTION_H,
  };
}

function rows(section: ImageSection): number {
  return Math.ceil(section.images.length / section.perRow);
}

const WIDTH =
  PAD * 2 +
  Math.max(
    ...IMAGE_SECTIONS.map((s) => s.perRow * cell(s).w + (s.perRow - 1) * GAP),
  );

function galleryHeight(): number {
  return IMAGE_SECTIONS.reduce(
    (h, s) => h + SECTION_H + rows(s) * (cell(s).h + GAP),
    PAD * 2,
  );
}

class ImageGallery extends Scene {
  constructor() {
    super("ImageGallery");
  }

  create(): void {
    // Same RENDER_SCALE trick as GameScene: design units in, crisp canvas out.
    const camera = this.cameras.main;
    camera.setZoom(RENDER_SCALE);
    camera.centerOn(WIDTH / 2, galleryHeight() / 2);
    const g = this.add.graphics();
    let y = PAD;
    for (const section of IMAGE_SECTIONS) {
      label(this, PAD, y, section.title, {
        size: FS.heading,
        weight: "bold",
        display: true,
        color: COLORS.accent,
      });
      y += SECTION_H;
      const { w, h } = cell(section);
      section.images.forEach((spec, i) => {
        const x = PAD + (i % section.perRow) * (w + GAP);
        this.card(
          g,
          section,
          spec,
          x,
          y + Math.floor(i / section.perRow) * (h + GAP),
        );
      });
      y += rows(section) * (h + GAP);
    }
  }

  private card(
    g: GameObjects.Graphics,
    section: ImageSection,
    spec: ImageSpec,
    x: number,
    y: number,
  ): void {
    const { w, h } = cell(section);
    panelFrame(g, x, y, w, h - CAPTION_H);
    g.save();
    g.translateCanvas(x + FRAME, y + FRAME);
    g.scaleCanvas(section.scale, section.scale);
    spec.draw(g);
    g.restore();
    label(this, x, y + h - CAPTION_H + 6, spec.name, {
      size: FS.small,
      weight: "bold",
      color: COLORS.accent,
    });
    label(this, x, y + h - CAPTION_H + 22, spec.note, {
      size: FS.small,
      color: COLORS.muted,
      wrap: w,
    });
  }
}

/** Boot the gallery into `parent`. */
export function startImageGallery(parent: string): Promise<Game> {
  return bootGallery(parent, WIDTH, galleryHeight(), ImageGallery);
}
