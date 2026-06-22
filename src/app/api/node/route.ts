import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getNodeSummary } from "@/lib/queries";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { users, slots } = schema;

async function isDownline(rootId: string, targetId: string): Promise<boolean> {
  if (rootId === targetId) return true;
  const res = await db.execute(sql`
    WITH RECURSIVE downline AS (
      SELECT id FROM ${users} WHERE id = ${rootId}
      UNION
      SELECT c.id FROM (
        SELECT id, sponsor_id AS parent_id FROM ${users}
        UNION ALL
        SELECT occupant_id AS id, owner_id AS parent_id FROM ${slots} WHERE occupant_id IS NOT NULL
      ) c
      JOIN downline d ON c.parent_id = d.id
    )
    SELECT 1 FROM downline WHERE id = ${targetId} LIMIT 1
  `);
  return res.rows.length > 0;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const level = Number(req.nextUrl.searchParams.get("level") || 1);
  if (!id) return new Response("Missing id", { status: 400 });

  // Security check: Only admins or the parent/sponsor downline of that node can view its details
  if (session.role !== "admin") {
    const allowed = await isDownline(session.uid, id);
    if (!allowed) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const summary = await getNodeSummary(id, level);
  if (!summary) return new Response("Not found", { status: 404 });
  return Response.json(summary);
}
