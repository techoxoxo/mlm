import { Skeleton, SkeletonCard, SkeletonStatCard, SkeletonTable } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Stat cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Chart area */}
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        <Skeleton w="100%" h={180} r={12} />
      </SkeletonCard>

      {/* Recent activity table */}
      <SkeletonCard>
        <Skeleton w="25%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={5} cols={4} />
      </SkeletonCard>
    </div>
  );
}
