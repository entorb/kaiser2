// Global play counter, shared with the other entorb.net pages.
const STATS_URL = "https://entorb.net/web-stats-json.php?origin=kaiser2"

export function parseAccessCounts(data: unknown): number | null {
  if (typeof data !== "object" || data === null) return null
  const value = (data as Record<string, unknown>).accesscounts
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** Total games started across all entorb.net sites. */
export async function readGlobalGames(): Promise<number | null> {
  try {
    const response = await fetch(`${STATS_URL}&action=read`)
    if (!response.ok) return null
    return parseAccessCounts(await response.json())
  } catch {
    return null
  }
}

/** Ping the server once per started game. No-op during local development. */
export function reportGameStart(): void {
  if (import.meta.env.DEV) return
  void globalThis.fetch?.(`${STATS_URL}&action=write`).catch(() => {})
}
