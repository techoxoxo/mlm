import Link from "next/link";
import { eq } from "drizzle-orm";
import { AuthForm } from "@/components/AuthForm";
import { db, schema } from "@/db";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const firstUser = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, "user")).limit(1);
  const isFirstUser = firstUser.length === 0;

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
        {ref ? "✦ Invited" : "✦ Revolutionary Group"}
      </div>

      <h1 style={{ fontSize: 30, margin: "0 0 6px", letterSpacing: "-0.02em", color: "#ffffff" }}>Create your account</h1>
      <p style={{ color: "#94a3b8", fontSize: 14.5, margin: "0 0 28px", lineHeight: 1.5 }}>
        {ref
          ? "You were invited — join the matrix and start filling slots."
          : "Join the queue-backed matrix and climb from Starter to Platinum."}
      </p>

      <AuthForm mode="register" refCode={ref} isFirstUser={isFirstUser} />

      <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 20, textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#a855f7", fontWeight: 700 }}>
          Log in
        </Link>
      </p>
    </>
  );
}
