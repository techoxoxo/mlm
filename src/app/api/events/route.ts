import { getSession } from "@/lib/auth";
import { channel, newSubscriber } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const uid = session.uid;
  const sub = newSubscriber();
  const encoder = new TextEncoder();
  let ping: ReturnType<typeof setInterval>;

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

      sub.on("message", (_chan, message) => send(`data: ${message}\n\n`));
      await sub.subscribe(channel(uid));

      ping = setInterval(() => send(`: ping\n\n`), 25000);
    },
    async cancel() {
      clearInterval(ping);
      try {
        await sub.quit();
      } catch {
        /* noop */
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
