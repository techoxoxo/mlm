import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function AutoUpgradeLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toggle card */}
      <SkeletonCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton w={160} h={18} r={8} />
            <Skeleton w={280} h={13} />
          </div>
          <Skeleton w={50} h={28} r={14} />
        </div>
      </SkeletonCard>

      {/* Rules table */}
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={5} cols={4} />
      </SkeletonCard>
    </div>
  );
}
