/**
 * Deep Holes – Main
 */

import { getAllHoles, addHole, updateHole, deepenHole, getMyMaxDepth, session } from "./data.js";
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
const ownerPanelBtn = document.getElementById("owner-panel-btn");

// Modals
const buyModal = document.getElementById("buy-modal");
const depthSlider = document.getElementById("depth-slider");
const depthValue = document.getElementById("depth-value");
const costDisplay = document.getElementById("cost-display");
const cancelBuyBtn = document.getElementById("cancel-buy-btn");
const confirmBuyBtn = document.getElementById("confirm-buy-btn");

const ownerModal = document.getElementById("owner-modal");
const editDescription = document.getElementById("edit-description");
const editImage = document.getElementById("edit-image");
const editLinks = document.getElementById("edit-links");
const editCurrentDepth = document.getElementById("edit-current-depth");
const deepenBtn = document.getElementById("deepen-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const saveEditBtn = document.getElementById("save-edit-btn");

let currentHole = null;
let isOwner = false;

// Renderers
const mapRenderer = new MapRenderer(mapCanvas, getAllHoles(), onHoleClick, getMyMaxDepth);
mapRenderer.owner = session.user;
const roomRenderer = new RoomRenderer(roomCanvas);

// ----- Events -----
backBtn.addEventListener("click", showMap);

buyFirstBtn.addEventListener("click", () => openBuyModal());
buyHoleBtn.addEventListener("click", () => openBuyModal());

depthSlider.addEventListener("input", () => {
  const d = parseInt(depthSlider.value, 10);
  depthValue.textContent = d;
  costDisplay.textContent = `$${d * 4}`;
});

cancelBuyBtn.addEventListener("click", () => buyModal.classList.add("hidden"));
confirmBuyBtn.addEventListener("click", () => {
  const depth = parseInt(depthSlider.value, 10);
  const hole = addHole({
    depth,
    description: `A new hole starting at depth ${depth}.`,
    owner: session.user
  });
  buyModal.classList.add("hidden");
  updateEmptyState();
  mapRenderer.setHoles(getAllHoles());
  mapRenderer.focusHole(hole);
  console.log("Hole created at depth", depth, hole);
});

ownerPanelBtn.addEventListener("click", () => openOwnerPanel());
cancelEditBtn.addEventListener("click", () => ownerModal.classList.add("hidden"));

saveEditBtn.addEventListener("click", () => {
  if (!currentHole) return;
  const linksText = editLinks.value.trim();
  const links = linksText
    ? linksText.split("\n").map(line => {
        const [label, url] = line.split("|").map(s => s.trim());
        return { label: label || "Link", url: url || "#" };
      })
    : [];

  updateHole(currentHole.id, {
    description: editDescription.value,
    image: editImage.value || currentHole.image,
    links
  });

  ownerModal.classList.add("hidden");
  // Refresh room view
  showRoom(getHoleByIdSafe(currentHole.id), true);
  mapRenderer.holes = getAllHoles();
});

deepenBtn.addEventListener("click", () => {
  if (!currentHole) return;
  deepenHole(currentHole.id);
  editCurrentDepth.textContent = currentHole.depth;
  roomDepthBadge.textContent = `Depth ${currentHole.depth}`;
  roomRenderer.enter(currentHole, isOwner);   // rebuild room for the new depth
  mapRenderer.holes = getAllHoles();
  console.log("Deepened to", currentHole.depth);
});

// ----- Core -----
function getHoleByIdSafe(id) {
  return getAllHoles().find(h => h.id === id);
}

function onHoleClick(hole) {
  currentHole = hole;
  isOwner = hole.owner === session.user;
  showRoom(hole, isOwner);
}

function showMap() {
  roomRenderer.leave();
  mapRenderer.setActive(true);
  roomScreen.classList.remove("active");
  mapScreen.classList.add("active");
  mapRenderer.holes = getAllHoles();
  updateEmptyState();
}

function showRoom(hole, owner) {
  mapRenderer.setActive(false);
  mapScreen.classList.remove("active");
  roomScreen.classList.add("active");

  roomTitle.textContent = `Hole #${hole.id}`;
  roomDepthBadge.textContent = `Depth ${hole.depth}`;
  if (hole.image) roomImage.src = hole.image; else roomImage.removeAttribute("src");
  roomImage.onerror = () => { roomImage.removeAttribute("src"); };
  roomDescription.textContent = hole.description || "No description yet.";

  roomLinks.innerHTML = "";
  if (hole.links?.length) {
    hole.links.forEach(link => {
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = link.label;
      roomLinks.appendChild(a);
    });
  }

  // Show owner button only for owned holes
  if (owner) {
    ownerPanelBtn.classList.remove("hidden");
  } else {
    ownerPanelBtn.classList.add("hidden");
  }

  // Small delay to ensure canvas is visible before starting
  setTimeout(() => {
    roomRenderer.enter(hole, owner);
  }, 50);
}

function updateEmptyState() {
  const holes = getAllHoles();
  if (holes.length === 0) emptyState.classList.remove("hidden");
  else emptyState.classList.add("hidden");
}

function openBuyModal() {
  depthSlider.value = 1;
  depthValue.textContent = "1";
  costDisplay.textContent = "$4";
  buyModal.classList.remove("hidden");
}

function openOwnerPanel() {
  if (!currentHole) return;
  editDescription.value = currentHole.description || "";
  editImage.value = currentHole.image || "";
  editLinks.value = (currentHole.links || [])
    .map(l => `${l.label}|${l.url}`)
    .join("\n");
  editCurrentDepth.textContent = currentHole.depth;
  ownerModal.classList.remove("hidden");
}

// ----- Wallet (Phantom / Solana) -----
const walletBtn = document.getElementById("connect-wallet-btn");
const walletAddr = document.getElementById("wallet-address");
walletBtn.addEventListener("click", async () => {
  const sol = window.solana;
  if (!sol?.isPhantom) { window.open("https://phantom.app/", "_blank", "noopener"); return; }
  try {
    const { publicKey } = await sol.connect();
    session.wallet = publicKey.toString();
    session.user = session.wallet;
    mapRenderer.owner = session.user;
    walletBtn.classList.add("hidden");
    walletAddr.textContent = session.wallet.slice(0, 4) + "…" + session.wallet.slice(-4);
    walletAddr.classList.remove("hidden");
    mapRenderer.clamp();
  } catch (e) { console.warn("Wallet connection rejected", e); }
});

// Init
updateEmptyState();
showMap();

window.DeepHoles = {
  getHoles: getAllHoles,
  addHole,
  deepenHole,
  mapRenderer,
  roomRenderer
};

console.log("%cDeep Holes ready", "color:#38bdf8; font-weight:bold;");
console.log("Drag map to pan. Click holes. Own holes show 'Edit Hole' button.");
