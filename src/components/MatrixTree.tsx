"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, User } from "lucide-react";
import type { MatrixNode } from "@/lib/queries";
import { memberCode } from "@/db/schema";

function Node({ node, isRoot }: { node: MatrixNode; isRoot?: boolean }) {
  const [open, setOpen] = useState(node.depth < 2);
  const hasKids = node.children.length > 0;

  return (
    <div style={{ marginLeft: isRoot ? 0 : 18 }}>
      <div
        onClick={() => hasKids && setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 9,
          cursor: hasKids ? "pointer" : "default",
          border: "1px solid var(--border)",
          background: isRoot ? "var(--surface-2)" : "var(--surface)",
          marginBottom: 6,
        }}
      >
        {hasKids ? (
          open ? <ChevronDown size={15} color="var(--muted)" /> : <ChevronRight size={15} color="var(--muted)" />
        ) : (
          <span style={{ width: 15 }} />
        )}
        <User size={14} color={isRoot ? "var(--gold-bright)" : "var(--muted)"} />
        {node.position != null && <span className="pill" style={{ fontSize: 10.5, padding: "2px 7px" }}>slot #{node.position}</span>}
        <Link href={`/admin/users/${node.id}`} className="mono" style={{ fontSize: 12.5, color: "var(--gold-bright)" }} onClick={(e) => e.stopPropagation()}>
          {memberCode(node.serialNo)}
        </Link>
        <span style={{ fontSize: 13, color: "var(--text)" }}>{node.name}</span>
        {hasKids && (
          <span style={{ fontSize: 12, color: "var(--faint)", marginLeft: "auto" }}>
            {node.children.length} below
          </span>
        )}
      </div>
      {open && hasKids && (
        <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 4 }}>
          {node.children.map((c) => (
            <Node key={c.id} node={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MatrixTree({ roots }: { roots: MatrixNode[] }) {
  if (roots.length === 0) {
    return <p style={{ color: "var(--faint)", fontSize: 14 }}>No placements at this stage yet.</p>;
  }
  return (
    <div>
      {roots.map((r) => (
        <Node key={r.id} node={r} isRoot />
      ))}
    </div>
  );
}
