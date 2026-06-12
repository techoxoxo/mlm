export function Logo({ size = 22, withWord = true }: { size?: number; withWord?: boolean }) {
  const box = size + 8;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
      <span
        style={{
          display: "inline-flex",
          width: box,
          height: box,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 11,
          background: "linear-gradient(150deg, #1a140c, #0c0907)",
          border: "1px solid rgba(212,175,55,0.35)",
          boxShadow: "0 4px 16px rgba(212,175,55,0.18)",
        }}
      >
        <svg width={size - 2} height={size - 2} viewBox="0 0 24 24" fill="none" aria-hidden>
          <defs>
            <linearGradient id="lg" x1="0" y1="24" x2="24" y2="0">
              <stop offset="0" stopColor="#a8842a" />
              <stop offset="1" stopColor="#f1d785" />
            </linearGradient>
          </defs>
          <rect x="3" y="14" width="4.5" height="7" rx="1.4" fill="url(#lg)" opacity="0.55" />
          <rect x="9.75" y="9" width="4.5" height="12" rx="1.4" fill="url(#lg)" opacity="0.8" />
          <rect x="16.5" y="3" width="4.5" height="18" rx="1.4" fill="url(#lg)" />
          <circle cx="18.75" cy="3.4" r="2.2" fill="#f7e6a8" />
        </svg>
      </span>
      {withWord && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: size,
            letterSpacing: "-0.03em",
          }}
        >
          Apex
        </span>
      )}
    </span>
  );
}
