/**
 * Main entry point – Deep Holes
 * All UI text is English. Data layer is mock and ready for Supabase swap.
 */

import { getAllHoles, addHole, clearAllHoles } from "./data.js";
import { MapRenderer } from "./map.js";
import { RoomRenderer } from "./room.js";

// DOM
const mapScreen = document.getElementById("map-screen");
const roomScreen = document.getElementById("room-screen");
const mapCanvas = document.getElementById("map-canvas");
const roomCanvas = document.getElementById("room-canvas");
const backBtn = document.getElementById("back-to-map-btn");
const roomTitle = document.getElementById("room-title");
const roomDepthBadge = document.getElementById("room-depth-badge");
const roomImage = document.getElementById("room-image");
const roomDescription = document.getElementById("room-description");
const roomLinks = document.getElementById("room-links");
const emptyState = document.getElementById("empty-state");
const buyFirstBtn = document.getElementById("buy-first-hole-btn");
const buyHoleBtn = document.getElementById("buy-hole-btn");

// State
let currentHole = null;
let isOwner = false;

// Renderers
const mapRenderer = new MapRenderer(mapCanvas, getAllHoles(), onHoleClick);
const roomRenderer = new RoomRenderer(roomCanvas);

// ----- Events -----
backBtn.addEventListener("click", showMap);

buyFirstBtn.addEventListener("click", () => {
  // Simulate buying the first hole (later: real Solana tx)
  const hole = addHole({
    owner: "you",
    description: "My very first hole. The adventure begins!",
    customRabbit: { color: "#f59e0b", earColor: "#d97706" }
  });
  updateEmptyState();
  mapRenderer.setHoles(getAllHoles());
  console.log("First hole created:", hole);
});

buyHoleBtn.addEventListener("click", () => {
  // Simulate buying a new hole
  const hole = addHole({
    owner: "you",
    description: "Another hole in the ground.",
    customRabbit: {
      color: `hsl(${Math.random() * 360}, 70%, 55%)`,
      earColor: `hsl(${Math.random() * 360}, 70%, 40%)`
    }
  });
  updateEmptyState();
  mapRenderer.setHoles(getAllHoles());
  console.log("New hole created:", hole);
});

// ----- Core functions -----
function onHoleClick(hole) {
  currentHole = hole;
  // Later: check wallet address === hole.owner
  isOwner = false;
  showRoom(hole, isOwner);
}

function showMap() {
  roomRenderer.leave();
  roomScreen.classList.remove("active");
  mapScreen.classList.add("active");
  mapRenderer.setHoles(getAllHoles());
  updateEmptyState();
}

function showRoom(hole, owner) {
  mapScreen.classList.remove("active");
  roomScreen.classList.add("active");

  roomTitle.textContent = `Hole #${hole.id}`;
  roomDepthBadge.textContent = `Depth ${hole.depth}`;
  roomImage.src = hole.image || "";
  roomImage.onerror = () => {
    roomImage.src = ""; // fallback
  };
  roomDescription.textContent = hole.description || "No description yet.";

  roomLinks.innerHTML = "";
  if (hole.links && hole.links.length) {
    hole.links.forEach(link => {
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = link.label;
      roomLinks.appendChild(a);
    });
  }

  roomRenderer.enter(hole, owner);
}

function updateEmptyState() {
  const holes = getAllHoles();
  if (holes.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }
}

// Init
updateEmptyState();
showMap();

// Debug helpers
window.DeepHoles = {
  getHoles: getAllHoles,
  addHole,
  clearAllHoles,
  mapRenderer,
  roomRenderer
};

console.log("%cDeep Holes ready", "color:#38bdf8; font-size:14px; font-weight:bold;");
console.log("Click a hole to enter. Use arrow keys or A/D to move the rabbit.");
