import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function MatrixLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Tier pills */}
      <div>
        <Skeleton w="70%" h={13} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} w={110} h={34} r={99} />
          ))}
        </div>
      </div>

      {/* Tree card */}
      <SkeletonCard style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Skeleton w={160} h={18} r={8} />
          <Skeleton w={100} h={26} r={99} />
        </div>
        {/* Fake tree nodes */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Skeleton w={64} h={64} r="50%" />
          <div style={{ display: "flex", gap: 40 }}>
            <Skeleton w={52} h={52} r="50%" />
            <Skeleton w={52} h={52} r="50%" />
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} w={40} h={40} r="50%" />
            ))}
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
