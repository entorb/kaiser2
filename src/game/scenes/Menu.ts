import screenshotUrl from "../../assets/kaiserpic4.png";
import { isMuted, onMuteChange, toggleMute } from "../audio/music";
import { toNewGame } from "../flow";
import { getLang, setLang, t } from "../i18n/i18n";
import { hasSave, loadGame } from "../model/save";
import { setState } from "../model/session";
import { readGlobalGames } from "../model/stats";
import { hasInstallPrompt, promptInstall } from "../pwa";
import { alert } from "../ui/dialog";
import { FocusGroup } from "../ui/focus";
import { CANVAS_W } from "../ui/layout";
import { crest, divider } from "../ui/ornament";
import { label } from "../ui/text";
import { COLORS, css, FONT_UI, FS } from "../ui/theme";
import { Button, Panel } from "../ui/widgets";
import { GameScene } from "./base";

const SCREENSHOT_KEY = "menuScreenshot";
const PANEL_W = 448;
const PANEL_H = 254;
const PANELS_Y = 246;
const BUTTON_H = 46;
const BUTTON_GAP = 12;
const LEFT_X = 24;
const RIGHT_X = 24 + PANEL_W + 16;

export class Menu extends GameScene {
  constructor() {
    super("Menu");
  }

  preload() {
    this.load.image(SCREENSHOT_KEY, screenshotUrl);
  }

  async create() {
    const group = new FocusGroup(this);

    crest(this, CANVAS_W / 2, 40, 48);

    label(this, CANVAS_W / 2, 150, t("app.title"), {
      size: 50,
      weight: "bold",
      display: true,
      color: COLORS.accent,
      origin: 0.5,
    })
      .setOrigin(0.5)
      .setShadow(0, 3, css(COLORS.woodDark), 5);

    label(this, CANVAS_W / 2, 196, t("app.subtitle"), {
      size: FS.body,
      color: COLORS.onWood,
      origin: 0.5,
    }).setOrigin(0.5);

    divider(this, CANVAS_W / 2, 222, 420);

    // Footer: games-played counter and credit links. Created first so the
    // install modal can hide it (DOM always renders above the canvas).
    const { element, setCount } = creditsFooter();
    const footer = this.add.dom(0, 510, element).setOrigin(0, 0);
    void readGlobalGames().then((games) => {
      if (games !== null) setCount(games);
    });

    // Right: the menu buttons on a parchment panel.
    Panel.decorate(this, RIGHT_X, PANELS_Y, PANEL_W, PANEL_H);

    const bx = RIGHT_X + 20;
    const bw = PANEL_W - 40;
    let y = PANELS_Y + 16;

    const newGame = new Button(this, bx, y, bw, BUTTON_H, t("menu.newGame"), {
      variant: "primary",
      onClick: () => toNewGame(this.scene),
    });
    newGame.bind(group);
    y += BUTTON_H + BUTTON_GAP;

    if (hasSave()) {
      const cont = new Button(this, bx, y, bw, BUTTON_H, t("menu.continue"), {
        onClick: () => {
          const state = loadGame();
          if (state) {
            setState(this, state);
            this.scene.start("TradingHouse");
          }
        },
      });
      cont.bind(group);
      y += BUTTON_H + BUTTON_GAP;
    }

    const gridW = (bw - 12) / 2;
    const gridH = 40;
    const gridTop = y + 4;
    const gridBottom = gridTop + gridH + 8;

    const musicLabel = () => t(isMuted() ? "menu.musicOff" : "menu.musicOn");
    const language = new Button(
      this,
      bx,
      gridTop,
      gridW,
      gridH,
      t("menu.language"),
      {
        onClick: () => {
          setLang(getLang() === "de" ? "en" : "de");
          this.scene.restart({ pause: false });
        },
      },
    );
    const music = new Button(
      this,
      bx + gridW + 12,
      gridTop,
      gridW,
      gridH,
      musicLabel(),
      { onClick: () => toggleMute() },
    );
    const share = new Button(
      this,
      bx,
      gridBottom,
      gridW,
      gridH,
      t("menu.share"),
      {
        onClick: () =>
          shareGame((label) => {
            share.setText(label);
            this.time.delayedCall(1500, () => share.setText(t("menu.share")));
          }),
      },
    );
    const install = new Button(
      this,
      bx + gridW + 12,
      gridBottom,
      gridW,
      gridH,
      t("menu.install"),
      {
        onClick: () => {
          if (hasInstallPrompt()) {
            void promptInstall();
            return;
          }
          footer.setVisible(false);
          void alert(this, t("menu.installTitle"), [
            `${t("menu.installAndroid")} ${t("menu.installAndroidText")}`,
            `${t("menu.installIphone")} ${t("menu.installIphoneText")}`,
          ]).then(() => footer.setVisible(true));
        },
      },
    );
    language.bind(group);
    music.bind(group);
    share.bind(group);
    install.bind(group);
    const stopWatchingMute = onMuteChange(() => music.setText(musicLabel()));
    this.events.once("shutdown", stopWatchingMute);

    // Left: a framed screenshot of the original 1989 game.
    Panel.decorate(this, LEFT_X, PANELS_Y, PANEL_W, PANEL_H);
    const shotH = 222;
    const shot = this.add.image(
      LEFT_X + PANEL_W / 2,
      PANELS_Y + PANEL_H / 2,
      SCREENSHOT_KEY,
    );
    shot.setScale(shotH / shot.height);
  }
}

/** Share the game via the Web Share API, or copy the link as a fallback. */
function shareGame(onCopied: (label: string) => void): void {
  const url = window.location.href;
  if (navigator.share) {
    void navigator.share({ title: t("app.title"), url }).catch(() => {});
    return;
  }
  void navigator.clipboard
    ?.writeText(url)
    .then(() => onCopied(t("menu.shareCopied")))
    .catch(() => {});
}

/** Small centred credits footer under the panels. */
function creditsFooter(): {
  element: HTMLDivElement;
  setCount: (games: number) => void;
} {
  const div = document.createElement("div");
  Object.assign(div.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: `${CANVAS_W}px`,
    gap: "5px",
    fontFamily: FONT_UI,
    fontSize: "13px",
    color: css(COLORS.muted),
    textAlign: "center",
    lineHeight: "1.25",
    pointerEvents: "auto",
  });

  const line1 = document.createElement("div");
  line1.style.minHeight = "16px";
  div.appendChild(line1);
  const setCount = (games: number) => {
    line1.textContent = t("menu.gamesPlayed", { n: games });
  };

  const line2 = document.createElement("div");
  line2.textContent = `${t("menu.creditsSource")} `;
  const author = link("Carsten Strotmann", "https://kaiser2.strotmann.de");
  line2.appendChild(author);
  div.appendChild(line2);

  const line3 = document.createElement("div");
  const links: [string, string][] = [
    [t("menu.openSource"), "https://github.com/entorb/kaiser2"],
    [t("menu.contact"), "https://entorb.net/contact.php?origin=kaiser2"],
  ];
  links.forEach(([text, href], i) => {
    if (i > 0) line3.append(" · ");
    line3.appendChild(link(text, href));
  });
  div.appendChild(line3);

  return { element: div, setCount };
}

function link(text: string, href: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.textContent = text;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  Object.assign(a.style, {
    color: css(COLORS.accent),
    textDecoration: "underline",
    cursor: "pointer",
  });
  return a;
}
