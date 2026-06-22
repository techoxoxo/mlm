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
          background: "rgba(248,198,23,0.08)",
          border: "1px solid rgba(248,198,23,0.2)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--gold)",
          marginBottom: 16,
        }}
      >
        ✦ Revolutionary Income Plan
      </div>

      <h1 style={{ fontSize: 30, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Welcome back</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "0 0 28px", lineHeight: 1.5 }}>
        Log in to your dashboard and keep climbing.
      </p>

      <div
        style={{
          padding: 26,
          borderRadius: 18,
          background: "rgba(16,15,18,0.8)",
          border: "1px solid var(--border-2)",
          backdropFilter: "blur(12px)",
        }}
      >
        <AuthForm mode="login" next={next} />
      </div>

      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 20, textAlign: "center" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "var(--gold-bright)", fontWeight: 700 }}>
          Create one
        </Link>
      </p>
    </>
  );
}
