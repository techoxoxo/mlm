import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Link href="/" style={{ marginBottom: 26 }}>
        <Logo size={26} />
      </Link>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        {children}
      </div>
    </main>
  );
}
