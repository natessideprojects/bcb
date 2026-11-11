"use client";
// The fairground sound system: FilmCow sound effects and the announcer play through
// Web Audio (decoded once, instant to retrigger, many at a time); the music loop is a
// plain <audio> element. Everything stays silent until the player turns sound on.
import {SFX, VO, type SfxName, type VoClip} from "./audio-manifest";

export type FairSettings = {enabled: boolean; music: number; effects: number; voice: number; animation: "normal" | "fast" | "off"};
export type {SfxName, VoClip};
export const FAIRGROUND_MUSIC = {title:"Fairground Fun",src:"/audio/music/fairground-fun.mp3"} as const;
const KEY = "bcb.fair-settings.v1";
const defaults: FairSettings = {enabled: false, music: 0.2, effects: 0.7, voice: 0.9, animation: "normal"};
let settings: FairSettings = {...defaults}, loaded = false;
const listeners = new Set<() => void>();
const publish = () => { for (const fn of listeners) fn(); };

let ctx: AudioContext | null = null, fxBus: GainNode | null = null, voBus: GainNode | null = null;
let music: HTMLAudioElement | null = null, preloaded = false;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const live = new Set<AudioScheduledSourceNode>();
const lastVariant = new Map<string, number>();
type Voice = {src: AudioBufferSourceNode | null; priority: number; clip: VoClip};
let generation = 0;
let voice: Voice | null = null, queued: {clip: VoClip; priority: number; at: number} | null = null;

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    fxBus = ctx.createGain(); voBus = ctx.createGain();
    fxBus.connect(ctx.destination); voBus.connect(ctx.destination);
    volumes();
  }
  return ctx;
}
function volumes() {
  if (fxBus) fxBus.gain.value = settings.effects;
  if (voBus) voBus.gain.value = settings.voice;
  if (music) music.volume = settings.music * (voice ? 0.4 : 1);
}
function load(url: string) {
  let p = buffers.get(url);
  if (!p) {
    const c = context();
    p = c ? fetch(url).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(url)))).then(b => c.decodeAudioData(b)).catch(() => null) : Promise.resolve(null);
    buffers.set(url, p);
  }
  return p;
}
const sfxUrl = (name: SfxName, n: number) => `/audio/sfx/${name}-${n}.mp3`;
const voUrl = (clip: VoClip) => `/audio/vo/${clip}.mp3`;
const audible = (level: number) => settings.enabled && level > 0 && typeof document !== "undefined" && !document.hidden;

function syncMusic() {
  if (!music) return;
  volumes();
  if (audible(settings.music)) void music.play().catch(() => {});
  else music.pause();
}
async function preload() {
  if (preloaded) return;
  preloaded = true;
  const urls = [
    ...Object.entries(SFX).flatMap(([name, n]) => Array.from({length: n}, (_, i) => sfxUrl(name as SfxName, i + 1))),
    ...(Object.keys(VO) as VoClip[]).map(voUrl),
  ];
  for (let i = 0; i < urls.length; i += 6) await Promise.all(urls.slice(i, i + 6).map(load));
}
function play(buffer: AudioBuffer, bus: GainNode, opts: {volume?: number; rate?: number; delay?: number; loop?: boolean} = {}) {
  const c = ctx!, src = c.createBufferSource(), gain = c.createGain();
  src.buffer = buffer; src.loop = !!opts.loop; src.playbackRate.value = opts.rate ?? 1;
  gain.gain.value = opts.volume ?? 1;
  src.connect(gain).connect(bus);
  src.start(c.currentTime + (opts.delay ?? 0) / 1000);
  live.add(src);
  src.onended = () => live.delete(src);
  return {src, gain};
}
function startVoice(clip: VoClip, priority: number) {
  const v: Voice = {src: null, priority, clip};
  voice = v; volumes();
  void load(voUrl(clip)).then(buffer => {
    if (voice !== v) return;
    if (!buffer || !voBus || !audible(settings.voice)) { endVoice(v); return; }
    const {src} = play(buffer, voBus, {rate: settings.animation === "fast" ? 2 : 1});
    v.src = src;
    src.addEventListener("ended", () => endVoice(v));
  });
}
function endVoice(v: Voice) {
  if (voice !== v) return;
  voice = null; volumes();
  const next = queued; queued = null;
  if (next && performance.now() - next.at < 2200) startVoice(next.clip, next.priority);
}

