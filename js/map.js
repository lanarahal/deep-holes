/**
 * Side-view Map Renderer
 * Modular – easy to extend with more layers, particles, etc.
 */

const HOLE_WIDTH = 150;
const SURFACE_Y = 200;

export class MapRenderer {
  constructor(canvas, holes, onHoleClick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.holes = holes;
    this.onHoleClick = onHoleClick;

    this.cameraX = 0;
    this.time = 0; // for subtle animations
    this.animationId = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("click", (e) => this.handleClick(e));

    this.startLoop();
  }

  startLoop() {
    const loop = () => {
      this.time += 0.016;
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopLoop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  setHoles(holes) {
    this.holes = holes;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
    skyGrad.addColorStop(0, "#0c4a6e");
    skyGrad.addColorStop(0.4, "#0ea5e9");
    skyGrad.addColorStop(0.85, "#7dd3fc");
    skyGrad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, SURFACE_Y);

    // Sun with soft glow
    const sunX = w - 90;
    const sunY = 55;
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 50);
    glow.addColorStop(0, "rgba(253, 224, 71, 0.8)");
    glow.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#fde047";
    ctx.fill();

    // Clouds (simple moving)
    this.drawClouds(ctx, w);

    // Trees
    this.drawTrees(ctx, w);

    // Grass surface
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, SURFACE_Y - 10, w, 18);
    // Grass blades (subtle)
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < w; i += 8) {
      const sway = Math.sin(this.time * 2 + i * 0.1) * 2;
      ctx.beginPath();
      ctx.moveTo(i, SURFACE_Y);
      ctx.lineTo(i + sway, SURFACE_Y - 8);
      ctx.stroke();
    }

    // Underground layers
    this.drawGroundLayers(ctx, w, h);

    // Holes
    this.holes.forEach(hole => this.drawHole(ctx, hole));
  }

  drawClouds(ctx, w) {
    const clouds = [
      { x: 100, y: 40, s: 1 },
      { x: 350, y: 70, s: 0.7 },
      { x: 600, y: 35, s: 1.2 },
      { x: 900, y: 60, s: 0.8 }
    ];
    clouds.forEach((c, i) => {
      const offset = (this.time * (8 + i * 3)) % (w + 200);
      const x = ((c.x + offset) % (w + 200)) - 100;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(x, c.y, 22 * c.s, 0, Math.PI * 2);
      ctx.arc(x + 25 * c.s, c.y - 5, 28 * c.s, 0, Math.PI * 2);
      ctx.arc(x + 50 * c.s, c.y, 20 * c.s, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawTrees(ctx, w) {
    const positions = [50, 140, 250, 380, 520, 670, 820, 960, 1100];
    positions.forEach((baseX, i) => {
      const x = baseX - (this.cameraX % 200);
      const sway = Math.sin(this.time * 1.5 + i) * 2;

      // Trunk
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x - 7, SURFACE_Y - 75, 14, 75);

      // Foliage (layered circles)
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(x + sway, SURFACE_Y - 95, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.arc(x - 18 + sway, SURFACE_Y - 75, 24, 0, Math.PI * 2);
      ctx.arc(x + 18 + sway, SURFACE_Y - 75, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(x + sway, SURFACE_Y - 110, 20, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawGroundLayers(ctx, w, h) {
    const layers = [
      { y: SURFACE_Y, h: 90, color: "#a16207" },
      { y: SURFACE_Y + 90, h: 110, color: "#854d0e" },
      { y: SURFACE_Y + 200, h: 130, color: "#57534e" },
      { y: SURFACE_Y + 330, h: 160, color: "#292524" },
      { y: SURFACE_Y + 490, h: h, color: "#1c1917" }
    ];
    layers.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.fillRect(0, l.y, w, l.h);
    });
    // Subtle layer lines
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    [SURFACE_Y + 90, SURFACE_Y + 200, SURFACE_Y + 330, SURFACE_Y + 490].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });
  }

  drawHole(ctx, hole) {
    const x = 90 + hole.x * HOLE_WIDTH - this.cameraX;
    const depthPx = Math.min(20 + hole.depth * 16, 420);
    const topY = SURFACE_Y;
    const cx = x + HOLE_WIDTH / 2;

    // Hole opening (ellipse)
    ctx.beginPath();
    ctx.ellipse(cx, topY, 42, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0c0a09";
    ctx.fill();

    // Hole shaft
    const shaftGrad = ctx.createLinearGradient(cx - 36, 0, cx + 36, 0);
    shaftGrad.addColorStop(0, "#1c1917");
    shaftGrad.addColorStop(0.5, "#0c0a09");
    shaftGrad.addColorStop(1, "#1c1917");
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(cx - 36, topY, 72, depthPx);

    // Inner edge highlight
    ctx.strokeStyle = "#44403c";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 36, topY, 72, depthPx);

    // Photo placeholder (moves down with depth)
    const imgSize = 52;
    const imgY = topY + Math.min(depthPx * 0.55, depthPx - imgSize - 16);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx - imgSize / 2, imgY, imgSize, imgSize, 10);
    ctx.clip();
    ctx.fillStyle = hole.customRabbit?.color || "#64748b";
    ctx.fillRect(cx - imgSize / 2, imgY, imgSize, imgSize);
    // Simple rabbit face icon
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(cx, imgY + 28, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Border around photo
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - imgSize / 2, imgY, imgSize, imgSize, 10);
    ctx.stroke();

    // Depth label
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Depth ${hole.depth}`, cx, topY + depthPx + 22);

    // Hitbox
    hole._hitbox = {
      x: cx - 45,
      y: topY - 12,
      w: 90,
      h: depthPx + 40
    };
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const hole of this.holes) {
      const box = hole._hitbox;
      if (box && mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
        this.onHoleClick(hole);
        return;
      }
    }
  }
}
