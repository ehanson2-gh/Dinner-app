import "server-only";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase-admin";
import { daysBetween, todayISO, weekDates } from "./date";
import { generateWeek } from "./week-generator";
import {
  NEVER_COOKED_DAYS,
  type Household,
  type Member,
  type Recipe,
  type LogEntry,
  type LogKind,
  type WeekPlan,
  type WeekPlanDay,
  type Photo,
  type Link,
} from "./types";
import type { GeneratorRecipe } from "./week-generator";

function newId(): string {
  return crypto.randomUUID();
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null) throw new Error(`${what}: not found`);
  return result.data;
}

// ── mapping ────────────────────────────────────────────────────────────

type HouseholdRow = {
  id: string;
  name: string;
  password_hash: string | null;
  week_starts_on: string;
  repeat_window_days: number;
  avoid_back_to_back_protein: boolean;
};

function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    weekStartsOn: row.week_starts_on,
    repeatWindowDays: row.repeat_window_days,
    avoidBackToBackProtein: row.avoid_back_to_back_protein,
    hasPassword: !!row.password_hash,
  };
}

type UserRow = {
  id: string;
  household_id: string;
  name: string;
  email: string | null;
  avatar_color: "accent" | "accent-2";
  reminder_time: string | null;
  default_log_screen: string;
};

function mapMember(row: UserRow): Member {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
    reminderTime: row.reminder_time,
    defaultLogScreen: row.default_log_screen,
  };
}

type RecipeRow = {
  id: string;
  household_id: string;
  name: string;
  protein: string | null;
  cuisine: string | null;
  tags: string[];
  origin: string | null;
  photos: Photo[];
  links: Link[];
};

type CookStats = { timesCooked: number; lastCookedAt: string | null };

function mapRecipe(row: RecipeRow, stats: CookStats | undefined, today: string): Recipe {
  const s = stats ?? { timesCooked: 0, lastCookedAt: null };
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    protein: row.protein,
    cuisine: row.cuisine,
    tags: row.tags ?? [],
    origin: row.origin,
    photos: row.photos ?? [],
    links: row.links ?? [],
    timesCooked: s.timesCooked,
    lastCookedAt: s.lastCookedAt,
    daysSinceLastCooked: s.lastCookedAt ? daysBetween(s.lastCookedAt, today) : NEVER_COOKED_DAYS,
  };
}

type LogRow = {
  id: string;
  household_id: string;
  date: string;
  recipe_id: string | null;
  free_text_name: string;
  kind: LogKind;
  note: string | null;
  tags: string[];
  photos: Photo[];
  links: Link[];
  logged_by: string;
  logged_at: string;
  users?: { name: string } | { name: string }[] | null;
};

function mapLog(row: LogRow): LogEntry {
  const usersField = row.users;
  const loggedByName = Array.isArray(usersField)
    ? usersField[0]?.name ?? ""
    : usersField?.name ?? "";
  return {
    id: row.id,
    householdId: row.household_id,
    date: row.date,
    recipeId: row.recipe_id,
    freeTextName: row.free_text_name,
    kind: row.kind,
    note: row.note,
    tags: row.tags ?? [],
    photos: row.photos ?? [],
    links: row.links ?? [],
    loggedBy: row.logged_by,
    loggedByName,
    loggedAt: row.logged_at,
  };
}

type WeekPlanRow = {
  id: string;
  household_id: string;
  week_start_date: string;
  days: WeekPlanDay[];
  seed: number;
  saved: boolean;
  generated_by: string | null;
  generated_at: string;
  saved_at: string | null;
  users?: { name: string } | { name: string }[] | null;
};

function mapWeekPlan(row: WeekPlanRow): WeekPlan {
  const usersField = row.users;
  const generatedByName = Array.isArray(usersField)
    ? usersField[0]?.name ?? null
    : usersField?.name ?? null;
  return {
    id: row.id,
    householdId: row.household_id,
    weekStartDate: row.week_start_date,
    days: row.days ?? [],
    seed: row.seed,
    saved: row.saved,
    generatedById: row.generated_by,
    generatedByName,
    generatedAt: row.generated_at,
    savedAt: row.saved_at,
  };
}

// ── household / auth ──────────────────────────────────────────────────

