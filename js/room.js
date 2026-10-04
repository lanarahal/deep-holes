/**
 * رندر اتاق داخل لونه + حرکت کاراکتر
 */

export class RoomRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.player = null;
    this.keys = {};
    this.animationId = null;
    this.hole = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // کنترل کیبورد
    window.addEventListener("keydown", (e) => {
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

    // کاراکتر بازیکن
    const color = isOwner
      ? (hole.customRabbit?.color || "#f59e0b")
      : "#94a3b8"; // مهمان = خاکستری

    this.player = {
      x: 100,
      y: 0,
      width: 36,
      height: 48,
      speed: 3.5,
      color,
      earColor: isOwner ? (hole.customRabbit?.earColor || "#d97706") : "#64748b",
      facing: 1 // 1 = راست، -1 = چپ
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
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  update() {
    if (!this.player) return;

    const w = this.canvas.clientWidth;
    const floorY = this.canvas.clientHeight - 60;

    // حرکت
    if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) {
      this.player.x -= this.player.speed;
      this.player.facing = -1;
    }
    if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) {
      this.player.x += this.player.speed;
      this.player.facing = 1;
    }

    // محدودیت دیوارها
    this.player.x = Math.max(20, Math.min(w - 20 - this.player.width, this.player.x));
    this.player.y = floorY - this.player.height;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // پس‌زمینه اتاق (بسته به عمق)
    const depth = this.hole?.depth || 1;
    let bgColor = "#292524";
    if (depth > 30) bgColor = "#1c1917";
    else if (depth > 15) bgColor = "#44403c";
    else if (depth > 5) bgColor = "#57534e";

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // کف اتاق
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, h - 60, w, 60);

    // خط کف
    ctx.strokeStyle = "#44403c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - 60);
    ctx.lineTo(w, h - 60);
    ctx.stroke();

    // دیوارهای تزئینی ساده
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, 30, h - 60);
    ctx.fillRect(w - 30, 0, 30, h - 60);

    // کاراکتر (خرگوش ساده)
    if (this.player) {
      this.drawRabbit(ctx, this.player);
    }

    // راهنما
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("← → برای حرکت", w / 2, h - 20);
  }

  drawRabbit(ctx, p) {
    const x = p.x;
    const y = p.y;

    // بدن
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(x, y + 12, p.width, p.height - 12, 10);
    ctx.fill();

    // سر
    ctx.beginPath();
    ctx.arc(x + p.width / 2, y + 10, 16, 0, Math.PI * 2);
    ctx.fill();

    // گوش‌ها
    ctx.fillStyle = p.earColor;
    // گوش چپ
    ctx.beginPath();
    ctx.ellipse(x + p.width / 2 - 10, y - 8, 6, 16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // گوش راست
    ctx.beginPath();
    ctx.ellipse(x + p.width / 2 + 10, y - 8, 6, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // چشم
    ctx.fillStyle = "#0f172a";
    const eyeX = p.facing === 1 ? x + p.width / 2 + 5 : x + p.width / 2 - 5;
    ctx.beginPath();
    ctx.arc(eyeX, y + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    // پاها (خیلی ساده)
    ctx.fillStyle = p.color;
    ctx.fillRect(x + 4, y + p.height - 6, 10, 8);
    ctx.fillRect(x + p.width - 14, y + p.height - 6, 10, 8);
  }
}
