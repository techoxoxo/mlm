import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function UsersLoading() {
  return (
    <SkeletonCard style={{ padding: 26 }}>
      <div style={{ marginBottom: 18 }}>
        <Skeleton w={140} h={18} r={8} style={{ marginBottom: 6 }} />
        <Skeleton w={240} h={12} />
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 14, border: "1px solid var(--border)", marginBottom: 18 }}>
        <Skeleton w={280} h={38} r={10} />
        <div style={{ display: "flex", gap: 8 }}>
          <Skeleton w={60} h={32} r={8} />
          <Skeleton w={70} h={32} r={8} />
          <Skeleton w={90} h={32} r={8} />
          <Skeleton w={60} h={32} r={8} />
        </div>
      </div>

      <SkeletonTable rows={10} cols={7} />
    </SkeletonCard>
  );
}
