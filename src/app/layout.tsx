import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex — Points Matrix Game",
  description: "A virtual points matrix game with slabs, FIFO placement and live distribution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
