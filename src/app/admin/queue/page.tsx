import { distributionQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

export default async function QueueAdmin() {
  let counts: Record<string, number> = {};
  let error: string | null = null;
  try {
    counts = await distributionQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
  } catch (e) {
    error = (e as Error).message;
  }

  const cards = [
    { label: "Waiting", key: "waiting", color: "var(--color-muted)" },
    { label: "Active", key: "active", color: "var(--color-brand-2)" },
    { label: "Completed", key: "completed", color: "var(--color-success)" },
    { label: "Failed", key: "failed", color: "var(--color-danger)" },
    { label: "Delayed", key: "delayed", color: "var(--color-accent)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <p style={{ color: "var(--color-muted)", fontSize: 14, margin: 0 }}>
        Live state of the BullMQ distribution queue. Activations and slab decisions flow through here for durable,
        retry-safe processing.
      </p>
      {error ? (
        <div className="card" style={{ padding: 22, color: "var(--color-danger)" }}>
          Could not reach Redis: {error}. Is the worker / Redis running?
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
          {cards.map((c) => (
            <div key={c.key} className="card" style={{ padding: 18 }}>
              <div style={{ color: "var(--color-muted)", fontSize: 13 }}>{c.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: c.color }}>{counts[c.key] ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
