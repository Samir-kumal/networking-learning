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
  title: "DevOps Hub — SubnetLab & Engineering Learning Portal",
  description:
    "Interactive learning portal for Networking, AWS Cloud, Cybersecurity, GitOps, and Docker & Kubernetes engineering — 41 hands-on modules.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-600/30 selection:text-indigo-600 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-300">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
