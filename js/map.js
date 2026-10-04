/**
 * Endless side-view map. Procedural in every direction, drag/arrow-key/wheel
 * navigation, animated creatures, per-player fog on deep layers.
 */
import { getImage } from "./data.js";
import { TAU, hash, biome, hsl, regionAt } from "./world.js";

export const LH = 130;       // layer height
export const SURF = 230;     // world-y of the ground surface
const HW = 170;              // distance between holes
const holeX = (h) => 120 + h.x * HW;

/* ---------- surface animals ---------- */
const SA = {
  rabbit:   { c: "#f1f5f9", d: "#cbd5e1", w: 11, h: 8, s: 1 },
  fox:      { c: "#ea580c", d: "#fff7ed", w: 15, h: 7, s: 1.1 },
  deer:     { c: "#a16207", d: "#fde68a", w: 17, h: 9, s: 1.3 },
  squirrel: { c: "#b45309", d: "#fed7aa", w: 8,  h: 6, s: 1 },
  hedgehog: { c: "#57534e", d: "#d6b98c", w: 11, h: 8, s: 1 }
};
const SA_KEYS = Object.keys(SA);

function critter(ctx, type, t, dir) {
  const a = SA[type], tall = type === "deer";
  const ll = tall ? 14 : 6, st = t * 9;
  ctx.save();
  ctx.scale(dir * a.s, a.s);
  ctx.translate(0, -ll - a.h + (type === "rabbit" ? -Math.abs(Math.sin(st)) * 4 : 0));
  ctx.strokeStyle = a.c; ctx.lineWidth = tall ? 2 : 3; ctx.lineCap = "round";
  [[-0.6, 0], [-0.3, Math.PI], [0.4, Math.PI], [0.65, 0]].forEach(([k, p]) => {
    ctx.beginPath(); ctx.moveTo(a.w * k, a.h * .5);
    ctx.lineTo(a.w * k + Math.sin(st + p) * 4, a.h + ll); ctx.stroke();
  });
  // tail
  ctx.fillStyle = type === "rabbit" ? "#fff" : a.c;
  ctx.beginPath();
  if (type === "fox") ctx.ellipse(-a.w - 6, 0, 10, 4, -0.3 + Math.sin(st * .5) * .15, 0, TAU);
  else if (type === "squirrel") ctx.ellipse(-a.w + 1, -8, 5, 11, 0.5 + Math.sin(st * .5) * .2, 0, TAU);
  else ctx.arc(-a.w, -1, type === "rabbit" ? 3.5 : 3, 0, TAU);
  ctx.fill();
  // body
  ctx.fillStyle = a.c; ctx.beginPath(); ctx.ellipse(0, 0, a.w, a.h, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = a.d; ctx.beginPath(); ctx.ellipse(2, a.h * .4, a.w * .6, a.h * .45, 0, 0, TAU); ctx.fill();
  if (type === "hedgehog") {
    ctx.strokeStyle = "#292524"; ctx.lineWidth = 1.3;
    for (let i = 0; i < 14; i++) {
      const q = Math.PI * 1.05 + (i / 13) * Math.PI * .9;
      ctx.beginPath(); ctx.moveTo(Math.cos(q) * a.w * .8, Math.sin(q) * a.h * .8);
      ctx.lineTo(Math.cos(q) * (a.w + 5), Math.sin(q) * (a.h + 5)); ctx.stroke();
    }
  }
  // head
  const hx = a.w * .95, hy = -a.h * .55;
  ctx.fillStyle = a.c; ctx.beginPath();
  ctx.ellipse(hx + (tall ? 3 : 0), hy - (tall ? 7 : 0), tall ? 5 : 6, tall ? 4 : 5, 0, 0, TAU); ctx.fill();
  if (tall) { ctx.strokeStyle = a.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.w * .6, -3); ctx.lineTo(hx + 1, hy - 7); ctx.stroke(); }
  const ey = tall ? hy - 8 : hy;
  ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(hx + (tall ? 5 : 3), ey - 1, 1.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + (tall ? 8 : 6), ey + 1.5, 1.1, 0, TAU); ctx.fill();
  // ears / antlers
  ctx.fillStyle = a.c; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5;
  if (type === "rabbit") {
    ctx.beginPath(); ctx.ellipse(hx - 2, hy - 12, 2.6, 8, 0.25, 0, TAU); ctx.ellipse(hx + 3, hy - 12, 2.6, 8, -0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.ellipse(hx - 2, hy - 11, 1, 5, 0.25, 0, TAU); ctx.fill();
  } else if (type === "fox") {
    ctx.beginPath(); ctx.moveTo(hx - 3, hy - 3); ctx.lineTo(hx - 1, hy - 11); ctx.lineTo(hx + 3, hy - 4); ctx.fill();
  } else if (tall) {
    ctx.beginPath(); ctx.moveTo(hx + 1, hy - 11); ctx.lineTo(hx - 3, hy - 21); ctx.moveTo(hx - 1, hy - 16); ctx.lineTo(hx + 4, hy - 19);
    ctx.moveTo(hx + 3, hy - 11); ctx.lineTo(hx + 6, hy - 21); ctx.stroke();
  } else if (type === "squirrel") {
    ctx.beginPath(); ctx.arc(hx - 1, hy - 5, 2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- underground creatures ---------- */
// y = where inside the layer the creature lives (0 top … 1 bottom)
const U = {
  worm(ctx, t, ph, o) {
    const gold = o.gold;
    for (let k = 7; k >= 0; k--) {
      const x = -18 + k * 5, y = Math.sin(t * 3 + ph + k * .8) * 3.2;
      ctx.fillStyle = gold ? `hsl(${44 - k * 1.5},95%,${58 - k}%)` : `hsl(335,70%,${66 - k * 2}%)`;
      ctx.beginPath(); ctx.arc(x, y, k === 7 ? 3.6 : 2.8, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "#1c1917"; ctx.beginPath(); ctx.arc(19, -1.5 + Math.sin(t * 3 + ph + 5.6) * 3.2, .9, 0, TAU); ctx.fill();
    if (gold) {
      ctx.fillStyle = "#fffbeb"; ctx.globalAlpha = .5 + .5 * Math.sin(t * 5 + ph);
      ctx.beginPath(); ctx.arc(-6 + Math.sin(t + ph) * 10, -3, 1.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  },
  skeleton(ctx, t, ph, o) {
    const dia = o.diamond, c = dia ? "#a5f3fc" : "#e7e5e4", st = t * 4 + ph;
    if (dia) { ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 10; }
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-16, -8); ctx.quadraticCurveTo(0, -12, 12, -9); ctx.stroke();       // spine
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-6 + i * 5, -8, 5, .2, Math.PI - .2); ctx.stroke(); } // ribs
    [[-12, 0], [-8, Math.PI], [8, Math.PI], [12, 0]].forEach(([x, p]) => {
      ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x + Math.sin(st + p) * 4, 4); ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(15, -12, 6, 0, TAU); ctx.fill();                                     // skull
    ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(17, -13, 1.6, 0, TAU); ctx.fill();
    ctx.fillRect(16, -9, 6, 1.6 + Math.abs(Math.sin(st * .5)) * 2);                              // jaw
    if (dia) {
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.globalAlpha = .5 + .5 * Math.sin(t * 6 + ph);
      ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(-2, -18); ctx.lineTo(2, -16); ctx.lineTo(-2, -15); ctx.lineTo(-4, -10); ctx.lineTo(-6, -15); ctx.lineTo(-10, -16); ctx.lineTo(-6, -18); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
  },
  root(ctx, t, ph) {
    ctx.strokeStyle = "#5b3a1a"; ctx.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 3 - k * .7; const len = 40 + hash(ph, k) * 40, sw = Math.sin(t * 1.2 + ph + k) * 6;
      ctx.beginPath(); ctx.moveTo(k * 8 - 8, 0);
      ctx.bezierCurveTo(k * 8 - 8 + sw, len * .4, k * 8 - 8 - sw, len * .7, k * 8 - 8 + sw * 1.4, len); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(k * 8 - 8 + sw * .5, len * .4); ctx.lineTo(k * 8 + 2 + sw, len * .55); ctx.stroke();
    }
  },
  beetle(ctx, t, ph) {
    const h = 90 + hash(ph) * 140, s = t * 10 + ph;
    ctx.strokeStyle = "#1c1917"; ctx.lineWidth = 1.2;
    for (let k = -1; k <= 1; k++) for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(k * 4, 0); ctx.lineTo(k * 4 + Math.sin(s + k * 2) * 3, sd * 7); ctx.stroke();
    }
    ctx.fillStyle = `hsl(${h},60%,35%)`; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `hsl(${h},70%,55%)`; ctx.beginPath(); ctx.ellipse(-1, -2, 6, 2.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1c1917"; ctx.beginPath(); ctx.arc(9, 0, 3.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -1); ctx.lineTo(15, -4 + Math.sin(s) * 1.5); ctx.moveTo(11, 1); ctx.lineTo(15, 4 - Math.sin(s) * 1.5); ctx.stroke();
  },
  mole(ctx, t, ph) {
    const s = t * 8 + ph;
    ctx.fillStyle = "#44403c"; ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13, 1, 6, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.arc(19, 2, 2.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fcd9b6"; for (const k of [0, 1]) { ctx.beginPath(); ctx.ellipse(8 + k * 3 + Math.sin(s + k) * 2, 8, 4, 2, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(15, -1, 1, 0, TAU); ctx.fill();
  },
  bat(ctx, t, ph) {
    const f = Math.sin(t * 12 + ph);
    ctx.fillStyle = "#312e81";
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sd * 3, 0); ctx.quadraticCurveTo(sd * 14, -10 - f * 8, sd * 22, -2 + f * 6);
      ctx.quadraticCurveTo(sd * 15, 2, sd * 11, 0); ctx.quadraticCurveTo(sd * 7, 4, sd * 3, 3); ctx.fill();
    }
    ctx.fillStyle = "#1e1b4b"; ctx.beginPath(); ctx.ellipse(0, 1, 4, 6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-2, -9); ctx.lineTo(0, -5); ctx.lineTo(2, -9); ctx.lineTo(3, -4); ctx.fill();
    ctx.fillStyle = "#fb7185"; ctx.fillRect(-2.5, -2, 1.4, 1.4); ctx.fillRect(1.2, -2, 1.4, 1.4);
  },
  crystal(ctx, t, ph, o) {
    const p = .6 + .4 * Math.sin(t * 2 + ph), h = o.hue;
    ctx.shadowColor = `hsl(${h},90%,60%)`; ctx.shadowBlur = 12 * p;
    [[-9, 14, 5], [0, 22, 6], [9, 12, 5]].forEach(([x, hh, w], k) => {
      ctx.fillStyle = `hsl(${h + k * 15},80%,${55 + p * 10}%)`;
      ctx.beginPath(); ctx.moveTo(x, -hh); ctx.lineTo(x + w, -hh * .25); ctx.lineTo(x + w * .6, 0); ctx.lineTo(x - w * .6, 0); ctx.lineTo(x - w, -hh * .25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.moveTo(x, -hh); ctx.lineTo(x - w, -hh * .25); ctx.lineTo(x - w * .3, 0); ctx.lineTo(x, -hh * .3); ctx.fill();
    });
    ctx.shadowBlur = 0;
  },
  nugget(ctx, t, ph) {
    ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.ellipse(0, -5, 11, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.ellipse(-2, -7, 8, 5, -.2, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fffbeb"; ctx.globalAlpha = .5 + .5 * Math.sin(t * 4 + ph);
    ctx.beginPath(); ctx.arc(2, -9, 1.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  },
  bone(ctx, t, ph) {
    ctx.strokeStyle = "#e7e5e4"; ctx.lineCap = "round"; ctx.lineWidth = 3;
    for (const r of [-.5, .5]) {
      ctx.beginPath(); ctx.moveTo(-10 * Math.cos(r), -6 - 10 * Math.sin(r)); ctx.lineTo(10 * Math.cos(r), -6 + 10 * Math.sin(r)); ctx.stroke();
    }
    ctx.fillStyle = "#e7e5e4"; ctx.beginPath(); ctx.arc(0, -14, 5, 0, TAU); ctx.fill();
  },
  salamander(ctx, t, ph) {
    ctx.shadowColor = "#f97316"; ctx.shadowBlur = 10;
    ctx.strokeStyle = "#ea580c"; ctx.lineCap = "round"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(14, 0);
    for (let k = 1; k <= 8; k++) ctx.lineTo(14 - k * 4.5, Math.sin(t * 5 + ph + k * .7) * 4);
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(15, 0, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1c1917"; ctx.beginPath(); ctx.arc(16.5, -1.5, 1, 0, TAU); ctx.fill();
  }
};
const KIND = {   // type -> factory options, vertical position, motion range, speed
  worm: { y: .55, r: 50, v: .5 }, goldworm: { y: .6, r: 50, v: .45, base: "worm", gold: true },
  skeleton: { y: .85, r: 40, v: .3 }, diamond: { y: .85, r: 40, v: .3, base: "skeleton", diamond: true },
  root: { y: 0, r: 0, v: 0 }, beetle: { y: .8, r: 60, v: .6 }, mole: { y: .8, r: 45, v: .35 },
  bat: { y: .4, r: 70, v: .8, fly: true }, crystal: { y: .95, r: 0, v: 0 }, nugget: { y: .95, r: 0, v: 0 },
  bone: { y: .95, r: 0, v: 0 }, salamander: { y: .85, r: 50, v: .5 }
};

/* ---------- renderer ---------- */
export class MapRenderer {
  constructor(canvas, holes, onHoleClick, getMaxDepth = () => 0) {
    Object.assign(this, { canvas, holes, onHoleClick, getMaxDepth });
    this.ctx = canvas.getContext("2d");
    this.camX = this.tx = 0; this.camY = this.ty = 0;
    this.time = 0; this.active = true; this.keys = {};
    this.drag = null; this.moved = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty }; this.moved = 0;
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.moved = Math.max(this.moved, Math.abs(dx) + Math.abs(dy));
      this.tx = this.drag.tx - dx; this.ty = this.drag.ty - dy; this.clamp();
    });
    canvas.addEventListener("pointerup", (e) => {
      const wasClick = this.drag && this.moved < 6;
      this.drag = null; canvas.style.cursor = "grab";
      if (wasClick) this.handleClick(e);
    });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) this.tx += (e.deltaX || e.deltaY);
      else this.ty += e.deltaY;
      this.clamp();
    }, { passive: false });

    const typing = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    window.addEventListener("keydown", (e) => {
      if (!this.active || typing(e) || !e.key.startsWith("Arrow")) return;
      e.preventDefault(); this.keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => { this.keys[e.key] = false; });

    const loop = () => {
      requestAnimationFrame(loop);
      if (!this.active) return;
      this.time += 0.016;
      const k = this.keys, sp = 16;
      if (k.ArrowLeft) this.tx -= sp; if (k.ArrowRight) this.tx += sp;
      if (k.ArrowUp) this.ty -= sp; if (k.ArrowDown) this.ty += sp;
      this.clamp();
      this.camX += (this.tx - this.camX) * 0.14;
      this.camY += (this.ty - this.camY) * 0.14;
      this.draw();
    };
    loop();
  }

  setActive(on) { this.active = on; if (on) this.resize(); }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.clientWidth; this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // number of underground layers this player may see (layer index < unlocked)
  unlocked() { return Math.max(1, this.getMaxDepth()); }
  clamp() {
    // horizontal: infinite. vertical: from sky down to just past the lock line
    const maxY = Math.max(0, SURF + this.unlocked() * LH + 120 - this.h * 0.7);
    this.ty = Math.max(0, Math.min(maxY, this.ty));
  }
  setHoles(holes) {
    this.holes = holes;
    const last = holes[holes.length - 1];
    if (last) { this.tx = holeX(last) - this.w / 2; this.clamp(); }
  }
  focusHole(hole) { this.tx = holeX(hole) - this.w / 2; this.ty = 0; this.clamp(); }

  draw() {
    const ctx = this.ctx, w = this.w, h = this.h, cx = this.camX, cy = this.camY;
    const reg = regionAt(cx + w / 2);
    ctx.clearRect(0, 0, w, h);
    this.drawSky(ctx, w, reg, cx, cy);
    this.drawSurface(ctx, w, reg, cx, cy);

    const U_ = this.unlocked(), lockY = SURF + U_ * LH - cy;
    const first = Math.max(0, Math.floor((cy - SURF) / LH));
    for (let i = first; i < U_ && SURF + i * LH - cy < h; i++) this.drawLayer(ctx, w, i, SURF + i * LH - cy, cx);
    this.holes.forEach((hole) => this.drawHole(ctx, hole, cx, cy));

    // Fog: layers below the player's deepest hole stay hidden until reached
    if (lockY < h) {
      const g = ctx.createLinearGradient(0, lockY - 30, 0, lockY + 60);
      g.addColorStop(0, "rgba(5,5,10,0)"); g.addColorStop(1, "#05050a");
      ctx.fillStyle = g; ctx.fillRect(0, lockY - 30, w, 90);
      ctx.fillStyle = "#05050a"; ctx.fillRect(0, lockY + 60, w, h);
      ctx.fillStyle = "rgba(148,163,184,.8)"; ctx.font = "600 15px system-ui"; ctx.textAlign = "center";
      ctx.fillText(`🔒 Layer ${U_ + 1} and deeper stay hidden until you dig there`, w / 2, lockY + 95);
    }
    // depth gauge
    const lay = Math.max(0, Math.floor((cy + h / 2 - SURF) / LH));
    if (cy + h / 2 > SURF) {
      const b = biome(lay);
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.beginPath(); ctx.roundRect(12, 12, 160, 30, 8); ctx.fill();
      ctx.fillStyle = "#f1f5f9"; ctx.font = "600 13px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`Layer ${lay + 1} · ${b.name}`, 22, 32);
    }
  }

  drawSky(ctx, w, reg, cx, cy) {
    const sh = SURF - cy; if (sh <= 0) return;
    const g = ctx.createLinearGradient(0, 0, 0, sh);
    g.addColorStop(0, reg.sky[0]); g.addColorStop(.55, reg.sky[1]); g.addColorStop(1, reg.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, sh);
    const sx = w - 110, sy = 70 - cy * .6;
    const gl = ctx.createRadialGradient(sx, sy, 5, sx, sy, 70);
    gl.addColorStop(0, "rgba(253,224,71,.85)"); gl.addColorStop(1, "rgba(253,224,71,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 70, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, TAU); ctx.fill();
    // far hills (parallax)
    ctx.fillStyle = "rgba(15,23,42,.18)"; ctx.beginPath(); ctx.moveTo(0, sh);
    for (let x = 0; x <= w; x += 20) {
      const wx = x + cx * .3; ctx.lineTo(x, sh - 40 - Math.sin(wx / 160) * 22 - Math.sin(wx / 57) * 7);
    }
    ctx.lineTo(w, sh); ctx.fill();
    // clouds & birds (endless, parallax)
    for (let i = Math.floor((cx * .25) / 340) - 1; i < (cx * .25 + w) / 340 + 1; i++) {
      const x = i * 340 + hash(i, 1) * 200 - cx * .25 + this.time * 8, y = (20 + hash(i, 2) * 80) - cy * .7, s = .7 + hash(i, 3) * .6;
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath();
      ctx.arc(x, y, 20 * s, 0, TAU); ctx.arc(x + 24 * s, y - 7 * s, 26 * s, 0, TAU); ctx.arc(x + 50 * s, y, 18 * s, 0, TAU); ctx.fill();
      if (hash(i, 4) > .55) {
        const bx = x + 120 + Math.sin(this.time + i) * 30, by = y + 40 + Math.sin(this.time * 2 + i) * 6, f = Math.sin(this.time * 9 + i) * 5;
        ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 9, by + f); ctx.quadraticCurveTo(bx, by - 5, bx + 9, by + f); ctx.stroke();
      }
    }
  }

  drawSurface(ctx, w, reg, cx, cy) {
    const gy = SURF - cy; if (gy > this.h + 140 || gy < -140) return;
    // trees
    for (let i = Math.floor((cx - 80) / 150); i < (cx + w + 80) / 150; i++) {
      if (hash(i, 5) < .3) continue;
      const r = regionAt(i * 150), x = i * 150 + hash(i, 6) * 80 - cx, sc = .8 + hash(i, 7) * .6, sw = Math.sin(this.time * 1.4 + i) * 2.5 * sc;
      ctx.fillStyle = r.trunk; ctx.fillRect(x - 7 * sc, gy - 80 * sc, 14 * sc, 80 * sc);
      [[0, -100, 34], [-20, -80, 26], [20, -80, 26], [0, -118, 22]].forEach(([dx, dy, rr], k) => {
        ctx.fillStyle = r.leaf[k % 3]; ctx.beginPath(); ctx.arc(x + (dx + sw) * sc, gy + dy * sc, rr * sc, 0, TAU); ctx.fill();
      });
    }
    // grass
    ctx.fillStyle = reg.grass; ctx.fillRect(0, gy - 12, w, 20);
    ctx.strokeStyle = reg.blade; ctx.lineWidth = 1.5;
    for (let x = -((cx % 7) + 7); x < w; x += 7) {
      const sway = Math.sin(this.time * 2.2 + (x + cx) * .12) * 2.5;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + sway, gy - 9 - hash(Math.floor((x + cx) / 7), 8) * 4); ctx.stroke();
    }
    // wandering animals
    for (let i = Math.floor((cx - 250) / 400); i < (cx + w + 250) / 400; i++) {
      if (hash(i, 9) < .25) continue;
      const type = SA_KEYS[Math.floor(hash(i, 10) * SA_KEYS.length)], sp = .15 + hash(i, 11) * .25, ph = hash(i, 12) * TAU;
      const m = this.time * sp + ph, x = i * 400 + 200 + Math.sin(m) * 150 - cx;
      ctx.save(); ctx.translate(x, gy + 2); critter(ctx, type, this.time + ph, Math.cos(m) >= 0 ? 1 : -1); ctx.restore();
    }
  }

  drawLayer(ctx, w, i, y, cx) {
    const b = biome(i), g = ctx.createLinearGradient(0, y, 0, y + LH);
    g.addColorStop(0, hsl(b, 5)); g.addColorStop(1, hsl(b, -4));
    ctx.fillStyle = g; ctx.fillRect(0, y, w, LH + 1);

    const c0 = Math.floor(cx / 70) - 1, c1 = Math.ceil((cx + w) / 70) + 1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y, w, LH); ctx.clip();
    for (let c = c0; c < c1; c++) {
      const r1 = hash(i, c, 1), r2 = hash(i, c, 2), r3 = hash(i, c, 3);
      const x = c * 70 + r1 * 60 - cx, py = y + 14 + r2 * (LH - 28);
      switch (b.tx) {
        case "roots": ctx.strokeStyle = "rgba(60,30,10,.45)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14 * (r3 - .5) * 2, y + 30, x + 10 * (r2 - .5), y + 30 + r3 * 50); ctx.stroke(); break;
        case "pebble": ctx.fillStyle = `hsla(${b.h},10%,${50 + r3 * 20}%,.35)`;
          ctx.beginPath(); ctx.ellipse(x, py, 2 + r3 * 4, 1.5 + r3 * 3, r2, 0, TAU); ctx.fill(); break;
        case "brick": ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1;
          ctx.strokeRect(x, y + Math.floor(r2 * 4) * 32 + 4, 40 + r3 * 30, 28); break;
        case "bone": ctx.strokeStyle = "rgba(231,229,228,.28)"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + 18, py + 6 * (r3 - .5) * 2); ctx.stroke(); break;
        case "ore": if (r3 > .35) { ctx.fillStyle = `rgba(251,191,36,${.35 + .4 * Math.abs(Math.sin(this.time * 2 + c + i))})`;
          ctx.beginPath(); ctx.moveTo(x, py - 4); ctx.lineTo(x + 4, py); ctx.lineTo(x, py + 4); ctx.lineTo(x - 4, py); ctx.fill(); } break;
        case "crys": ctx.fillStyle = `hsla(${190 + r3 * 120},80%,65%,${.2 + .25 * Math.abs(Math.sin(this.time + c * 1.7))})`;
          ctx.beginPath(); ctx.moveTo(x, py - 7); ctx.lineTo(x + 4, py); ctx.lineTo(x - 4, py); ctx.fill(); break;
        case "lava": ctx.strokeStyle = `rgba(251,113,22,${.25 + .35 * Math.abs(Math.sin(this.time * 1.5 + c))})`; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + 12, py + 8 * (r3 - .5)); ctx.lineTo(x + 20, py + 14 * (r2 - .5)); ctx.stroke(); break;
      }
    }
    // creatures: up to 2 per 210px cell
    for (let c = Math.floor((cx - 40) / 210); c < (cx + w + 40) / 210; c++) {
      const n = Math.floor(hash(i, c, 20) * 2.4);
      for (let k = 0; k < n; k++) {
        const type = b.c[Math.floor(hash(i, c, 30 + k) * b.c.length)], kd = KIND[type], ph = hash(i, c, 40 + k) * TAU;
        const m = this.time * kd.v + ph, bx = c * 210 + hash(i, c, 50 + k) * 210;
        let x = bx + Math.sin(m) * kd.r - cx, yy = y + kd.y * LH;
        if (kd.fly) yy += Math.sin(m * 2.3) * 22;
        ctx.save(); ctx.translate(x, yy);
        if (kd.v && Math.cos(m) < 0) ctx.scale(-1, 1);
        U[kd.base || type](ctx, this.time, ph, { ...kd, hue: 170 + hash(i, c, 60) * 160 });
        ctx.restore();
      }
    }
    ctx.restore();
    // layer divider
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, y, w, 2);
  }

  drawHole(ctx, hole, cx, cy) {
    const x = holeX(hole) - cx, top = SURF - cy, dep = hole.depth * LH;
    if (x < -90 || x > this.w + 90 || top > this.h) return;
    const lockBottom = SURF + this.unlocked() * LH;
    const shaftH = Math.min(dep, lockBottom - SURF);       // never draw into fog
    const own = hole.owner === this.owner;
    // shaft
    const g = ctx.createLinearGradient(x - 38, 0, x + 38, 0);
    g.addColorStop(0, "#1c1917"); g.addColorStop(.5, "#050403"); g.addColorStop(1, "#1c1917");
    ctx.fillStyle = g; ctx.fillRect(x - 38, top, 76, shaftH);
    ctx.strokeStyle = own ? "#fbbf24" : "#57534e"; ctx.lineWidth = 2; ctx.strokeRect(x - 38, top, 76, shaftH);
    // rungs
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
    for (let y = LH; y < shaftH; y += LH) { ctx.beginPath(); ctx.moveTo(x - 38, top + y); ctx.lineTo(x + 38, top + y); ctx.stroke(); }
    // mound + opening
    ctx.fillStyle = "#6b4423"; ctx.beginPath(); ctx.ellipse(x, top + 2, 56, 15, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = "#050403"; ctx.beginPath(); ctx.ellipse(x, top, 44, 14, 0, 0, TAU); ctx.fill();
    // burrow chamber + picture sink with depth
    if (dep <= lockBottom - SURF) {
      const by = top + dep;
      ctx.fillStyle = "#0c0a09"; ctx.beginPath(); ctx.ellipse(x, by - 22, 52, 34, 0, 0, TAU); ctx.fill();
      const img = getImage(hole.image), s = 56, iy = by - 22 - s / 2;
      ctx.save(); ctx.beginPath(); ctx.roundRect(x - s / 2, iy, s, s, 10); ctx.clip();
      if (img?.complete && img.naturalWidth) ctx.drawImage(img, x - s / 2, iy, s, s);
      else { ctx.fillStyle = hole.customRabbit?.color || "#64748b"; ctx.fillRect(x - s / 2, iy, s, s); }
      ctx.restore();
      ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - s / 2, iy, s, s, 10); ctx.stroke();
      ctx.fillStyle = "#f1f5f9"; ctx.font = "bold 12px system-ui"; ctx.textAlign = "center";
      ctx.fillText(`Depth ${hole.depth}`, x, by + 22);
    }
    hole._hit = { x: x + cx - 52, y: SURF - 24, w: 104, h: Math.max(60, shaftH + 30) };
  }

  handleClick(e) {
    const r = this.canvas.getBoundingClientRect();
    const mx = e.clientX - r.left + this.camX, my = e.clientY - r.top + this.camY;
    for (const hole of this.holes) {
      const b = hole._hit;
      if (b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { this.onHoleClick(hole); return; }
    }
  }
}
