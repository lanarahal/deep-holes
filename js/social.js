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
export const START_BALANCE = 100;
export const ADMIN_WALLET = "8radQBX8A5M2NPfQcjPDCRAPVUBzx2vhcVwQQtaPExR3";           // simulated SOL every user starts with
const KEY = "dh:net:v1";
const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("deep-holes") : null;

const empty = () => ({ chat: [], listings: {}, sales: [], balances: {}, bans: {}, engagement: {}, users: {} });
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
  if (isBanned(me.id)) return false;
  text = String(text || "").trim().slice(0, 300);
  const now = Date.now();
  if (!text || !me.id || now - lastSend < 800) return false;     // 0.8 s anti-spam
  lastSend = now;
  state.chat.push({ id: now + Math.random().toString(36).slice(2, 6), from: me.id, name: me.name, to: to || null, text, ts: now });
  state.chat = state.chat.slice(-300);
  save(); emit("chat");
  return true;
}
export const messages = () => state.chat;

/* ---------- engagement ---------- */
const engagementFor = (holeId) => {
  const k = String(holeId);
  if (!state.engagement[k]) state.engagement[k] = { views: 0, likes: 0, likedBy: {}, tips: 0, tipCount: 0 };
  return state.engagement[k];
};
export function visitHole(holeId, viewer) {
  if (!holeId || !viewer) return;
  const e = engagementFor(holeId); e.views += 1; save(); emit("engagement");
}
export function toggleLike(holeId, viewer) {
  if (!holeId || !viewer || isBanned(viewer)) return { liked: false, likes: engagementFor(holeId).likes };
  const e = engagementFor(holeId);
  if (e.likedBy[viewer]) { delete e.likedBy[viewer]; e.likes = Math.max(0, e.likes - 1); }
  else { e.likedBy[viewer] = true; e.likes += 1; }
  save(); emit("engagement"); return { liked: !!e.likedBy[viewer], likes: e.likes };
}
export function tipHole(holeId, from, amount, to = null) {
  amount = Number(amount);
  if (!holeId || !from || !(amount > 0) || isBanned(from) || balance(from) < amount) return { ok: false, err: "Invalid tip or insufficient balance." };
  const e = engagementFor(holeId); move(from, to, amount); e.tips += amount; e.tipCount += 1;
  state.sales.push({ kind: "tip", holeId, from, to, price: amount, ts: Date.now() });
  save(); emit("engagement"); emit("sales"); return { ok: true };
}
export const holeStats = (holeId, viewer = me.id) => { const e = engagementFor(holeId); return { views: e.views, likes: e.likes, tips: e.tips, tipCount: e.tipCount, liked: !!e.likedBy?.[viewer] }; };
export function playerStats(getHoles) {
  const map = new Map();
  getHoles().forEach(h => { const e = engagementFor(h.id); const old = map.get(h.owner) || { id: h.owner, name: h.username, holes: 0, views: 0, likes: 0, tips: 0 }; old.holes++; old.views += e.views; old.likes += e.likes; old.tips += e.tips; old.name = old.name || h.username; map.set(h.owner, old); });
  return [...map.values()].sort((a,b) => b.likes - a.likes || b.views - a.views || b.holes - a.holes);
}

/* ---------- local prototype moderation / admin tools ---------- */
export function deleteMessage(messageId, actor = me.id) {
  if (!isAdmin(actor)) return false;
  const before = state.chat.length; state.chat = state.chat.filter(m => m.id !== messageId);
  if (state.chat.length !== before) { save(); emit("chat"); return true; } return false;
}
export function editMessage(messageId, text, actor = me.id) {
  if (!isAdmin(actor)) return false; const m = state.chat.find(x => x.id === messageId); if (!m) return false;
  m.text = String(text || "").trim().slice(0, 300); m.edited = true; save(); emit("chat"); return true;
}
export function banUser(id, reason = "Moderation", actor = me.id) {
  if (!isAdmin(actor) || !id || id === ADMIN_WALLET) return false; state.bans[id] = { reason, ts: Date.now() }; save(); emit("moderation"); return true;
}
export function unbanUser(id, actor = me.id) {
  if (!isAdmin(actor)) return false; delete state.bans[id]; save(); emit("moderation"); return true;
}
export function deleteUserData(id, actor = me.id) {
  if (!isAdmin(actor) || !id || id === ADMIN_WALLET) return false;
  state.chat = state.chat.filter(m => m.from !== id && m.to !== id);
  delete state.balances[id]; delete state.users[id]; delete state.bans[id];
  Object.keys(state.listings).forEach(k => { if (state.listings[k]?.seller === id) delete state.listings[k]; });
  save(); emit("moderation"); emit("chat"); emit("market"); return true;
}
export function clearChat(actor = me.id) { if (!isAdmin(actor)) return false; state.chat = []; save(); emit("chat"); return true; }
export function resetEconomy(actor = me.id) { if (!isAdmin(actor)) return false; state.balances = {}; state.sales = []; state.listings = {}; save(); emit("sales"); emit("market"); return true; }
export function adminSnapshot() { return { bans: bannedUsers(), messages: [...state.chat], listings: { ...state.listings }, sales: [...state.sales] }; }

/* ---------- ledger (simulated balances) ---------- */
export const isAdmin = (id = me.id) => id === ADMIN_WALLET;
export const isBanned = (id) => !!state.bans[id];
export const bannedUsers = () => Object.entries(state.bans).map(([id, info]) => ({ id, ...(info || {}) }));
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
  if (hole?.special) return false;
  state.listings[hole.id] = { holeId: hole.id, seller: hole.owner, mode: customPrice == null ? "auto" : "custom", price: customPrice ?? null, ts: Date.now() };
  save(); emit("market");
}
export function unlist(hole) { delete state.listings[hole.id]; save(); emit("market"); }

export function buy(hole, buyer, price) {
  if (hole?.special) return { ok: false, err: "This special burrow is exclusive to its original owner." };
  const l = activeListing(hole);
  if (!l) return { ok: false, err: "This hole is no longer for sale." };
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
