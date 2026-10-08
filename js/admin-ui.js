/**
 * Admin panel (only offered to ADMIN_WALLET). Moderation, holes, users, billboards and stalls.
 * NOTE: this is client-side. With the local driver every change only affects this browser.
 * When you move to a real backend, enforce admin rights on the SERVER (verify a signed message
 * from the admin wallet) - never trust the browser.
 */
import { HOLE_STYLES, MAX_DEPTH, groupEnd, gapLayout } from "./world.js?v=10";
import { fmtSol } from "./pricing.js?v=10";

export function initAdmin(c) {
  const { net, h, btn, modal, getHoles, session, people, nameOf, isOnline, applyOverride, goToHole, openDM, changed } = c;
  const m = modal("🛡 Admin panel", true);
  let tab = "overview", focusN = null;
  const TABS = ["overview", "chat", "users", "holes", "ads"];
  const short = (a) => (a && a.length > 12 ? a.slice(0, 4) + "…" + a.slice(-4) : a);

  const confirmBtn = (label, cls, fn) => {            // two clicks needed for destructive actions
    const b = btn(label, cls, () => { if (b.dataset.arm) { fn(); return; } b.dataset.arm = "1"; b.textContent = "Click again to confirm"; setTimeout(() => { delete b.dataset.arm; b.textContent = label; }, 3000); });
    return b;
  };
  const inp = (value, type = "text", ph = "") => { const i = h("input"); i.type = type; i.value = value ?? ""; i.placeholder = ph; i.addEventListener("keydown", (e) => e.stopPropagation()); return i; };
  const field = (label, el) => h("label", "ad-field", h("span", null, label), el);
  const editHole = (id, patch) => { net.setOverride(id, patch); applyOverride(id, patch); changed(); };
  const removeHoleFor = (x) => { if (!x.special) editHole(x.id, { deleted: true }); };

  const views = {
    overview(b) {
      const st = net.stats(), tt = net.totals(), holes = getHoles();
      b.append(h("div", "sx-stats",
        ...[["Holes", holes.length], ["Players", people().filter((p) => p.holes.length).length], ["Online", net.online().length], ["Messages", net.messages().length],
          ["Banned", net.bannedIds().length], ["Sales volume", fmtSol(st.total)], ["Likes", tt.likes], ["Tips", fmtSol(tt.tips)]]
          .map(([k, v]) => h("div", "sx-stat", h("small", null, k), h("b", null, String(v))))));
      const notice = inp(net.notice(), "text", "Announcement shown to everyone…"); notice.maxLength = 200;
      b.append(h("h3", null, "Announcement"), h("div", "sx-chips", notice, btn("Publish", "", () => { net.setNotice(notice.value); changed(); }), btn("Clear", "btn-secondary", () => { net.setNotice(""); changed(); })));
      b.append(h("h3", null, "Maintenance"), h("div", "sx-chips",
        confirmBtn("Clear all chat", "btn-danger", () => { net.clearChat(); changed(); }),
        confirmBtn("Remove all listings", "btn-danger", () => { net.clearListings(); changed(); })));
    },

    chat(b) {
      const msgs = [...net.messages()].reverse().slice(0, 150);
      if (!msgs.length) b.append(h("p", "chat-empty", "No messages."));
      msgs.forEach((x) => {
        const scope = x.to ? `DM → ${nameOf(x.to)}` : "Global";
        b.append(h("div", "sx-row static", h("span", "tag", scope), h("span", "nm", `${x.name || short(x.from)}: ${x.text}`),
          btn("Delete", "btn-danger", () => { net.deleteMessage(x.id); changed(); }),
          confirmBtn("Ban sender", "btn-danger", () => { net.ban(x.from, true); changed(); })));
      });
    },

    users(b) {
      const list = people(), known = new Set(list.map((u) => u.id));
      net.bannedIds().filter((id) => !known.has(id)).forEach((id) => list.push({ id, name: nameOf(id), holes: [], online: false }));
      list.forEach((u) => {
        const isBan = net.isBanned(u.id), bal = inp(net.balance(u.id).toFixed(3), "number"); bal.step = "0.001"; bal.className = "ad-small";
        b.append(h("div", "sx-row static",
          h("span", null, u.online ? "🟢" : "⚪"), h("span", "nm", `${u.name || short(u.id)} · ${short(u.id)}`), h("span", null, `${u.holes.length} holes`), isBan ? h("span", "tag sale", "banned") : null,
          bal, btn("Set ◎", "btn-secondary", () => { net.setBalance(u.id, bal.value); changed(); }),
          btn("💬", "btn-secondary", () => { m.close(); openDM(u.id); }),
          btn(isBan ? "Unban" : "Ban", isBan ? "" : "btn-danger", () => { net.ban(u.id, !isBan); changed(); }),
          confirmBtn("Delete user", "btn-danger", () => { u.holes.forEach(removeHoleFor); net.purgeUser(u.id); net.ban(u.id, true); changed(); })));
      });
    },

    holes(b) {
      getHoles().forEach((x) => {
        const un = inp(x.username), ds = inp(x.description), dp = inp(x.depth, "number"), ow = inp(x.owner), st = h("select");
        dp.min = 1; dp.max = MAX_DEPTH; dp.className = "ad-small"; ow.disabled = !!x.special;
        HOLE_STYLES.forEach((n, i) => { const o = h("option", null, n); o.value = i; st.append(o); }); st.value = x.style || 0;
        const l = net.activeListing(x);
        b.append(h("div", "ad-card",
          h("div", "ad-head", h("b", null, `#${x.id}${x.special ? " ★" : ""}`), h("span", null, `slot ${x.x + 1}`), l ? h("span", "tag sale", "for sale") : null),
          field("Username", un), field("Description", ds), field("Depth (1-" + MAX_DEPTH + ")", dp), field("Style", st), field("Owner id", ow),
          h("div", "ad-actions",
            btn("Save", "", () => editHole(x.id, { username: un.value.trim() || x.username, description: ds.value, depth: Math.max(1, Math.min(MAX_DEPTH, Math.floor(+dp.value) || x.depth)), style: +st.value, ...(x.special || !ow.value.trim() ? {} : { owner: ow.value.trim() }) })),
            btn("Go", "btn-secondary", () => { m.close(); goToHole(x); }),
            l ? btn("Unlist", "btn-secondary", () => { net.unlist(x); changed(); }) : null,
            x.special ? null : confirmBtn("Delete hole", "btn-danger", () => removeHoleFor(x)))));
      });
    },

    ads(b) {
      const maxX = getHoles().reduce((mx, x) => Math.max(mx, x.x), 0);
      b.append(h("p", "modal-desc", "A billboard follows every 8-14 holes. Every 3rd gap also has a stall with a café below it. Changes show on the map immediately."));
      const card = (key, title, sub, shopDefault) => {
        const ad = net.getAd(key) || {};
        const t = inp(ad.title, "text", shopDefault || "YOUR AD HERE"), tx = inp(ad.text), img = inp(ad.image, "text", "https://… picture"), link = inp(ad.link, "text", "https://… link when clicked"), color = inp(ad.color || "#1e293b", "color");
        const on = inp("", "checkbox"); on.checked = ad.on !== false;
        const el = h("div", "ad-card" + (focusN === key ? " flash" : ""), h("div", "ad-head", h("b", null, title), h("span", null, sub)),
          field("Title", t), field("Text", tx), field("Image URL", img), field("Link", link), field("Color", color), field("Active", on),
          h("div", "ad-actions", btn("Save", "", () => { net.setAd(key, { title: t.value.trim(), text: tx.value.trim(), image: img.value.trim(), link: link.value.trim(), color: color.value, on: on.checked }); changed(); })));
        b.append(el);
        if (focusN === key) requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
      };
      for (let n = 0; groupEnd(n - 1) <= maxX + 14 && n < 12; n++) {
        const g = gapLayout(n), after = groupEnd(n) + 1;
        card(n, "📢 Billboard", `gap ${n + 1} · after hole ${after}`);
        if (g.shop) card("s" + n, `${g.shop.e} ${g.shop.n}`, `stall in gap ${n + 1} · café below at depth 20`, g.shop.n);
      }
    }
  };

  function render() {
    const b = m.body; b.replaceChildren();
    b.append(h("div", "ad-tabs", ...TABS.map((t) => btn(t[0].toUpperCase() + t.slice(1), t === tab ? "" : "btn-secondary", () => { tab = t; focusN = null; render(); }))));
    views[tab](b);
  }
  return { open(t = "overview", n = null) { tab = t; focusN = n; render(); m.open(); }, render, isOpen: m.isOpen };
}
