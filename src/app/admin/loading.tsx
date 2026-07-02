import { Skeleton, SkeletonCard, SkeletonStatCard } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Simulate panel */}
      <SkeletonCard>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Skeleton w={20} h={20} r={4} />
          <Skeleton w={140} h={18} r={8} />
        </div>
        <Skeleton w="80%" h={13} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <Skeleton w={110} h={40} r={10} />
          <Skeleton w={140} h={40} r={10} />
        </div>
      </SkeletonCard>

      {/* Danger zone */}
      <SkeletonCard>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Skeleton w={20} h={20} r={4} />
          <Skeleton w={110} h={18} r={8} />
        </div>
        <Skeleton w="70%" h={13} style={{ marginBottom: 16 }} />
        <Skeleton w={140} h={40} r={10} />
      </SkeletonCard>
    </div>
  );
}
