/**
 * Deep Holes data layer (prototype).
 * Production note: ownership, permissions and economy must move server/on-chain.
 */
export const MAX_DEPTH = 50;
export const FLOOR_DEPTH_STEP = 5;
export const ADMIN_WALLET = "8radQBX8A5M2NPfQcjPDCRAPVUBzx2vhcVwQQtaPExR3";
export const SPECIAL_OWNER = ADMIN_WALLET;

export let holes = [
  {
    id: 1,
    owner: SPECIAL_OWNER,
    username: "lanarahal",
    depth: 5,
    x: 0,
    special: true,
    style: "royal",
    image: "https://picsum.photos/seed/lanarahal/400/400",
    description: "The first and exclusive Deep Holes burrow of lanarahal.",
    links: [],
    customRabbit: { color: "#f59e0b", earColor: "#b45309" },
    gallery: {}
  },
  {
    id: 2,
    owner: "demo2",
    username: "Bolt",
    depth: 10,
    x: 1,
    style: "cozy",
    image: "https://picsum.photos/seed/rabbit2/400/400",
    description: "Going deeper. The soil here feels different.",
    links: [],
    customRabbit: { color: "#8b5cf6", earColor: "#7c3aed" },
    gallery: {}
  },
  {
    id: 3,
    owner: "demo3",
    username: "Nyx",
    depth: 15,
    x: 2,
    style: "crystal",
    image: "https://picsum.photos/seed/rabbit3/400/400",
    description: "Reached the stone layer. Things are getting interesting.",
    links: [],
    customRabbit: { color: "#10b981", earColor: "#059669" },
    gallery: {}
  }
];

export const GUEST_USER = "you";
export const session = {
  user: GUEST_USER,
  wallet: null,
  character: { color: "#94a3b8", earColor: "#64748b" }
};

export const SLOTS = 6;
export const floorCount = (depth) => Math.max(1, Math.ceil(Math.min(MAX_DEPTH, Math.max(1, depth)) / FLOOR_DEPTH_STEP));
export const layerUnlockedAtDepth = (layerIndex) => Math.min(MAX_DEPTH, (layerIndex + 1) * FLOOR_DEPTH_STEP);

export function getGallery(hole, floor) {
  const g = hole?.gallery?.[floor] || [];
  return Array.from({ length: SLOTS }, (_, i) => g[i] || null);
}
export function setGallery(hole, floor, items) {
  hole.gallery = hole.gallery || {};
  hole.gallery[floor] = Array.from({ length: SLOTS }, (_, i) => items[i] || null);
}
export function getMyMaxDepth() {
  return holes.filter(h => h.owner === session.user).reduce((m, h) => Math.max(m, h.depth), 0);
}

const imgCache = new Map();
export function getImage(url) {
  if (!url) return null;
  if (!imgCache.has(url)) { const img = new Image(); img.src = url; imgCache.set(url, img); }
  return imgCache.get(url);
}
export function getAllHoles() { return [...holes]; }
export function getHoleById(id) { return holes.find(h => h.id === Number(id)); }

export function addHole({ depth = 1, description, image, customRabbit, owner, username, style = "classic" } = {}) {
  const newId = holes.length > 0 ? Math.max(...holes.map(h => h.id)) + 1 : 1;
  const safeDepth = Math.min(MAX_DEPTH, Math.max(1, Math.floor(depth)));
  const newHole = {
    id: newId,
    owner: owner || session.user,
    username: username || (session.wallet ? session.wallet.slice(0, 4) + "…" + session.wallet.slice(-4) : `Rabbit #${newId}`),
    depth: safeDepth,
    x: holes.length,
    style,
    image: image || null,
    description: description || "A brand new hole.",
    links: [],
    gallery: {},
    customRabbit: customRabbit || { color: `hsl(${Math.random() * 360}, 70%, 55%)`, earColor: `hsl(${Math.random() * 360}, 65%, 40%)` }
  };
  holes.push(newHole);
  return newHole;
}

export function updateHole(id, updates) {
  const hole = getHoleById(id); if (!hole) return null;
  Object.assign(hole, updates);
  if (Number.isFinite(hole.depth)) hole.depth = Math.min(MAX_DEPTH, Math.max(1, Math.floor(hole.depth)));
  return hole;
}

export function deepenHole(id) {
  const hole = getHoleById(id); if (!hole || hole.depth >= MAX_DEPTH) return hole || null;
  hole.depth = Math.min(MAX_DEPTH, hole.depth + 1);
  return hole;
}

export function transferHole(id, from, to) {
  const hole = getHoleById(id);
  if (!hole || hole.owner !== from) return false;
  hole.owner = to; return true;
}

export function deleteHole(id) {
  const n = Number(id), idx = holes.findIndex(h => h.id === n);
  if (idx < 0) return false;
  holes.splice(idx, 1);
  holes.forEach((h, i) => { h.x = i; });
  return true;
}
export function deleteHolesByOwner(owner) {
  const ids = holes.filter(h => h.owner === owner).map(h => h.id);
  ids.forEach(deleteHole); return ids;
}
export function clearAllHoles() { holes = []; }
