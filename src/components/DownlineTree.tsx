"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, User, Circle } from "lucide-react";
import type { TreeNode } from "@/lib/queries";

const STATUS_COLOR: Record<string, string> = {
  active: "var(--color-success)",
  registered: "var(--color-muted)",
  exited: "var(--color-accent)",
  completed: "var(--color-brand-2)",
};

function Node({ node, isRoot }: { node: TreeNode; isRoot?: boolean }) {
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
          border: "1px solid var(--color-border)",
          background: isRoot ? "var(--color-surface-2)" : "var(--color-surface)",
          marginBottom: 6,
        }}
      >
        {hasKids ? (
          open ? <ChevronDown size={15} color="var(--color-muted)" /> : <ChevronRight size={15} color="var(--color-muted)" />
        ) : (
          <span style={{ width: 15 }} />
        )}
        <User size={15} color={isRoot ? "var(--color-brand-2)" : "var(--color-muted)"} />
        <span style={{ fontSize: 14, fontWeight: isRoot ? 600 : 500 }}>{isRoot ? "You" : node.name}</span>
        <span className="chip" style={{ fontSize: 11, padding: "2px 8px" }}>
          {node.slab ? `Slab ${node.slab}` : "registered"}
        </span>
        <Circle size={8} fill={STATUS_COLOR[node.status] ?? "var(--color-muted)"} color={STATUS_COLOR[node.status] ?? "var(--color-muted)"} />
        {hasKids && (
          <span style={{ fontSize: 12, color: "var(--color-muted)", marginLeft: "auto" }}>
            {node.children.length} ref{node.children.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {open && hasKids && (
        <div style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: 4 }}>
          {node.children.map((c) => (
            <Node key={c.id} node={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DownlineTree({ root }: { root: TreeNode | null }) {
  if (!root || root.children.length === 0) {
    return <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No downline yet — share your referral link to grow your tree.</p>;
  }
  return <Node node={root} isRoot />;
}
