import { db, schema } from "@/db";
import { getSession } from "./auth";
import { clientIp } from "./ratelimit";

const { auditLog } = schema;

export type AuditEntry = {
  action: string;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  note?: string;
};

/**
 * Record an admin action in the audit log.
 * Automatically captures the admin's session ID and client IP.
 * Fails silently — audit should never break the main operation.
 */
export async function logAudit(entry: AuditEntry) {
  try {
    const session = await getSession();
    if (!session) return;

    let ip: string | null = null;
    try {
      ip = await clientIp();
    } catch {
      // clientIp() may fail outside of a request context (e.g. worker)
    }

    await db.insert(auditLog).values({
      adminId: session.uid,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      before: entry.before as never,
      after: entry.after as never,
      ipAddress: ip,
      note: entry.note ?? null,
    });
  } catch (e) {
    console.error("Audit log write failed:", e);
  }
}

/**
 * Record an audit entry with an explicit admin ID (for use in workers / non-request contexts).
 */
export async function logAuditDirect(adminId: string, entry: AuditEntry & { ipAddress?: string }) {
  try {
    await db.insert(auditLog).values({
      adminId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      before: entry.before as never,
      after: entry.after as never,
      ipAddress: entry.ipAddress ?? null,
      note: entry.note ?? null,
    });
  } catch (e) {
    console.error("Audit log write failed:", e);
  }
}
