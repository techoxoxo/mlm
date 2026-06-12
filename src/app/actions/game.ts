"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { enqueueActivation, enqueueDecision } from "@/lib/queue";

const { users } = schema;

export async function activateAction() {
  const s = await getSession();
  if (!s) return { error: "Not authenticated" };
  const user = await db.query.users.findFirst({ where: eq(users.id, s.uid) });
  if (!user) return { error: "User not found" };
  if (user.currentSlab !== 0) return { error: "Already activated" };

  try {
    await enqueueActivation(s.uid);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function decideAction(choice: "exit" | "upgrade") {
  const s = await getSession();
  if (!s) return { error: "Not authenticated" };
  try {
    await enqueueDecision(s.uid, choice);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}
