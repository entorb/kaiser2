import { type GameObjects, Math as PhaserMath } from "phaser";
import { playCoins } from "../audio/music";
import { toLand } from "../flow";
import { t } from "../i18n/i18n";
import type { StringKey } from "../i18n/strings";
import { giveGrain, grainBounds, harvest } from "../model/rules";
import { getState } from "../model/session";
import type { GameState } from "../model/types";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { COLORS, RADIUS, SPACE } from "../ui/theme";
import { moneyLabel, Panel, Slider, StatRow } from "../ui/widgets";
import { GameScene } from "./base";
import { primaryAction, screenTitle, statusBar } from "./common";

export class Grain extends GameScene {
  private granary?: GameObjects.Graphics;

  constructor() {
    super("Grain");
  }

  async create() {
    const state = getState(this);
    const result = harvest(state, state.sp);

    await this.play(state, result.vkorn);
    toLand(this.scene);
  }

  /**
   * Combined trade + distribution screen (KAISER3 #KORN then #KORNAUS). Both
   * sliders are live at once: left/right trade changes the granary and the
   * distribution bounds, and a single "Weiter" settles the trade, hands the
   * chosen amount to the people, then leaves for land.
   */
  private async play(state: GameState, vkorn: number): Promise<void> {
    const p = state.players[state.sp];
    const seller = state.players[state.turn.han];
    this.children.removeAll();
    this.granary = undefined;
    const group = new FocusGroup(this);
    const { content } = frame();
    statusBar(this, state, group);
    screenTitle(this, t("grain.title"), content.y);
    this.drawGranary(state, p.lkorn);

    // Required stock includes the 20% the ruler keeps (max give is 80%).
    const required = Math.trunc(state.turn.klager);
    const maxSell = Math.trunc(p.lkorn);
    const maxBuy = Math.trunc(seller.verkorn);
    const step = 500;
    const total = (v: number) =>
      Math.trunc((Math.abs(v) * seller.kpreis) / 500);
    // Distribution bounds for the stock that results from a given trade.
    const boundsFor = (traded: number) =>
      grainBounds({ ...p, lkorn: p.lkorn + traded });
    const neededFor = (traded: number) => {
      const { p20, p80 } = boundsFor(traded);
      return Math.max(p20, Math.min(p80, Math.min(vkorn, p80)));
    };
    const distStep = (traded: number) => {
      const { p20, p80 } = boundsFor(traded);
      return Math.max(1, Math.round(Math.max(p80 - p20, 1) / 100));
    };

    const panelW = 340;
    const panel = new Panel(this, content.x + 220, content.y + 54, panelW, 316);
    const rows: [string, string, number?][] = [
      [t("grain.rot"), `${state.turn.faul} %`, COLORS.danger],
      [t(`weather.${state.wetter}` as StringKey), "", COLORS.info],
      [t("grain.reserve"), `${Math.trunc(p.lkorn)}`],
      [t("grain.need"), `${required}`],
      [t("grain.price"), `${seller.kpreis}`],
    ];
    rows.forEach(([labelText, value, color], i) => {
      panel.add(
        new StatRow(
          this,
          SPACE.lg,
          64 + i * 40,
          panelW - SPACE.lg * 2,
          labelText,
          value,
          { valueColor: color ?? COLORS.text },
        ),
      );
    });

    // Weather effect gets its own icon beside the row.
    const weatherG = this.add.graphics();
    panel.add(weatherG);
    this.drawWeatherIcon(weatherG, panelW - 26, 112, state.wetter);

    const controlsX = content.x + 572;
    const controlsW = content.w - 572;
    Panel.decorate(this, controlsX, content.y + 54, controlsW, 316);

    const sliderX = controlsX + 24;
    const sliderW = controlsW - 48;
    const b0 = boundsFor(0);

    await new Promise<void>((resolve) => {
      let trade: Slider;
      let dist: Slider;
      let tradeAmount = 0;
      const finish = () => {
        this.applyTrade(state, trade.value);
        giveGrain(state, state.sp, dist.value);
        resolve();
      };

      dist = new Slider(this, sliderX, content.y + 220, sliderW, 130, {
        label: t("grain.distribution"),
        min: b0.p20,
        max: b0.p80,
        step: distStep(0),
        initial: neededFor(0),
        format: (v) => `${v}`,
        minLabel: `${b0.p20}`,
        maxLabel: `${b0.p80}`,
        // Red while giving the people less than they need.
        valueColor: (v) =>
          v < neededFor(tradeAmount) ? COLORS.danger : COLORS.success,
        onSubmit: finish,
      });

      // Trade needed to bring the stock up to the required amount.
      const needMark = required - Math.trunc(p.lkorn);
      trade = new Slider(this, sliderX, content.y + 70, sliderW, 130, {
        label: t("grain.trade"),
        min: -maxSell,
        max: maxBuy,
        step,
        initial: 0,
        minIcon: "minus",
        maxIcon: "plus",
        markers: [{ value: needMark, color: COLORS.danger }],
        format: (v) => (v > 0 ? `+${v}` : `${v}`),
        // Red while the resulting stock stays under the required amount.
        valueColor: (v) =>
          p.lkorn + v < required ? COLORS.danger : COLORS.success,
        cost: (v) => {
          if (v === 0) return "";
          return moneyLabel(v > 0 ? -total(v) : total(v), t("common.taler"));
        },
        costColor: (v) =>
          v > 0 && total(v) > p.geld ? COLORS.danger : COLORS.accent,
        onChange: (v) => {
          tradeAmount = v;
          const b = boundsFor(v);
          dist.setRange(b.p20, b.p80, distStep(v));
          dist.setEndLabels(`${b.p20}`, `${b.p80}`);
          // Reset distribution default: the need, rounded up to the step so a
          // sufficient stock never shows red just from rounding down.
          const need = neededFor(v);
          const step = distStep(v);
          dist.setValue(Math.ceil(need / step) * step);
          this.drawGranary(state, p.lkorn + v);
        },
        onSubmit: finish,
      });

      trade.bind(group);
      dist.bind(group);
      primaryAction(this, group, t("common.continue"), finish);
      group.focus(trade);
    });
    group.destroy();
  }

