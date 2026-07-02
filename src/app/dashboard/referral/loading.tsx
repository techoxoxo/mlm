import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function ReferralLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Referral link card */}
      <SkeletonCard>
        <Skeleton w="40%" h={18} r={8} style={{ marginBottom: 12 }} />
        <Skeleton w="100%" h={44} r={10} style={{ marginBottom: 10 }} />
        <Skeleton w={120} h={36} r={10} />
      </SkeletonCard>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton w="50%" h={12} />
            <Skeleton w="30%" h={26} r={8} />
          </SkeletonCard>
        ))}
      </div>

      {/* Referrals table */}
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={6} cols={4} />
      </SkeletonCard>
    </div>
  );
}
