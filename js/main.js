/**
 * نقطه ورود اصلی بازی
 * همه چیز ماژولار است و بعداً قابل جایگزینی
 */

import { getAllHoles, getHoleById } from "./data.js";
import { MapRenderer } from "./map.js";
import { RoomRenderer } from "./room.js";

// عناصر DOM
const mapScreen = document.getElementById("map-screen");
const roomScreen = document.getElementById("room-screen");
const mapCanvas = document.getElementById("map-canvas");
const roomCanvas = document.getElementById("room-canvas");
const backBtn = document.getElementById("back-to-map-btn");
const roomTitle = document.getElementById("room-title");
const roomImage = document.getElementById("room-image");
const roomDescription = document.getElementById("room-description");
const roomLinks = document.getElementById("room-links");

// وضعیت فعلی
let currentHole = null;
let isOwner = false; // فعلاً برای تست همیشه false (مهمان)

// راه‌اندازی رندررها
const mapRenderer = new MapRenderer(mapCanvas, getAllHoles(), onHoleClick);
const roomRenderer = new RoomRenderer(roomCanvas);

// ----- رویدادها -----
backBtn.addEventListener("click", () => {
  showMap();
});

// ----- توابع اصلی -----
function onHoleClick(hole) {
  currentHole = hole;
  // فعلاً همه را مهمان در نظر می‌گیریم (بعداً با ولت چک می‌شود)
  isOwner = false;
  showRoom(hole, isOwner);
}

function showMap() {
  roomRenderer.leave();
  roomScreen.classList.remove("active");
  mapScreen.classList.add("active");
  mapRenderer.setHoles(getAllHoles());
  mapRenderer.draw();
}

function showRoom(hole, owner) {
  mapScreen.classList.remove("active");
  roomScreen.classList.add("active");

  // پر کردن اطلاعات
  roomTitle.textContent = `لونه #${hole.id} — عمق ${hole.depth}`;
  roomImage.src = hole.image || "";
  roomImage.alt = `تصویر لونه ${hole.id}`;
  roomDescription.textContent = hole.description || "بدون توضیحات";

  // لینک‌ها
  roomLinks.innerHTML = "";
  if (hole.links && hole.links.length) {
    hole.links.forEach(link => {
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = link.label;
      roomLinks.appendChild(a);
    });
  }

  // شروع اتاق
  roomRenderer.enter(hole, owner);
}

// شروع اولیه
showMap();

// برای دیباگ در کنسول
window.DeepHoles = {
  getHoles: getAllHoles,
  mapRenderer,
  roomRenderer
};

console.log("%cDeep Holes آماده است!", "color:#38bdf8; font-size:14px;");
console.log("برای تست: روی لونه‌ها کلیک کن و با فلش‌ها حرکت کن.");
