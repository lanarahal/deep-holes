/**
 * Isometric burrow room. Tile-based floor, two walls with the owner's picture,
 * depth-based biome/props, 4-direction + click-to-move rabbit.
 */
import { getImage } from "./data.js";
import { TAU, hash, biome, hsl } from "./world.js";

const N = 8, TW = 72, TH = 36, WH = 150;
const PROPS = {
  shallow: ["mushroom", "lamp", "rock", "mushroom"],
  deep: ["crystal", "chest", "bones", "lamp"]
};

export class RoomRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.keys = {}; this.player = null; this.raf = null; this.hole = null; this.time = 0;
    window.addEventListener("resize", () => this.resize());
    const typing = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    window.addEventListener("keydown", (e) => {
      if (!this.player || typing(e)) return;
      if (e.key.startsWith("Arrow") || "wasdWASD".includes(e.key)) e.preventDefault();
      this.keys[e.key.toLowerCase()] = true; this.player.target = null;
    });
    window.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener("pointerdown", (e) => this.clickMove(e));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(r.width * dpr); this.canvas.height = Math.floor(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width; this.h = r.height;
    this.scale = Math.min(1.25, this.w / (N * TW + 90), this.h / (N * TH + WH + 130));
  }

  enter(hole, isOwner = false) {
    this.leave(); this.hole = hole; this.time = 0; this.resize();
    const r = hole.customRabbit || {};
    this.player = {
      gx: N / 2, gy: N / 2, face: 1, walk: 0, target: null, blink: 0,
      color: isOwner ? r.color || "#f59e0b" : "#94a3b8",
      ear: isOwner ? r.earColor || "#d97706" : "#64748b"
    };
    this.buildProps();
    const loop = () => { this.raf = requestAnimationFrame(loop); this.time += 0.016; this.update(); this.draw(); };
    loop();
  }
  leave() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; this.player = null; this.hole = null; this.keys = {}; }

  buildProps() {
    const b = biome(this.hole.depth - 1), set = PROPS[this.hole.depth > 9 ? "deep" : "shallow"], seed = this.hole.id * 13 + this.hole.depth;
    this.props = [];
    for (let k = 0; k < 7; k++) {
      this.props.push({ type: set[Math.floor(hash(seed, k) * set.length)], gx: 1 + hash(seed, k, 1) * (N - 2), gy: 1 + hash(seed, k, 2) * (N - 2), ph: hash(seed, k, 3) * TAU });
    }
    this.props = this.props.filter((p) => Math.hypot(p.gx - N / 2, p.gy - N / 2) > 1.3);
    this.biome = b;
  }

  iso(gx, gy) { return { x: (gx - gy) * TW / 2, y: (gx + gy) * TH / 2 - N * TH / 2 }; }

  clickMove(e) {
    if (!this.player) return;
    const r = this.canvas.getBoundingClientRect(), s = this.scale;
    const x = (e.clientX - r.left - this.w / 2) / s, y = (e.clientY - r.top - this.h / 2 - 30) / s;
    const A = 2 * x / TW, B = 2 * (y + N * TH / 2) / TH;
    this.player.target = { gx: Math.max(.4, Math.min(N - .4, (A + B) / 2)), gy: Math.max(.4, Math.min(N - .4, (B - A) / 2)) };
  }

  update() {
    const p = this.player; if (!p) return;
    const k = this.keys; let sx = (k.arrowright || k.d ? 1 : 0) - (k.arrowleft || k.a ? 1 : 0), sy = (k.arrowdown || k.s ? 1 : 0) - (k.arrowup || k.w ? 1 : 0);
    if (!sx && !sy && p.target) {
      const dx = p.target.gx - p.gx, dy = p.target.gy - p.gy, d = Math.hypot(dx, dy);
      if (d < .08) p.target = null;
      else { const gx = dx / d, gy = dy / d; sx = gx - gy; sy = (gx + gy); }
    }
    // screen direction -> grid direction (right = +gx -gy, down = +gx +gy)
    const mx = sx + sy, my = sy - sx, len = Math.hypot(mx, my);
    if (len) {
      const sp = .055;
      p.gx += (mx / len) * sp; p.gy += (my / len) * sp;
      if (sx) p.face = sx > 0 ? 1 : -1;
      p.walk += .3;
    } else p.walk *= .8;
    p.gx = Math.max(.4, Math.min(N - .4, p.gx)); p.gy = Math.max(.4, Math.min(N - .4, p.gy));
    this.props.forEach((o) => { // solid props push the rabbit out
      if (o.type === "mushroom" || o.type === "bones") return;
      const dx = p.gx - o.gx, dy = p.gy - o.gy, d = Math.hypot(dx, dy);
      if (d < .5 && d > 0) { p.gx = o.gx + dx / d * .5; p.gy = o.gy + dy / d * .5; }
    });
    p.blink = (this.time % 3.4) < .12 ? 1 : 0;
  }

  draw() {
    const ctx = this.ctx, w = this.w, h = this.h, b = this.biome, depth = this.hole.depth;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, hsl(b, 2)); bg.addColorStop(1, hsl(b, -9));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    ctx.save(); ctx.translate(w / 2, h / 2 + 30); ctx.scale(this.scale, this.scale);
    this.drawWalls(ctx, b, depth);
    this.drawFloor(ctx, b);
    // y-sort props + rabbit
    const list = [...this.props.map((o) => ({ o, z: o.gx + o.gy, f: () => this.drawProp(ctx, o) })),
      { z: this.player.gx + this.player.gy, f: () => this.drawRabbit(ctx, this.player) }].sort((a, c) => a.z - c.z);
    list.forEach((it) => it.f());
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "13px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Arrows / WASD or click the floor to move", w / 2, h - 16);
  }

  drawFloor(ctx, b) {
    for (let gx = 0; gx < N; gx++) for (let gy = 0; gy < N; gy++) {
      const a = this.iso(gx, gy), r = hash(this.hole.id, gx, gy);
      ctx.fillStyle = hsl(b, 4 + ((gx + gy) & 1) * 3 + r * 3);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + TW / 2, a.y + TH / 2); ctx.lineTo(a.x, a.y + TH); ctx.lineTo(a.x - TW / 2, a.y + TH / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.stroke();
      if (r > .7) { ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.ellipse(a.x + (r - .85) * 30, a.y + TH / 2, 4, 2, 0, 0, TAU); ctx.fill(); }
    }
    // front edge thickness
    const L = this.iso(0, N), B = this.iso(N, N), R = this.iso(N, 0);
    ctx.fillStyle = hsl(b, -10);
    ctx.beginPath(); ctx.moveTo(L.x - TW / 2, L.y + TH / 2); ctx.lineTo(B.x, B.y + TH); ctx.lineTo(B.x, B.y + TH + 14); ctx.lineTo(L.x - TW / 2, L.y + TH / 2 + 14); ctx.fill();
    ctx.fillStyle = hsl(b, -14);
    ctx.beginPath(); ctx.moveTo(R.x + TW / 2, R.y + TH / 2); ctx.lineTo(B.x, B.y + TH); ctx.lineTo(B.x, B.y + TH + 14); ctx.lineTo(R.x + TW / 2, R.y + TH / 2 + 14); ctx.fill();
  }

  drawWalls(ctx, b, depth) {
    const T = this.iso(0, 0), Lc = this.iso(0, N), Rc = this.iso(N, 0), top = { x: T.x, y: T.y };
    // left wall (gx = 0 edge) and right wall (gy = 0 edge)
    [[Lc, -8, 0], [Rc, -14, 1]].forEach(([c, dl, side]) => {
      const g = ctx.createLinearGradient(0, top.y - WH, 0, top.y);
      g.addColorStop(0, hsl(b, dl - 6)); g.addColorStop(1, hsl(b, dl + 3));
      ctx.fillStyle = g; ctx.beginPath();
      const ox = 0, oy = 0;
      ctx.moveTo(top.x, top.y); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x, c.y - WH); ctx.lineTo(top.x, top.y - WH); ctx.closePath(); ctx.fill();
      // strata + speckles along the wall
      for (let k = 0; k < N; k++) {
        const t0 = k / N, ex = top.x + (c.x - top.x) * t0, ey = top.y + (c.y - top.y) * t0;
        for (let j = 0; j < 4; j++) {
          const r = hash(this.hole.id, k * 4 + j, side);
          ctx.fillStyle = r > .5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.14)";
          ctx.fillRect(ex + (side ? 1 : -1) * r * 8, ey - 14 - j * 36 - r * 8, side ? 24 : -24, 4 + r * 6);
        }
      }
    });
    // picture frame on the right wall: sinks lower the deeper the hole is
    const fy = 14 + Math.min(28, 8 * Math.log2(depth + 1)), img = getImage(this.hole.image);
    ctx.save(); ctx.translate(top.x, top.y); ctx.transform(TW / 2, TH / 2, 0, 1, 0, 0);
    const x0 = 2.4, fw = 3.2, fh = 88, y0 = -WH + fy;
    ctx.fillStyle = "#6b4423"; ctx.fillRect(x0 - .12, y0 - 7, fw + .24, fh + 14);
    ctx.fillStyle = "#1c1917"; ctx.fillRect(x0, y0, fw, fh);
    if (img?.complete && img.naturalWidth) {
      const ppt = TW / 2, sc = Math.max(fw * ppt / img.naturalWidth, fh / img.naturalHeight);
      const dw = img.naturalWidth * sc / ppt, dh = img.naturalHeight * sc;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, fw, fh); ctx.clip();
      ctx.drawImage(img, x0 + (fw - dw) / 2, y0 + (fh - dh) / 2, dw, dh); ctx.restore();
    } else { ctx.fillStyle = this.hole.customRabbit?.color || "#64748b"; ctx.fillRect(x0, y0, fw, fh); }
    ctx.restore();
    // wall torch on the left wall
    const tp = this.iso(0, 5.5), fl = Math.sin(this.time * 12) * 1.5;
    ctx.fillStyle = "#44403c"; ctx.fillRect(tp.x - 8, tp.y - 70, 4, 22);
    const gl = ctx.createRadialGradient(tp.x - 6, tp.y - 76, 2, tp.x - 6, tp.y - 76, 70);
    gl.addColorStop(0, "rgba(251,191,36,.45)"); gl.addColorStop(1, "rgba(251,191,36,0)");
    ctx.fillStyle = gl; ctx.fillRect(tp.x - 80, tp.y - 150, 150, 150);
    ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.ellipse(tp.x - 6, tp.y - 78, 5, 8 + fl, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.ellipse(tp.x - 6, tp.y - 76, 2.5, 5 + fl, 0, 0, TAU); ctx.fill();
  }

  drawProp(ctx, o) {
    const p = this.iso(o.gx, o.gy), t = this.time;
    ctx.save(); ctx.translate(p.x, p.y + TH / 2);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 0, 14, 6, 0, 0, TAU); ctx.fill();
    switch (o.type) {
      case "mushroom":
        ctx.fillStyle = "#e7e5e4"; ctx.fillRect(-3, -12, 6, 12);
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.ellipse(0, -13, 11, 8, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-4, -16, 1.8, 0, TAU); ctx.arc(3, -18, 1.5, 0, TAU); ctx.fill(); break;
      case "lamp": {
        const g = ctx.createRadialGradient(0, -26, 2, 0, -26, 60); g.addColorStop(0, "rgba(253,224,71,.4)"); g.addColorStop(1, "rgba(253,224,71,0)");
        ctx.fillStyle = g; ctx.fillRect(-60, -90, 120, 120);
        ctx.fillStyle = "#78350f"; ctx.fillRect(-2.5, -24, 5, 24);
        ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(0, -28, 7 + Math.sin(t * 9 + o.ph), 0, TAU); ctx.fill(); break; }
      case "rock":
        ctx.fillStyle = "#78716c"; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-9, -14); ctx.lineTo(4, -17); ctx.lineTo(14, -5); ctx.lineTo(12, 0); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(4, -17); ctx.lineTo(0, -8); ctx.fill(); break;
      case "crystal": {
        const pu = .6 + .4 * Math.sin(t * 2 + o.ph);
        ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 14 * pu;
        [[-8, 22], [0, 34], [8, 18]].forEach(([x, hh], k) => {
          ctx.fillStyle = `hsl(${185 + k * 20},85%,${55 + pu * 10}%)`;
          ctx.beginPath(); ctx.moveTo(x, -hh); ctx.lineTo(x + 6, -hh * .3); ctx.lineTo(x + 4, 0); ctx.lineTo(x - 4, 0); ctx.lineTo(x - 6, -hh * .3); ctx.fill();
        });
        ctx.shadowBlur = 0; break; }
      case "chest":
        ctx.fillStyle = "#92400e"; ctx.fillRect(-15, -16, 30, 16);
        ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.ellipse(0, -16, 15, 7, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = "#fbbf24"; ctx.fillRect(-15, -10, 30, 2.5); ctx.fillRect(-2.5, -13, 5, 7);
        ctx.fillStyle = "#fffbeb"; ctx.globalAlpha = .5 + .5 * Math.sin(t * 4 + o.ph); ctx.beginPath(); ctx.arc(8, -20, 1.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
      default: // bones
        ctx.strokeStyle = "#e7e5e4"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(10, -6); ctx.moveTo(-8, -8); ctx.lineTo(8, 1); ctx.stroke();
        ctx.fillStyle = "#e7e5e4"; ctx.beginPath(); ctx.arc(2, -8, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#0f172a"; ctx.fillRect(0, -9, 1.6, 2); ctx.fillRect(3.5, -9, 1.6, 2);
    }
    ctx.restore();
  }

  drawRabbit(ctx, p) {
    const pos = this.iso(p.gx, p.gy), moving = Math.abs(p.walk) > .05;
    const hop = moving ? Math.abs(Math.sin(p.walk)) * 7 : Math.sin(this.time * 2) * .8;
    ctx.save(); ctx.translate(pos.x, pos.y + TH / 2);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 1, 19 - hop * .6, 7 - hop * .2, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -hop); ctx.scale(p.face, 1);
    const dark = p.ear, c = p.color;
    // tail
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-19, -14, 6, 0, TAU); ctx.fill();
    // hind & front feet
    const ft = Math.sin(p.walk) * 5;
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-8 + ft, -2, 9, 5, 0, 0, TAU); ctx.ellipse(10 - ft, -1, 6, 4, 0, 0, TAU); ctx.fill();
    // body
    const bg = ctx.createLinearGradient(0, -40, 0, 0); bg.addColorStop(0, c); bg.addColorStop(1, dark);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(-2, -18, 19, 17 + Math.sin(this.time * 2.4) * .6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(3, -13, 10, 10, 0, 0, TAU); ctx.fill();
    // ears (sway/flop)
    const sw = Math.sin(this.time * 3) * .06 + (moving ? Math.sin(p.walk) * .12 : 0);
    [[1, -.18], [-5, .1]].forEach(([x, r], k) => {
      ctx.save(); ctx.translate(x + 7, -50); ctx.rotate(r - sw * (k ? -1 : 1) - .1);
      ctx.fillStyle = k ? dark : c; ctx.beginPath(); ctx.ellipse(0, -14, 5.5, 17, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.ellipse(0, -13, 2.6, 12, 0, 0, TAU); ctx.fill(); ctx.restore();
    });
    // head
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(8, -40, 15, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.ellipse(14, -35, 8, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.arc(12, -34, 3, 0, TAU); ctx.fill();    // cheek
    // eye (blinks)
    if (p.blink) { ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(10, -42); ctx.lineTo(16, -42); ctx.stroke(); }
    else { ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.ellipse(14, -43, 3.2, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(15, -44.5, 1.3, 0, TAU); ctx.fill(); }
    // nose + whiskers
    ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.arc(21, -39, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(15,23,42,.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(19, -37); ctx.lineTo(30, -39); ctx.moveTo(19, -36); ctx.lineTo(30, -34); ctx.stroke();
    ctx.restore();
  }
}
