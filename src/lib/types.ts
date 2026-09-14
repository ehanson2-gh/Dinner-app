// Domain types shared across the data layer, server actions, and UI.
// Deliberately camelCase everywhere on this side of the boundary — data.ts
// is the only place that talks snake_case to Postgres.

export type AvatarColor = "accent" | "accent-2";

export type Household = {
  id: string;
  name: string;
  weekStartsOn: string; // 'monday' — exposed as a setting, not enforced (matches prototype)
  repeatWindowDays: number; // exposed, not enforced in generation (see week-generator.ts)
  avoidBackToBackProtein: boolean;
  hasPassword: boolean;
};

export type Member = {
  id: string;
  householdId: string;
  name: string;
  email: string | null;
  avatarColor: AvatarColor;
  reminderTime: string | null; // 'HH:MM' or null
  defaultLogScreen: string;
};

export type Photo = { id: string; url: string; caption: string };
export type Link = { id: string; title: string; url: string };

export const PROTEIN_OPTIONS = ["Chicken", "Beef", "Pork", "Shrimp", "Veg"] as const;
export type Protein = (typeof PROTEIN_OPTIONS)[number];

export const RECIPE_FILTER_PILLS = [
  "All", "Shrimp", "Chicken", "Beef", "Pork", "Veg", "Mexican", "Italian", "Southern",
] as const;

/** A recipe never cooked (no log_entries reference it) is treated as this many
 *  days stale — high enough to make it a likely pick, without needing an
 *  "infinity" special case in the generator's weighting math. */
export const NEVER_COOKED_DAYS = 60;

export type Recipe = {
  id: string;
  householdId: string;
  name: string;
  protein: string | null;
  cuisine: string | null;
  tags: string[]; // freeform, excludes protein — e.g. cuisine + "Weeknight"
  origin: string | null;
  photos: Photo[];
  links: Link[];
  timesCooked: number; // derived from log_entries
  lastCookedAt: string | null; // derived, ISO date
  daysSinceLastCooked: number; // derived, NEVER_COOKED_DAYS sentinel if never cooked
};

export type LogKind = "meal" | "leftovers" | "dining_out" | "skipped";

export type LogEntry = {
  id: string;
  householdId: string;
  date: string; // ISO date
  recipeId: string | null;
  freeTextName: string;
  kind: LogKind;
  note: string | null;
  tags: string[];
  photos: Photo[];
  links: Link[];
  loggedBy: string;
  loggedByName: string;
  loggedAt: string;
};

export type WeekPlanDay = {
  date: string;
  kind: "meal" | "non";
  name: string;
  protein: string | null;
  cuisine: string | null;
  tags: string[];
  recipeId: string | null;
  locked: boolean;
};

export type WeekPlan = {
  id: string;
  householdId: string;
  weekStartDate: string;
  days: WeekPlanDay[];
  seed: number;
  saved: boolean;
  generatedById: string | null;
  generatedByName: string | null;
  generatedAt: string;
  savedAt: string | null;
};
