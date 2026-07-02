import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function TransactionsLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Filters bar */}
      <SkeletonCard style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Skeleton w={200} h={38} r={10} />
        <Skeleton w={100} h={32} r={8} />
        <Skeleton w={100} h={32} r={8} />
        <Skeleton w={100} h={32} r={8} />
      </SkeletonCard>

      {/* Transactions table */}
      <SkeletonCard>
        <Skeleton w="25%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={10} cols={5} />
      </SkeletonCard>
    </div>
  );
}
