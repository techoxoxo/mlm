import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getNodeSummary } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  const level = Number(req.nextUrl.searchParams.get("level") || 1);
  if (!id) return new Response("Missing id", { status: 400 });

  const summary = await getNodeSummary(id, level);
  if (!summary) return new Response("Not found", { status: 404 });
  return Response.json(summary);
}
