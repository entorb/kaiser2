import screenshotUrl from "../../assets/kaiserpic4.png"
import { isMuted, onMuteChange, toggleMute } from "../audio/music"
import { toNewGame } from "../flow"
import { getLang, setLang, t } from "../i18n/i18n"
import { getRuleset, toggleRuleset } from "../model/ruleset"
import { hasSave, loadGame } from "../model/save"
import { setState } from "../model/session"
import { readGlobalGames } from "../model/stats"
import { hasInstallPrompt, promptInstall } from "../pwa"
import { alert } from "../ui/dialog"
import { FocusGroup } from "../ui/focus"
import { fullscreenButton } from "../ui/fullscreen"
import { drawDownloadIcon, drawShareIcon, drawSoundOffIcon, drawSoundOnIcon } from "../ui/icon"
import { CANVAS_W, MARGIN } from "../ui/layout"
import { crest, divider } from "../ui/ornament"
import { label } from "../ui/text"
import { COLORS, css, FONT_UI, FS } from "../ui/theme"
import { Button, Panel } from "../ui/widgets"
import { GameScene } from "./base"

const SCREENSHOT_KEY = "menuScreenshot"
const PANEL_GAP = 16
const PANEL_PAD = 16
const BUTTON_H = 56
const BUTTON_GAP = 12
const ICON_GAP = 8

export class Menu extends GameScene {
  constructor() {
    super("Menu")
  }

  preload() {
    this.load.image(SCREENSHOT_KEY, screenshotUrl)
  }

  async create() {
    const group = new FocusGroup(this)

    crest(this, CANVAS_W / 2, 30, 36)

    label(this, CANVAS_W / 2, 126, t("app.title"), {
      size: 56,
      weight: "bold",
      display: true,
      color: COLORS.accent,
      origin: 0.5,
    })
      .setOrigin(0.5)
      .setShadow(0, 3, css(COLORS.woodDark), 5)

    label(this, CANVAS_W / 2, 170, t("app.subtitle"), {
      size: FS.body,
      color: COLORS.onWood,
      origin: 0.5,
    }).setOrigin(0.5)

    divider(this, CANVAS_W / 2, 194, 420)

    // Two panels: the 1989 screenshot on the left, the buttons on the right
    // (a little wider, its rows need the room). Height follows the button rows.
    const saved = hasSave()
    const rows = saved ? 3 : 2
    const panelsY = 214
    const panelH = PANEL_PAD * 2 + rows * BUTTON_H + (rows - 1) * BUTTON_GAP
    const totalW = CANVAS_W - MARGIN * 2 - PANEL_GAP
    const leftW = Math.round(totalW * 0.45)
    const rightW = totalW - leftW
    const leftX = MARGIN
    const rightX = MARGIN + leftW + PANEL_GAP

    // Footer: games-played counter and credit links. Created first so the
    // install modal can hide it (DOM always renders above the canvas).
    const { element, setCount } = creditsFooter()
    const footer = this.add.dom(0, panelsY + panelH + 14, element).setOrigin(0, 0)
    void readGlobalGames().then((games) => {
      if (games !== null) setCount(games)
    })

    Panel.decorate(this, rightX, panelsY, rightW, panelH)
    const bx = rightX + 20
    const bw = rightW - 40
    let y = panelsY + PANEL_PAD

    // Top row: start a game and pick the rules it will use.
    const halfW = (bw - BUTTON_GAP) / 2
    const rulesLabel = () => t(getRuleset() === "atari" ? "menu.rulesAtari" : "menu.rulesRemake")
    const newGame = new Button(this, bx, y, halfW, BUTTON_H, t("menu.newGame"), {
      variant: "primary",
      onClick: () => toNewGame(this.scene),
    })
    const rules = new Button(this, bx + halfW + BUTTON_GAP, y, halfW, BUTTON_H, rulesLabel(), {
      onClick: () => {
        toggleRuleset()
        rules.setText(rulesLabel())
      },
    })
    newGame.bind(group)
    rules.bind(group)
    y += BUTTON_H + BUTTON_GAP

    if (saved) {
      const cont = new Button(this, bx, y, bw, BUTTON_H, t("menu.continue"), {
        onClick: () => {
          const state = loadGame()
          if (state) {
            setState(this, state)
            this.scene.start("TradingHouse")
          }
        },
      })
      cont.bind(group)
      y += BUTTON_H + BUTTON_GAP
    }

    // Bottom row: icon buttons (language shows its own code). Fullscreen is
    // absent where the browser has no Fullscreen API (iPhone Safari), and the
    // install button is absent once the app already runs standalone.
    const fullscreen = this.game.device.fullscreen.available
    const installed = isInstalled()
    const slots = 3 + (fullscreen ? 1 : 0) + (installed ? 0 : 1) // language, music, share
    const slotW = (bw - ICON_GAP * (slots - 1)) / slots
    let slot = 0
    const nextX = () => bx + slot++ * (slotW + ICON_GAP)

    const language = new Button(this, nextX(), y, slotW, BUTTON_H, t("menu.language"), {
      onClick: () => {
        setLang(getLang() === "de" ? "en" : "de")
        this.scene.restart({ pause: false })
      },
    })
    const soundIcon = () => (isMuted() ? drawSoundOffIcon : drawSoundOnIcon)
    const music = new Button(this, nextX(), y, slotW, BUTTON_H, "", {
      icon: soundIcon(),
      onClick: () => toggleMute(),
    })
    const share = new Button(this, nextX(), y, slotW, BUTTON_H, "", {
      icon: drawShareIcon,
      onClick: () =>
        shareGame((copied) => {
          share.setText(copied)
          this.time.delayedCall(1500, () => share.setText(""))
        }),
    })
    language.bind(group)
    music.bind(group)
    share.bind(group)
    if (!installed) {
      const install = new Button(this, nextX(), y, slotW, BUTTON_H, "", {
        icon: drawDownloadIcon,
        onClick: () => {
          if (hasInstallPrompt()) {
            void promptInstall()
            return
          }
          footer.setVisible(false)
          void alert(this, t("menu.installTitle"), [
            `${t("menu.installAndroid")} ${t("menu.installAndroidText")}`,
            `${t("menu.installIphone")} ${t("menu.installIphoneText")}`,
          ]).then(() => footer.setVisible(true))
        },
      })
      install.bind(group)
    }
    if (fullscreen) {
      fullscreenButton(this, group, nextX(), y, slotW, BUTTON_H)
    }
    const stopWatchingMute = onMuteChange(() => music.setIcon(soundIcon()))
    this.events.once("shutdown", stopWatchingMute)

    // Left: a framed screenshot of the original 1989 game.
    Panel.decorate(this, leftX, panelsY, leftW, panelH)
    const shot = this.add.image(leftX + leftW / 2, panelsY + panelH / 2, SCREENSHOT_KEY)
    shot.setScale(Math.min((panelH - 32) / shot.height, (leftW - 32) / shot.width))
  }
}

