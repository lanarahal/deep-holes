/**
 * Sound effects and default themes use Web Audio synthesis. Optional music files under music/
 * override their matching theme; a missing/unsupported track falls back to its procedural tune.
 */
import { S, onSettings } from "./settings.js?v=18";

let ctx = null, master, musicBus, sfxBus, noiseBuf, rain, wind, cur = null, fileTrack = null, desiredTheme = null, themeSeq = 0, timer = null, nextT = 0, step = 0;
let outsideAmbience = { rain: 0, wind: 0 };
const MUSIC_VERSION = 1;
const trackBuffers = new Map();
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    musicBus.connect(master); sfxBus.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // A softer band of noise reads as rain without the piercing high-frequency hiss.
    rain = loopNoise("bandpass", 1150, 0.55); wind = loopNoise("lowpass", 500, 0.5);
    applyVolumes(); timer = setInterval(tick, 90); nextT = ctx.currentTime + .1;
    if (desiredTheme) void activateTheme(desiredTheme, ++themeSeq);
  }
  if (ctx.state === "suspended") ctx.resume();
}
function loopNoise(type, freq, q) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(master); src.start(); return { g, f };
}
function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(S.sound ? 1 : 0, t, .05); musicBus.gain.setTargetAtTime(S.music * .55, t, .1); sfxBus.gain.setTargetAtTime(S.sfx, t, .05);
}
onSettings(applyVolumes);
for (const ev of ["pointerdown", "keydown", "touchend"]) addEventListener(ev, unlock, { once: false, passive: true });
document.addEventListener("visibilitychange", () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });

/* ---------- building blocks ---------- */
function tone({ f, f2, dur = .15, type = "sine", vol = .2, at = 0, attack = .005, bus = sfxBus, lp }) {
  if (!ctx || !S.sound) return;
  const t = ctx.currentTime + Math.max(0, at), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = o; if (lp) { const b = ctx.createBiquadFilter(); b.type = "lowpass"; b.frequency.value = lp; o.connect(b); n = b; }
  n.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .05);
}
function noise({ dur = .1, vol = .2, at = 0, type = "lowpass", freq = 800, f2, q = 1, bus = sfxBus }) {
  if (!ctx || !S.sound) return;
  const t = ctx.currentTime + Math.max(0, at), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + .05);
}
const arp = (notes, step = .07, o = {}) => notes.forEach((m, i) => tone({ f: mtof(m), at: i * step, ...o }));

