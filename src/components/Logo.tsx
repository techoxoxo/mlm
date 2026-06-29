import Image from "next/image";

export function Logo({ size = 22, withWord = true, color }: { size?: number; withWord?: boolean; color?: string }) {
  const imgSize = size + 16;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          display: "inline-flex",
          width: imgSize,
          height: imgSize,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(255,255,255,0.85)",
          border: "1px solid rgba(184,134,11,0.2)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <Image
          src="/images/rv_mlm.png"
          alt="Revolutionary Income Plan logo"
          width={imgSize}
          height={imgSize}
          style={{ objectFit: "contain", width: "100%", height: "100%" }}
          priority
        />
      </span>
      {withWord && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: size,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: color || "inherit"
          }}
        >
          Revolutionary Income Plan
        </span>
      )}
    </span>
  );
}
