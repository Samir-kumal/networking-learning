"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import BackToTop from "@/components/BackToTop";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex bg-[#080c14] text-[#f0f6fc] font-sans selection:bg-[#00f0ff]/30 selection:text-[#00f0ff] relative">
      {/* Cyber Grid Background Ambient Overlay */}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none -z-10 opacity-60" />

      {/* Collapsible Command Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Shell with Dynamic Padding */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Top Header Status Bar */}
        <header className="sticky top-0 z-30 bg-[#080c14]/80 backdrop-blur-xl border-b border-[#202c40] px-4 py-2.5 flex items-center justify-between font-mono text-xs text-[#8b949e]">
          <div className="flex items-center gap-3">
            <span className="text-[#00f0ff] font-bold">DEVOPS_SHELL_v16.3</span>
            <span className="hidden sm:inline text-[#202c40]">|</span>
            <span className="hidden sm:inline text-[#00ff9d] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" /> CLOUD_ENGINE: READY
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-[11px]">PORT: <strong className="text-[#00f0ff]">3008</strong></span>
            <span className="text-[11px] text-[#ffb700] bg-[#ffb700]/10 px-2 py-0.5 rounded border border-[#ffb700]/30 font-bold">
              SYS_ENV: PROD
            </span>
          </div>
        </header>

        {/* Main Content Page Render */}
        <main className="flex-1 w-full">{children}</main>

        {/* Floating Back to Top Button */}
        <BackToTop />

        {/* High-Tech Terminal Footer */}
        <footer className="border-t border-[#202c40] bg-[#0e1420] py-6 text-center text-xs font-mono text-[#8b949e]">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#00f0ff]">⚡</span>
              <span>DevOpsHub & SubnetLab — Built with Next.js 16.3, React 19, TypeScript & Tailwind CSS.</span>
            </div>
            <div className="text-[11px] text-[#00ff9d] font-bold">
              41 INTERACTIVE ENGINEERING MODULES
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