export async function getTheHousehold(): Promise<Household> {
  const { data, error } = await supabaseAdmin.from("households").select("*").limit(1).single();
  if (error || !data) {
    throw new Error(
      "No household found. Run supabase/schema.sql then supabase/seed.sql in the Supabase SQL Editor."
    );
  }
  return mapHousehold(data as HouseholdRow);
}

export async function getMembers(householdId: string): Promise<Member[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getMembers: ${error.message}`);
  return (data as UserRow[]).map(mapMember);
}

export async function attemptSignIn(
  userId: string,
  password: string
): Promise<{ ok: true; userName: string; householdId: string } | { ok: false; reason: string }> {
  const { data: householdRow, error: hErr } = await supabaseAdmin
    .from("households")
    .select("id, password_hash")
    .limit(1)
    .single();
  if (hErr || !householdRow) return { ok: false, reason: "Household isn't set up yet." };
  if (!householdRow.password_hash) {
    return { ok: false, reason: "No password set yet — run `npm run set-password` first." };
  }

  const { data: userRow, error: uErr } = await supabaseAdmin
    .from("users")
    .select("id, name, household_id")
    .eq("id", userId)
    .eq("household_id", householdRow.id)
    .single();
  if (uErr || !userRow) return { ok: false, reason: "Unknown user." };

  const valid = await bcrypt.compare(password, householdRow.password_hash);
  if (!valid) return { ok: false, reason: "Wrong password." };

  return { ok: true, userName: userRow.name, householdId: householdRow.id };
}

export async function updateHouseholdSettings(
  householdId: string,
  patch: Partial<{
    weekStartsOn: string;
    repeatWindowDays: number;
    avoidBackToBackProtein: boolean;
  }>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.weekStartsOn !== undefined) row.week_starts_on = patch.weekStartsOn;
  if (patch.repeatWindowDays !== undefined) row.repeat_window_days = patch.repeatWindowDays;
  if (patch.avoidBackToBackProtein !== undefined)
    row.avoid_back_to_back_protein = patch.avoidBackToBackProtein;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabaseAdmin.from("households").update(row).eq("id", householdId);
  if (error) throw new Error(`updateHouseholdSettings: ${error.message}`);
}

export async function updateMemberSettings(
  userId: string,
  patch: Partial<{ avatarColor: "accent" | "accent-2"; reminderTime: string | null; defaultLogScreen: string }>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor;
  if (patch.reminderTime !== undefined) row.reminder_time = patch.reminderTime;
  if (patch.defaultLogScreen !== undefined) row.default_log_screen = patch.defaultLogScreen;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabaseAdmin.from("users").update(row).eq("id", userId);
  if (error) throw new Error(`updateMemberSettings: ${error.message}`);
}

// ── recipes ────────────────────────────────────────────────────────────

async function cookStatsByRecipe(householdId: string): Promise<Map<string, CookStats>> {
  const { data, error } = await supabaseAdmin
    .from("log_entries")
    .select("recipe_id, date")
    .eq("household_id", householdId)
    .not("recipe_id", "is", null);
  if (error) throw new Error(`cookStatsByRecipe: ${error.message}`);

  const map = new Map<string, CookStats>();
  for (const row of data as { recipe_id: string; date: string }[]) {
    const existing = map.get(row.recipe_id);
    if (!existing) {
      map.set(row.recipe_id, { timesCooked: 1, lastCookedAt: row.date });
    } else {
      existing.timesCooked += 1;
      if (row.date > (existing.lastCookedAt ?? "")) existing.lastCookedAt = row.date;
    }
  }
  return map;
}

export async function getRecipes(householdId: string): Promise<Recipe[]> {
  const [{ data, error }, stats] = await Promise.all([
    supabaseAdmin.from("recipes").select("*").eq("household_id", householdId).order("name"),
    cookStatsByRecipe(householdId),
  ]);
  if (error) throw new Error(`getRecipes: ${error.message}`);
  const today = todayISO();
  return (data as RecipeRow[]).map((row) => mapRecipe(row, stats.get(row.id), today));
}

export async function getRecipeById(householdId: string, id: string): Promise<Recipe | null> {
  const [{ data, error }, stats] = await Promise.all([
    supabaseAdmin.from("recipes").select("*").eq("household_id", householdId).eq("id", id).maybeSingle(),
    cookStatsByRecipe(householdId),
  ]);
  if (error) throw new Error(`getRecipeById: ${error.message}`);
  if (!data) return null;
  return mapRecipe(data as RecipeRow, stats.get(id), todayISO());
}

export async function getRecipesForGenerator(householdId: string): Promise<GeneratorRecipe[]> {
  const recipes = await getRecipes(householdId);
  return recipes.map((r) => ({
    id: r.id,
    name: r.name,
    protein: r.protein,
    cuisine: r.cuisine,
    daysSinceLastCooked: r.daysSinceLastCooked,
  }));
}

function deriveCuisine(tags: string[], fallback: string | null): string | null {
  return tags.length > 0 ? tags[0] : fallback;
}

export async function createRecipe(
  householdId: string,
  input: {
    name: string;
    protein: string | null;
    tags: string[];
    origin?: string | null;
    photoCount?: number;
    linkCount?: number;
  }
): Promise<Recipe> {
  const photos: Photo[] = Array.from({ length: input.photoCount ?? 0 }, () => ({
    id: newId(),
    url: "",
    caption: "dish photo",
  }));
  const links: Link[] = Array.from({ length: input.linkCount ?? 0 }, () => ({
    id: newId(),
    title: "source link",
    url: "",
  }));
  const row = {
    household_id: householdId,
    name: input.name,
    protein: input.protein,
    cuisine: deriveCuisine(input.tags, null),
    tags: input.tags,
    origin: input.origin ?? null,
    photos,
    links,
  };
  const result = await supabaseAdmin.from("recipes").insert(row).select("*").single();
  const data = unwrap(result, "createRecipe");
  return mapRecipe(data as RecipeRow, undefined, todayISO());
}

export async function updateRecipe(
  householdId: string,
  id: string,
  patch: Partial<{ name: string; protein: string | null; tags: string[] }>
): Promise<Recipe> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.protein !== undefined) row.protein = patch.protein;
  if (patch.tags !== undefined) {
    row.tags = patch.tags;
    row.cuisine = deriveCuisine(patch.tags, null);
  }
  const result = await supabaseAdmin
    .from("recipes")
    .update(row)
    .eq("household_id", householdId)
    .eq("id", id)
    .select("*")
    .single();
  const data = unwrap(result, "updateRecipe");
  const stats = await cookStatsByRecipe(householdId);
  return mapRecipe(data as RecipeRow, stats.get(id), todayISO());
}

export async function deleteRecipe(householdId: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("recipes").delete().eq("household_id", householdId).eq("id", id);
  if (error) throw new Error(`deleteRecipe: ${error.message}`);
}

export async function addPhotoPlaceholder(
  householdId: string,
  recipeId: string,
  caption: string
): Promise<Recipe> {
  const recipe = await getRecipeById(householdId, recipeId);
  if (!recipe) throw new Error("addPhotoPlaceholder: recipe not found");
  const photos: Photo[] = [...recipe.photos, { id: newId(), url: "", caption }];
  const result = await supabaseAdmin
    .from("recipes")
    .update({ photos })
    .eq("household_id", householdId)
    .eq("id", recipeId)
    .select("*")
    .single();
  const data = unwrap(result, "addPhotoPlaceholder");
  const stats = await cookStatsByRecipe(householdId);
  return mapRecipe(data as RecipeRow, stats.get(recipeId), todayISO());
}

export async function addSourceLink(
  householdId: string,
  recipeId: string,
  link: { title: string; url: string }
): Promise<Recipe> {
  const recipe = await getRecipeById(householdId, recipeId);
  if (!recipe) throw new Error("addSourceLink: recipe not found");
  const links: Link[] = [...recipe.links, { id: newId(), title: link.title, url: link.url }];
  const result = await supabaseAdmin
    .from("recipes")
    .update({ links })
    .eq("household_id", householdId)
    .eq("id", recipeId)
    .select("*")
    .single();
  const data = unwrap(result, "addSourceLink");
  const stats = await cookStatsByRecipe(householdId);
  return mapRecipe(data as RecipeRow, stats.get(recipeId), todayISO());
}

export async function addTagsToRecipe(
  householdId: string,
  recipeId: string,
  newTags: string[]
): Promise<Recipe> {
  const recipe = await getRecipeById(householdId, recipeId);
  if (!recipe) throw new Error("addTagsToRecipe: recipe not found");
  const merged = [...recipe.tags];
  for (const t of newTags) if (!merged.includes(t)) merged.push(t);
  return updateRecipe(householdId, recipeId, { tags: merged });
}

export async function removeTagFromRecipe(
  householdId: string,
  recipeId: string,
  tag: string
): Promise<Recipe> {
  const recipe = await getRecipeById(householdId, recipeId);
  if (!recipe) throw new Error("removeTagFromRecipe: recipe not found");
  const remaining = recipe.tags.filter((t) => t !== tag);
  return updateRecipe(householdId, recipeId, { tags: remaining });
}

// ── log entries ────────────────────────────────────────────────────────

export async function getLogEntry(householdId: string, date: string): Promise<LogEntry | null> {
  const { data, error } = await supabaseAdmin
    .from("log_entries")
    .select("*, users!log_entries_logged_by_fkey(name)")
    .eq("household_id", householdId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error(`getLogEntry: ${error.message}`);
  if (!data) return null;
  return mapLog(data as unknown as LogRow);
}

export async function getLogEntriesForDates(
  householdId: string,
  dates: string[]
): Promise<Map<string, LogEntry>> {
  if (dates.length === 0) return new Map();
  const { data, error } = await supabaseAdmin
    .from("log_entries")
    .select("*, users!log_entries_logged_by_fkey(name)")
    .eq("household_id", householdId)
    .in("date", dates);
  if (error) throw new Error(`getLogEntriesForDates: ${error.message}`);
  const map = new Map<string, LogEntry>();
  for (const row of data as unknown as LogRow[]) map.set(row.date, mapLog(row));
  return map;
}

function inferLogKind(freeTextName: string): LogKind {
  const n = freeTextName.toLowerCase();
  if (n === "leftovers") return "leftovers";
  if (n === "dining out") return "dining_out";
  if (n === "skipped") return "skipped";
  return "meal";
}

export async function upsertLogEntry(
  householdId: string,
  input: {
    date: string;
    freeTextName: string;
    note?: string | null;
    tags?: string[];
    loggedBy: string;
    kind?: LogKind;
    photoCount?: number;
    linkCount?: number;
  }
): Promise<LogEntry> {
  const kind = input.kind ?? inferLogKind(input.freeTextName);
  let recipeId: string | null = null;
  let tags = input.tags ?? [];
  if (kind === "meal") {
    const { data: match } = await supabaseAdmin
      .from("recipes")
      .select("id, protein, cuisine")
      .eq("household_id", householdId)
      .ilike("name", input.freeTextName)
      .maybeSingle();
    if (match) {
      recipeId = match.id;
      if (!input.tags) tags = [match.protein, match.cuisine].filter((t): t is string => Boolean(t));
    }
  }

  const photos: Photo[] = Array.from({ length: input.photoCount ?? 0 }, () => ({
    id: newId(),
    url: "",
    caption: "dish photo",
  }));
  const links: Link[] = Array.from({ length: input.linkCount ?? 0 }, () => ({
    id: newId(),
    title: "source link",
    url: "",
  }));

  const row = {
    household_id: householdId,
    date: input.date,
    recipe_id: recipeId,
    free_text_name: input.freeTextName,
    kind,
    note: input.note ?? null,
    tags,
    photos,
    links,
    logged_by: input.loggedBy,
  };

  const result = await supabaseAdmin
    .from("log_entries")
    .upsert(row, { onConflict: "household_id,date" })
    .select("*, users!log_entries_logged_by_fkey(name)")
    .single();
  const data = unwrap(result, "upsertLogEntry");
  return mapLog(data as unknown as LogRow);
}

export async function getTypeAheadMatches(
  householdId: string,
  query: string,
  limit = 4
): Promise<{ name: string; daysSinceLastCooked: number }[]> {
  if (!query.trim()) return [];
  const recipes = await getRecipes(householdId);
  const q = query.trim().toLowerCase();
  return recipes
    .filter((r) => r.name.toLowerCase().includes(q) && r.name.toLowerCase() !== q)
    .sort((a, b) => b.timesCooked - a.timesCooked)
    .slice(0, limit)
    .map((r) => ({ name: r.name, daysSinceLastCooked: r.daysSinceLastCooked }));
}

export async function getCookedOftenRecipes(householdId: string, limit = 5): Promise<Recipe[]> {
  const recipes = await getRecipes(householdId);
  return recipes
    .filter((r) => r.timesCooked > 0)
    .sort((a, b) => b.timesCooked - a.timesCooked)
    .slice(0, limit);
}

// ── history ────────────────────────────────────────────────────────────

export async function getLogsInMonth(
  householdId: string,
  year: number,
  month0: number
): Promise<Map<string, LogEntry>> {
  const start = `${year}-${String(month0 + 1).padStart(2, "0")}-01`;
  const nextMonth0 = month0 === 11 ? 0 : month0 + 1;
  const nextYear = month0 === 11 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth0 + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabaseAdmin
    .from("log_entries")
    .select("*, users!log_entries_logged_by_fkey(name)")
    .eq("household_id", householdId)
    .gte("date", start)
    .lt("date", end);
  if (error) throw new Error(`getLogsInMonth: ${error.message}`);
  const map = new Map<string, LogEntry>();
  for (const row of data as unknown as LogRow[]) map.set(row.date, mapLog(row));
  return map;
}

export async function getHistoryFooterStats(
  householdId: string
): Promise<{ count: number; earliestDate: string | null }> {
  const { count, error: countError } = await supabaseAdmin
    .from("log_entries")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);
  if (countError) throw new Error(`getHistoryFooterStats: ${countError.message}`);

  const { data: earliest, error: earliestError } = await supabaseAdmin
    .from("log_entries")
    .select("date")
    .eq("household_id", householdId)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (earliestError) throw new Error(`getHistoryFooterStats: ${earliestError.message}`);

  return { count: count ?? 0, earliestDate: earliest?.date ?? null };
}

// ── week plans ─────────────────────────────────────────────────────────

export async function getWeekPlan(householdId: string, weekStartDate: string): Promise<WeekPlan | null> {
  const { data, error } = await supabaseAdmin
    .from("week_plans")
    .select("*, users!week_plans_generated_by_fkey(name)")
    .eq("household_id", householdId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (error) throw new Error(`getWeekPlan: ${error.message}`);
  if (!data) return null;
  return mapWeekPlan(data as unknown as WeekPlanRow);
}

export async function upsertWeekPlan(
  householdId: string,
  input: {
    weekStartDate: string;
    days: WeekPlanDay[];
    seed: number;
    saved: boolean;
    generatedBy: string;
  }
): Promise<WeekPlan> {
  const row = {
    household_id: householdId,
    week_start_date: input.weekStartDate,
    days: input.days,
    seed: input.seed,
    saved: input.saved,
    generated_by: input.generatedBy,
    generated_at: new Date().toISOString(),
    saved_at: input.saved ? new Date().toISOString() : null,
  };
  const result = await supabaseAdmin
    .from("week_plans")
    .upsert(row, { onConflict: "household_id,week_start_date" })
    .select("*, users!week_plans_generated_by_fkey(name)")
    .single();
  const data = unwrap(result, "upsertWeekPlan");
  return mapWeekPlan(data as unknown as WeekPlanRow);
}

/** Fetches the plan for this week, generating (and persisting) a fresh
 *  draft on first visit — mirrors the prototype's componentDidMount gen(). */
export async function getOrCreateWeekPlan(
  householdId: string,
  weekStartDate: string,
  generatedBy: string,
  avoidBackToBackProtein: boolean
): Promise<WeekPlan> {
  const existing = await getWeekPlan(householdId, weekStartDate);
  if (existing) return existing;
  const recipes = await getRecipesForGenerator(householdId);
  const days = generateWeek({
    seed: 1,
    weekDates: weekDates(weekStartDate),
    recipes,
    avoidBackToBackProtein,
  });
  return upsertWeekPlan(householdId, { weekStartDate, days, seed: 1, saved: false, generatedBy });
}

export async function markWeekSaved(householdId: string, weekStartDate: string): Promise<WeekPlan> {
  const result = await supabaseAdmin
    .from("week_plans")
    .update({ saved: true, saved_at: new Date().toISOString() })
    .eq("household_id", householdId)
    .eq("week_start_date", weekStartDate)
    .select("*, users!week_plans_generated_by_fkey(name)")
    .single();
  const data = unwrap(result, "markWeekSaved");
  return mapWeekPlan(data as unknown as WeekPlanRow);
}
