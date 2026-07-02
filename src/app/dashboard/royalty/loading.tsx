import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function RoyaltyLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Info banner */}
      <SkeletonCard>
        <Skeleton w="50%" h={18} r={8} style={{ marginBottom: 10 }} />
        <Skeleton w="80%" h={13} style={{ marginBottom: 6 }} />
        <Skeleton w="60%" h={13} />
      </SkeletonCard>

      {/* Tier cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton w={80} h={14} />
              <Skeleton w={50} h={22} r={99} className="skeleton-pill" />
            </div>
            <Skeleton w="100%" h={8} r={4} />
            <Skeleton w="45%" h={12} />
          </SkeletonCard>
        ))}
      </div>

      {/* History table */}
      <SkeletonCard>
        <Skeleton w="25%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={5} cols={5} />
      </SkeletonCard>
    </div>
  );
}
