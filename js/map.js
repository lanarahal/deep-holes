/**
 * Side-view Map with pan, animals, textured layers
 */

const HOLE_WIDTH = 160;
const SURFACE_Y = 210;

export class MapRenderer {
  constructor(canvas, holes, onHoleClick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.holes = holes;
    this.onHoleClick = onHoleClick;

    this.cameraX = 0;
    this.targetCameraX = 0;
    this.time = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragCameraStart = 0;

    // Animals & creatures
    this.surfaceAnimals = this.createSurfaceAnimals();
    this.birds = this.createBirds();
    this.undergroundCreatures = this.createUndergroundCreatures();

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Mouse pan
    this.canvas.addEventListener("mousedown", (e) => this.onPointerDown(e));
    window.addEventListener("mousemove", (e) => this.onPointerMove(e));
    window.addEventListener("mouseup", () => this.onPointerUp());
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetCameraX += e.deltaY * 0.8;
      this.clampCamera();
    }, { passive: false });

    // Keyboard pan
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.targetCameraX -= 40;
      if (e.key === "ArrowRight") this.targetCameraX += 40;
      this.clampCamera();
    });

    this.canvas.addEventListener("click", (e) => this.handleClick(e));

    this.startLoop();
  }

  createSurfaceAnimals() {
    const types = ["rabbit", "fox", "deer", "squirrel"];
    const list = [];
    for (let i = 0; i < 7; i++) {
      list.push({
        type: types[i % types.length],
        x: 80 + i * 180 + Math.random() * 60,
        y: SURFACE_Y - 18,
        speed: 0.4 + Math.random() * 0.6,
        dir: Math.random() > 0.5 ? 1 : -1,
        frame: Math.random() * 10
      });
    }
    return list;
  }

  createBirds() {
    const list = [];
    for (let i = 0; i < 5; i++) {
      list.push({
        x: Math.random() * 1200,
        y: 30 + Math.random() * 80,
        speed: 0.8 + Math.random() * 1.2,
        wing: Math.random() * Math.PI
      });
    }
    return list;
  }

  createUndergroundCreatures() {
    // layer index roughly: 0=soil, 1=deep soil, 2=stone, 3=hard stone, 4=deep
    return [
      { layer: 0, x: 200, type: "worm", speed: 0.3 },
      { layer: 0, x: 500, type: "worm", speed: 0.25 },
      { layer: 1, x: 300, type: "beetle", speed: 0.4 },
      { layer: 1, x: 700, type: "beetle", speed: 0.35 },
      { layer: 2, x: 250, type: "crystal", speed: 0 },
      { layer: 2, x: 600, type: "crystal", speed: 0 },
      { layer: 3, x: 400, type: "bone", speed: 0 },
      { layer: 3, x: 800, type: "gem", speed: 0 },
      { layer: 4, x: 350, type: "treasure", speed: 0 },
      { layer: 4, x: 650, type: "diamond", speed: 0 }
    ];
  }

  startLoop() {
    const loop = () => {
      this.time += 0.016;
      // Smooth camera
      this.cameraX += (this.targetCameraX - this.cameraX) * 0.12;
      this.updateAnimals();
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  }

  updateAnimals() {
    // Surface animals
    this.surfaceAnimals.forEach(a => {
      a.x += a.speed * a.dir;
      a.frame += 0.15;
      if (a.x > 1600) a.dir = -1;
      if (a.x < -50) a.dir = 1;
    });
    // Birds
    this.birds.forEach(b => {
      b.x += b.speed;
      b.wing += 0.2;
      if (b.x > 1400) b.x = -50;
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setHoles(holes) {
    this.holes = holes;
    // Auto scroll to show newest hole
    if (holes.length > 0) {
      const lastX = 90 + (holes.length - 1) * HOLE_WIDTH;
      const viewW = this.canvas.clientWidth;
      if (lastX - this.cameraX > viewW - 200) {
        this.targetCameraX = lastX - viewW + 250;
        this.clampCamera();
      }
    }
  }

  clampCamera() {
    const maxX = Math.max(0, (this.holes.length * HOLE_WIDTH) - this.canvas.clientWidth + 300);
    this.targetCameraX = Math.max(0, Math.min(maxX, this.targetCameraX));
  }

  onPointerDown(e) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragCameraStart = this.targetCameraX;
    this.canvas.style.cursor = "grabbing";
  }

  onPointerMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    this.targetCameraX = this.dragCameraStart - dx;
    this.clampCamera();
  }

  onPointerUp() {
    this.isDragging = false;
    this.canvas.style.cursor = "grab";
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
    sky.addColorStop(0, "#0c4a6e");
    sky.addColorStop(0.45, "#0ea5e9");
    sky.addColorStop(0.85, "#7dd3fc");
    sky.addColorStop(1, "#bae6fd");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, SURFACE_Y);

    // Sun
    const sunX = w - 100;
    const sunY = 50;
    const glow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 55);
    glow.addColorStop(0, "rgba(253,224,71,0.85)");
    glow.addColorStop(1, "rgba(253,224,71,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    this.drawClouds(ctx, w);

    // Birds
    this.birds.forEach(b => this.drawBird(ctx, b));

    // Trees
    this.drawTrees(ctx, w);

    // Grass
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, SURFACE_Y - 12, w, 20);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < w; i += 7) {
      const sway = Math.sin(this.time * 2.2 + i * 0.12) * 2.5;
      ctx.beginPath();
      ctx.moveTo(i, SURFACE_Y);
      ctx.lineTo(i + sway, SURFACE_Y - 9);
      ctx.stroke();
    }

    // Surface animals
    this.surfaceAnimals.forEach(a => this.drawSurfaceAnimal(ctx, a));

    // Underground layers with texture
    this.drawGroundLayers(ctx, w, h);

    // Underground creatures / items
    this.undergroundCreatures.forEach(c => this.drawUnderground(ctx, c));

    // Holes
    this.holes.forEach(hole => this.drawHole(ctx, hole));
  }

  drawClouds(ctx, w) {
    const clouds = [
      { x: 80, y: 35, s: 1 },
      { x: 320, y: 65, s: 0.75 },
      { x: 580, y: 30, s: 1.15 },
      { x: 850, y: 55, s: 0.85 },
      { x: 1100, y: 40, s: 1 }
    ];
    clouds.forEach((c, i) => {
      const offset = (this.time * (6 + i * 2.5)) % (w + 250);
      const x = ((c.x - this.cameraX * 0.3 + offset) % (w + 250)) - 80;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(x, c.y, 20 * c.s, 0, Math.PI * 2);
      ctx.arc(x + 22 * c.s, c.y - 6, 26 * c.s, 0, Math.PI * 2);
      ctx.arc(x + 48 * c.s, c.y, 18 * c.s, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawBird(ctx, b) {
    const x = b.x - this.cameraX * 0.6;
    const wingY = Math.sin(b.wing) * 4;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, b.y + wingY);
    ctx.quadraticCurveTo(x, b.y - 4, x + 8, b.y + wingY);
    ctx.stroke();
  }

  drawTrees(ctx, w) {
    const positions = [40, 130, 240, 370, 510, 660, 810, 960, 1110, 1260];
    positions.forEach((baseX, i) => {
      const x = baseX - this.cameraX * 0.85;
      if (x < -60 || x > w + 60) return;
      const sway = Math.sin(this.time * 1.4 + i * 0.7) * 2.5;

      ctx.fillStyle = "#78350f";
      ctx.fillRect(x - 8, SURFACE_Y - 80, 16, 80);

      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(x + sway, SURFACE_Y - 100, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.arc(x - 20 + sway, SURFACE_Y - 80, 26, 0, Math.PI * 2);
      ctx.arc(x + 20 + sway, SURFACE_Y - 80, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(x + sway, SURFACE_Y - 115, 22, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawSurfaceAnimal(ctx, a) {
    const x = a.x - this.cameraX;
    if (x < -40 || x > this.canvas.clientWidth + 40) return;
    const bob = Math.sin(a.frame) * 2;

    ctx.save();
    ctx.translate(x, a.y + bob);
    ctx.scale(a.dir, 1);

    if (a.type === "rabbit") {
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, -5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.ellipse(3, -14, 3, 8, 0.2, 0, Math.PI * 2);
      ctx.ellipse(9, -14, 3, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.type === "fox") {
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -4);
      ctx.lineTo(18, -2);
      ctx.lineTo(8, 2);
      ctx.fill();
    } else if (a.type === "deer") {
      ctx.fillStyle = "#a16207";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(5, -8);
      ctx.lineTo(5, -18);
      ctx.moveTo(5, -14);
      ctx.lineTo(10, -16);
      ctx.stroke();
    } else {
      // squirrel
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawGroundLayers(ctx, w, h) {
    const layers = [
      { y: SURFACE_Y, h: 95, color: "#a16207", texture: "roots" },
      { y: SURFACE_Y + 95, h: 115, color: "#854d0e", texture: "pebbles" },
      { y: SURFACE_Y + 210, h: 130, color: "#57534e", texture: "stone" },
      { y: SURFACE_Y + 340, h: 150, color: "#292524", texture: "bones" },
      { y: SURFACE_Y + 490, h: h, color: "#1c1917", texture: "deep" }
    ];

    layers.forEach((l, idx) => {
      ctx.fillStyle = l.color;
      ctx.fillRect(0, l.y, w, l.h);

      // Texture overlay
      ctx.save();
      ctx.globalAlpha = 0.18;
      if (l.texture === "roots") {
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const rx = ((i * 97 + 30) - this.cameraX * 0.2) % (w + 100);
          ctx.beginPath();
          ctx.moveTo(rx, l.y + 10);
          ctx.quadraticCurveTo(rx + 20, l.y + 40, rx - 10, l.y + 80);
          ctx.stroke();
        }
      } else if (l.texture === "pebbles") {
        ctx.fillStyle = "#a8a29e";
        for (let i = 0; i < 40; i++) {
          const px = ((i * 53 + 10) - this.cameraX * 0.15) % (w + 40);
          const py = l.y + 15 + (i * 17) % (l.h - 25);
          ctx.beginPath();
          ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (l.texture === "stone") {
        ctx.strokeStyle = "#78716c";
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const sx = ((i * 140) - this.cameraX * 0.1) % (w + 80);
          ctx.strokeRect(sx, l.y + 20 + (i % 3) * 30, 50 + (i % 4) * 10, 25);
        }
      } else if (l.texture === "bones") {
        ctx.strokeStyle = "#d6d3d1";
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const bx = ((i * 180 + 40) - this.cameraX * 0.08) % (w + 60);
          ctx.beginPath();
          ctx.moveTo(bx, l.y + 40);
          ctx.lineTo(bx + 30, l.y + 55);
          ctx.moveTo(bx + 5, l.y + 35);
          ctx.lineTo(bx + 5, l.y + 50);
          ctx.stroke();
        }
      } else {
        // deep sparkles
        ctx.fillStyle = "#fbbf24";
        for (let i = 0; i < 15; i++) {
          const dx = ((i * 89 + 20) - this.cameraX * 0.05) % (w + 30);
          const dy = l.y + 30 + (i * 41) % 200;
          ctx.globalAlpha = 0.3 + Math.sin(this.time * 2 + i) * 0.2;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Layer separator
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, l.y);
      ctx.lineTo(w, l.y);
      ctx.stroke();
    });
  }

  drawUnderground(ctx, c) {
    const layerY = [SURFACE_Y + 40, SURFACE_Y + 140, SURFACE_Y + 260, SURFACE_Y + 400, SURFACE_Y + 550];
    const y = layerY[c.layer] || SURFACE_Y + 100;
    const x = c.x - this.cameraX * 0.5;
    if (x < -30 || x > this.canvas.clientWidth + 30) return;

    ctx.save();
    ctx.translate(x, y);

    if (c.type === "worm") {
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-4, -6, 4, 0);
      ctx.quadraticCurveTo(10, 5, 14, 0);
      ctx.stroke();
    } else if (c.type === "beetle") {
      ctx.fillStyle = "#365314";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.type === "crystal") {
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(6, 4);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
    } else if (c.type === "bone") {
      ctx.strokeStyle = "#e7e5e4";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
    } else if (c.type === "gem" || c.type === "diamond") {
      ctx.fillStyle = c.type === "diamond" ? "#a5f3fc" : "#c084fc";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
    } else if (c.type === "treasure") {
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(-8, -6, 16, 3);
    }
    ctx.restore();
  }

  drawHole(ctx, hole) {
    const x = 100 + hole.x * HOLE_WIDTH - this.cameraX;
    const depthPx = Math.min(22 + hole.depth * 15, 430);
    const topY = SURFACE_Y;
    const cx = x + HOLE_WIDTH / 2;

    // Opening
    ctx.beginPath();
    ctx.ellipse(cx, topY, 44, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0c0a09";
    ctx.fill();

    // Shaft
    const grad = ctx.createLinearGradient(cx - 38, 0, cx + 38, 0);
    grad.addColorStop(0, "#1c1917");
    grad.addColorStop(0.5, "#0c0a09");
    grad.addColorStop(1, "#1c1917");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 38, topY, 76, depthPx);

    ctx.strokeStyle = "#44403c";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 38, topY, 76, depthPx);

    // Photo / color block
    const imgSize = 54;
    const imgY = topY + Math.min(depthPx * 0.5, depthPx - imgSize - 18);
    ctx.fillStyle = hole.customRabbit?.color || "#64748b";
    ctx.beginPath();
    ctx.roundRect(cx - imgSize / 2, imgY, imgSize, imgSize, 10);
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Depth label
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Depth ${hole.depth}`, cx, topY + depthPx + 20);

    hole._hitbox = { x: cx - 48, y: topY - 14, w: 96, h: depthPx + 45 };
  }

  handleClick(e) {
    if (this.isDragging) return;
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
