"use server";

import { requireSession } from "@/lib/session";
import { getTheHousehold, upsertLogEntry } from "@/lib/data";

export async function commitLog(input: {
  date: string;
  name: string;
  note: string;
  tags: string[];
  photoCount: number;
  linkCount: number;
}) {
  const session = await requireSession();
  if (!input.name.trim()) return { ok: false as const, reason: "Pick a meal first" };
  const household = await getTheHousehold();
  await upsertLogEntry(household.id, {
    date: input.date,
    freeTextName: input.name.trim(),
    note: input.note.trim() || null,
    tags: input.tags,
    loggedBy: session.userId,
    photoCount: input.photoCount,
    linkCount: input.linkCount,
  });
  return { ok: true as const };
}
