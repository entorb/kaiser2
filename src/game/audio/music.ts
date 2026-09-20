import { at } from "../lookup"
// Procedural music and UI blips, generated with Web Audio oscillators — no
// audio files. We reuse Phaser's AudioContext (`game.sound.context`), which
// already handles the browser autoplay unlock; when the game runs without Web
// Audio every call here is a silent no-op.
//
// The score lives in `tracks.ts` (pure data). A lookahead scheduler wakes every
// few milliseconds and schedules the notes that fall inside the next window,
// so timing follows `AudioContext.currentTime` rather than `setTimeout`.

import type Phaser from "phaser"
import {
  BLIPS,
  type BlipName,
  COINS,
  type DroneSpec,
  type Note,
  TRACKS,
  type TrackName,
  trackForScene,
} from "./tracks"

const MUTE_KEY = "kaiser2.music"
const MUSIC_GAIN = 0.3
const SFX_GAIN = 0.5
/** Schedule notes up to this many seconds ahead. */
const LOOKAHEAD = 0.12
const TICK_MS = 25
const CROSSFADE = 0.25

interface Engine {
  ctx: AudioContext
  musicBus: GainNode
  sfxBus: GainNode
}

let engine: Engine | null = null
let muted = loadMuted()
let currentTrack: TrackName | null = null
let scheduler: number | null = null
let loopStart = 0
let nextTime = 0
let noteIndex = 0
let notes: Note[] = []
let loopBeats = 0
let secondsPerBeat = 0.5

/** Sources still sounding, so a track switch can fade and stop them. */
const live: AudioScheduledSourceNode[] = []
const muteListeners = new Set<(muted: boolean) => void>()
/** Short noise burst reused by the coin clink (built once per context). */
let noiseBuffer: AudioBuffer | null = null

function loadMuted(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "off"
  } catch {
    return false
  }
}

function persistMuted(value: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, value ? "off" : "on")
  } catch {
    // storage unavailable (private mode); mute just will not persist
  }
}

/** Track a source so `stopSources` can silence it and drop it when it ends. */
function keep(node: AudioScheduledSourceNode): void {
  live.push(node)
  node.onended = () => {
    const i = live.indexOf(node)
    if (i >= 0) live.splice(i, 1)
  }
}

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** Plucked string: a triangle plus a detuned saw, fast attack, long decay. */
function playHarp(freq: number, when: number, seconds: number, gain: number) {
  if (!engine) return
  const { ctx } = engine
  const end = when + Math.max(0.2, seconds)

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = Math.min(6000, freq * 6)
  lp.Q.value = 0.7

  const env = ctx.createGain()
  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(0.5 * gain, when + 0.006)
  env.gain.exponentialRampToValueAtTime(0.0001, end)
  lp.connect(env)
  env.connect(engine.musicBus)

  for (const [type, detune] of [
    ["triangle", 0],
    ["sawtooth", 6],
  ] as const) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    osc.connect(lp)
    osc.start(when)
    osc.stop(end + 0.05)
    keep(osc)
  }
}

/** Recorder-like flute: sine with slow attack, gentle release and vibrato. */
function playFlute(freq: number, when: number, seconds: number, gain: number) {
  if (!engine) return
  const { ctx } = engine
  const attack = 0.07
  const release = 0.18
  const end = when + Math.max(0.3, seconds)

  const osc = ctx.createOscillator()
  osc.type = "sine"
  osc.frequency.value = freq

  const vibrato = ctx.createOscillator()
  vibrato.type = "sine"
  vibrato.frequency.value = 5
  const vibratoGain = ctx.createGain()
  vibratoGain.gain.value = freq * 0.006
  vibrato.connect(vibratoGain)
  vibratoGain.connect(osc.frequency)

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 3200

  const level = 0.32 * gain
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(level, when + attack)
  const releaseAt = Math.max(when + attack, end - release)
  env.gain.setValueAtTime(level, releaseAt)
  env.gain.linearRampToValueAtTime(0, end + 0.05)

  osc.connect(lp)
  lp.connect(env)
  env.connect(engine.musicBus)

  osc.start(when)
  osc.stop(end + 0.1)
  vibrato.start(when)
  vibrato.stop(end + 0.1)
  keep(osc)
  keep(vibrato)
}