/* ---------- effects ---------- */
const SFX = {
  click: () => tone({ f: 880, f2: 640, dur: .06, type: "triangle", vol: .12 }),
  open: () => arp([72, 79], .06, { dur: .14, type: "sine", vol: .14 }),
  close: () => arp([79, 72], .05, { dur: .12, type: "sine", vol: .1 }),
  step: () => { noise({ dur: .06, vol: .1, freq: 500 + Math.random() * 250 }); tone({ f: 110 + Math.random() * 30, f2: 70, dur: .05, vol: .08 }); },
  dig: () => { for (let i = 0; i < 3; i++) noise({ dur: .12, vol: .22, at: i * .13, freq: 900, f2: 300 }); tone({ f: 90, f2: 45, dur: .4, vol: .3, at: .02 }); },
  deepen: () => { SFX.dig(); arp([60, 64, 67, 72, 76], .09, { type: "triangle", dur: .3, vol: .16, at: .35 }); },
  buy: () => { arp([76, 79, 83, 88], .08, { dur: .35, vol: .16 }); noise({ type: "highpass", freq: 6000, dur: .4, vol: .08, at: .2 }); },
  coin: () => { tone({ f: 1318, dur: .12, vol: .14 }); tone({ f: 1760, dur: .25, vol: .14, at: .08 }); },
  sell: () => { SFX.coin(); setTimeout(SFX.coin, 130); },
  enter: () => { noise({ type: "bandpass", freq: 1400, f2: 180, dur: .42, vol: .3, q: 2 }); tone({ f: 420, f2: 110, dur: .4, vol: .12, type: "triangle" }); },
  exit: () => { noise({ type: "bandpass", freq: 200, f2: 1600, dur: .4, vol: .26, q: 2 }); tone({ f: 130, f2: 480, dur: .38, vol: .1, type: "triangle" }); },
  stairs: () => { for (let i = 0; i < 4; i++) tone({ f: 130 + i * 8, f2: 90, dur: .07, at: i * .1, vol: .12, type: "square", lp: 500 }); },
  pop: () => tone({ f: 520, f2: 880, dur: .07, vol: .12 }),
  ding: () => { tone({ f: 1046, dur: .5, vol: .14, type: "triangle" }); tone({ f: 1568, dur: .6, vol: .08, at: .04 }); },
  error: () => { tone({ f: 190, dur: .12, type: "square", vol: .1, lp: 900 }); tone({ f: 150, dur: .16, type: "square", vol: .1, at: .13, lp: 900 }); },
  like: () => { tone({ f: 700, f2: 1000, dur: .1, vol: .14 }); tone({ f: 1000, f2: 1400, dur: .14, vol: .14, at: .08 }); },
  sparkle: () => { for (let i = 0; i < 7; i++) tone({ f: 1400 + Math.random() * 2400, dur: .18, vol: .07, at: i * .05 }); },
  rare: () => { SFX.sparkle(); arp([72, 76, 79, 84, 88], .08, { type: "triangle", dur: .5, vol: .12, at: .1 }); },
  fanfare: () => arp([60, 64, 67, 72, 67, 72, 79], .11, { type: "triangle", dur: .4, vol: .15 }),
  thunder: () => { noise({ dur: 1.8, vol: .26, freq: 160, f2: 40 }); noise({ dur: .5, vol: .13, freq: 600, f2: 100, at: .05 }); },
  party: () => { for (let i = 0; i < 6; i++) noise({ type: "highpass", freq: 3000, dur: .1, vol: .1, at: i * .07 }); arp([72, 76, 79, 84], .06, { dur: .3, vol: .12 }); }
};
export const sfx = (name) => { if (!ctx || !S.sound) return; try { SFX[name]?.(); } catch { /* audio is optional */ } };
export const vibrate = (ms) => { if (S.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* ignore */ } };
export function stepSound() { if (S.steps) sfx("step"); }

/* ---------- ambience (rain / wind) ---------- */
export function ambience({ rain: r = 0, wind: w = 0 }) {
  if (!ctx) return; const t = ctx.currentTime;
  rain.g.gain.setTargetAtTime(S.weather ? r * .055 : 0, t, .6); wind.g.gain.setTargetAtTime(S.weather ? w * .08 : 0, t, .8);
}

// The map records the current weather; a burrow can then muffle it without guessing the weather again.
export function surfaceAmbience({ rain: r = 0, wind: w = 0 }) {
  outsideAmbience = { rain: r, wind: w }; ambience(outsideAmbience);
}
export function burrowAmbience(floor) {
  ambience({ rain: floor === 0 ? outsideAmbience.rain * .018 : 0, wind: 0 });
}

