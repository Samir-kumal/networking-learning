import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mastering Subnets — Interactive Guide",
  description:
    "An interactive, deep-dive guide to IP addressing, binary math, CIDR notation, VLSM design, VPC networking, and subnet calculations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#0d1117] text-[#e6edf3] font-sans selection:bg-[#58a6ff]/30 selection:text-[#58a6ff]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
