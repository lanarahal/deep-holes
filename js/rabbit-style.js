/**
 * Bunny closet: admin-managed, frame-aligned cosmetic sets.
 * Each optional layer is a transparent 10-frame 1280x160 PNG matching the base rabbit sheet.
 * Catalog, balances and ownership share the local social store. Move purchases to a server for production.
 */
import { store, balance, START_BALANCE } from "./social.js?v=18";
import * as eco from "./economy.js?v=18";

export const STYLE_LAYERS = [
  ["hat", "Hat"], ["outfit", "Outfit"], ["glasses", "Glasses"], ["mouth", "Mouth"], ["accessory", "Extra accessory"]
];
export const SHEET_WIDTH = 1280, SHEET_HEIGHT = 160, SHEET_FRAMES = 10;
const layerNames = new Set(STYLE_LAYERS.map(([k]) => k));
const state = () => {
  const s = store.get();
  if (!s.rabbitStyles || typeof s.rabbitStyles !== "object") s.rabbitStyles = { sets: [], players: {}, orders: [] };
  s.rabbitStyles.sets ||= []; s.rabbitStyles.players ||= {}; s.rabbitStyles.orders ||= [];
  return s.rabbitStyles;
};
const uid = () => `bunny-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const rabbitSets = ({ includeHidden = true } = {}) => state().sets.filter((x) => includeHidden || x.active !== false);
export const rabbitSet = (id) => state().sets.find((x) => x.id === id) || null;
export function saveRabbitSet(input) {
  const s = state(), id = input.id || uid(), now = Date.now();
  const rec = { ...input, id, layers: Object.fromEntries(Object.entries(input.layers || {}).filter(([k, v]) => layerNames.has(k) && typeof v === "string" && v.startsWith("data:image/png;base64,"))),
    name: String(input.name || "").trim().slice(0, 36), description: String(input.description || "").trim().slice(0, 180),
    currency: input.currency === "sol" ? "sol" : "cp", price: Math.max(0, Number(input.price) || 0), active: input.active !== false, tint: input.tint !== false,
    createdAt: input.createdAt || now, updatedAt: now };
  if (!rec.name || !Object.keys(rec.layers).length) return { ok: false, err: "Add a name and at least one transparent overlay layer." };
  if (!(rec.price > 0 && rec.price <= 1e7)) return { ok: false, err: "Set a positive price (up to 10,000,000)." };
  if (rec.currency === "cp" && !Number.isInteger(rec.price)) return { ok: false, err: "Carrot-point prices must be whole numbers." };
  const i = s.sets.findIndex((x) => x.id === id);
  const nextSets = [...s.sets]; if (i >= 0) nextSets[i] = rec; else nextSets.unshift(rec);
  const root = store.get();
  // localStorage is finite; reserve room for chat, holes and wallet data instead of silently losing a save.
  if (JSON.stringify({ ...root, rabbitStyles: { ...s, sets: nextSets } }).length > 3_000_000) return { ok: false, err: "The style catalog is too large for browser storage. Use smaller PNGs or delete unused sets." };
  s.sets = nextSets;
  store.commit("rabbit-styles");
  return { ok: true, set: rec };
}
export function removeRabbitSet(id) {
  const s = state(), set = s.sets.find((x) => x.id === id);
  if (!set) return false;
  s.sets = s.sets.filter((x) => x.id !== id);
  for (const p of Object.values(s.players)) { p.owned = (p.owned || []).filter((x) => x !== id); if (p.equipped === id) p.equipped = null; }
  store.commit("rabbit-styles"); return true;
}
export function setActive(id, active) {
  const set = rabbitSet(id); if (!set) return false;
  set.active = !!active; set.updatedAt = Date.now(); store.commit("rabbit-styles"); return true;
}
export function rabbitCloset(user) {
  const s = state(); if (!s.players[user]) s.players[user] = { owned: [], equipped: null };
  const p = s.players[user]; p.owned ||= []; if (!p.owned.includes(p.equipped)) p.equipped = null;
  return p;
}
export const ownsRabbitSet = (user, id) => rabbitCloset(user).owned.includes(id);
export const equippedRabbitSet = (user) => rabbitCloset(user).equipped;
export function equipRabbitSet(user, id) {
  if (!user) return { ok: false, err: "Connect a wallet or select a player profile first." };
  const p = rabbitCloset(user);
  if (id && !p.owned.includes(id)) return { ok: false, err: "You do not own this style set." };
  p.equipped = id || null; store.commit("rabbit-styles"); return { ok: true };
}
export function randomOwnedRabbitSet(user) {
  const p = rabbitCloset(user), list = p.owned.filter((id) => !!rabbitSet(id));
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}
export function buyRabbitSet(user, id) {
  if (!user) return { ok: false, err: "Connect your wallet before buying a style set." };
  const s = state(), root = store.get(), set = s.sets.find((x) => x.id === id && x.active !== false);
  if (!set) return { ok: false, err: "This set is no longer available." };
  const p = rabbitCloset(user);
  if (p.owned.includes(id)) return { ok: false, err: "You already own this set." };
  const w = eco.wallet(user), price = set.price;
  if (set.currency === "sol") {
    if (balance(user) + 1e-10 < price) return { ok: false, err: `Not enough simulated SOL. Price: ◎${price.toFixed(3)}.` };
    root.balances[user] = (root.balances[user] ?? START_BALANCE) - price;
  } else {
    if (w.cp < price) return { ok: false, err: `Not enough 🥕. Price: ${Math.ceil(price)} carrot points.` };
    w.cp -= price;
  }
  p.owned.push(id); p.equipped = id;
  s.orders.push({ id: uid(), user, setId: id, currency: set.currency, amount: price, ts: Date.now() });
  s.orders = s.orders.slice(-500);
  store.commit("rabbit-styles"); return { ok: true, set, cp: w.cp, sol: balance(user) };
}

const imageCache = new Map(), tintedCache = new Map();
function layerImage(src, tint, color) {
  if (!src) return null;
  let im = imageCache.get(src);
  if (!im) { im = new Image(); im.src = src; imageCache.set(src, im); }
  if (!im.complete || !im.naturalWidth) return null;
  if (!tint || !color) return im;
  const key = src + "|" + color;
  if (!tintedCache.has(key)) {
    if (tintedCache.size > 180) tintedCache.clear();
    const c = document.createElement("canvas"); c.width = SHEET_WIDTH; c.height = SHEET_HEIGHT;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0); x.globalCompositeOperation = "multiply"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in"; x.drawImage(im, 0, 0); tintedCache.set(key, c);
  }
  return tintedCache.get(key);
}
/** Draw only uploaded layers at native frame coordinates over the matching base frame. */
export function drawRabbitSet(ctx, id, frame, face = 1, color = null) {
  const set = rabbitSet(id); if (!set) return new Set();
  const used = new Set(), f = ((Math.floor(frame) % SHEET_FRAMES) + SHEET_FRAMES) % SHEET_FRAMES;
  ctx.save(); if (face < 0) ctx.scale(-1, 1);
  for (const [key] of STYLE_LAYERS) {
    const src = set.layers?.[key], im = layerImage(src, set.tint, color);
    if (!im) continue;
    ctx.drawImage(im, f * (SHEET_WIDTH / SHEET_FRAMES), 0, SHEET_WIDTH / SHEET_FRAMES, SHEET_HEIGHT, -32, -80, 64, 80);
    used.add(key);
  }
  ctx.restore(); return used;
}
