/**
 * Network layer – LOCAL driver.
 * Chat, presence, market listings and the money ledger. Everything is kept in
 * localStorage and synced between tabs of the same browser with a
 * BroadcastChannel, so it works on a static site (GitHub Pages) for testing.
 *
 * !! It is NOT multi-user over the internet. To go live, re-implement this
 *    file's exported functions against a server (Supabase Realtime, Firebase…)
 *    and move the money/ownership checks to the server or a Solana program.
 */
export const START_BALANCE = 100;           // simulated SOL every user starts with
const KEY = "dh:net:v1";
const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("deep-holes") : null;

const empty = () => ({ chat: [], listings: {}, sales: [], balances: {}, visits: {}, likes: {}, tips: {}, tipLog: [], banned: {}, ads: {}, overrides: {}, notice: "" });
const load = () => { try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return empty(); } };
let state = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ } bc?.postMessage({ t: "state" }); };

const listeners = new Set();
const emit = (e) => listeners.forEach((fn) => fn(e));
export const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/* ---------- presence ---------- */
let me = { id: null, name: "" };
const peers = new Map();                    // id -> { id, name, ts }
const beat = (t = "hb") => me.id && bc?.postMessage({ t, id: me.id, name: me.name });
export function setMe(m) { me = m; beat("hello"); emit("presence"); }
setInterval(() => {
  beat();
  const now = Date.now();
  for (const [id, p] of peers) if (now - p.ts > 15000) { peers.delete(id); emit("presence"); }
}, 5000);
addEventListener("pagehide", () => beat("bye"));
bc && (bc.onmessage = ({ data: m }) => {
  if (m.t === "state") { state = load(); emit("change"); }
  else if (m.t === "bye") { peers.delete(m.id); emit("presence"); }
  else if (m.id && m.id !== me.id) { peers.set(m.id, { id: m.id, name: m.name, ts: Date.now() }); if (m.t === "hello") beat(); emit("presence"); }
});
export const online = () => [{ id: me.id, name: me.name, self: true }, ...[...peers.values()].map((p) => ({ ...p, self: false }))].filter((p) => p.id);
export const peerName = (id) => peers.get(id)?.name;

/* ---------- chat (global: to = null, direct: to = user id) ---------- */
let lastSend = 0;
export function send(to, text) {
  text = String(text || "").trim().slice(0, 300);
  const now = Date.now();
  if (!text || !me.id || state.banned[me.id] || now - lastSend < 800) return false;     // 0.8 s anti-spam, banned users cannot talk
  lastSend = now;
  state.chat.push({ id: now + Math.random().toString(36).slice(2, 6), from: me.id, name: me.name, to: to || null, text, ts: now });
  state.chat = state.chat.slice(-300);
  save(); emit("chat");
  return true;
}
export const messages = () => state.chat;

/* ---------- ledger (simulated balances) ---------- */
export const balance = (u) => state.balances[u] ?? START_BALANCE;
const move = (from, to, amt) => { state.balances[from] = balance(from) - amt; if (to) state.balances[to] = balance(to) + amt; };

export function recordPrimary(hole, price) {             // buying a brand-new hole from the game
  move(hole.owner, null, price);
  state.sales.push({ kind: "primary", holeId: hole.id, from: null, to: hole.owner, price, ts: Date.now() });
  save(); emit("sales");
}

/* ---------- market ---------- */
export const activeListing = (hole) => { const l = state.listings[hole.id]; return l && l.seller === hole.owner ? l : null; };
export function listHole(hole, customPrice) {              // customPrice = number | null (automatic)
  if (hole.special || state.banned[hole.owner]) return;       // the founder hole is never for sale
  state.listings[hole.id] = { holeId: hole.id, seller: hole.owner, mode: customPrice == null ? "auto" : "custom", price: customPrice ?? null, ts: Date.now() };
  save(); emit("market");
}
export function unlist(hole) { delete state.listings[hole.id]; save(); emit("market"); }

export function buy(hole, buyer, price) {
  const l = activeListing(hole);
  if (!l) return { ok: false, err: "This hole is no longer for sale." };
  if (state.banned[buyer]) return { ok: false, err: "Your account is banned." };
  if (buyer === hole.owner) return { ok: false, err: "You already own this hole." };
  if (l.mode === "custom" && Math.abs(l.price - price) > 1e-9) return { ok: false, err: "The price changed. Please reopen the listing." };
  if (balance(buyer) < price) return { ok: false, err: "Not enough balance." };
  const seller = hole.owner;
  move(buyer, seller, price);
  state.sales.push({ kind: "resale", holeId: hole.id, from: seller, to: buyer, price, ts: Date.now() });
  delete state.listings[hole.id];
  save(); emit("sales");
  return { ok: true, seller };
}

