/**
 * لایه داده (فعلاً Mock)
 * بعداً به راحتی با Supabase جایگزین می‌شود
 */

export const holes = [
  {
    id: 1,
    owner: "demo1",
    depth: 3,
    x: 0, // موقعیت افقی در نقشه (واحد لونه)
    image: "https://picsum.photos/seed/hole1/400/400",
    description: "اولین لونه آزمایشی. اینجا می‌تونی هر چیزی بنویسی.",
    links: [
      { label: "توییتر", url: "https://x.com" },
      { label: "سایت", url: "https://example.com" }
    ],
    customRabbit: { color: "#f59e0b", earColor: "#d97706" }
  },
  {
    id: 2,
    owner: "demo2",
    depth: 8,
    x: 1,
    image: "https://picsum.photos/seed/hole2/400/400",
    description: "لونه عمیق‌تر با قابلیت‌های بیشتر.",
    links: [
      { label: "گیت‌هاب", url: "https://github.com" }
    ],
    customRabbit: { color: "#8b5cf6", earColor: "#7c3aed" }
  },
  {
    id: 3,
    owner: "demo3",
    depth: 15,
    x: 2,
    image: "https://picsum.photos/seed/hole3/400/400",
    description: "این لونه به لایه سنگ رسیده.",
    links: [],
    customRabbit: { color: "#10b981", earColor: "#059669" }
  },
  {
    id: 4,
    owner: "guest-demo",
    depth: 1,
    x: 3,
    image: "https://picsum.photos/seed/hole4/400/400",
    description: "لونه تازه خریداری شده.",
    links: [],
    customRabbit: { color: "#ef4444", earColor: "#dc2626" }
  }
];

// بعداً این توابع با فراخوانی Supabase جایگزین می‌شوند
export function getAllHoles() {
  return [...holes];
}

export function getHoleById(id) {
  return holes.find(h => h.id === id);
}

export function addHole(holeData) {
  const newId = holes.length + 1;
  const newHole = {
    id: newId,
    x: holes.length, // کنار آخرین لونه
    depth: 1,
    ...holeData
  };
  holes.push(newHole);
  return newHole;
}

export function deepenHole(id) {
  const hole = getHoleById(id);
  if (hole) {
    hole.depth += 1;
  }
  return hole;
}
