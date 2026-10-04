/**
 * Isometric-style room + clear rabbit movement
 */

export class RoomRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.player = null;
    this.keys = {};
    this.animationId = null;
    this.hole = null;
    this.time = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Also listen to visibility / zoom changes
    window.addEventListener("resize", () => {
      setTimeout(() => this.resize(), 50);
    });

    window.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "A", "d", "D", "w", "W", "s", "S"].includes(e.key)) {
        e.preventDefault();
      }
      this.keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = rect.width;
    this.viewH = rect.height;
  }

  enter(hole, isOwner = false) {
    this.hole = hole;
    this.isOwner = isOwner;
    this.time = 0;
    this.resize(); // force correct size

    const color = isOwner
      ? (hole.customRabbit?.color || "#f59e0b")
      : "#94a3b8";
    const earColor = isOwner
      ? (hole.customRabbit?.earColor || "#d97706")
      : "#64748b";

    // Player position in isometric space
    this.player = {
      isoX: 0,
      isoY: 0,
      width: 48,
      height: 64,
      speed: 2.8,
      color,
      earColor,
      facing: 1,
      walkCycle: 0
    };

    this.startLoop();
  }

  leave() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.player = null;
    this.hole = null;
  }

  startLoop() {
    const loop = () => {
      this.time += 0.016;
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  update() {
    if (!this.player) return;
    let moving = false;

    if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) {
      this.player.isoX -= this.player.speed;
      this.player.facing = -1;
      moving = true;
    }
    if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) {
      this.player.isoX += this.player.speed;
      this.player.facing = 1;
      moving = true;
    }
    if (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"]) {
      this.player.isoY -= this.player.speed * 0.6;
      moving = true;
    }
    if (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"]) {
      this.player.isoY += this.player.speed * 0.6;
      moving = true;
    }

    // Clamp inside room
    this.player.isoX = Math.max(-180, Math.min(180, this.player.isoX));
    this.player.isoY = Math.max(-80, Math.min(90, this.player.isoY));

    if (moving) this.player.walkCycle += 0.28;
    else this.player.walkCycle *= 0.8;
  }

  // Convert isometric to screen
  isoToScreen(isoX, isoY) {
    const cx = this.viewW / 2;
    const cy = this.viewH / 2 + 30;
    return {
      x: cx + (isoX - isoY) * 0.9,
      y: cy + (isoX + isoY) * 0.45
    };
  }

  draw() {
    if (!this.viewW) this.resize();
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    const depth = this.hole?.depth || 1;

    // Background
    let topC = "#3f3f46";
    let botC = "#1c1917";
    if (depth > 25) { topC = "#1c1917"; botC = "#0c0a09"; }
    else if (depth > 12) { topC = "#292524"; botC = "#1c1917"; }
    else if (depth > 5) { topC = "#44403c"; botC = "#292524"; }

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, topC);
    bg.addColorStop(1, botC);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Isometric floor
    this.drawIsoFloor(ctx, w, h);

    // Walls (simple isometric feel)
    this.drawIsoWalls(ctx, w, h);

    // Decorative items based on depth
    this.drawRoomDecor(ctx, depth);

    // Player
    if (this.player) {
      this.drawRabbit(ctx, this.player);
    }

    // Hint
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("← → A D  move  •  W S  forward/back", w / 2, h - 18);
  }

  drawIsoFloor(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2 + 40;

    // Floor diamond
    ctx.fillStyle = "#292524";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 110);
    ctx.lineTo(cx + 220, cy);
    ctx.lineTo(cx, cy + 110);
    ctx.lineTo(cx - 220, cy);
    ctx.closePath();
    ctx.fill();

    // Grid lines on floor
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const p1 = this.isoToScreen(i * 40, -120);
      const p2 = this.isoToScreen(i * 40, 120);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = this.isoToScreen(-160, i * 30);
      const p4 = this.isoToScreen(160, i * 30);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // Floor edge highlight
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 110);
    ctx.lineTo(cx + 220, cy);
    ctx.lineTo(cx, cy + 110);
    ctx.lineTo(cx - 220, cy);
    ctx.closePath();
    ctx.stroke();
  }

  drawIsoWalls(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2 + 40;

    // Back wall (darker)
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.moveTo(cx - 220, cy);
    ctx.lineTo(cx, cy - 110);
    ctx.lineTo(cx, cy - 220);
    ctx.lineTo(cx - 220, cy - 110);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 220, cy);
    ctx.lineTo(cx, cy - 110);
    ctx.lineTo(cx, cy - 220);
    ctx.lineTo(cx + 220, cy - 110);
    ctx.closePath();
    ctx.fill();
  }

  drawRoomDecor(ctx, depth) {
    // Simple glowing crystals or lamps depending on depth
    const items = [
      { isoX: -90, isoY: -40, type: depth > 10 ? "crystal" : "lamp" },
      { isoX: 100, isoY: 30, type: depth > 15 ? "chest" : "rock" },
      { isoX: -40, isoY: 50, type: "mushroom" }
    ];

    items.forEach(item => {
      const pos = this.isoToScreen(item.isoX, item.isoY);
      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (item.type === "lamp") {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, -20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-3, -12, 6, 18);
      } else if (item.type === "crystal") {
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(10, 0);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
      } else if (item.type === "chest") {
        ctx.fillStyle = "#b45309";
        ctx.fillRect(-14, -12, 28, 18);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-14, -12, 28, 5);
      } else {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.ellipse(0, -6, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fca5a5";
        ctx.beginPath();
        ctx.arc(0, -14, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  drawRabbit(ctx, p) {
    const pos = this.isoToScreen(p.isoX, p.isoY);
    const bounce = Math.abs(Math.sin(p.walkCycle)) * 4;

    ctx.save();
    ctx.translate(pos.x, pos.y - bounce);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(p.facing, 1);

    // Body
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(-20, -36, 40, 40, 14);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -48, 18, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = p.earColor;
    ctx.beginPath();
    ctx.ellipse(-12, -72, 7, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -72, 7, 18, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(-12, -70, 3.5, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -70, 3.5, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(7, -50, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(8.5, -51, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(12, -43, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Feet
    const foot = Math.sin(p.walkCycle) * 5;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(-18, 0, 14, 12, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(4, foot, 14, 12, 5);
    ctx.fill();

    ctx.restore();
  }
}