/** Bowed-brass swell: detuned saws, a lowpass that opens on the attack. */
function playBrass(freq: number, when: number, seconds: number, gain: number) {
  if (!engine) return
  const { ctx } = engine
  const attack = 0.09
  const release = 0.2
  const end = when + Math.max(0.3, seconds)

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.Q.value = 0.8
  lp.frequency.setValueAtTime(500, when)
  lp.frequency.linearRampToValueAtTime(2200, when + attack + 0.05)

  const level = 0.2 * gain
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(level, when + attack)
  const releaseAt = Math.max(when + attack, end - release)
  env.gain.setValueAtTime(level, releaseAt)
  env.gain.linearRampToValueAtTime(0, end + 0.05)
  lp.connect(env)
  env.connect(engine.musicBus)

  for (const detune of [-7, 7]) {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.value = freq
    osc.detune.value = detune
    osc.connect(lp)
    osc.start(when)
    osc.stop(end + 0.1)
    keep(osc)
  }
}

/** Bagpipe-style drone: two detuned saws through a lowpass, slow swell. */
function startDrone(drone: DroneSpec, when: number) {
  if (!engine) return
  const { ctx } = engine
  const base = midiToHz(drone.midi)
  const level = drone.gain ?? 0.1

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 750
  lp.Q.value = 0.5

  const env = ctx.createGain()
  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(level, when + 2)
  lp.connect(env)
  env.connect(engine.musicBus)

  for (const [freq, detune] of [
    [base, -5],
    [base * 1.5, 5],
  ] as const) {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.value = freq
    osc.detune.value = detune
    osc.connect(lp)
    osc.start(when)
    keep(osc)
  }
}

function scheduleNote(note: Note, when: number, beatSeconds: number) {
  const freq = midiToHz(note.midi)
  const seconds = note.dur * beatSeconds
  const gain = note.gain ?? 1
  if (note.voice === "flute") playFlute(freq, when, seconds, gain)
  else if (note.voice === "brass") playBrass(freq, when, seconds, gain)
  else playHarp(freq, when, seconds, gain)
}

function tick(): void {
  if (!engine || notes.length === 0 || muted) return
  const { ctx } = engine
  if (ctx.state !== "running") return

  const horizon = ctx.currentTime + LOOKAHEAD
  if (nextTime < ctx.currentTime) {
    // Fell behind (context was suspended); restart the loop cleanly.
    loopStart = ctx.currentTime + 0.05
    nextTime = loopStart
    noteIndex = 0
  }

  let guard = 0
  while (nextTime < horizon && guard < 256) {
    scheduleNote(at(notes, noteIndex), nextTime, secondsPerBeat)
    noteIndex += 1
    if (noteIndex >= notes.length) {
      noteIndex = 0
      loopStart += loopBeats * secondsPerBeat
      nextTime = loopStart
    } else {
      nextTime = loopStart + at(notes, noteIndex).beat * secondsPerBeat
    }
    guard += 1
  }
}

function stopSources(fade: number): void {
  if (!engine) return
  const { ctx, musicBus } = engine
  const now = ctx.currentTime
  musicBus.gain.cancelScheduledValues(now)
  musicBus.gain.setValueAtTime(musicBus.gain.value, now)
  musicBus.gain.linearRampToValueAtTime(0, now + fade)
  musicBus.gain.setValueAtTime(muted ? 0 : MUSIC_GAIN, now + fade + 0.03)
  for (const node of live) {
    try {
      node.stop(now + fade + 0.02)
    } catch {
      // already stopped
    }
  }
  live.length = 0
}

/** Start (or switch to) a track by name. */
export function playTrack(name: TrackName): void {
  currentTrack = name
  if (!engine) return
  const { ctx } = engine
  stopSources(CROSSFADE)

  const track = TRACKS[name]
  notes = track.notes
  loopBeats = track.loopBeats
  secondsPerBeat = 60 / track.bpm
  loopStart = ctx.currentTime + CROSSFADE + 0.05
  noteIndex = 0
  nextTime = loopStart + (notes[0]?.beat ?? 0) * secondsPerBeat
  if (track.drone) startDrone(track.drone, loopStart)

  scheduler ??= window.setInterval(tick, TICK_MS)
}

/**
 * Fade out and stop the current track; `playTrack` starts one again. Used by
 * the `list-audio.html` audition page, hence `@public`.
 *
 * @public
 */
export function stopMusic(): void {
  currentTrack = null
  notes = []
  if (scheduler !== null) {
    window.clearInterval(scheduler)
    scheduler = null
  }
  stopSources(CROSSFADE)
}

function setSceneMusic(key: string): void {
  const name = trackForScene(key)
  if (!name || name === currentTrack) return
  playTrack(name)
}

function onGameObjectDown(): void {
  blip("click")
}

function onMuteKey(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key.toLowerCase() !== "m") return
  const target = event.target as HTMLElement | null
  if (
    target &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  ) {
    return
  }
  toggleMute()
}

