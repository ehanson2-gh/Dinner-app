import { requireSession } from "@/lib/session";
import { getTheHousehold, getRecipes } from "@/lib/data";
import { RecipesScreen } from "./RecipesScreen";

export default async function RecipesPage() {
  await requireSession();
  const household = await getTheHousehold();
  const recipes = await getRecipes(household.id);
  const existingCuisines = Array.from(
    new Set(recipes.map((r) => r.cuisine).filter((c): c is string => Boolean(c)))
  );

  return <RecipesScreen recipes={recipes} existingCuisines={existingCuisines} />;
}
