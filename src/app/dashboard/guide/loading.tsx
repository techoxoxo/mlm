import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function GuideLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i}>
          <Skeleton w="45%" h={20} r={8} style={{ marginBottom: 12 }} />
          <Skeleton w="100%" h={13} style={{ marginBottom: 6 }} />
          <Skeleton w="90%" h={13} style={{ marginBottom: 6 }} />
          <Skeleton w="75%" h={13} />
        </SkeletonCard>
      ))}
    </div>
  );
}
