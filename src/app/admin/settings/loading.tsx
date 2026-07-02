import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function SettingsLoading() {
  return (
    <SkeletonCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Skeleton w={180} h={18} r={8} />
          <Skeleton w={260} h={12} />
        </div>
        <Skeleton w={120} h={38} r={8} />
      </div>
      {/* Form fields */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          <Skeleton w={140} h={12} />
          <Skeleton h={40} r={10} />
        </div>
      ))}
      <Skeleton w={120} h={42} r={10} />
    </SkeletonCard>
  );
}
