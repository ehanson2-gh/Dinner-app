// Week generation — ported deliberately from the design prototype's `gen()`
// method (Dinner Tracker App.dc.html, the canonical prototype file per the
// handoff README; the sibling .dc.html is an earlier exploration and NOT
// the spec). Kept byte-for-byte faithful to the seeded LCG and weighting so
// "Regenerate" / "Swap" behave exactly as designed:
//
//   let s = (seed * 7919 + 104729) % 233280        // one-time reseed
//   for each of 7 days (Monday-first, i = 0..6):
//     if day i is locked in `keep`: reuse it, don't advance s
//     if i === 4 (Friday) and seed % 3 === 1: emit "Dining out", prev = null, don't advance s
//     pool = avoidBackToBackProtein ? recipes.protein !== prev : recipes
//     weight(r) = r.daysSinceLastCooked + 4        // staler => likelier; +4 floors fresh recipes
//     s = (s * 9301 + 49297) % 233280               // advance LCG
//     t = (s / 233280) * sum(weights); walk pool subtracting weights until t <= 0
//
// "Regenerate week" calls generateWeek({ seed: seed + 1, ... }).
// "Swap" for day i calls generateWeek({ seed: seed + i + 11, ... }) and takes
// only result[i], discarding the rest of that throwaway week.

export type GeneratorRecipe = {
  id: string;
  name: string;
  protein: string | null;
  cuisine: string | null;
  /** Derived from log history — see data.ts. A large sentinel if never cooked. */
  daysSinceLastCooked: number;
};

export type WeekDay = {
  date: string; // 'YYYY-MM-DD'
  kind: "meal" | "non";
  name: string;
  protein: string | null;
  cuisine: string | null;
  tags: string[];
  recipeId: string | null;
  locked: boolean;
};

function lcgNext(s: number): number {
  return (s * 9301 + 49297) % 233280;
}

export function generateWeek(params: {
  seed: number;
  weekDates: string[]; // exactly 7 dates, Monday..Sunday
  recipes: GeneratorRecipe[];
  avoidBackToBackProtein: boolean;
  /** Days to keep as-is (locking has no UI yet, per the handoff — reserved for later). */
  keep?: (WeekDay | null | undefined)[];
}): WeekDay[] {
  const { seed, weekDates, recipes, avoidBackToBackProtein, keep } = params;
  if (weekDates.length !== 7) {
    throw new Error("generateWeek requires exactly 7 dates");
  }

  const out: WeekDay[] = [];
  let prevProtein: string | null = null;
  let s = (seed * 7919 + 104729) % 233280;

  for (let i = 0; i < 7; i++) {
    const kept = keep?.[i];
    if (kept?.locked) {
      out.push({ ...kept, date: weekDates[i] });
      prevProtein = kept.protein;
      continue;
    }

    if (i === 4 && seed % 3 === 1) {
      out.push({
        date: weekDates[i],
        kind: "non",
        name: "Dining out",
        protein: null,
        cuisine: null,
        tags: [],
        recipeId: null,
        locked: false,
      });
      prevProtein = null;
      continue;
    }

    const filtered = avoidBackToBackProtein
      ? recipes.filter((r) => r.protein !== prevProtein)
      : recipes;
    // Deliberate deviation from the prototype: if avoiding back-to-back
    // protein empties the pool (e.g. every remaining recipe shares the
    // previous day's protein), fall back to the full list rather than
    // crashing on an empty pick. The prototype's fixed 6-recipe demo set
    // never hit this; a real, smaller or less varied collection can.
    const pool = filtered.length > 0 ? filtered : recipes;
    if (pool.length === 0) {
      throw new Error("Cannot generate a week with zero recipes in the collection");
    }

    const weights = pool.map((r) => r.daysSinceLastCooked + 4);
    const total = weights.reduce((a, b) => a + b, 0);

    s = lcgNext(s);
    let t = (s / 233280) * total;
    let pick = pool[0];
    for (let j = 0; j < pool.length; j++) {
      t -= weights[j];
      if (t <= 0) {
        pick = pool[j];
        break;
      }
    }

    prevProtein = pick.protein;
    out.push({
      date: weekDates[i],
      kind: "meal",
      name: pick.name,
      protein: pick.protein,
      cuisine: pick.cuisine,
      tags: [pick.protein, pick.cuisine].filter((t): t is string => Boolean(t)),
      recipeId: pick.id,
      locked: false,
    });
  }

  return out;
}
