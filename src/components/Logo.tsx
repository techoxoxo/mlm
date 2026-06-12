import { Hexagon } from "lucide-react";

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: size }}>
      <span
        style={{
          display: "inline-flex",
          width: size + 10,
          height: size + 10,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9,
          background: "linear-gradient(135deg, var(--color-brand), var(--color-brand-2))",
        }}
      >
        <Hexagon size={size - 4} color="#fff" strokeWidth={2.4} />
      </span>
      <span>Apex</span>
    </span>
  );
}
