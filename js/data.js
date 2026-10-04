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
    owner: "demo4",
    depth: 1,
    x: 3,
    image: "https://picsum.photos/seed/rabbit4/400/400",
    description: "Just bought this hole. Still shallow.",
    links: [],
    customRabbit: { color: "#ef4444", earColor: "#dc2626" }
  }
];

// For testing owner features – treat this as "you"
export const CURRENT_USER = "you";

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
    owner: owner || CURRENT_USER,
    depth: Math.max(1, Math.min(50, depth)),
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
  if (hole) hole.depth += 1;
  return hole;
}

export function clearAllHoles() {
  holes = [];
}
