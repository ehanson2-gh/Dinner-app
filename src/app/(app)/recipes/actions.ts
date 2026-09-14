"use server";

import { cookies } from "next/headers";
import { requireSession } from "@/lib/session";
import {
  getTheHousehold,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addTagsToRecipe,
  removeTagFromRecipe,
  addPhotoPlaceholder,
  addSourceLink,
  getOrCreateWeekPlan,
  getRecipeById,
  upsertWeekPlan,
} from "@/lib/data";
import { todayISO, startOfWeekMonday, weekDates } from "@/lib/date";

export async function createRecipeAction(input: {
  name: string;
  protein: string | null;
  tags: string[];
  photoCount?: number;
  linkCount?: number;
}) {
  const session = await requireSession();
  const household = await getTheHousehold();
  if (!input.name.trim()) return { ok: false as const, reason: "Name it first" };
  const recipe = await createRecipe(household.id, {
    name: input.name.trim(),
    protein: input.protein,
    tags: input.tags,
    origin: `Added by ${session.userName}`,
    photoCount: input.photoCount,
    linkCount: input.linkCount,
  });
  return { ok: true as const, recipe };
}

export async function updateRecipeAction(
  id: string,
  patch: { name?: string; protein?: string | null; tags?: string[] }
) {
  await requireSession();
  const household = await getTheHousehold();
  if (patch.name !== undefined && !patch.name.trim()) {
    return { ok: false as const, reason: "Name can't be empty" };
  }
  const recipe = await updateRecipe(household.id, id, patch);
  return { ok: true as const, recipe };
}

export async function deleteRecipeAction(id: string) {
  await requireSession();
  const household = await getTheHousehold();
  await deleteRecipe(household.id, id);
}

export async function addTagsAction(id: string, tags: string[]) {
  await requireSession();
  const household = await getTheHousehold();
  return addTagsToRecipe(household.id, id, tags);
}

export async function removeTagAction(id: string, tag: string) {
  await requireSession();
  const household = await getTheHousehold();
  return removeTagFromRecipe(household.id, id, tag);
}

export async function addPhotoPlaceholderAction(id: string, caption: string) {
  await requireSession();
  const household = await getTheHousehold();
  return addPhotoPlaceholder(household.id, id, caption);
}

export async function addSourceLinkAction(id: string, link: { title: string; url: string }) {
  await requireSession();
  const household = await getTheHousehold();
  return addSourceLink(household.id, id, link);
}

/** "Add to this week" from Recipe Detail — assigns to whichever week day was
 *  last selected on the Week screen (remembered via a small client cookie,
 *  since that selection is otherwise just in-memory UI state — see
 *  WeekScreen.tsx's selectDay). Falls back to today if nothing was selected
 *  yet this session. */
export async function addRecipeToWeekAction(recipeId: string) {
  const session = await requireSession();
  const household = await getTheHousehold();
  const recipe = await getRecipeById(household.id, recipeId);
  if (!recipe) throw new Error("Recipe not found");

  const cookieStore = await cookies();
  const selDay = cookieStore.get("dt_selday")?.value || todayISO();
  const weekStart = startOfWeekMonday(selDay);
  const dates = weekDates(weekStart);
  const dayIndex = dates.indexOf(selDay);
  const targetIndex = dayIndex === -1 ? dates.indexOf(todayISO()) : dayIndex;

  const plan = await getOrCreateWeekPlan(
    household.id,
    weekStart,
    session.userId,
    household.avoidBackToBackProtein
  );
  const days = plan.days.slice();
  days[targetIndex] = {
    date: dates[targetIndex],
    kind: "meal",
    name: recipe.name,
    protein: recipe.protein,
    cuisine: recipe.cuisine,
    tags: [recipe.protein, recipe.cuisine].filter((t): t is string => Boolean(t)),
    recipeId: recipe.id,
    locked: false,
  };
  await upsertWeekPlan(household.id, {
    weekStartDate: weekStart,
    days,
    seed: plan.seed,
    saved: false,
    generatedBy: session.userId,
  });

  return { weekdayLabel: dates[targetIndex] };
}