  /** KORNSPEICH (KAISER3:20490): silo filled by stock / required stock. */
  private drawGranary(state: GameState, lkorn: number): void {
    const { content } = frame();
    const w = 200;
    const h = 300;
    const x = content.x;
    const y = content.y + 54;
    if (!this.granary) this.granary = this.add.graphics();
    const g = this.granary;
    g.clear();

    const bodyX = x + 24;
    const bodyW = w - 48;
    const bodyTop = y + 56;
    const bodyBottom = y + h;
    const apexY = y + 2;

    // Thatched conical roof.
    g.fillStyle(0x7a5a2e, 1);
    g.fillTriangle(x + w / 2, apexY, x + 10, bodyTop, x + w - 10, bodyTop);
    g.lineStyle(1, 0x5a4020, 0.6);
    const roofH = bodyTop - apexY;
    const half = (w - 20) / 2;
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const yy = apexY + roofH * t;
      const hw = half * t;
      g.lineBetween(x + w / 2 - hw, yy, x + w / 2 + hw, yy);
    }
    g.lineStyle(3, COLORS.woodDark, 1);
    g.strokeTriangle(x + w / 2, apexY, x + 10, bodyTop, x + w - 10, bodyTop);

    // Stone plinth under the silo.
    g.fillStyle(0x8a8578, 1);
    g.fillRoundedRect(bodyX - 6, bodyBottom - 14, bodyW + 12, 18, 2);
    g.lineStyle(2, COLORS.woodDark, 1);
    g.strokeRoundedRect(bodyX - 6, bodyBottom - 14, bodyW + 12, 18, 2);

    // Wooden wall with vertical plank seams.
    g.fillStyle(COLORS.surfaceAlt, 1);
    g.fillRoundedRect(bodyX, bodyTop, bodyW, bodyBottom - bodyTop, RADIUS);
    g.lineStyle(1, COLORS.border, 0.35);
    for (let px = bodyX + 14; px < bodyX + bodyW - 2; px += 14) {
      g.lineBetween(px, bodyTop + 3, px, bodyBottom - 15);
    }

