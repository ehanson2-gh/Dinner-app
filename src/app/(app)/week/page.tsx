import { requireSession } from "@/lib/session";
import { getTheHousehold, getMembers, getRecipes, getOrCreateWeekPlan, getLogEntriesForDates } from "@/lib/data";
import { todayISO, startOfWeekMonday, weekDates, formatWeekRange, formatRelativeTime } from "@/lib/date";
import { WeekScreen } from "./WeekScreen";

export default async function WeekPage() {
  const session = await requireSession();
  const household = await getTheHousehold();
  const members = await getMembers(household.id);
  const today = todayISO();
  const weekStart = startOfWeekMonday(today);
  const dates = weekDates(weekStart);

  const [plan, logsMap, recipes] = await Promise.all([
    getOrCreateWeekPlan(household.id, weekStart, session.userId, household.avoidBackToBackProtein),
    getLogEntriesForDates(household.id, dates),
    getRecipes(household.id),
  ]);

  const generatedByMember = members.find((m) => m.id === plan.generatedById);
  const savedIsLatest = !!plan.savedAt && plan.savedAt >= plan.generatedAt;
  const activityText = `${plan.generatedByName ?? "Someone"} ${
    savedIsLatest ? "saved the week" : "generated this week"
  } · ${formatRelativeTime(savedIsLatest ? plan.savedAt! : plan.generatedAt)}`;

  return (
    <WeekScreen
      weekStartDate={weekStart}
      weekRangeLabel={formatWeekRange(weekStart)}
      dates={dates}
      days={plan.days}
      saved={plan.saved}
      loggedDates={Array.from(logsMap.keys())}
      loggedNotes={Object.fromEntries(
        Array.from(logsMap.entries()).map(([date, entry]) => [date, entry.note])
      )}
      activityText={activityText}
      activityAvatarName={plan.generatedByName ?? "?"}
      activityAvatarColor={generatedByMember?.avatarColor ?? "accent"}
      todayISO={today}
      recipes={recipes.map((r) => ({ id: r.id, name: r.name, daysSinceLastCooked: r.daysSinceLastCooked }))}
    />
  );
}
