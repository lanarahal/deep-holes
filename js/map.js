/**
 * رندر نقشهٔ کناری (Side-view)
 * قابل گسترش برای لایه‌های زمین و عمق بی‌نهایت
 */

const HOLE_WIDTH = 140;      // عرض هر لونه
const SURFACE_Y = 180;       // ارتفاع سطح زمین از بالای canvas
const MAX_VISIBLE_DEPTH = 25; // برای مقیاس بصری

export class MapRenderer {
  constructor(canvas, holes, onHoleClick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.holes = holes;
    this.onHoleClick = onHoleClick;

    this.cameraX = 0; // اسکرول افقی
    this.scale = 1;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // کلیک روی لونه
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.draw();
  }

  setHoles(holes) {
    this.holes = holes;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // پاک کردن
    ctx.clearRect(0, 0, w, h);

    // ===== آسمان =====
    const skyGrad = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
    skyGrad.addColorStop(0, "#0ea5e9");
    skyGrad.addColorStop(0.6, "#38bdf8");
    skyGrad.addColorStop(1, "#7dd3fc");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, SURFACE_Y);

    // خورشید ساده
    ctx.beginPath();
    ctx.arc(w - 80, 50, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#fde047";
    ctx.fill();

    // ===== درختان جنگل (ساده) =====
    this.drawTrees(ctx, w);

    // ===== سطح زمین =====
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, SURFACE_Y - 8, w, 16);

    // ===== لایه‌های زیر زمین =====
    this.drawGroundLayers(ctx, w, h);

    // ===== لونه‌ها =====
    this.holes.forEach(hole => {
      this.drawHole(ctx, hole);
    });
  }

  drawTrees(ctx, w) {
    const treePositions = [40, 120, 220, 340, 480, 620, 780, 920];
    treePositions.forEach(x => {
      // تنه
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x - 6, SURFACE_Y - 70, 12, 70);
      // شاخ و برگ
      ctx.beginPath();
      ctx.arc(x, SURFACE_Y - 80, 28, 0, Math.PI * 2);
      ctx.fillStyle = "#166534";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 15, SURFACE_Y - 65, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 15, SURFACE_Y - 65, 20, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawGroundLayers(ctx, w, h) {
    const layers = [
      { y: SURFACE_Y, height: 80, color: "#a16207" },   // خاک سطحی
      { y: SURFACE_Y + 80, height: 100, color: "#854d0e" }, // خاک عمیق
      { y: SURFACE_Y + 180, height: 120, color: "#57534e" }, // سنگ
      { y: SURFACE_Y + 300, height: 150, color: "#292524" }, // سنگ سخت
      { y: SURFACE_Y + 450, height: h, color: "#1c1917" }    // عمق ناشناخته
    ];

    layers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.fillRect(0, layer.y, w, layer.height);
    });

    // خطوط لایه‌ها
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    [SURFACE_Y + 80, SURFACE_Y + 180, SURFACE_Y + 300, SURFACE_Y + 450].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });
  }

  drawHole(ctx, hole) {
    const x = 80 + hole.x * HOLE_WIDTH - this.cameraX;
    const depthPx = Math.min(hole.depth * 18, 400); // عمق بصری
    const topY = SURFACE_Y;
    const bottomY = topY + depthPx;

    // دهانه لونه (بیضی)
    ctx.beginPath();
    ctx.ellipse(x + HOLE_WIDTH / 2, topY, 38, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1c1917";
    ctx.fill();

    // بدنه لونه (مستطیل تیره با لبه‌های نرم)
    ctx.fillStyle = "#0c0a09";
    ctx.fillRect(x + HOLE_WIDTH / 2 - 32, topY, 64, depthPx);

    // لبه‌های داخلی
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + HOLE_WIDTH / 2 - 32, topY, 64, depthPx);

    // عکس کوچک روی/داخل لونه (هر چه عمیق‌تر، پایین‌تر)
    if (hole.image) {
      const imgSize = 48;
      const imgY = topY + Math.min(depthPx * 0.6, depthPx - imgSize - 10);

      // فعلاً یک مربع رنگی به جای عکس واقعی (بعداً Image لود می‌کنیم)
      ctx.fillStyle = hole.customRabbit?.color || "#64748b";
      ctx.beginPath();
      ctx.roundRect(x + HOLE_WIDTH / 2 - imgSize / 2, imgY, imgSize, imgSize, 8);
      ctx.fill();

      // شماره عمق
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`Depth ${hole.depth}`, x + HOLE_WIDTH / 2, bottomY + 22);
    }

    // ذخیره محدوده کلیک
    hole._hitbox = {
      x: x + HOLE_WIDTH / 2 - 40,
      y: topY - 10,
      w: 80,
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
        break;
      }
    }
  }
}
