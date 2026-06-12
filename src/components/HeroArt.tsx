// Playful flat-SVG hero art for the yellow billboard: a tiny astronaut planting
// a flag on a stack of coins (climbing the tiers), with stars and a ringed planet.
export function MascotScene() {
  return (
    <svg viewBox="0 0 360 300" width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      {/* sparkles */}
      {[
        [30, 40, 1.6], [320, 30, 2.2], [60, 150, 1.4], [330, 150, 1.5], [290, 90, 1.2],
      ].map(([x, y, r], i) => (
        <g key={i} style={{ animation: `pulse-node ${2 + i * 0.4}s ease-in-out infinite` }}>
          <path
            d={`M ${x} ${Number(y) - 6 * Number(r)} l ${1.8 * Number(r)} ${4.2 * Number(r)} l ${4.2 * Number(r)} ${1.8 * Number(r)} l -${4.2 * Number(r)} ${1.8 * Number(r)} l -${1.8 * Number(r)} ${4.2 * Number(r)} l -${1.8 * Number(r)} -${4.2 * Number(r)} l -${4.2 * Number(r)} -${1.8 * Number(r)} l ${4.2 * Number(r)} -${1.8 * Number(r)} Z`}
            fill="#fffdf0"
            opacity="0.9"
          />
        </g>
      ))}

      {/* ringed planet */}
      <g style={{ animation: "floaty 5s ease-in-out infinite" }}>
        <circle cx="312" cy="62" r="20" fill="#2a2008" />
        <circle cx="305" cy="56" r="5" fill="#4a3a0e" />
        <circle cx="319" cy="68" r="3.4" fill="#4a3a0e" />
        <ellipse cx="312" cy="62" rx="33" ry="9" fill="none" stroke="#2a2008" strokeWidth="4" transform="rotate(-16 312 62)" />
      </g>

      {/* coin stack */}
      <g>
        <ellipse cx="170" cy="268" rx="92" ry="20" fill="rgba(35,26,2,0.18)" />
        {[
          [170, 248, 84, 22], [170, 222, 70, 19], [170, 198, 56, 16],
        ].map(([cx, cy, rx, ry], i) => (
          <g key={i}>
            <rect x={Number(cx) - Number(rx)} y={Number(cy) - Number(ry)} width={Number(rx) * 2} height={Number(ry) + 12} rx={Number(ry)} fill="#caa10a" />
            <ellipse cx={cx} cy={Number(cy) - Number(ry) + 6} rx={rx} ry={ry} fill="#ffe07a" stroke="#8a6a05" strokeWidth="3" />
            <text x={cx} y={Number(cy) - Number(ry) + 11} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13" fill="#8a6a05">
              ★
            </text>
          </g>
        ))}
      </g>

      {/* astronaut */}
      <g style={{ animation: "floaty 4s ease-in-out infinite" }}>
        {/* flag */}
        <rect x="218" y="60" width="5" height="120" rx="2.5" fill="#3a2c08" />
        <path d="M223 62 L 290 74 L 223 92 Z" fill="#fffdf0" stroke="#3a2c08" strokeWidth="3" strokeLinejoin="round" />
        <path d="M243 70 l 14 6 l -14 6 c 3 -4 3 -8 0 -12 Z" fill="#ef5d5d" />

        {/* legs */}
        <rect x="168" y="148" width="16" height="34" rx="8" fill="#fffdf0" stroke="#3a2c08" strokeWidth="3.5" />
        <rect x="192" y="146" width="16" height="30" rx="8" fill="#fffdf0" stroke="#3a2c08" strokeWidth="3.5" transform="rotate(18 200 161)" />
        {/* body */}
        <rect x="158" y="96" width="58" height="62" rx="24" fill="#fffdf0" stroke="#3a2c08" strokeWidth="4" />
        {/* backpack */}
        <rect x="146" y="104" width="20" height="38" rx="8" fill="#e8dfc4" stroke="#3a2c08" strokeWidth="3.5" />
        {/* arm to flag */}
        <rect x="204" y="104" width="30" height="14" rx="7" fill="#fffdf0" stroke="#3a2c08" strokeWidth="3.5" transform="rotate(-22 219 111)" />
        {/* chest light */}
        <circle cx="178" cy="126" r="5" fill="#39c6e8" stroke="#3a2c08" strokeWidth="2.5" />
        {/* helmet */}
        <circle cx="187" cy="84" r="26" fill="#fffdf0" stroke="#3a2c08" strokeWidth="4" />
        <circle cx="187" cy="84" r="17" fill="#231a02" />
        <circle cx="181" cy="79" r="5" fill="#fffdf0" opacity="0.85" />
        <circle cx="192" cy="89" r="2.4" fill="#fffdf0" opacity="0.5" />
      </g>
    </svg>
  );
}

// Floating coin tokens for the side card.
export function CoinField() {
  const coins: [number, number, number, string][] = [
    [40, 36, 17, "▲"], [108, 24, 13, "◆"], [78, 96, 21, "★"], [150, 78, 14, "✦"],
    [36, 160, 14, "◆"], [118, 152, 18, "▲"], [62, 226, 16, "✦"], [142, 222, 13, "★"],
  ];
  return (
    <svg viewBox="0 0 180 260" width="100%" style={{ display: "block" }} aria-hidden>
      {coins.map(([x, y, r, glyph], i) => (
        <g key={i} style={{ animation: `floaty ${3.4 + (i % 4) * 0.7}s ease-in-out ${i * 0.3}s infinite` }}>
          <circle cx={x} cy={y + 3} r={r} fill="#9a7a06" />
          <circle cx={x} cy={y} r={r} fill="#ffd84d" stroke="#8a6a05" strokeWidth="2.5" />
          <text x={x} y={y + r * 0.36} textAnchor="middle" fontSize={r * 0.9} fontWeight="800" fill="#8a6a05">
            {glyph}
          </text>
        </g>
      ))}
    </svg>
  );
}
