import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function RoyaltyAdminLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Run button area */}
      <SkeletonCard>
        <Skeleton w={200} h={40} r={10} />
      </SkeletonCard>

      {/* Royalty tiers */}
      <SkeletonCard>
        <Skeleton w="35%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={5} cols={4} />
      </SkeletonCard>

      {/* Recent distributions */}
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={5} cols={5} />
      </SkeletonCard>
    </div>
  );
}
