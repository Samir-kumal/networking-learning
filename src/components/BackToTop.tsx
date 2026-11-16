"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    toggleVisibility();

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      type="button"
      variant="outline"
      size="icon"
      aria-label="Back to top"
      className="fixed bottom-4 right-3 z-40 size-9 sm:bottom-6 sm:right-6 sm:size-11 rounded-full bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-600 shadow-xl backdrop-blur-md hover:bg-indigo-600 hover:text-white hover:border-indigo-400 transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </Button>
  );
}
