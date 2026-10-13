/**
 * Hole pricing.
 *   primary (new hole)  = depth x $4
 *   automatic resale    = $4 x depth^1.15 x location multiplier x population multiplier
 *   location multiplier = 1 + 2 / (1 + distance)   (distance = slots away from the FIRST house)
 *     -> first house x3, 1 slot away x2, 3 slots x1.5 ... far away -> x1
 *   population multiplier = 1 + 5% per distinct non-demo hole owner
 * The bundled demo holes are excluded. In this local-driver build, the count comes from
 * distinct owners in the locally synchronized hole list, not a global internet-wide user registry.
 * SOL_USD is a fixed demo rate; replace it with a live price feed in production.
 */
export const SOL_USD = 150;
export const USD_PER_LEVEL = 4;
export const POPULATION_STEP = 0.05;
const DEMO_OWNER_IDS = new Set(["demo1", "demo2", "demo3", "demo4"]);

export const fmtSol = (s) => "◎" + (s >= 10 ? s.toFixed(2) : s.toFixed(3));
export const fmtUsd = (u) => "$" + Math.round(u).toLocaleString("en-US");

export function priceBreakdown(hole, holes) {
  const first = holes.reduce((m, h) => Math.min(m, h.x), Infinity);
  const dist = Math.max(0, hole.x - (Number.isFinite(first) ? first : 0));
  const base = USD_PER_LEVEL * Math.pow(hole.depth, 1.15);
  const mult = 1 + 2 / (1 + dist);
  const population = new Set(holes.filter((h) => !h.special && h.owner && !DEMO_OWNER_IDS.has(h.owner)).map((h) => h.owner)).size;
  const populationMult = 1 + POPULATION_STEP * population;
  const usd = base * mult * populationMult;
  return { dist, base, mult, population, populationMult, usd, sol: usd / SOL_USD };
}
export const autoPriceSol = (hole, holes) => priceBreakdown(hole, holes).sol;
export const primaryPriceSol = (depth) => (depth * USD_PER_LEVEL) / SOL_USD;
export const deepenPriceSol = () => USD_PER_LEVEL / SOL_USD;
