import { requireSession } from "@/lib/session";
import { getTheHousehold, getRecipes } from "@/lib/data";
import { todayISO } from "@/lib/date";
import { LogForm } from "./LogForm";

export default async function LogPage(props: PageProps<"/log">) {
  await requireSession();
  const household = await getTheHousehold();
  const searchParams = await props.searchParams;

  const dateParam = typeof searchParams.date === "string" ? searchParams.date : undefined;
  const prefill = typeof searchParams.prefill === "string" ? searchParams.prefill : "";
  const startExpanded = searchParams.more === "1";

  const recipes = await getRecipes(household.id);
  const existingCuisines = Array.from(new Set(recipes.map((r) => r.cuisine).filter((c): c is string => Boolean(c))));

  return (
    <div>
      <h1 style={{ fontSize: 27, marginBottom: 4 }}>Log dinner</h1>
      <LogForm
        todayISO={todayISO()}
        fixedDate={dateParam}
        initialQuery={prefill}
        initialMore={startExpanded}
        recipes={recipes.map((r) => ({
          name: r.name,
          protein: r.protein,
          cuisine: r.cuisine,
          timesCooked: r.timesCooked,
          daysSinceLastCooked: r.daysSinceLastCooked,
        }))}
        existingCuisines={existingCuisines}
      />
    </div>
  );
}