/* ---------- music: optional user tracks, otherwise use the built-in procedural tunes ---------- */
const PENT = [0, 2, 4, 7, 9], MINP = [0, 3, 5, 7, 10];
const THEMES = {
  meadow:  { root: 60, scale: PENT, bpm: 84, lead: "triangle", chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], dens: .5, bass: 1 },
  desert:  { root: 57, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 72, lead: "sawtooth", lp: 1400, chords: [[0, 4, 7], [1, 5, 8], [0, 4, 7], [10, 14, 17]], dens: .45, bass: 1 },
  snow:    { root: 64, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 58, lead: "sine", chords: [[0, 4, 7, 11], [2, 6, 9], [4, 7, 11], [0, 4, 7, 11]], dens: .3, bass: 0 },
  fairy:   { root: 67, scale: PENT, bpm: 78, lead: "sine", chords: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14], [4, 7, 11, 14]], dens: .65, bass: 0, bell: 1 },
  jungle:  { root: 62, scale: MINP, bpm: 104, lead: "triangle", chords: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]], dens: .6, bass: 1, perc: 1 },
  burrow:  { root: 55, scale: PENT, bpm: 66, lead: "triangle", chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [0, 4, 7]], dens: .35, bass: 1 },
  deep:    { root: 48, scale: MINP, bpm: 54, lead: "sine", chords: [[0, 3, 7], [0, 3, 7], [-2, 2, 5], [0, 3, 7]], dens: .22, bass: 1, drip: 1 },
  bone:    { root: 50, scale: [0, 1, 3, 6, 7], bpm: 50, lead: "sine", chords: [[0, 3, 6], [0, 3, 6], [1, 4, 7], [0, 3, 6]], dens: .2, bass: 0, drip: 1 },
  gold:    { root: 52, scale: PENT, bpm: 68, lead: "triangle", chords: [[0, 4, 7], [4, 7, 11], [5, 9, 12], [7, 11, 14]], dens: .5, bass: 1, bell: 1 },
  crystal: { root: 72, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 62, lead: "sine", chords: [[0, 4, 7, 11], [2, 6, 9], [0, 4, 7, 11], [4, 7, 11]], dens: .55, bass: 0, bell: 1 },
  magma:   { root: 43, scale: [0, 1, 4, 5, 7, 8], bpm: 70, lead: "sawtooth", lp: 900, chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]], dens: .25, bass: 1, perc: 1 },
  cafe:    { root: 62, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 92, lead: "triangle", chords: [[0, 3, 7, 10], [5, 9, 12, 15], [-2, 2, 5, 9], [-5, 0, 4, 7]], dens: .45, bass: 1, jazz: 1 },
  party:   { root: 64, scale: PENT, bpm: 118, lead: "square", lp: 2400, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], dens: .8, bass: 1, kick: 1 }
};
const OLD_LAYER_FALLBACKS = ["burrow", "burrow", "deep", "deep", "bone", "gold", "crystal", "magma", "deep", "deep"];
export const MAP_LAYER_THEMES = Array.from({ length: 10 }, (_, i) => `map-layer-${i + 1}`);
export const ROOM_THEMES = Array.from({ length: 10 }, (_, i) => `burrow-${i + 1}`);
// Kept as an alias for older integrations.
export const LAYER_THEMES = OLD_LAYER_FALLBACKS;

const MUSIC_FILES = {
  meadow: "music/surface/meadow.mp3", desert: "music/surface/desert.mp3", snow: "music/surface/snow.mp3",
  fairy: "music/surface/fairy.mp3", jungle: "music/surface/jungle.mp3",
  "map-layer-1": "music/underground/layer-1-topsoil.mp3", "map-layer-2": "music/underground/layer-2-clay.mp3",
  "map-layer-3": "music/underground/layer-3-gravel.mp3", "map-layer-4": "music/underground/layer-4-stone.mp3",
  "map-layer-5": "music/underground/layer-5-boneyard.mp3", "map-layer-6": "music/underground/layer-6-gold-vein.mp3",
  "map-layer-7": "music/underground/layer-7-crystal-cave.mp3", "map-layer-8": "music/underground/layer-8-magma.mp3",
  "map-layer-9": "music/underground/layer-9-deep-topsoil.mp3", "map-layer-10": "music/underground/layer-10-deep-magma.mp3",
  ...Object.fromEntries(ROOM_THEMES.map((name, i) => [name, `music/burrows/floor-${i + 1}.mp3`])),
  cafe: "music/cafe/cafe.mp3", party: "music/party/party.mp3"
};
const FALLBACKS = Object.fromEntries([
  ...MAP_LAYER_THEMES.map((name, i) => [name, OLD_LAYER_FALLBACKS[i]]),
  ...ROOM_THEMES.map((name, i) => [name, OLD_LAYER_FALLBACKS[i]])
]);

function loadTrack(path) {
  if (!trackBuffers.has(path)) {
    const pending = fetch(`${path}?v=${MUSIC_VERSION}`)
      .then(async (r) => r.ok ? ctx.decodeAudioData(await r.arrayBuffer()) : null)
      .catch(() => null);
    trackBuffers.set(path, pending);
  }
  return trackBuffers.get(path);
}

