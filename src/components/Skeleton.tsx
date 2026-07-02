export function Skeleton({ w, h, r, className = "", style }: { w?: string | number; h?: string | number; r?: string | number; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: w ?? "100%",
        height: h ?? 14,
        borderRadius: r,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="skeleton-card" style={style}>
      {children}
    </div>
  );
}

/** A reusable stat card skeleton matching the StatCard pattern used on dashboards */
export function SkeletonStatCard() {
  return (
    <SkeletonCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Skeleton w={36} h={36} r={10} />
        <Skeleton w={100} h={12} />
      </div>
      <Skeleton w="60%" h={28} r={8} />
      <Skeleton w="40%" h={12} />
    </SkeletonCard>
  );
}

/** A table skeleton with configurable rows and columns */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="skeleton-table-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} h={12} w="70%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="skeleton-table-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton key={ci} h={14} w={ci === 0 ? "50%" : "80%"} />
          ))}
        </div>
      ))}
    </div>
  );
}
