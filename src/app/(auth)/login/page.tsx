import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Welcome back</h1>
      <p style={{ color: "var(--color-muted)", fontSize: 14, margin: "0 0 22px" }}>Log in to your dashboard.</p>
      <AuthForm mode="login" />
      <p style={{ color: "var(--color-muted)", fontSize: 14, marginTop: 18, textAlign: "center" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "var(--color-brand-2)" }}>
          Create one
        </Link>
      </p>
    </>
  );
}
