"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";

const { supportTickets, supportMessages } = schema;

async function requireUser() {
  const s = await getSession();
  if (!s || !s.uid) throw new Error("Unauthorized");
  return s;
}

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("Forbidden");
  return s;
}

export type ActionState<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

export async function createTicketAction(
  subject: string,
  category: string,
  description: string
): Promise<ActionState<string>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    if (!subject.trim()) return { ok: false, error: "Subject is required" };
    if (!category.trim()) return { ok: false, error: "Category is required" };
    if (!description.trim()) return { ok: false, error: "Description is required" };

    const ticketId = await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(supportTickets)
        .values({
          userId,
          subject: subject.trim(),
          category: category.trim(),
          status: "open",
        })
        .returning({ id: supportTickets.id });

      await tx.insert(supportMessages).values({
        ticketId: ticket.id,
        senderId: userId,
        role: "user",
        message: description.trim(),
      });

      return ticket.id;
    });

    revalidatePath("/dashboard/support");
    return { ok: true, data: ticketId };
  } catch (err) {
    console.error("createTicketAction error:", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function replyToTicketAction(
  ticketId: string,
  message: string
): Promise<ActionState> {
  try {
    const session = await getSession();
    if (!session || !session.uid) return { ok: false, error: "Unauthorized" };

    if (!message.trim()) return { ok: false, error: "Message content is required" };

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) return { ok: false, error: "Ticket not found" };

    // If user, must be the owner. If admin, always allowed.
    if (session.role !== "admin" && ticket.userId !== session.uid) {
      return { ok: false, error: "Access denied" };
    }

    if (ticket.status === "closed") {
      return { ok: false, error: "Cannot reply to a closed ticket" };
    }

    await db.transaction(async (tx) => {
      await tx.insert(supportMessages).values({
        ticketId,
        senderId: session.uid,
        role: session.role === "admin" ? "admin" : "user",
        message: message.trim(),
      });

      await tx
        .update(supportTickets)
        .set({
          status: session.role === "admin" ? "answered" : "open",
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticketId));
    });

    revalidatePath(`/dashboard/support/${ticketId}`);
    revalidatePath(`/admin/support/${ticketId}`);
    revalidatePath("/dashboard/support");
    revalidatePath("/admin/support");

    return { ok: true };
  } catch (err) {
    console.error("replyToTicketAction error:", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function closeTicketAction(ticketId: string): Promise<ActionState> {
  try {
    const session = await getSession();
    if (!session || !session.uid) return { ok: false, error: "Unauthorized" };

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) return { ok: false, error: "Ticket not found" };

    if (session.role !== "admin" && ticket.userId !== session.uid) {
      return { ok: false, error: "Access denied" };
    }

    await db
      .update(supportTickets)
      .set({
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId));

    revalidatePath(`/dashboard/support/${ticketId}`);
    revalidatePath(`/admin/support/${ticketId}`);
    revalidatePath("/dashboard/support");
    revalidatePath("/admin/support");

    return { ok: true };
  } catch (err) {
    console.error("closeTicketAction error:", err);
    return { ok: false, error: (err as Error).message };
  }
}
