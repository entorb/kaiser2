import type { GameState } from "./types"

const int = Math.floor

/** The amount the people must receive this year. */
export function grainNeed(state: GameState): number {
  return Math.max(0, Math.trunc(state.turn.vkorn))
}

/** Stock required for the 80% dole limit to cover the people's need. */
export function stockForGrainNeed(need: number): number {
  return Math.ceil((Math.max(0, need) * 100) / 80)
}

export interface GrainPlan {
  min: number
  max: number
  need: number
  donation: number
  marker: number
  sufficient: boolean
}

/** Live dole target for a stock level, including the original 20%/80% bounds. */
export function grainPlan(state: GameState, stock: number): GrainPlan {
  const safeStock = Math.max(0, stock)
  const min = int((safeStock * 20) / 100)
  const max = int((safeStock * 80) / 100)
  const need = grainNeed(state)
  const donation = Math.max(min, Math.min(max, need))
  return { min, max, need, donation, marker: donation, sufficient: max >= need }
}