/** True when the game runs as an installed PWA, so there is nothing to install. */
function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia("(display-mode: standalone)").matches || standalone
}

/** Share the game via the Web Share API, or copy the link as a fallback. */
function shareGame(onCopied: (label: string) => void): void {
  const url = window.location.href
  if (navigator.share) {
    void navigator.share({ title: t("app.title"), url }).catch(() => {})
    return
  }
  void navigator.clipboard
    ?.writeText(url)
    .then(() => onCopied(t("menu.shareCopied")))
    .catch(() => {})
}

/** Small centred credits footer under the panels. */
function creditsFooter(): {
  element: HTMLDivElement
  setCount: (games: number) => void
} {
  const div = document.createElement("div")
  Object.assign(div.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: `${CANVAS_W}px`,
    gap: "5px",
    fontFamily: FONT_UI,
    fontSize: "18px",
    color: css(COLORS.onWood),
    textAlign: "center",
    lineHeight: "1.25",
    pointerEvents: "auto",
  })

  const line1 = document.createElement("div")
  line1.style.minHeight = "22px"
  div.appendChild(line1)
  const setCount = (games: number) => {
    line1.textContent = t("menu.gamesPlayed", { n: games })
  }

  const line2 = document.createElement("div")
  line2.textContent = `${t("menu.creditsSource")} `
  const author = link("Carsten Strotmann", "https://kaiser2.strotmann.de")
  line2.appendChild(author)
  div.appendChild(line2)

  const line3 = document.createElement("div")
  const links: [string, string, keyof typeof FOOTER_ICON_PATHS | undefined][] = [
    [t("menu.home"), "https://entorb.net/games/", "home"],
    [t("menu.openSource"), "https://github.com/entorb/kaiser2", undefined],
    [t("menu.contact"), "https://entorb.net/contact.php?origin=kaiser2", "contact"],
  ]
  links.forEach(([text, href, icon], i) => {
    if (i > 0) line3.append(" · ")
    line3.appendChild(link(text, href, icon))
  })
  div.appendChild(line3)

  return { element: div, setCount }
}

/** Outline paths (24x24) for the footer link icons, in the project's plain-line-art style. */
const FOOTER_ICON_PATHS = {
  home: ["M4 11 12 4 20 11 20 20 4 20Z", "M9 20V13H15V20"],
  contact: ["M4 5H20V19H4Z", "M4 5 12 13 20 5"],
}

/** Small inline SVG icon matching a footer link's destination. */
function linkIcon(name: keyof typeof FOOTER_ICON_PATHS): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("width", "15")
  svg.setAttribute("height", "15")
  svg.style.flex = "none"
  for (const d of FOOTER_ICON_PATHS[name]) {
    const path = document.createElementNS(ns, "path")
    path.setAttribute("d", d)
    path.setAttribute("fill", "none")
    path.setAttribute("stroke", css(COLORS.accent))
    path.setAttribute("stroke-width", "1.6")
    path.setAttribute("stroke-linecap", "round")
    path.setAttribute("stroke-linejoin", "round")
    svg.appendChild(path)
  }
  return svg
}

function link(
  text: string,
  href: string,
  icon?: keyof typeof FOOTER_ICON_PATHS,
): HTMLAnchorElement {
  const a = document.createElement("a")
  a.href = href
  a.target = "_blank"
  a.rel = "noopener"
  Object.assign(a.style, {
    color: css(COLORS.accent),
    textDecoration: "underline",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    verticalAlign: "middle",
  })
  if (icon) a.appendChild(linkIcon(icon))
  a.append(text)
  return a
}
