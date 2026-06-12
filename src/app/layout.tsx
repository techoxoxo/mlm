import type { Metadata } from "next";
import { Baloo_2, Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const display = Baloo_2({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const num = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-num",
  weight: ["400", "500", "600", "700"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Apex — climb the matrix",
  description:
    "A virtual-points growth game built on a five-tier matrix. Refer, fill your slots, and decide: cash out or climb.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${num.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
