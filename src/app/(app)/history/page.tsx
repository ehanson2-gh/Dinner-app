import { requireSession } from "@/lib/session";
import { getTheHousehold, getMembers, getLogsInMonth, getHistoryFooterStats } from "@/lib/data";
import { todayISO, parseISO } from "@/lib/date";
import { HistoryScreen } from "./HistoryScreen";

export default async function HistoryPage() {
  await requireSession();
  const household = await getTheHousehold();
  const today = parseISO(todayISO());
  const year = today.y;
  const month0 = today.m - 1;

  const [members, logsMap, footer] = await Promise.all([
    getMembers(household.id),
    getLogsInMonth(household.id, year, month0),
    getHistoryFooterStats(household.id),
  ]);

  return (
    <HistoryScreen
      initialYear={year}
      initialMonth0={month0}
      initialDay={today.d}
      initialLogs={Object.fromEntries(logsMap)}
      members={members.map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor }))}
      footerCount={footer.count}
      footerEarliestDate={footer.earliestDate}
    />
  );
}
