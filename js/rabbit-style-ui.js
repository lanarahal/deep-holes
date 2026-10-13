/** Player-facing rabbit closet and admin-managed set shop. */
import * as audio from "./audio.js?v=18";
import { rabbitSets, rabbitCloset, equippedRabbitSet, ownsRabbitSet, buyRabbitSet, equipRabbitSet } from "./rabbit-style.js?v=18";
import { drawRabbitPreview } from "./room.js?v=18";
import { rollLook } from "./world.js?v=18";
import { wallet } from "./economy.js?v=18";
import { balance } from "./social.js?v=18";

export function initRabbitStyleUI({ social, session, onEquip = () => {} }) {
  const { modal, h, btn, say } = social;
  const m = modal("🐰 Rabbit closet", true);
  const priceLabel = (s) => s.currency === "sol" ? `◎ ${Number(s.price).toFixed(3)} SOL` : `🥕 ${Math.ceil(s.price)} carrot points`;

  function preview(set, owned) {
    const c = h("canvas", "rabbit-set-preview"); c.width = 160; c.height = 200;
    const look = { ...rollLook(), setId: set.id };
    drawRabbitPreview(c, look);
    // Image assets are loaded lazily, so redraw after their first network/decode turn.
    [60, 240, 650].forEach((ms) => setTimeout(() => { if (c.isConnected) drawRabbitPreview(c, look); }, ms));
    return c;
  }
  function render() {
    const b = m.body, user = session.user, closet = rabbitCloset(user), activeId = equippedRabbitSet(user);
    b.replaceChildren();
    b.append(h("p", "modal-desc", "Browse complete bunny looks. Sets and prices are configured by the game admin. Every set is sold for exactly one currency: carrot points or simulated SOL."));
    b.append(h("div", "sx-stats", h("div", "sx-stat", h("small", null, "Carrot points"), h("b", null, `🥕 ${Math.floor(wallet(user).cp)}`)),
      h("div", "sx-stat", h("small", null, "Simulated SOL"), h("b", null, `◎ ${Number(balance(user)).toFixed(3)}`)),
      h("div", "sx-stat", h("small", null, "Style sets owned"), h("b", null, String(closet.owned.length)))));
    const active = activeId ? rabbitSets().find((s) => s.id === activeId) : null;
    b.append(h("div", "ad-card rabbit-equipped", h("b", null, active ? `Currently wearing: ${active.name}` : "Currently wearing: your rolled outfit"),
      active ? btn("Remove set", "btn-secondary", () => { const r = equipRabbitSet(user, null); if (r.ok) { onEquip(null); say("Your own rolled outfit is back."); audio.sfx("click"); render(); } }) : null));
    const sets = rabbitSets({ includeHidden: false });
    if (!sets.length) { b.append(h("p", "chat-empty", "No style sets are available yet. The admin can add them from Admin → Rabbit styles.")); return; }
    const grid = h("div", "rabbit-set-grid");
    sets.forEach((set) => {
      const isOwned = ownsRabbitSet(user, set.id), isOn = activeId === set.id;
      const card = h("article", "rabbit-set-card" + (isOn ? " is-equipped" : ""), preview(set, isOwned),
        h("div", "rabbit-set-copy", h("div", "rabbit-set-title", h("b", null, set.name), isOn ? h("span", "tag sale", "EQUIPPED") : isOwned ? h("span", "tag", "OWNED") : null),
          h("p", "modal-desc", set.description || "A complete look for your bunny."),
          h("div", "rabbit-set-price", priceLabel(set)),
          isOwned ? (isOn ? null : btn("Wear this set", "", () => {
            const r = equipRabbitSet(user, set.id); if (!r.ok) return say(r.err);
            onEquip(set.id); say(`${set.name} equipped.`); audio.sfx("buy"); render();
          })) : btn(`Buy · ${priceLabel(set)}`, "", () => {
            const r = buyRabbitSet(user, set.id);
            if (!r.ok) { say(r.err); audio.sfx("error"); return; }
            onEquip(set.id); say(`Purchased and equipped ${set.name}.`); audio.sfx("buy"); render();
          })));
      grid.append(card);
    });
    b.append(grid);
  }
  return { open() { render(); m.open(); }, close: () => m.close(), isOpen: m.isOpen, render };
}