    const klager = state.turn.klager;
    const frac = klager > 0 ? Math.min(1, lkorn / klager) : 0;
    const innerTop = bodyTop + 6;
    const innerBottom = bodyBottom - 16;
    const fillH = (innerBottom - innerTop) * frac;
    if (fillH > 0) {
      const fy = innerBottom - fillH;
      g.fillStyle(COLORS.accent, 1);
      g.fillRect(bodyX + 2, fy, bodyW - 4, fillH);
      // Grain texture.
      g.fillStyle(0x8a6b1f, 0.45);
      for (let i = 0; i < Math.min(60, Math.floor(fillH / 5)); i++) {
        const gx = bodyX + 6 + ((i * 37) % (bodyW - 12));
        const gy = fy + 4 + ((i * 53) % Math.max(1, fillH - 6));
        g.fillCircle(gx, gy, 1.4);
      }
      // Heaped surface: a row of rounded grains at the fill line.
      g.fillStyle(COLORS.accentHover, 0.9);
      for (let gx = bodyX + 8; gx < bodyX + bodyW - 6; gx += 7) {
        g.fillCircle(gx, fy + 1, 4);
      }
    }

    // Fill-level ticks (25/50/75 %).
    g.lineStyle(1, COLORS.woodDark, 0.5);
    for (let i = 1; i < 4; i++) {
      const ty = innerBottom - (innerBottom - innerTop) * (i / 4);
      g.lineBetween(bodyX + 2, ty, bodyX + 12, ty);
    }

