import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function PaymentsLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Pending withdrawals */}
      <SkeletonCard style={{ border: "1px solid rgba(245, 198, 23, 0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Skeleton w={20} h={20} r={4} />
          <Skeleton w={200} h={18} r={8} />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Skeleton w={100} h={14} />
                <Skeleton w={90} h={20} r={99} />
              </div>
              <Skeleton w={280} h={12} />
              <Skeleton w={200} h={12} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Skeleton w={200} h={36} r={8} />
              <Skeleton w={120} h={36} r={8} />
              <Skeleton w={80} h={36} r={8} />
            </div>
          </div>
        ))}
      </SkeletonCard>

      {/* Recent log */}
      <SkeletonCard>
        <Skeleton w="35%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={8} cols={7} />
      </SkeletonCard>
    </div>
  );
}
