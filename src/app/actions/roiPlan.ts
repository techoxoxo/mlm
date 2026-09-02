"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { investInRoiPlan } from "@/lib/roiPlan";

export async function investInRoiPlanAction(
  form: FormData,
): Promise<{ ok: true; directPaid: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in" };

  const amount = Number(form.get("amount"));
  if (!Number.isFinite(amount)) return { ok: false, error: "Invalid amount" };

  try {
    const res = await investInRoiPlan(session.uid, Math.round(amount));
    revalidatePath("/dashboard/roi-plan");
    revalidatePath("/dashboard");
    return { ok: true, directPaid: res.directPaid };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
