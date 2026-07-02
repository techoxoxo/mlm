import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function NetworkLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Level breakdown */}
      <SkeletonCard>
        <Skeleton w="35%" h={18} r={8} style={{ marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              <Skeleton w={48} h={48} r="50%" />
              <Skeleton w={60} h={12} />
              <Skeleton w={36} h={20} r={8} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Members table */}
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={8} cols={5} />
      </SkeletonCard>
    </div>
  );
}
