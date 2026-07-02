import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function WalletLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Balance card */}
      <SkeletonCard style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Skeleton w={36} h={36} r={10} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <Skeleton w={140} h={12} />
          <Skeleton w={180} h={32} r={8} />
        </div>
      </SkeletonCard>

      {/* Payout form */}
      <SkeletonCard>
        <Skeleton w="35%" h={18} r={8} style={{ marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton w={120} h={12} />
            <Skeleton h={40} r={10} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton w={160} h={12} />
            <Skeleton h={40} r={10} />
          </div>
        </div>
        <Skeleton h={72} r={8} style={{ marginBottom: 16 }} />
        <Skeleton h={44} r={10} className="skeleton-btn" style={{ width: "100%" }} />
      </SkeletonCard>

      {/* Transactions table */}
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <Skeleton w="25%" h={14} />
            <Skeleton w="15%" h={14} />
            <Skeleton w="20%" h={14} />
          </div>
        ))}
      </SkeletonCard>
    </div>
  );
}
