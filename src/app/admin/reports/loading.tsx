import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function ReportsLoading() {
  return (
    <SkeletonCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Skeleton w="25%" h={18} r={8} />
        <div style={{ display: "flex", gap: 8 }}>
          <Skeleton w={100} h={32} r={8} />
          <Skeleton w={100} h={32} r={8} />
        </div>
      </div>
      <SkeletonTable rows={12} cols={6} />
    </SkeletonCard>
  );
}