    g.lineStyle(3, COLORS.woodDark, 1);
    g.strokeRoundedRect(bodyX, bodyTop, bodyW, bodyBottom - bodyTop, RADIUS);
  }

  /**
   * Small procedural weather pictogram centred on (cx, cy), distinct per
   * WETTER level: 1-3 storms/drought, 4-6 clouds/sun mix, 7-10 radiant suns.
   */
  private drawWeatherIcon(
    g: GameObjects.Graphics,
    cx: number,
    cy: number,
    wetter: number,
  ): void {
    const cloudColor = 0x8d95a3;
    const stormColor = 0x5f6b80;
    const sunAt = (
      x: number,
      y: number,
      r: number,
      count: number,
      len: number,
      color: number,
    ) => {
      g.fillStyle(color, 1);
      g.fillCircle(x, y, r);
      g.lineStyle(1.6, color, 1);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * 2 * Math.PI - Math.PI / 2;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2));
        g.lineTo(
          x + Math.cos(a) * (r + 2 + len),
          y + Math.sin(a) * (r + 2 + len),
        );
        g.strokePath();
      }
    };
    const cloudAt = (x: number, y: number, s: number, color: number) => {
      g.fillStyle(color, 1);
      g.fillCircle(x - 4 * s, y, 3 * s);
      g.fillCircle(x, y - 2 * s, 4 * s);
      g.fillCircle(x + 4 * s, y, 3 * s);
      g.fillRect(x - 4 * s, y, 8 * s, 3 * s);
    };
    switch (wetter) {
      case 1: {
        // Hurricane: tight swirl with a lightning bolt.
        g.lineStyle(2.5, stormColor, 1);
        for (let i = 0; i < 4; i++) {
          const a0 = -Math.PI / 2 + i * (Math.PI / 2.4);
          g.beginPath();
          g.arc(cx, cy, 2.5 + i * 3, a0, a0 + Math.PI * 1.35);
          g.strokePath();
        }
        const s = 1.5;
        g.fillStyle(COLORS.danger, 1);
        g.fillPoints(
          [
            new PhaserMath.Vector2(cx + 2 * s, cy - 6 * s),
            new PhaserMath.Vector2(cx + 5 * s, cy + 0.5 * s),
            new PhaserMath.Vector2(cx + 3.2 * s, cy + 0.5 * s),
            new PhaserMath.Vector2(cx + 1.6 * s, cy + 6 * s),
            new PhaserMath.Vector2(cx - 0.4 * s, cy + 1.5 * s),
            new PhaserMath.Vector2(cx + 1.2 * s, cy + 1.5 * s),
            new PhaserMath.Vector2(cx - 0.8 * s, cy - 0.5 * s),
          ],
          true,
        );
        break;
      }
      case 2: {
        // Drought: scorching sun over cracked ground.
        g.fillStyle(0xdf8c3f, 1);
        g.fillCircle(cx, cy - 5, 7);
        g.lineStyle(1.5, 0xdf8c3f, 1);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * 10, cy - 5 + Math.sin(a) * 10);
          g.lineTo(cx + Math.cos(a) * 12, cy - 5 + Math.sin(a) * 12);
          g.strokePath();
        }
        g.lineStyle(2, 0xa06a1f, 1);
        g.lineBetween(cx - 12, cy + 8, cx + 12, cy + 9);
        g.lineStyle(1.5, 0xa06a1f, 1);
        g.lineBetween(cx - 7, cy + 8.5, cx - 4, cy + 13);
        g.lineBetween(cx, cy + 9, cx + 3, cy + 13);
        g.lineBetween(cx + 7, cy + 9, cx + 4, cy + 13);
        break;
      }
      case 3: {
        // Storm and rain: storm cloud with slanted rain streaks.
        cloudAt(cx, cy, 1.4, stormColor);
        g.lineStyle(1.8, COLORS.info, 1);
        g.beginPath();
        g.moveTo(cx - 7, cy + 6);
        g.lineTo(cx - 10, cy + 12);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx, cy + 6);
        g.lineTo(cx - 3, cy + 12);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx + 7, cy + 6);
        g.lineTo(cx + 4, cy + 12);
        g.strokePath();
        break;
      }
      case 4: {
        // Bad weather: heavy dark cloud.
        cloudAt(cx, cy, 1.7, stormColor);
        break;
      }
      case 5: {
        // Normal: sun half hidden behind a cloud.
        sunAt(cx + 5, cy - 2, 5, 0, 0, COLORS.accent);
        cloudAt(cx - 3, cy - 2, 1.0, cloudColor);
        break;
      }
      case 6: {
        // OK: sun peeking out from under a small cloud.
        sunAt(cx + 2, cy + 2, 7, 0, 0, COLORS.accentHover);
        cloudAt(cx - 4, cy - 6, 1.0, cloudColor);
        break;
      }
      case 7:
        sunAt(cx, cy, 6, 4, 4, COLORS.accentHover);
        break;
      case 8:
        sunAt(cx, cy, 6, 6, 5, COLORS.accentHover);
        break;
      case 9:
        sunAt(cx, cy, 6, 8, 6, COLORS.accent);
        break;
      case 10: {
        // Record summer: radiant sun with a halo and sparks.
        sunAt(cx, cy, 6, 10, 7, COLORS.accent);
        g.lineStyle(1.5, COLORS.accent, 1);
        g.strokeCircle(cx, cy, 13);
        g.fillStyle(COLORS.accent, 1);
        g.fillCircle(cx - 15, cy - 8, 1.5);
        g.fillCircle(cx + 15, cy - 8, 1.5);
        break;
      }
    }
  }

  private applyTrade(state: GameState, amount: number): void {
    const p = state.players[state.sp];
    const seller = state.players[state.turn.han];
    const price = seller.kpreis;
    if (amount > 0) {
      const a = Math.min(amount, seller.verkorn);
      if (a <= 0) return;
      playCoins();
      p.lkorn += a;
      if (a > 50000) p.punkte += 1;
      seller.lkorn -= a;
      seller.geld += (a * price) / 500;
      seller.verkorn -= a;
      p.geld -= (a * price) / 500;
    } else if (amount < 0) {
      const a = Math.min(-amount, p.lkorn);
      p.lkorn -= a;
      p.geld += (a * price) / 500;
      // Source jumped away before crediting the partner (KAISER3:10585-10587
      // was dead code). The intended partner update is applied here.
      seller.verkorn += a;
      seller.lkorn += a;
      seller.geld -= (a * price) / 500;
    }
  }
}
