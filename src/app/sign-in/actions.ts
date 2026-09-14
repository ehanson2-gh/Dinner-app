"use server";

import { redirect } from "next/navigation";
import { attemptSignIn } from "@/lib/data";
import { createSession, clearSession } from "@/lib/session";

export async function signIn(
  userId: string,
  password: string
): Promise<{ ok: false; reason: string } | never> {
  if (!userId) return { ok: false, reason: "Pick who you are first." };
  if (!password) return { ok: false, reason: "Enter the household password." };

  const result = await attemptSignIn(userId, password);
  if (!result.ok) return { ok: false, reason: result.reason };

  await createSession({
    userId,
    userName: result.userName,
    householdId: result.householdId,
  });
  redirect("/week");
}

export async function signOut(): Promise<never> {
  await clearSession();
  redirect("/sign-in");
}
