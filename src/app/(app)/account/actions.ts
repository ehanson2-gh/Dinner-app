"use server";

import { requireSession } from "@/lib/session";
import { getTheHousehold, updateHouseholdSettings } from "@/lib/data";

export async function toggleAvoidProtein() {
  await requireSession();
  const household = await getTheHousehold();
  await updateHouseholdSettings(household.id, {
    avoidBackToBackProtein: !household.avoidBackToBackProtein,
  });
}
