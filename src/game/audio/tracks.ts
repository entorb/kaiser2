// Procedural medieval score data. Pure: no Web Audio here, so the melodies,
// the scene mapping and the SFX specs are unit-testable. `music.ts` turns
// these numbers into oscillators. All tunes are original — no Atari audio.

export type Voice = "harp" | "flute";
export type TrackName = "menu" | "game" | "fanfare";
export type BlipName = "click" | "move";

export interface Note {
  /** Start, in beats from the top of the loop. */
  beat: number;
  /** Length, in beats. */
  dur: number;
  /** MIDI note number (69 = A4). */
  midi: number;
  voice: Voice;
  gain?: number;
}

export interface DroneSpec {
  /** MIDI root; the fifth is added an octave and a half above. */
  midi: number;
  gain?: number;
}

export interface Track {
  bpm: number;
  loopBeats: number;
  /** Sorted by `beat`; the scheduler walks them in order. */
  notes: Note[];
  drone?: DroneSpec;
}

export interface BlipSpec {
  freq: number;
  dur: number;
  gain: number;
  wave: OscillatorType;
}

/** `[beat, duration in beats, MIDI note]`. */
type Row = [beat: number, dur: number, midi: number];

const harp = (rows: Row[]): Note[] =>
  rows.map(([beat, dur, midi]) => ({ beat, dur, midi, voice: "harp" }));
const flute = (rows: Row[]): Note[] =>
  rows.map(([beat, dur, midi]) => ({ beat, dur, midi, voice: "flute" }));

function track(
  bpm: number,
  loopBeats: number,
  notes: Note[],
  drone?: DroneSpec,
): Track {
  return {
    bpm,
    loopBeats,
    notes: [...notes].sort((a, b) => a.beat - b.beat),
    drone,
  };
}

// G major, brisk 4/4 bard dance: a bouncy harp jig in the first half hands the
// tune to the flute for the second, over an oom-pah root-fifth bass (I-V-vi-IV,
// twice). Bright and cheerful — the main theme. ~16 s loop at 120 BPM.
const MENU = track(120, 32, [
  ...harp([
    // A: harp carries the tune (bars 1-4).
    [0, 0.5, 74], // D5
    [0.5, 0.5, 76], // E5
    [1, 0.5, 74], // D5
    [1.5, 0.5, 71], // B4
    [2, 1, 72], // C5
    [3, 1, 74], // D5
    [4, 0.5, 74], // D5
    [4.5, 0.5, 76], // E5
    [5, 1, 78], // F#5
    [6, 2, 74], // D5
    [8, 0.5, 71], // B4
    [8.5, 0.5, 72], // C5
    [9, 0.5, 74], // D5
    [9.5, 0.5, 71], // B4
    [10, 1, 67], // G4
    [11, 1, 71], // B4
    [12, 0.5, 72], // C5
    [12.5, 0.5, 74], // D5
    [13, 1, 76], // E5
    [14, 2, 72], // C5
  ]),
  ...flute([
    // B: flute takes the tune (bars 5-8).
    [16, 0.5, 79], // G5
    [16.5, 0.5, 78], // F#5
    [17, 1, 76], // E5
    [18, 0.5, 74], // D5
    [18.5, 0.5, 76], // E5
    [19, 1, 74], // D5
    [20, 0.5, 72], // C5
    [20.5, 0.5, 74], // D5
    [21, 1, 76], // E5
    [22, 2, 79], // G5
    [24, 0.5, 78], // F#5
    [24.5, 0.5, 76], // E5
    [25, 1, 74], // D5
    [26, 1, 71], // B4
    [27, 1, 74], // D5
    [28, 0.5, 79], // G5
    [28.5, 0.5, 78], // F#5
    [29, 1, 76], // E5
    [30, 2, 74], // D5 (dominant turnaround)
  ]),
  ...harp([
    // Oom-pah bass: root on 1 and 3, fifth on 2 and 4.
    [0, 1, 43], // G2
    [1, 1, 50], // D3
    [2, 1, 43],
    [3, 1, 50],
    [4, 1, 50], // D3
    [5, 1, 57], // A3
    [6, 1, 50],
    [7, 1, 57],
    [8, 1, 40], // E2
    [9, 1, 47], // B2
    [10, 1, 40],
    [11, 1, 47],
    [12, 1, 48], // C3
    [13, 1, 55], // G3
    [14, 1, 48],
    [15, 1, 55],
    [16, 1, 43],
    [17, 1, 50],
    [18, 1, 43],
    [19, 1, 50],
    [20, 1, 48],
    [21, 1, 55],
    [22, 1, 48],
    [23, 1, 55],
    [24, 1, 50],
    [25, 1, 57],
    [26, 1, 50],
    [27, 1, 57],
    [28, 1, 43],
    [29, 1, 50],
    [30, 1, 43],
    [31, 1, 50],
  ]),
]);