/** Re-apply ownership changes from the sales history (other tabs / after reload). */
export function replay(transfer) {
  let changed = false;
  for (const s of state.sales) if (s.kind === "resale" && transfer(s.holeId, s.from, s.to)) changed = true;
  return changed;
}
export const sales = () => state.sales;
export function stats() {
  const t = { total: 0, count: state.sales.length, primary: 0, resale: 0, primaryCount: 0, resaleCount: 0 };
  for (const s of state.sales) {
    t.total += s.price;
    if (s.kind === "primary") { t.primary += s.price; t.primaryCount++; } else { t.resale += s.price; t.resaleCount++; }
  }
  return t;
}

/* ---------- visits, likes, tips ---------- */
export function recordVisit(holeId, visitor) {            // same visitor counts once per 30 minutes
  const v = (state.visits[holeId] ||= { n: 0, u: {} }), now = Date.now();
  if (!v.u[visitor] || now - v.u[visitor] > 30 * 60000) v.n++;
  v.u[visitor] = now;
  save(); emit("stats");
}
export const holeStats = (id) => ({
  visits: state.visits[id]?.n || 0, unique: Object.keys(state.visits[id]?.u || {}).length,
  likes: (state.likes[id] || []).length, tips: state.tips[id]?.total || 0, tipCount: state.tips[id]?.n || 0
});
export const hasLiked = (id, user) => (state.likes[id] || []).includes(user);
export function toggleLike(id, user) {                     // returns true if now liked
  if (state.banned[user]) return false;
  const a = (state.likes[id] ||= []), i = a.indexOf(user);
  i < 0 ? a.push(user) : a.splice(i, 1);
  save(); emit("stats");
  return i < 0;
}
export function tip(hole, from, amount) {
  if (state.banned[from]) return { ok: false, err: "Your account is banned." };
  if (from === hole.owner) return { ok: false, err: "You cannot tip yourself." };
  if (!(amount > 0)) return { ok: false, err: "Enter an amount above 0." };
  if (balance(from) < amount) return { ok: false, err: "Not enough balance." };
  move(from, hole.owner, amount);
  const t = (state.tips[hole.id] ||= { total: 0, n: 0 });
  t.total += amount; t.n++;
  state.tipLog.push({ holeId: hole.id, from, to: hole.owner, amount, ts: Date.now() });
  state.tipLog = state.tipLog.slice(-200);
  save(); emit("stats");
  return { ok: true };
}
export function totals() {
  const t = { likes: 0, visits: 0, tips: 0 };
  for (const k in state.likes) t.likes += state.likes[k].length;
  for (const k in state.visits) t.visits += state.visits[k].n;
  for (const k in state.tips) t.tips += state.tips[k].total;
  return t;
}

/* ---------- moderation / admin (the UI only offers these to the admin wallet) ---------- */
export const isBanned = (id) => !!state.banned[id];
export const bannedIds = () => Object.keys(state.banned);
export function ban(id, on = true) { on ? (state.banned[id] = { at: Date.now() }) : delete state.banned[id]; save(); emit("change"); }
export function deleteMessage(id) { state.chat = state.chat.filter((m) => m.id !== id); save(); emit("chat"); }
export function clearChat() { state.chat = []; save(); emit("chat"); }
export function purgeUser(id) {                              // chat, likes, balance of a deleted user
  state.chat = state.chat.filter((m) => m.from !== id && m.to !== id);
  for (const k in state.likes) state.likes[k] = state.likes[k].filter((u) => u !== id);
  delete state.balances[id];
  save(); emit("change");
}
export function setBalance(user, value) { state.balances[user] = Math.max(0, +value || 0); save(); emit("sales"); }
export function clearListings() { state.listings = {}; save(); emit("market"); }
export const overrides = () => state.overrides;
export function setOverride(holeId, patch) {
  state.overrides[holeId] = { ...state.overrides[holeId], ...patch };
  if (patch.deleted) delete state.listings[holeId];
  save(); emit("change");
}
export const getAd = (n) => state.ads[n] || null;
export function setAd(n, ad) { state.ads[n] = ad; save(); emit("change"); }
export const notice = () => state.notice;
export function setNotice(t) { state.notice = String(t || "").slice(0, 200); save(); emit("change"); }
