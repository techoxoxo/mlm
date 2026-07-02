import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function SlabsLoading() {
  return (
    <SkeletonCard>
      <Skeleton w="25%" h={18} r={8} style={{ marginBottom: 16 }} />
      <SkeletonTable rows={6} cols={5} />
    </SkeletonCard>
  );
}
