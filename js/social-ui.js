/**
 * Social UI: chat (global + direct), leaderboard, market and sell/buy panel.
 * All dynamic text is inserted with textContent / text nodes (no innerHTML).
 */
import * as net from "./social.js?v=8";
import { priceBreakdown, autoPriceSol, fmtSol, fmtUsd, SOL_USD } from "./pricing.js?v=8";
import { floorCount } from "./data.js?v=8";

const h = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter((k) => k != null)); return e; };
const btn = (text, cls, fn) => { const b = h("button", "btn btn-small " + (cls || ""), text); b.type = "button"; b.addEventListener("click", fn); return b; };
const short = (a) => (a && a.length > 12 ? a.slice(0, 4) + "…" + a.slice(-4) : a);
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "now" : m < 60 ? m + "m" : Math.round(m / 60) + "h"; };

export function initSocial(ctx) {
  const { getHoles, session, goToHole, transfer, onOwnership } = ctx;
  const guestId = (() => {
    try { let g = sessionStorage.getItem("dh:guest"); if (!g) { g = "guest-" + Math.random().toString(36).slice(2, 6); sessionStorage.setItem("dh:guest", g); } return g; }
    catch { return "guest-" + Math.random().toString(36).slice(2, 6); }
  })();
  const meId = () => session.wallet || guestId;
  const nameOf = (id) => getHoles().find((x) => x.owner === id)?.username || net.peerName(id) || (id?.startsWith("guest-") ? "Guest " + id.slice(6) : short(id));
  const priceOf = (hole) => { const l = net.activeListing(hole); return l?.mode === "custom" ? l.price : autoPriceSol(hole, getHoles()); };
  const money = (sol) => `${fmtSol(sol)} (~${fmtUsd(sol * SOL_USD)})`;

  /* ---------- modal shell ---------- */
  function modal(title, wide) {
    const body = h("div", "sx-body"), close = btn("Close", "btn-secondary", () => root.classList.add("hidden"));
    const root = h("div", "modal hidden", h("div", "modal-content" + (wide ? " wide" : ""), h("h2", null, title), body, h("div", "modal-actions", close)));
    root.addEventListener("pointerdown", (e) => { if (e.target === root) root.classList.add("hidden"); });
    document.body.append(root);
    return { root, body, open() { root.classList.remove("hidden"); }, isOpen: () => !root.classList.contains("hidden") };
  }
  const lbModal = modal("🏆 Leaderboard", true), mkModal = modal("🏪 Market", true), trModal = modal("Trade hole");

  /* ---------- top bar ---------- */
  const area = document.querySelector(".top-bar .wallet-area");
  const balBadge = h("span", "badge", "");
  const lbBtn = btn("🏆 Leaderboard", "btn-secondary", () => { renderLeaderboard(); lbModal.open(); });
  const mkBtn = btn("🏪 Market", "btn-secondary", () => { renderMarket(); mkModal.open(); });
  area.prepend(lbBtn, mkBtn, balBadge);
  const updateBalance = () => { balBadge.textContent = "Balance " + fmtSol(net.balance(session.user)); balBadge.title = "Simulated balance (demo)"; };

  /* ---------- for-sale flags drawn on the map ---------- */
  const syncFlags = () => getHoles().forEach((x) => { x._sale = net.activeListing(x) ? fmtSol(priceOf(x)) : null; });

  /* ================= CHAT ================= */
  let tab = "global", peer = null, chatOpen = false;
  const lastRead = {};
  const fab = h("button", "chat-fab", "💬"), badge = h("span", "chat-badge hidden");
  fab.append(badge); fab.title = "Chat";
  const gTab = btn("Global", "", () => { tab = "global"; peer = null; renderChat(); });
  const dTab = btn("Messages", "", () => { tab = "dm"; peer = null; renderChat(); });
  const peerTitle = h("span", "chat-peer");
  const list = h("div", "chat-list"), input = h("input", ""), sendBtn = btn("Send", "", doSend);
  input.type = "text"; input.maxLength = 300; input.placeholder = "Write a message…";
  input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") doSend(); });   // keep WASD/arrows for the game
  const panel = h("div", "chat-panel hidden",
    h("div", "chat-head", gTab, dTab, peerTitle, btn("✕", "btn-secondary", () => toggleChat(false))), list, h("div", "chat-foot", input, sendBtn));
  document.body.append(fab, panel);
  fab.addEventListener("click", () => toggleChat(!chatOpen));

  const convoOf = (m) => (m.from === meId() ? m.to : m.from);
  const globalMsgs = () => net.messages().filter((m) => !m.to);
  const dmMsgs = (p) => net.messages().filter((m) => m.to && ((m.from === meId() && m.to === p) || (m.from === p && m.to === meId())));
  const unreadIn = (msgs, key) => msgs.filter((m) => m.from !== meId() && m.ts > (lastRead[key] ?? sessionStart)).length;
  const sessionStart = Date.now();

  function toggleChat(open) { chatOpen = open; panel.classList.toggle("hidden", !open); renderChat(); if (open) input.focus(); }
  function openDM(id) {
    if (!id || id === meId()) return;
    tab = "dm"; peer = id; toggleChat(true);
  }
  function doSend() {
    if (tab === "dm" && !peer) return;
    if (net.send(tab === "global" ? null : peer, input.value)) { input.value = ""; renderChat(); }
  }
  function renderChat() {
    gTab.classList.toggle("on", tab === "global"); dTab.classList.toggle("on", tab === "dm");
    const open = chatOpen;
    if (open) {
      if (tab === "global") lastRead.global = Date.now();
      else if (peer) lastRead[peer] = Date.now();
    }
    // unread badge
    const dmPeers = new Set(net.messages().filter((m) => m.to && (m.from === meId() || m.to === meId())).map(convoOf));
    let unread = (open && tab === "global") ? 0 : unreadIn(globalMsgs(), "global");
    dmPeers.forEach((p) => { if (!(open && tab === "dm" && peer === p)) unread += unreadIn(dmMsgs(p), p); });
    badge.textContent = unread > 9 ? "9+" : unread; badge.classList.toggle("hidden", !unread);
    if (!open) return;

    list.replaceChildren(); peerTitle.textContent = "";
    input.disabled = sendBtn.disabled = tab === "dm" && !peer;
    if (tab === "dm" && !peer) {                                   // conversation list
      input.placeholder = "Pick a conversation first";
      if (!dmPeers.size) list.append(h("p", "chat-empty", "No messages yet. Click a name in the Leaderboard or the room to start one."));
      [...dmPeers].forEach((p) => {
        const msgs = dmMsgs(p), last = msgs[msgs.length - 1], un = unreadIn(msgs, p);
        const row = h("button", "chat-convo", h("b", null, nameOf(p)), h("span", null, last?.text.slice(0, 40) || ""), un ? h("i", null, String(un)) : null);
        row.type = "button"; row.addEventListener("click", () => { peer = p; renderChat(); });
        list.append(row);
      });
      return;
    }
    input.placeholder = tab === "global" ? "Message everyone…" : "Message " + nameOf(peer) + "…";
    if (tab === "dm") {
      peerTitle.textContent = nameOf(peer);
      if (peer.startsWith("demo") || peer === "you") list.append(h("p", "chat-empty", "This is a demo account – nobody will answer."));
    }
    const msgs = tab === "global" ? globalMsgs() : dmMsgs(peer);
    if (!msgs.length) list.append(h("p", "chat-empty", tab === "global" ? "Say hi to everyone online." : "No messages yet."));
    msgs.slice(-80).forEach((m) => {
      const self = m.from === meId(), who = h("button", "chat-name", self ? "You" : m.name || short(m.from));
      who.type = "button"; who.disabled = self; who.addEventListener("click", () => openDM(m.from));
      list.append(h("div", "chat-msg" + (self ? " me" : ""), h("div", "chat-meta", who, h("span", null, ago(m.ts))), h("div", "chat-text", m.text)));
    });
    list.scrollTop = list.scrollHeight;
  }

  /* ================= LEADERBOARD ================= */
  const stat = (label, value, sub) => h("div", "sx-stat", h("small", null, label), h("b", null, value), sub ? h("span", null, sub) : null);
  function renderLeaderboard() {
    const holes = getHoles(), st = net.stats(), on = net.online();
    const b = lbModal.body; b.replaceChildren();
    b.append(h("div", "sx-stats",
      stat("Online now", String(on.length)),
      stat("Holes dug", String(holes.length)),
      stat("Total hole sales", fmtSol(st.total), `~${fmtUsd(st.total * SOL_USD)} · ${st.count} sales`),
      stat("New / resold", `${fmtSol(st.primary)} / ${fmtSol(st.resale)}`, `${st.primaryCount} new · ${st.resaleCount} resold`)));

    b.append(h("h3", null, `Online (${on.length})`));
    const chips = h("div", "sx-chips");
    on.forEach((u) => { const c = btn(u.self ? "You" : u.name || short(u.id), u.self ? "btn-secondary" : "", () => { lbModal.root.classList.add("hidden"); openDM(u.id); }); c.disabled = u.self; chips.append(c); });
    b.append(chips);

    b.append(h("h3", null, "Deepest holes"));
    const rows = [...holes].sort((x, y) => y.depth - x.depth).slice(0, 10);
    const table = h("div", "sx-table");
    rows.forEach((x, i) => {
      const l = net.activeListing(x), row = h("button", "sx-row" + (i === 0 ? " top" : ""),
        h("span", "rk", i === 0 ? "👑" : "#" + (i + 1)), h("span", "nm", x.username || "Hole " + x.id), h("span", null, `Depth ${x.depth}`),
        h("span", "pr", money(priceOf(x))), h("span", "tag" + (l ? " sale" : ""), l ? "For sale" : "Not listed"));
      row.type = "button"; row.addEventListener("click", () => { lbModal.root.classList.add("hidden"); goToHole(x); });
      table.append(row);
    });
    if (!rows.length) table.append(h("p", "chat-empty", "No holes yet."));
    b.append(table, h("p", "modal-desc", "Prices: the listed price if the hole is for sale, otherwise its automatic value."));
  }

  /* ================= MARKET ================= */
  function renderMarket() {
    const holes = getHoles(), b = mkModal.body; b.replaceChildren();
    b.append(h("p", "modal-desc", `Your balance: ${money(net.balance(session.user))} · simulated`));
    const items = holes.filter((x) => net.activeListing(x)).sort((x, y) => priceOf(x) - priceOf(y));
    const grid = h("div", "sx-table");
    items.forEach((x) => {
      const l = net.activeListing(x), mine = x.owner === session.user;
      const row = h("div", "sx-row static", h("span", "nm", x.username || "Hole " + x.id), h("span", null, `Depth ${x.depth}`),
        h("span", null, `Slot ${x.x + 1}`), h("span", "pr", money(priceOf(x))), h("span", "tag", l.mode === "auto" ? "auto price" : "asking"),
        btn("View", "btn-secondary", () => { mkModal.root.classList.add("hidden"); goToHole(x); }),
        mine ? h("span", "tag", "yours") : btn("Buy", "", () => openTrade(x)));
      grid.append(row);
    });
    if (!items.length) grid.append(h("p", "chat-empty", "Nothing for sale right now. Owners can list a hole from inside it."));
    b.append(h("h3", null, "For sale"), grid, h("h3", null, "Recent sales"));
    const recent = h("div", "sx-table");
    [...net.sales()].slice(-8).reverse().forEach((s) => recent.append(h("div", "sx-row static",
      h("span", "nm", `Hole #${s.holeId}`), h("span", null, s.kind === "primary" ? "new" : "resale"), h("span", null, `${nameOf(s.from) || "game"} → ${nameOf(s.to)}`),
      h("span", "pr", money(s.price)), h("span", "tag", ago(s.ts)))));
    if (!net.sales().length) recent.append(h("p", "chat-empty", "No sales yet."));
    b.append(recent);
  }

  /* ================= TRADE (sell / buy) ================= */
  let tradeHole = null, confirming = false;
  function openTrade(hole) { tradeHole = hole; confirming = false; renderTrade(); trModal.open(); }
  function renderTrade() {
    const hole = tradeHole, b = trModal.body; b.replaceChildren();
    if (!hole) return;
    const bd = priceBreakdown(hole, getHoles()), l = net.activeListing(hole), mine = hole.owner === session.user;
    b.append(h("p", "modal-desc", `${hole.username || "Hole " + hole.id} · depth ${hole.depth} · ${floorCount(hole.depth)} floors · slot ${hole.x + 1}`),
      h("div", "sx-break",
        h("div", null, h("span", null, `Depth ${hole.depth} (4 × depth^1.15)`), h("b", null, fmtUsd(bd.base))),
        h("div", null, h("span", null, `Location: ${bd.dist} slot${bd.dist === 1 ? "" : "s"} from the first house`), h("b", null, "× " + bd.mult.toFixed(2))),
        h("div", "tot", h("span", null, "Automatic price"), h("b", null, money(bd.sol)))));

    if (mine) {
      const auto = h("input"), cust = h("input"), price = h("input");
      auto.type = cust.type = "radio"; auto.name = cust.name = "mode"; auto.checked = !l || l.mode === "auto"; cust.checked = l?.mode === "custom";
      price.type = "number"; price.min = "0.001"; price.step = "0.001"; price.value = l?.mode === "custom" ? l.price : bd.sol.toFixed(3);
      price.addEventListener("focus", () => (cust.checked = true));
      price.addEventListener("keydown", (e) => e.stopPropagation());
      const msg = h("p", "sx-err");
      b.append(h("label", "sx-opt", auto, " Automatic price (follows depth and location)"),
        h("label", "sx-opt", cust, " My asking price (◎ SOL) ", price), msg,
        h("div", "modal-actions", l ? btn("Remove listing", "btn-secondary", () => { net.unlist(hole); trModal.root.classList.add("hidden"); changed(); }) : null,
          btn(l ? "Update listing" : "List for sale", "", () => {
            const v = parseFloat(price.value);
            if (cust.checked && !(v > 0 && v < 1e6)) { msg.textContent = "Enter a price above 0."; return; }
            net.listHole(hole, cust.checked ? v : null); trModal.root.classList.add("hidden"); changed();
          })));
    } else {
      const price = priceOf(hole), err = h("p", "sx-err");
      b.append(h("p", null, l ? `Price: ${money(price)}` : "This hole is not for sale. Its estimated value is above."), h("p", "modal-desc", `Your balance: ${money(net.balance(session.user))}`), err);
      const row = h("div", "modal-actions", btn("💬 Message owner", "btn-secondary", () => { trModal.root.classList.add("hidden"); openDM(hole.owner); }));
      if (l) row.append(btn(confirming ? "Click again to confirm" : "Buy now (simulated)", "", () => {
        if (!confirming) { confirming = true; renderTrade(); return; }
        const r = net.buy(hole, session.user, price);
        if (!r.ok) { confirming = false; renderTrade(); trModal.body.querySelector(".sx-err").textContent = r.err; return; }
        transfer(hole.id, r.seller, session.user); changed(); trModal.root.classList.add("hidden");
      }));
      b.append(row);
    }
  }
  function changed() { refreshAll(); onOwnership?.(); }

  /* ---------- room header buttons ---------- */
  let tradeArea = null;
  function updateTrade(hole, isOwner) {
    const host = document.getElementById("room-info");
    if (!tradeArea) { tradeArea = h("div", "trade-area"); host.append(tradeArea); }
    tradeArea.replaceChildren();
    if (!hole) return;
    const l = net.activeListing(hole);
    if (isOwner) tradeArea.append(btn(l ? `For sale · ${fmtSol(priceOf(hole))}` : "Sell hole", "btn-secondary", () => openTrade(hole)));
    else {
      if (l) tradeArea.append(btn(`Buy · ${fmtSol(priceOf(hole))}`, "", () => openTrade(hole)));
      else tradeArea.append(btn("Value", "btn-secondary", () => openTrade(hole)));
      tradeArea.append(btn("💬 Message", "btn-secondary", () => openDM(hole.owner)));
    }
    tradeArea.dataset.hole = hole.id; tradeArea.dataset.owner = isOwner ? "1" : "";
  }

  /* ---------- sync ---------- */
  function refreshAll() {
    net.replay(transfer);
    syncFlags(); updateBalance(); renderChat();
    if (lbModal.isOpen()) renderLeaderboard();
    if (mkModal.isOpen()) renderMarket();
    if (trModal.isOpen()) renderTrade();
    if (tradeArea?.dataset.hole) { const x = getHoles().find((q) => q.id === +tradeArea.dataset.hole); if (x) updateTrade(x, x.owner === session.user); }
  }
  net.on((e) => { if (e === "change") { net.replay(transfer); onOwnership?.(); } refreshAll(); });

  function refreshIdentity() { net.setMe({ id: meId(), name: nameOf(meId()) }); refreshAll(); }
  refreshIdentity();
  net.replay(transfer); syncFlags(); updateBalance();

  return {
    updateTrade, openDM, refreshIdentity, refreshAll,
    afford: (sol) => net.balance(session.user) >= sol,
    primarySale: (hole, sol) => net.recordPrimary(hole, sol)
  };
}
