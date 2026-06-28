import type { Metadata } from "next";
import { Baloo_2, Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

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
  title: "Revolutionary Income Plan — Build Your Network, Grow Your Income",
  description:
    "Revolutionary Income Plan: a fair, queue-backed matrix network. Refer, fill your slots, and decide: cash out or climb.",
  icons: {
    icon: "/images/rv_mlm.png",
    apple: "/images/rv_mlm.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${num.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
