"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export interface KatexProps {
  expr: string;
  block?: boolean;
  className?: string;
}

/** Renders a LaTeX expression via KaTeX. `block` uses display mode (centered, larger). */
export function Katex({ expr, block = false, className }: KatexProps) {
  const html = useMemo(
    () => katex.renderToString(expr, { throwOnError: false, displayMode: block, output: "html" }),
    [expr, block],
  );

  if (block) {
    return <div className={`overflow-x-auto ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
