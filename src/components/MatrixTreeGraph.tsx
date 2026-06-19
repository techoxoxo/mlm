"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatrixNode } from "@/lib/queries";
import { memberCode } from "@/db/schema";

function descendants(n: MatrixNode): number {
  return n.children.reduce((a, c) => a + 1 + descendants(c), 0);
}

function Node({ node, isRoot }: { node: MatrixNode; isRoot?: boolean }) {
  const [open, setOpen] = useState(node.depth < 2); // expand first couple levels
  const hasKids = node.children.length > 0;

  return (
    <li>
      <div
        className={`mnode${isRoot ? " root" : ""}`}
        onClick={() => hasKids && setOpen((o) => !o)}
        title={hasKids ? (open ? "Collapse" : "Expand") : undefined}
      >
        {node.position != null && (
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em", color: "var(--muted)", textTransform: "uppercase" }}>
            slot {node.position}
          </span>
        )}
        <Link
          href={`/admin/users/${node.id}`}
          className="mono"
          style={{ fontSize: 12, fontWeight: 700, color: "var(--gold-bright)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {memberCode(node.serialNo)}
        </Link>
        <span style={{ fontSize: 11, color: "var(--muted)", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.name}
        </span>
        {hasKids && (
          <span style={{ fontSize: 10, color: open ? "var(--faint)" : "var(--gold)", fontWeight: 700 }}>
            {open ? "▾" : `▸ +${descendants(node)}`}
          </span>
        )}
      </div>
      {open && hasKids && (
        <ul>
          {node.children.map((c) => (
            <Node key={c.id} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function MatrixTreeGraph({ roots }: { roots: MatrixNode[] }) {
  if (roots.length === 0) {
    return <p style={{ color: "var(--faint)", fontSize: 14 }}>No placements at this stage yet.</p>;
  }
  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 18, minWidth: "100%" }}>
        {roots.map((r) => (
          <div key={r.id} className="mtree">
            <ul>
              <Node node={r} isRoot />
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
