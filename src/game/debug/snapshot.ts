import type { Game } from "phaser"

export interface SnapshotText {
  x: number
  y: number
  text: string
  /** Font size in canvas pixels (from Phaser's TextStyle). */
  size?: number
  /** True when the text lives inside the keyboard-focused widget. */
  focused?: boolean
}

export interface SceneSnapshot {
  scene: string
  texts: SnapshotText[]
}

/** Minimal shape shared by text objects and containers holding them. */
export interface SceneNode {
  x: number
  y: number
  visible?: boolean
  text?: string
  focused?: boolean
  list?: SceneNode[]
  /** Phaser TextStyle of a text object (containers have none). */
  style?: { fontSize?: string | number }
}

/**
 * Flatten every visible text object under `node` into canvas coordinates,
 * marking text that belongs to the keyboard-focused widget. Dev tooling: lets
 * Playwright assert on screen content as JSON instead of reading pixels.
 */
export function collectText(
  node: SceneNode,
  ox: number,
  oy: number,
  focused: boolean,
  out: SnapshotText[],
): void {
  if (node.visible === false) return
  const x = ox + node.x
  const y = oy + node.y
  const isFocused = focused || node.focused === true
  if (typeof node.text === "string" && node.text.length > 0) {
    const raw = node.style?.fontSize
    const size = raw == null ? undefined : Math.round(Number.parseFloat(String(raw)))
    out.push({
      x: Math.round(x),
      y: Math.round(y),
      text: node.text,
      size,
      focused: isFocused || undefined,
    })
  }
  for (const child of node.list ?? []) collectText(child, x, y, isFocused, out)
}

/** Snapshot of every active scene's visible text, top-to-bottom, left-to-right. */
export function snapshotScenes(game: Game): SceneSnapshot[] {
  return game.scene.getScenes(true).map((scene) => {
    const texts: SnapshotText[] = []
    for (const child of scene.children.list) {
      collectText(child as unknown as SceneNode, 0, 0, false, texts)
    }
    texts.sort((a, b) => a.y - b.y || a.x - b.x)
    return { scene: scene.scene.key, texts }
  })
}
