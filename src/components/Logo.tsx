import Image from "next/image";

export function Logo({ size = 22, withWord = true }: { size?: number; withWord?: boolean; color?: string }) {
  const imgSize = size * 4;

  if (withWord) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", width: "100%" }}>
        <Image
          src="/1.png"
          alt="Revolutionary Group"
          width={imgSize * 6}
          height={imgSize}
          style={{ objectFit: "contain", width: "auto", height: `${imgSize}px`, maxWidth: "100%" }}
          priority
        />
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        width: imgSize,
        height: imgSize,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Image
        src="/image.png"
        alt="Revolutionary Group Emblem"
        width={imgSize}
        height={imgSize}
        style={{ objectFit: "contain", width: "100%", height: "100%" }}
        priority
      />
    </span>
  );
}
