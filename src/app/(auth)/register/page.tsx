import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Create your account</h1>
      <p style={{ color: "var(--color-muted)", fontSize: 14, margin: "0 0 22px" }}>Join the matrix and start filling slots.</p>
      <AuthForm mode="register" refCode={ref} />
      <p style={{ color: "var(--color-muted)", fontSize: 14, marginTop: 18, textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--color-brand-2)" }}>
          Log in
        </Link>
      </p>
    </>
  );
}
