import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function UserDetailLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* User header */}
      <SkeletonCard style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Skeleton w={56} h={56} r="50%" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <Skeleton w={180} h={22} r={8} />
          <Skeleton w={220} h={13} />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Skeleton w={72} h={24} r={99} />
            <Skeleton w={90} h={24} r={99} />
          </div>
        </div>
      </SkeletonCard>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton w="50%" h={12} />
            <Skeleton w="35%" h={26} r={8} />
          </SkeletonCard>
        ))}
      </div>

      {/* Transaction history */}
      <SkeletonCard>
        <Skeleton w="30%" h={18} r={8} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={6} cols={5} />
      </SkeletonCard>
    </div>
  );
}
