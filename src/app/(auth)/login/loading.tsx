import { Skeleton } from "@/components/Skeleton";

export default function LoginLoading() {
  return (
    <>
      <Skeleton w={160} h={26} r={99} style={{ marginBottom: 16 }} />
      <Skeleton w={200} h={30} r={8} style={{ marginBottom: 6 }} />
      <Skeleton w={280} h={14} style={{ marginBottom: 28 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Skeleton w={50} h={12} style={{ marginBottom: 6 }} />
          <Skeleton h={44} r={12} />
        </div>
        <div>
          <Skeleton w={70} h={12} style={{ marginBottom: 6 }} />
          <Skeleton h={44} r={12} />
        </div>
        <Skeleton h={46} r={12} style={{ marginTop: 4 }} />
      </div>

      <Skeleton w={160} h={14} r={6} style={{ margin: "20px auto 0" }} />
    </>
  );
}