// A Aeolian, calm and sparse so it does not fight the play loop: a flute lead
// over a slow harp arpeggio (Am / F / C / G shapes) and an A/E drone. ~20 s.
const GAME = track(
  96,
  32,
  [
    ...flute([
      [0, 3, 69], // A4
      [3, 1, 71], // B4
      [4, 2, 72], // C5
      [6, 2, 71], // B4
      [8, 2, 69], // A4
      [10, 2, 67], // G4
      [12, 4, 69], // A4
      [16, 2, 76], // E5
      [18, 1, 74], // D5
      [19, 1, 72], // C5
      [20, 2, 71], // B4
      [22, 2, 72], // C5
      [24, 2, 74], // D5
      [26, 2, 71], // B4
      [28, 4, 69], // A4
    ]),
    ...harp([
      [0, 2, 57], // A3
      [2, 2, 64], // E4
      [4, 2, 60], // C4
      [6, 2, 67], // G4
      [8, 2, 55], // G3
      [10, 2, 62], // D4
      [12, 2, 57], // A3
      [14, 2, 64], // E4
      [16, 2, 53], // F3
      [18, 2, 60], // C4
      [20, 2, 55], // G3
      [22, 2, 62], // D4
      [24, 2, 62], // D4
      [26, 2, 57], // A3
      [28, 2, 64], // E4
      [30, 2, 57], // A3
    ]),
  ],
  { midi: 45, gain: 0.07 },
);

// D Ionian flourish for a promotion or a coronation. One-shot, not looped.
const FANFARE = track(132, 8, [
  ...harp([
    [0, 0.5, 62], // D4
    [0.5, 0.5, 66], // F#4
    [1, 0.5, 69], // A4
    [1.5, 1.5, 74], // D5
    [3, 0.5, 69], // A4
    [3.5, 0.5, 73], // C#5
    [4, 2, 74], // D5
    [6, 1, 71], // B4
    [7, 1, 74], // D5
  ]),
  ...flute([
    [0, 0.5, 74], // D5
    [1.5, 1.5, 81], // A5
    [4, 2, 86], // D6
    [7, 1, 81], // A5
  ]),
]);

export const TRACKS: Record<TrackName, Track> = {
  menu: MENU,
  game: GAME,
  fanfare: FANFARE,
};

export const BLIPS: Record<BlipName, BlipSpec> = {
  click: { freq: 880, dur: 0.07, gain: 0.22, wave: "sine" },
  move: { freq: 1320, dur: 0.04, gain: 0.1, wave: "triangle" },
};

/** One partial of the coin-clink SFX, started `delay` seconds into the clink. */
export interface CoinPart extends BlipSpec {
  delay: number;
}

// Metallic and slightly inharmonic: a bright cluster of short partials that ring
// out at staggered times, like a handful of talers hitting a table. `music.ts`
// adds a brief band-passed noise burst on top for the initial "ching".
export const COINS: CoinPart[] = [
  { freq: 2093, dur: 0.22, gain: 0.16, wave: "triangle", delay: 0 },
  { freq: 2637, dur: 0.2, gain: 0.13, wave: "triangle", delay: 0.02 },
  { freq: 3136, dur: 0.17, gain: 0.11, wave: "sine", delay: 0.045 },
  { freq: 3951, dur: 0.14, gain: 0.08, wave: "sine", delay: 0.07 },
  { freq: 1760, dur: 0.24, gain: 0.09, wave: "triangle", delay: 0.1 },
];

const SCENE_TRACKS: Record<string, TrackName> = {
  Menu: "menu",
  NewGame: "menu",
  Highscore: "menu",
  TradingHouse: "game",
  Partner: "game",
  Grain: "game",
  Land: "game",
  Chronicle: "game",
  Taxes: "game",
  TradeData: "game",
  Business: "game",
  Promotion: "game",
  Ranking: "game",
  SecretService: "game",
};

/** Music for a scene key, or `null` for screens that stay silent (Boot). */
export function trackForScene(key: string): TrackName | null {
  return SCENE_TRACKS[key] ?? null;
}
