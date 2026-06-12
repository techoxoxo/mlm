// A bespoke downline-matrix visual: a binary tree of nodes "filling" upward,
// conveying the growth-structure of the game. Pure SVG + CSS animation.
export function MatrixVisual() {
  const W = 540;
  const H = 440;
  const levels = 4; // 1, 2, 4, 8 nodes
  const topPad = 34;
  const rowGap = (H - topPad * 2) / (levels - 1);

  type N = { x: number; y: number; i: number; lvl: number };
  const nodes: N[][] = [];
  for (let lvl = 0; lvl < levels; lvl++) {
    const count = 2 ** lvl;
    const row: N[] = [];
    for (let i = 0; i < count; i++) {
      const x = (W * (i + 1)) / (count + 1);
      const y = topPad + lvl * rowGap;
      row.push({ x, y, i, lvl });
    }
    nodes.push(row);
  }

  const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let lvl = 0; lvl < levels - 1; lvl++) {
    nodes[lvl].forEach((p, i) => {
      [nodes[lvl + 1][i * 2], nodes[lvl + 1][i * 2 + 1]].forEach((c, j) => {
        edges.push({ x1: p.x, y1: p.y, x2: c.x, y2: c.y, key: `${lvl}-${i}-${j}` });
      });
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2ee89c" stopOpacity="0.5" />
          <stop offset="1" stopColor="#2ee89c" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="nodeFill" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#3df0a6" />
          <stop offset="1" stopColor="#119a66" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {edges.map((e, idx) => (
        <line
          key={e.key}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="url(#edge)"
          strokeWidth="1.5"
          style={{ animation: `rise 0.7s ease ${0.2 + idx * 0.012}s both` }}
        />
      ))}

      {nodes.flat().map((n, idx) => {
        const isApex = n.lvl === 0;
        const r = isApex ? 13 : 9 - n.lvl;
        const filled = (n.lvl + n.i) % 3 !== 2; // most filled, a few open
        return (
          <g key={`${n.lvl}-${n.i}`} style={{ animation: `rise 0.6s ease ${0.15 + n.lvl * 0.12 + n.i * 0.02}s both` }}>
            {filled && (
              <circle cx={n.x} cy={n.y} r={r + 5} fill="#2ee89c" opacity="0.12" filter="url(#soft)" />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={r}
              fill={isApex ? "#e7b35c" : filled ? "url(#nodeFill)" : "#171c26"}
              stroke={isApex ? "#f0c478" : filled ? "rgba(46,232,156,0.5)" : "rgba(255,255,255,0.12)"}
              strokeWidth="1.5"
              style={filled ? { animation: `pulse-node ${2.4 + idx * 0.1}s ease-in-out infinite` } : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
