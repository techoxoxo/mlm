import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Welcome back</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>Log in to your dashboard.</p>
      <AuthForm mode="login" next={next} />
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 18, textAlign: "center" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
          Create one
        </Link>
      </p>
    </>
  );
}
