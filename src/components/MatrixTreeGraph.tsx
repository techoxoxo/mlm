"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, X, ArrowUpRight } from "lucide-react";
import type { MatrixNode, NodeSummary } from "@/lib/queries";
import { memberCode } from "@/db/schema";

function descendants(n: MatrixNode): number {
  return n.children.reduce((a, c) => a + 1 + descendants(c), 0);
}

function Node({ node, level, isRoot, onOpen }: { node: MatrixNode; level: number; isRoot?: boolean; onOpen?: (id: string) => void }) {
  const [open, setOpen] = useState(node.depth < 2);
  const hasKids = node.children.length > 0;
  const total = hasKids ? descendants(node) : 0;

  return (
    <li>
      <div className={`mnode${isRoot ? " root" : ""}`} onClick={onOpen ? () => onOpen(node.id) : undefined} style={onOpen ? undefined : { cursor: "default" }} title={onOpen ? "Click for details" : undefined}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          {node.position != null ? (
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--gold-ink)", background: "var(--gold)", borderRadius: 5, padding: "2px 6px" }}>
              {node.position}
            </span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--gold)", border: "1px solid var(--border-3)", borderRadius: 5, padding: "2px 6px" }}>
              TOP
            </span>
          )}
          <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold-bright)" }}>{memberCode(node.serialNo)}</span>
        </div>
        {/* whole card opens the modal — the modal links to the full journey */}
        <span style={{ fontSize: 11.5, color: "var(--text)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        {hasKids && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            style={{ marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: 0, color: "var(--gold)", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}
          >
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {open ? "collapse" : `${total} below`}
          </button>
        )}
      </div>
      {open && hasKids && (
        <ul>
          {node.children.map((c) => (
            <Node key={c.id} node={c} level={level} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: accent ? "var(--gold-bright)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

function NodeModal({ id, level, isAdmin = false, onClose }: { id: string; level: number; isAdmin?: boolean; onClose: () => void }) {
  const [data, setData] = useState<NodeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetch(`/api/node?id=${id}&level=${level}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id, level]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, padding: 24, maxHeight: "85vh", overflowY: "auto", background: "#16151a", border: "1px solid var(--border)" }}>
        {loading || !data ? (
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>{loading ? "Loading…" : "Not found."}</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="pill pill-gold mono">{memberCode(data.serialNo)}</span>
                  <span className="pill" style={{ textTransform: "capitalize" }}>{data.status}</span>
                </div>
                <h3 style={{ fontSize: 19, margin: "10px 0 0" }}>{data.name}</h3>
                <p style={{ color: "var(--faint)", fontSize: 12.5, margin: "2px 0 0" }}>Stage {data.slab || "—"} · {level === data.slab ? "current tier" : `viewing tier ${level}`}</p>
              </div>
              <button onClick={onClose} style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginTop: 16 }}>
              <Stat label="Points balance" value={data.balance.toLocaleString()} />
              <Stat label="Total earned" value={data.totalEarned.toLocaleString()} accent />
              <Stat label="Royalty earned" value={data.royaltyEarned.toLocaleString()} />
              <Stat label="Direct referrals" value={String(data.directs)} />
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700, marginBottom: 8 }}>Matrix line (top → here)</div>
              {data.upline.length === 0 ? (
                <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>This player is at the top of the tier.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12 }}>
                  {data.upline.map((u, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ color: "var(--muted)" }}>{memberCode(u.serialNo)}</span>
                      <span style={{ color: "var(--faint)" }}>›</span>
                    </span>
                  ))}
                  <span className="mono pill pill-gold">{memberCode(data.serialNo)}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700, marginBottom: 8 }}>Directly below (their slots)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.downline.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: d.status === "filled" ? "var(--gold-ink)" : "var(--muted)", background: d.status === "filled" ? "var(--gold)" : "transparent", border: d.status === "filled" ? 0 : "1px solid var(--border-2)", borderRadius: 5, padding: "2px 6px" }}>slot {d.position}</span>
                    {d.name ? <><span className="mono" style={{ color: "var(--gold-bright)" }}>{memberCode(d.serialNo!)}</span><span style={{ color: "var(--muted)" }}>{d.name}</span></> : <span style={{ color: "var(--faint)" }}>open</span>}
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <Link href={`/admin/users/${data.id}`} className="btn btn-primary" style={{ marginTop: 20, width: "100%" }}>
                Open full journey <ArrowUpRight size={16} />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function MatrixTreeGraph({ roots, level, readOnly = false, isAdmin = false }: { roots: MatrixNode[]; level: number; readOnly?: boolean; isAdmin?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (roots.length === 0) {
    return <p style={{ color: "var(--faint)", fontSize: 14 }}>No placements at this stage yet.</p>;
  }
  return (
    <>
      <p style={{ fontSize: 12.5, color: "var(--faint)", margin: "0 0 14px" }}>
        {readOnly ? (
          <>Each card is a player placed beneath you · use <b style={{ color: "var(--muted)" }}>below / collapse</b> to expand the branch.</>
        ) : (
          <>Tap a card for full details · use <b style={{ color: "var(--muted)" }}>below / collapse</b> to expand the branch.</>
        )}
      </p>
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 22, minWidth: "100%" }}>
          {roots.map((r) => (
            <div key={r.id} className="mtree">
              <ul>
                <Node node={r} level={level} isRoot onOpen={readOnly ? undefined : setOpenId} />
              </ul>
            </div>
          ))}
        </div>
      </div>
      {!readOnly && openId && <NodeModal id={openId} level={level} isAdmin={isAdmin} onClose={() => setOpenId(null)} />}
    </>
  );
}