export const fairSound = {
  bindMusic(element:HTMLAudioElement|null) { if(music!==element)music?.pause(); music=element; syncMusic(); },
  get: () => settings,
  server: () => defaults,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  init() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      for (const key of ["music", "effects", "voice"] as const) if (typeof saved[key] === "number") settings[key] = Math.max(0, Math.min(1, saved[key]));
      if (["normal", "fast", "off"].includes(saved.animation)) settings.animation = saved.animation;
      else if (matchMedia("(prefers-reduced-motion: reduce)").matches) settings.animation = "off";
    } catch {}
    document.addEventListener("visibilitychange", () => { syncMusic(); if (document.hidden) this.cancel(); });
    settings = {...settings};
    publish();
  },
  /** Call from a click or tap: browsers only start audio after a user gesture. */
  set(patch: Partial<FairSettings>) {
    settings = {...settings, ...patch};
    try { localStorage.setItem(KEY, JSON.stringify({...settings, enabled: false})); } catch {}
    if (settings.enabled) { void context()?.resume(); void preload(); } else this.cancel();
    syncMusic(); volumes(); publish();
  },
  cancel() {
    generation++;
    for (const src of live) { try { src.stop(); } catch {} }
    live.clear();
    voice = null; queued = null; volumes();
  },
  /** One-shot effect; a random recording is picked from the variants. */
  effect(name: SfxName, opts: {volume?: number; rate?: number; delay?: number} = {}) {
    if (!audible(settings.effects) || !context()) return;
    const count = SFX[name];
    let n = 1 + Math.floor(Math.random() * count);
    if (count > 1 && n === lastVariant.get(name)) n = (n % count) + 1;
    lastVariant.set(name, n);
    const rate = (opts.rate ?? 1) * (0.96 + Math.random() * 0.08);
    const epoch = generation;
    void load(sfxUrl(name, n)).then(buffer => { if (epoch === generation && buffer && fxBus && audible(settings.effects)) play(buffer, fxBus, {...opts, rate}); });
  },
  /** A looping effect (the drive hum). Returns a function that fades it out. */
  loop(name: SfxName, volume = 0.5) {
    const epoch = generation;
    let stopped = false, node: {src: AudioBufferSourceNode; gain: GainNode} | null = null;
    if (audible(settings.effects) && context()) {
      void load(sfxUrl(name, 1)).then(buffer => {
        if (stopped || epoch !== generation || !buffer || !fxBus || !ctx || !audible(settings.effects)) return;
        node = play(buffer, fxBus, {loop: true, volume: 0});
        node.gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.12);
      });
    }
    return () => {
      stopped = true;
      if (!node || !ctx) return;
      const {src, gain} = node, t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + 0.18);
      try { src.stop(t + 0.2); } catch {}
    };
  },
  /**
   * The announcer. Priority 3 cuts in over anything; otherwise a busy announcer
   * keeps talking and the newest important line waits briefly in the queue.
   */
  say(clip: VoClip, priority = 1) {
    if (!audible(settings.voice) || !context()) return;
    if (!voice || priority > voice.priority || (priority === 3 && voice.priority === 3)) {
      if (voice?.src) { const old = voice.src; voice = null; try { old.stop(); } catch {} }
      startVoice(clip, priority);
    } else if (!queued || priority >= queued.priority) queued = {clip, priority, at: performance.now()};
  },
  /** How long a clip runs (ms), so the show can give the announcer room. */
  length(clip: VoClip) { return Math.round(VO[clip] / (settings.animation === "fast" ? 2 : 1)); },
  talking: () => !!voice,
  doubles() { this.effect("doubles"); this.effect("cheer", {delay: 150, volume: 0.7}); },
};
