/**
 * Data layer (currently Mock)
 * Will be replaced with Supabase later – keep the same function signatures
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

export function getAllHoles() {
  return [...holes];
}

export function getHoleById(id) {
  return holes.find(h => h.id === id);
}

export function addHole(holeData = {}) {
  const newId = holes.length > 0 ? Math.max(...holes.map(h => h.id)) + 1 : 1;
  const newHole = {
    id: newId,
    owner: holeData.owner || "anonymous",
    depth: 1,
    x: holes.length,
    image: holeData.image || `https://picsum.photos/seed/hole${newId}/400/400`,
    description: holeData.description || "A brand new hole.",
    links: holeData.links || [],
    customRabbit: holeData.customRabbit || { color: "#64748b", earColor: "#475569" }
  };
  holes.push(newHole);
  return newHole;
}

export function deepenHole(id) {
  const hole = getHoleById(id);
  if (hole) hole.depth += 1;
  return hole;
}

export function clearAllHoles() {
  holes = [];
}