function fadeOutCurrent() {
  if (!ctx) { cur = null; fileTrack = null; return; }
  const t = ctx.currentTime, oldSynth = cur, oldFile = fileTrack;
  cur = null; fileTrack = null;
  if (oldSynth?.g) {
    oldSynth.g.gain.setTargetAtTime(0, t, .35);
    setTimeout(() => { try { oldSynth.g.disconnect(); } catch { /* already stopped */ } }, 2200);
  }
  if (oldFile) {
    oldFile.gain.gain.setTargetAtTime(0, t, .35);
    try { oldFile.source.stop(t + 1.8); } catch { /* already stopped */ }
    setTimeout(() => { try { oldFile.source.disconnect(); oldFile.gain.disconnect(); } catch { /* already stopped */ } }, 2200);
  }
}

function startSynth(name, fallbackName) {
  const T = THEMES[fallbackName];
  if (!ctx || !T) return;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.connect(musicBus);
  g.gain.setTargetAtTime(1, ctx.currentTime, .8);
  cur = { name, T, g }; step = 0; nextT = ctx.currentTime + .1;
}

async function activateTheme(name, request) {
  const fallbackName = FALLBACKS[name] || name, T = THEMES[fallbackName];
  if (!ctx || !T) return;
  const path = MUSIC_FILES[name];
  let buffer = null;
  if (path) buffer = await loadTrack(path);
  if (request !== themeSeq || name !== desiredTheme || !ctx) return;
  fadeOutCurrent();
  if (buffer) {
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer; source.loop = true; source.connect(gain); gain.connect(musicBus);
    gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.setTargetAtTime(1, ctx.currentTime, .8);
    source.start(); fileTrack = { source, gain };
  } else startSynth(name, fallbackName);
}

export function theme(name) {
  const fallbackName = FALLBACKS[name] || name;
  if (!THEMES[fallbackName] || desiredTheme === name) return;
  desiredTheme = name;
  const request = ++themeSeq;
  if (!ctx) { cur = { name, T: THEMES[fallbackName], g: null, pending: true }; return; }
  void activateTheme(name, request);
}
function note(m, at, dur, type, vol, lp) { if (!cur?.g) return; const t = at - ctx.currentTime; tone({ f: mtof(m), dur, type, vol, at: Math.max(0, t), bus: cur.g, attack: .02, lp }); }
function tick() {
  if (!ctx || !S.sound || S.music <= 0.01 || !cur) return;
  if (!cur.g) { const n = cur.name; cur = null; theme(n); }        // a theme was chosen before the first tap unlocked audio
  if (!cur?.g) return;
  const T = cur.T, sp = 60 / T.bpm / 2;                       // eighth-note length
  while (nextT < ctx.currentTime + .25) {
    const bar = Math.floor(step / 8) % T.chords.length, beat = step % 8, ch = T.chords[bar], t = nextT;
    if (beat === 0) ch.forEach((n) => note(T.root + n - 12, t, sp * 8, "sine", .05, 900));          // pad
    if (T.bass && beat % 4 === 0) note(T.root + ch[0] - 24, t, sp * 3, "triangle", .12, 500);
    if (Math.random() < T.dens && beat % 2 === (T.jazz ? 1 : 0)) {
      const d = rnd(T.scale) + 12 * (Math.random() < .3 ? 1 : 0); note(T.root + d + (T.bell ? 12 : 0), t, T.bell ? sp * 5 : sp * 2, T.lead, T.bell ? .07 : .08, T.lp);
    }
    if (T.kick && beat % 2 === 0) { tone({ f: 120, f2: 45, dur: .16, vol: .2, at: t - ctx.currentTime, bus: cur.g }); }
    if (T.kick || T.perc || T.jazz) { if (beat % 2 === 1 || T.kick) noise({ type: "highpass", freq: 6500, dur: .05, vol: T.jazz ? .035 : .05, at: Math.max(0, t - ctx.currentTime), bus: cur.g }); }
    if (T.perc && beat % 4 === 2) tone({ f: 200, f2: 150, dur: .08, type: "triangle", vol: .09, at: Math.max(0, t - ctx.currentTime), bus: cur.g });
    if (T.drip && Math.random() < .08) tone({ f: 1500 + Math.random() * 900, f2: 900, dur: .22, vol: .05, at: Math.max(0, t - ctx.currentTime), bus: cur.g });
    nextT += sp; step++;
  }
}
