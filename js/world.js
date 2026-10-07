/**
 * Procedural world – deterministic, so every layer/column is generated the
 * same way for every player and can go on forever (any depth, any x).
 */
export const TAU = Math.PI * 2;
export const hash = (a, b = 0, c = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + 13.37) * 43758.5453;
  return x - Math.floor(x);
};

// 8 base biomes; each further group of 8 shifts hue so layers never repeat exactly
const BIOMES = [
  { k: "topsoil", n: "Topsoil",      h: 28,  s: 45, l: 30, tx: "roots",  c: ["worm", "root"] },
  { k: "clay", n: "Clay",         h: 14,  s: 50, l: 30, tx: "pebble", c: ["beetle", "worm", "root"] },
  { k: "gravel", n: "Gravel",       h: 35,  s: 12, l: 36, tx: "pebble", c: ["mole", "goldworm", "beetle"] },
  { k: "stone", n: "Stone",        h: 215, s: 8,  l: 30, tx: "brick",  c: ["bat", "crystal", "skeleton"] },
  { k: "boneyard", n: "Boneyard",     h: 40,  s: 10, l: 20, tx: "bone",   c: ["skeleton", "bat", "bone"] },
  { k: "gold-vein", n: "Gold vein",    h: 42,  s: 40, l: 20, tx: "ore",    c: ["goldworm", "goldworm", "nugget"] },
  { k: "crystal-cave", n: "Crystal cave", h: 240, s: 35, l: 20, tx: "crys",   c: ["crystal", "diamond", "bat"] },
  { k: "magma", n: "Magma",        h: 8,   s: 60, l: 14, tx: "lava",   c: ["salamander", "diamond", "goldworm"] }
];
const cache = new Map();
export function biome(i) {
  if (!cache.has(i)) {
    const b = BIOMES[i % 8], tier = Math.floor(i / 8);
    cache.set(i, { ...b, i, tier, hue: tier * 47, h: (b.h + tier * 47) % 360, l: Math.max(8, b.l - tier * 1.5),
      name: b.n + (tier ? ` ${tier + 1}` : "") });
  }
  return cache.get(i);
}
export const hsl = (b, dl = 0, a = 1) => `hsla(${b.h},${b.s}%,${Math.max(3, b.l + dl)}%,${a})`;

// Surface changes every 1800px: new sky, ground, tree species and animals
export const REGIONS = [
  { id: "meadow", sky: ["#0c4a6e", "#38bdf8", "#bae6fd"], grass: "#4ade80", blade: "#22c55e", leaf: ["#14532d", "#166534", "#15803d"], trunk: "#78350f",
    trees: ["oak", "oak", "pine"], fauna: ["rabbit", "sheep", "fox", "deer", "sheep", "squirrel", "hedgehog"] },
  { id: "desert", sky: ["#7c2d12", "#fb923c", "#fde68a"], grass: "#e5b863", blade: "#b45309", leaf: ["#15803d", "#16a34a", "#4d7c0f"], trunk: "#92400e",
    trees: ["cactus", "palm", "cactus"], fauna: ["camel", "fennec", "snake"] },
  { id: "snow", sky: ["#1e293b", "#64748b", "#e2e8f0"], grass: "#f1f5f9", blade: "#cbd5e1", leaf: ["#0f766e", "#115e59", "#134e4a"], trunk: "#44403c",
    trees: ["pine", "pine", "oak"], fauna: ["polar", "wolf", "penguin", "sheep", "rabbit"] },
  { id: "fairy", sky: ["#4c1d95", "#c026d3", "#fbcfe8"], grass: "#f9a8d4", blade: "#db2777", leaf: ["#be185d", "#db2777", "#f472b6"], trunk: "#581c87",
    trees: ["oak", "palm", "oak"], fauna: ["unicorn", "sheep", "rabbit", "squirrel", "fox"] },
  { id: "jungle", sky: ["#052e16", "#15803d", "#bbf7d0"], grass: "#22c55e", blade: "#15803d", leaf: ["#064e3b", "#047857", "#10b981"], trunk: "#422006",
    trees: ["palm", "oak", "palm"], fauna: ["snake", "sheep", "squirrel", "deer", "hedgehog"] }
];
// Regions follow each other in a fixed order, every one exactly REGION_W px wide
export const REGION_W = 3000;
export const regionAt = (wx) => REGIONS[Math.floor(Math.max(0, wx) / REGION_W) % REGIONS.length];

/* ---------- depth / layers ---------- */
export const MAX_DEPTH = 50;          // deepest a hole can ever be
export const LAYER_DEPTHS = 5;        // 10 layers x 5 depth levels; every new layer = one more floor
export const layerOf = (d) => Math.ceil(Math.max(1, d) / LAYER_DEPTHS);

/* ---------- horizontal layout: 4 holes, then a gap with a billboard or a stall ---------- */
export const SLOT_W = 170, GROUP = 4, GAP = 300;
export const slotX = (x) => 120 + x * SLOT_W + Math.floor(x / GROUP) * GAP;
export const gapX = (n) => slotX(GROUP * n + GROUP - 1) + (SLOT_W + GAP) / 2;     // centre of gap n
export const SHOPS = [
  { k: "carrot", n: "Carrot Stand", e: "🥕", c: "#f97316" },
  { k: "tools", n: "Tool Shop", e: "⛏️", c: "#64748b" },
  { k: "potion", n: "Potion Stall", e: "🧪", c: "#a855f7" }
];
// every 4th gap (starting with gap 1) is a stall, all others are billboards
export const gapKind = (n) => (n % 4 === 1 ? { shop: SHOPS[Math.floor(n / 4) % SHOPS.length] } : { billboard: true });

/* ---------- hole entrance styles (picked when buying) ---------- */
export const HOLE_STYLES = ["Classic mound", "Stone ring", "Wooden door", "Mushroom hut", "Crystal gate", "Flower burrow", "Royal gate"];
export const SPECIAL_STYLE = 6;       // founder only

/* ---------- rabbit look (every character is different) ---------- */
const strHash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
function hueOf(col) {
  const m = /^hsla?\((\d+)/.exec(col || ""); if (m) return +m[1];
  const x = /^#?([0-9a-f]{6})$/i.exec(col || ""); if (!x) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(x[1].slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}
/** acc: 0 none, 1 scarf, 2 glasses, 3 bow, 4 flower, 5 crown (founder) */
export function lookFor(id, rabbit, crown = false) {
  const r = strHash(id), hue = Math.round(r * 360);
  const color = rabbit?.color || `hsl(${hue},65%,55%)`, ear = rabbit?.earColor || `hsl(${hue},60%,38%)`;
  return { color, ear, acc: crown ? 5 : Math.floor(strHash(id + "acc") * 5), hue: hueOf(color) };
}