/**
 * Wire the engine to an AudioContext. Idempotent, so the audition page can call
 * it with its own context and `attachMusic` reuses it.
 */
export function attachAudio(context: AudioContext): void {
  if (engine) return
  const musicBus = context.createGain()
  const sfxBus = context.createGain()
  musicBus.gain.value = muted ? 0 : MUSIC_GAIN
  sfxBus.gain.value = muted ? 0 : SFX_GAIN
  musicBus.connect(context.destination)
  sfxBus.connect(context.destination)
  engine = { ctx: context, musicBus, sfxBus }
}

/** Hook the music to Phaser's audio context. Call once, after the game boots. */
export function attachMusic(game: Phaser.Game): void {
  const context = (game.sound as Partial<Phaser.Sound.WebAudioSoundManager>).context
  if (!context) return // No Web Audio: the game stays silent.

  attachAudio(context)
  window.addEventListener("keydown", onMuteKey)
}

/** Select a scene's track and route its pointer clicks to a blip. */
export function attachSceneMusic(scene: Phaser.Scene): void {
  setSceneMusic(scene.scene.key)
  scene.input.off("gameobjectdown", onGameObjectDown)
  scene.input.on("gameobjectdown", onGameObjectDown)
}

/** Play a short UI sound, unless muted. */
export function blip(name: BlipName): void {
  if (!engine || muted) return
  const { ctx } = engine
  if (ctx.state !== "running") return
  const spec = BLIPS[name]
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = spec.wave
  osc.frequency.value = spec.freq
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, now)
  env.gain.linearRampToValueAtTime(spec.gain, now + 0.005)
  env.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur)
  osc.connect(env)
  env.connect(engine.sfxBus)
  osc.start(now)
  osc.stop(now + spec.dur + 0.02)
}

/** One-shot flourish over the current track (promotion, coronation). */
export function playFanfare(): void {
  if (!engine || muted) return
  const { ctx } = engine
  if (ctx.state !== "running") return
  const track = TRACKS.fanfare
  const beatSeconds = 60 / track.bpm
  const start = ctx.currentTime + 0.05
  for (const note of track.notes) {
    scheduleNote(note, start + note.beat * beatSeconds, beatSeconds)
  }
}

/** Short decaying white noise for the coin transient (built once per context). */
function coinNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer?.sampleRate === ctx.sampleRate) {
    return noiseBuffer
  }
  const len = Math.floor(ctx.sampleRate * 0.06)
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  const noise = crypto.getRandomValues(new Uint32Array(len))
  for (const [i, n] of noise.entries()) {
    const decay = 1 - i / len
    data[i] = (n / 2 ** 31 - 1) * decay * decay
  }
  noiseBuffer = buffer
  return buffer
}

/** Clinking coins: a bright metallic cluster for a purchase. */
export function playCoins(): void {
  if (!engine || muted) return
  const { ctx } = engine
  if (ctx.state !== "running") return
  const start = ctx.currentTime + 0.01

  const noise = ctx.createBufferSource()
  noise.buffer = coinNoise(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 5200
  bp.Q.value = 1.1
  const noiseEnv = ctx.createGain()
  noiseEnv.gain.setValueAtTime(0.18, start)
  noiseEnv.gain.exponentialRampToValueAtTime(0.0001, start + 0.06)
  noise.connect(bp)
  bp.connect(noiseEnv)
  noiseEnv.connect(engine.sfxBus)
  noise.start(start)
  noise.stop(start + 0.08)

  for (const part of COINS) {
    const t0 = start + part.delay
    const osc = ctx.createOscillator()
    osc.type = part.wave
    osc.frequency.value = part.freq
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t0)
    env.gain.linearRampToValueAtTime(part.gain, t0 + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + part.dur)
    osc.connect(env)
    env.connect(engine.sfxBus)
    osc.start(t0)
    osc.stop(t0 + part.dur + 0.02)
  }
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  persistMuted(value)
  if (engine) {
    const { ctx, musicBus, sfxBus } = engine
    const now = ctx.currentTime
    musicBus.gain.cancelScheduledValues(now)
    musicBus.gain.setValueAtTime(musicBus.gain.value, now)
    musicBus.gain.linearRampToValueAtTime(value ? 0 : MUSIC_GAIN, now + 0.15)
    sfxBus.gain.value = value ? 0 : SFX_GAIN
  }
  for (const listener of muteListeners) listener(value)
}

export function toggleMute(): void {
  setMuted(!muted)
}

/** Subscribe to mute changes (e.g. to relabel a toggle). Returns an unsubscribe. */
export function onMuteChange(listener: (muted: boolean) => void): () => void {
  muteListeners.add(listener)
  return () => muteListeners.delete(listener)
}
