import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      {/* kicker */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 99,
          background: "rgba(139, 92, 246, 0.12)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#c084fc",
          marginBottom: 16,
        }}
      >
        ✦ Revolutionary Group
      </div>

      <h1 style={{ fontSize: 30, margin: "0 0 6px", letterSpacing: "-0.02em", color: "#ffffff" }}>Welcome back</h1>
      <p style={{ color: "#94a3b8", fontSize: 14.5, margin: "0 0 28px", lineHeight: 1.5 }}>
        Log in to your dashboard and keep climbing.
      </p>

      <AuthForm mode="login" next={next} />

      <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 20, textAlign: "center" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "#a855f7", fontWeight: 700 }}>
          Create one
        </Link>
      </p>
    </>
  );
}
