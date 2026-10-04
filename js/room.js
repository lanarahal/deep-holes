/**
 * Room interior + player movement
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

    window.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(e.key)) {
        e.preventDefault();
      }
      this.keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  enter(hole, isOwner = false) {
    this.hole = hole;
    this.isOwner = isOwner;
    this.time = 0;

    const color = isOwner
      ? (hole.customRabbit?.color || "#f59e0b")
      : "#94a3b8";

    const earColor = isOwner
      ? (hole.customRabbit?.earColor || "#d97706")
      : "#64748b";

    this.player = {
      x: 120,
      y: 0,
      width: 42,
      height: 56,
      speed: 4.2,
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

    const w = this.canvas.clientWidth;
    const floorY = this.canvas.clientHeight - 70;
    let moving = false;

    if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) {
      this.player.x -= this.player.speed;
      this.player.facing = -1;
      moving = true;
    }
    if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) {
      this.player.x += this.player.speed;
      this.player.facing = 1;
      moving = true;
    }

    if (moving) {
      this.player.walkCycle += 0.25;
    } else {
      this.player.walkCycle = 0;
    }

    // Boundaries
    this.player.x = Math.max(40, Math.min(w - 40 - this.player.width, this.player.x));
    this.player.y = floorY - this.player.height;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const depth = this.hole?.depth || 1;

    // Background color based on depth
    let bg1 = "#44403c";
    let bg2 = "#292524";
    if (depth > 30) { bg1 = "#1c1917"; bg2 = "#0c0a09"; }
    else if (depth > 15) { bg1 = "#292524"; bg2 = "#1c1917"; }
    else if (depth > 5) { bg1 = "#57534e"; bg2 = "#44403c"; }

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, bg1);
    bgGrad.addColorStop(1, bg2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Side walls
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, 50, h - 70);
    ctx.fillRect(w - 50, 0, 50, h - 70);

    // Wall texture lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let y = 20; y < h - 80; y += 28) {
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(w - 50, y);
      ctx.stroke();
    }

    // Floor
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, h - 70, w, 70);

    // Floor edge highlight
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h - 70);
    ctx.lineTo(w, h - 70);
    ctx.stroke();

    // Simple floor tiles
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, h - 70);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Soft ambient light from above
    const light = ctx.createRadialGradient(w / 2, 0, 10, w / 2, 0, h * 0.7);
    light.addColorStop(0, "rgba(255,255,255,0.06)");
    light.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    // Draw player
    if (this.player) {
      this.drawRabbit(ctx, this.player);
    }

    // Controls hint (fades a bit)
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("← →  or  A D  to move", w / 2, h - 25);
  }

  drawRabbit(ctx, p) {
    const x = p.x;
    const y = p.y;
    const bounce = Math.abs(Math.sin(p.walkCycle)) * 3;

    ctx.save();
    ctx.translate(x + p.width / 2, y + p.height - bounce);
    ctx.scale(p.facing, 1);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(-p.width / 2, -p.height + 16, p.width, p.height - 16, 12);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -p.height + 14, 18, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = p.earColor;
    // Left ear
    ctx.beginPath();
    ctx.ellipse(-11, -p.height - 6, 7, 18, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.ellipse(11, -p.height - 6, 7, 18, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(-11, -p.height - 4, 3, 10, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(11, -p.height - 4, 3, 10, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(6, -p.height + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -p.height + 11, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(10, -p.height + 18, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Feet (simple bob)
    const footOffset = Math.sin(p.walkCycle) * 4;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(-16, -8, 12, 10, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(4, -8 + footOffset, 12, 10, 4);
    ctx.fill();

    ctx.restore();
  }
}
