"use server";

import { requireSession } from "@/lib/session";
import {
  getTheHousehold,
  getRecipesForGenerator,
  getWeekPlan,
  upsertWeekPlan,
  markWeekSaved,
  upsertLogEntry,
  getRecipeById,
} from "@/lib/data";
import { generateWeek } from "@/lib/week-generator";
import { weekDates } from "@/lib/date";
import type { LogKind } from "@/lib/types";

async function ctx() {
  const session = await requireSession();
  const household = await getTheHousehold();
  return { session, household };
}

export async function regenerateWeek(weekStartDate: string) {
  const { session, household } = await ctx();
  const current = await getWeekPlan(household.id, weekStartDate);
  const nextSeed = (current?.seed ?? 0) + 1;
  const recipes = await getRecipesForGenerator(household.id);
  const days = generateWeek({
    seed: nextSeed,
    weekDates: weekDates(weekStartDate),
    recipes,
    avoidBackToBackProtein: household.avoidBackToBackProtein,
  });
  await upsertWeekPlan(household.id, {
    weekStartDate,
    days,
    seed: nextSeed,
    saved: false,
    generatedBy: session.userId,
  });
}

export async function swapDay(weekStartDate: string, dayIndex: number) {
  const { session, household } = await ctx();
  const current = await getWeekPlan(household.id, weekStartDate);
  if (!current) throw new Error("No week plan to swap a day in");
  const recipes = await getRecipesForGenerator(household.id);
  // Faithful to the prototype: swap regenerates a whole throwaway week with
  // seed+dayIndex+11 and keeps only that day's result.
  const throwaway = generateWeek({
    seed: current.seed + dayIndex + 11,
    weekDates: weekDates(weekStartDate),
    recipes,
    avoidBackToBackProtein: household.avoidBackToBackProtein,
  });
  const days = current.days.slice();
  days[dayIndex] = throwaway[dayIndex];
  await upsertWeekPlan(household.id, {
    weekStartDate,
    days,
    seed: current.seed,
    saved: false,
    generatedBy: session.userId,
  });
}

export async function clearDay(weekStartDate: string, dayIndex: number) {
  const { session, household } = await ctx();
  const current = await getWeekPlan(household.id, weekStartDate);
  if (!current) throw new Error("No week plan to clear a day in");
  const dates = weekDates(weekStartDate);
  const days = current.days.slice();
  days[dayIndex] = {
    date: dates[dayIndex],
    kind: "non",
    name: "Nothing planned",
    protein: null,
    cuisine: null,
    tags: [],
    recipeId: null,
    locked: false,
  };
  await upsertWeekPlan(household.id, {
    weekStartDate,
    days,
    seed: current.seed,
    saved: false,
    generatedBy: session.userId,
  });
}

export async function pickRecipeForDayAction(weekStartDate: string, dayIndex: number, recipeId: string) {
  const { session, household } = await ctx();
  const current = await getWeekPlan(household.id, weekStartDate);
  if (!current) throw new Error("No week plan to update");
  const recipe = await getRecipeById(household.id, recipeId);
  if (!recipe) throw new Error("Recipe not found");
  const dates = weekDates(weekStartDate);
  const days = current.days.slice();
  days[dayIndex] = {
    date: dates[dayIndex],
    kind: "meal",
    name: recipe.name,
    protein: recipe.protein,
    cuisine: recipe.cuisine,
    tags: [recipe.protein, recipe.cuisine].filter((t): t is string => Boolean(t)),
    recipeId: recipe.id,
    locked: false,
  };
  await upsertWeekPlan(household.id, {
    weekStartDate,
    days,
    seed: current.seed,
    saved: false,
    generatedBy: session.userId,
  });
}

export async function saveWeek(weekStartDate: string) {
  await requireSession();
  const household = await getTheHousehold();
  await markWeekSaved(household.id, weekStartDate);
}

function inferKindFromName(name: string): LogKind {
  const n = name.toLowerCase();
  if (n.includes("leftover")) return "leftovers";
  if (n.includes("dining out")) return "dining_out";
  return "skipped";
}

export async function confirmAte(weekStartDate: string, dayIndex: number) {
  const { session, household } = await ctx();
  const current = await getWeekPlan(household.id, weekStartDate);
  if (!current) throw new Error("No week plan");
  const day = current.days[dayIndex];
  const kind: LogKind = day.kind === "meal" ? "meal" : inferKindFromName(day.name);
  await upsertLogEntry(household.id, {
    date: day.date,
    freeTextName: day.name,
    note: "Logged from the week view",
    tags: day.tags,
    loggedBy: session.userId,
    kind,
  });
}

export async function quickAlt(weekStartDate: string, dayIndex: number, alt: "Leftovers" | "Dining out") {
  const { session, household } = await ctx();
  const current = await getWeekPlan(household.id, weekStartDate);
  if (!current) throw new Error("No week plan");
  const dates = weekDates(weekStartDate);
  const days = current.days.slice();
  days[dayIndex] = {
    date: dates[dayIndex],
    kind: "non",
    name: alt,
    protein: null,
    cuisine: null,
    tags: [],
    recipeId: null,
    locked: false,
  };
  await upsertWeekPlan(household.id, {
    weekStartDate,
    days,
    seed: current.seed,
    saved: false,
    generatedBy: session.userId,
  });
  await upsertLogEntry(household.id, {
    date: dates[dayIndex],
    freeTextName: alt,
    note: "Non-meal entry",
    tags: [],
    loggedBy: session.userId,
    kind: alt === "Leftovers" ? "leftovers" : "dining_out",
  });
}
