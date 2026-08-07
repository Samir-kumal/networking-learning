"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import BackToTop from "@/components/BackToTop";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">

      {/* Fixed sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main content area — offset by sidebar width */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Slim top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span className="font-semibold text-slate-700">DevOps Hub</span>
            <span className="text-slate-300">/</span>
            <span>Next.js 16.3 · Docker · Port 3008</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
            <span className="text-slate-500">All systems operational</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full animate-fade-up">
          {children}
        </main>

        <BackToTop />

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-5 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-slate-400">
            <span>
              DevOps Hub &amp; SubnetLab — built with{" "}
              <span className="font-medium text-slate-600">Next.js 16.3</span>,{" "}
              <span className="font-medium text-slate-600">React 19</span>,{" "}
              <span className="font-medium text-slate-600">TypeScript</span> &amp;{" "}
              <span className="font-medium text-slate-600">Tailwind CSS</span>.
            </span>
            <span className="text-emerald-600 font-semibold">41 interactive engineering modules</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
