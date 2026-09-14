import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getTheHousehold, getRecipeById, getRecipes } from "@/lib/data";
import { RecipeDetailScreen } from "./RecipeDetailScreen";

export default async function RecipeDetailPage(props: PageProps<"/recipes/[id]">) {
  await requireSession();
  const household = await getTheHousehold();
  const { id } = await props.params;

  const [recipe, allRecipes] = await Promise.all([
    getRecipeById(household.id, id),
    getRecipes(household.id),
  ]);
  if (!recipe) notFound();

  const existingCuisines = Array.from(
    new Set(allRecipes.map((r) => r.cuisine).filter((c): c is string => Boolean(c)))
  );

  return <RecipeDetailScreen recipe={recipe} existingCuisines={existingCuisines} />;
}
