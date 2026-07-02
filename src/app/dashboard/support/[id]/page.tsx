import { notFound, redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { TicketDiscussion } from "@/components/TicketDiscussion";

export const dynamic = "force-dynamic";

export default async function UserTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const [ticket] = await db
    .select()
    .from(schema.supportTickets)
    .where(eq(schema.supportTickets.id, id))
    .limit(1);

  // Ticket must exist and belong to the logged-in user
  if (!ticket || ticket.userId !== session.uid) {
    notFound();
  }

  const messages = await db
    .select()
    .from(schema.supportMessages)
    .where(eq(schema.supportMessages.ticketId, id))
    .orderBy(asc(schema.supportMessages.createdAt));

  return (
    <TicketDiscussion
      ticket={ticket}
      messages={messages}
      currentUserId={session.uid}
      isAdmin={false}
    />
  );
}
