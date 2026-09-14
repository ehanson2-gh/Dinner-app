"use server";

import { requireSession } from "@/lib/session";
import { getTheHousehold, getLogsInMonth } from "@/lib/data";
import type { LogEntry } from "@/lib/types";

export async function fetchMonthLogs(year: number, month0: number): Promise<Record<string, LogEntry>> {
  await requireSession();
  const household = await getTheHousehold();
  const map = await getLogsInMonth(household.id, year, month0);
  return Object.fromEntries(map);
}
