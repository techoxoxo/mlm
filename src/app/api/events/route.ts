import { getSession } from "@/lib/auth";
import { subscribeToUserEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const uid = session.uid;
  const encoder = new TextEncoder();
  let ping: ReturnType<typeof setInterval>;
  let unsubscribe: (() => Promise<void>) | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          /* stream closed */
        }
      };
      send(`: connected\n\n`);

      unsubscribe = await subscribeToUserEvents(uid, (message) => {
        send(`data: ${message}\n\n`);
      });

      ping = setInterval(() => send(`: ping\n\n`), 25000);
    },
    async cancel() {
      clearInterval(ping);
      if (unsubscribe) {
        await unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

