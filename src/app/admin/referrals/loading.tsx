import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function ReferralsLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={10} cols={6} />
      </SkeletonCard>
    </div>
  );
}
