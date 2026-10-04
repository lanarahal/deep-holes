/**
 * Data layer (Mock) – ready for Supabase replacement
 */

export let holes = [
  {
    id: 1,
    owner: "demo1",
    depth: 3,
    x: 0,
    image: "https://picsum.photos/seed/rabbit1/400/400",
    description: "My first experimental hole. Feel free to look around!",
    links: [
      { label: "Twitter", url: "https://x.com" },
      { label: "Website", url: "https://example.com" }
    ],
    customRabbit: { color: "#f59e0b", earColor: "#d97706" }
  },
  {
    id: 2,
    owner: "demo2",
    depth: 8,
    x: 1,
    image: "https://picsum.photos/seed/rabbit2/400/400",
    description: "Going deeper. The soil here feels different.",
    links: [
      { label: "GitHub", url: "https://github.com" }
    ],
    customRabbit: { color: "#8b5cf6", earColor: "#7c3aed" }
  },
  {
    id: 3,
    owner: "demo3",
    depth: 15,
    x: 2,
    image: "https://picsum.photos/seed/rabbit3/400/400",
    description: "Reached the stone layer. Things are getting interesting.",
    links: [],
    customRabbit: { color: "#10b981", earColor: "#059669" }
  },
  {
    id: 4,
    owner: "you",
    depth: 1,
    x: 3,
    image: "https://picsum.photos/seed/rabbit4/400/400",
    description: "Just bought this hole. Still shallow.",
    links: [],
    customRabbit: { color: "#ef4444", earColor: "#dc2626" }
  }
];

// Current player. Replaced by the wallet address after "Connect Wallet".
export const session = { user: "you", wallet: null };

/** Deepest hole owned by the current player – decides which layers are unlocked. */
export function getMyMaxDepth() {
  return holes.filter(h => h.owner === session.user).reduce((m, h) => Math.max(m, h.depth), 0);
}

// Image cache so canvases can draw user pictures (loaded once)
const imgCache = new Map();
export function getImage(url) {
  if (!url) return null;
  if (!imgCache.has(url)) {
    const img = new Image();
    img.src = url;
    imgCache.set(url, img);
  }
  return imgCache.get(url);
}

export function getAllHoles() {
  return [...holes];
}

export function getHoleById(id) {
  return holes.find(h => h.id === id);
}

export function addHole({ depth = 1, description, image, customRabbit, owner } = {}) {
  const newId = holes.length > 0 ? Math.max(...holes.map(h => h.id)) + 1 : 1;
  const newHole = {
    id: newId,
    owner: owner || session.user,
    depth: Math.max(1, Math.floor(depth)),   // no upper limit
    x: holes.length,
    image: image || `https://picsum.photos/seed/hole${newId}/400/400`,
    description: description || "A brand new hole.",
    links: [],
    customRabbit: customRabbit || {
      color: `hsl(${Math.random() * 360}, 70%, 55%)`,
      earColor: `hsl(${Math.random() * 360}, 65%, 40%)`
    }
  };
  holes.push(newHole);
  return newHole;
}

export function updateHole(id, updates) {
  const hole = getHoleById(id);
  if (!hole) return null;
  Object.assign(hole, updates);
  return hole;
}

export function deepenHole(id) {
  const hole = getHoleById(id);
  if (hole) hole.depth += 1;   // unlimited
  return hole;
}

export function clearAllHoles() {
  holes = [];
}
