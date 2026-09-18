import type { GameState, PlayerState } from "./types";
import { playerAt } from "./types";

/** Fresh per-turn scratch values (locals in KAISERB/KAISER3). */
export function resetTurn(state: GameState): void {
  state.turn = {
    han: 0,
    kaus: 0,
    vkorn: 0,
    klager: 0,
    abg: 0,
    zahl: 0,
    gew: 0,
    neu: 0,
    alt: 0,
    faul: 0,
  };
}

/**
 * KAISERB:2310 - advance to the next ruler, rolling the year over. Deposed
 * rulers (ENTHOB) sit out their term: each skipped turn consumes one year of
 * the suspension. The source only checked ENTHOB=1 (so a 2-year ENTHOB2 never
 * skipped); the intended count is consumed here. The ruler who ends up playing
 * then ages and scores (KAISERB:2380).
 */
export function advancePlayer(state: GameState): void {
  const step = () => {
    state.sp += 1;
    if (state.sp > state.count) {
      state.sp = 1;
      state.jahr += 1;
    }
  };
  step();
  while (state.count > 1 && consumeDeposition(playerAt(state, state.sp)))
    step();
  startRuler(state);
  resetTurn(state);
}

/**
 * KAISERB:2380 - the ruler starting their turn ages one year and scores one
 * point. Deposed rulers who are skipped do not age or score.
 */
export function startRuler(state: GameState): void {
  const p = playerAt(state, state.sp);
  p.tod -= 1;
  p.punkte += 1;
}

/** KAISERB:2370 - consume one year of a deposition; true while suspended. */
function consumeDeposition(p: PlayerState): boolean {
  if (p.entHob <= 0) return false;
  p.entHob -= 1;
  return true;
}
