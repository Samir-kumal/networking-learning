"use client";

import type { ReactNode } from "react";
import { Katex } from "./Katex";

export interface PlaygroundPreset {
  label: string;
  apply: () => void;
}

export interface PlaygroundShellProps {
  title: string;
  description: string;
  /** LaTeX for the live equation strip, with current parameter values substituted. */
  equation?: string;
  onReset: () => void;
  onRandomize?: () => void;
  presets?: PlaygroundPreset[];
  /** Sliders/inputs, rendered in a side rail (stacks below the canvas on mobile). */
  controls: ReactNode;
  /** The canvas/plot/visualization itself. */
  children: ReactNode;
}

const BUTTON_CLASS =
  "rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition";

/** Standard chrome every ML playground shares: title, live equation, reset/randomize/presets, responsive canvas+controls layout. */
export function PlaygroundShell({
  title,
  description,
  equation,
  onReset,
  onRandomize,
  presets,
  controls,
  children,
}: PlaygroundShellProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {presets?.map((preset) => (
            <button key={preset.label} onClick={preset.apply} className={BUTTON_CLASS}>
              {preset.label}
            </button>
          ))}
          {onRandomize && (
            <button onClick={onRandomize} className={BUTTON_CLASS}>
              Randomize
            </button>
          )}
          <button onClick={onReset} className={BUTTON_CLASS}>
            Reset
          </button>
        </div>
      </div>

      {equation && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
          <Katex expr={equation} block />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-4">{children}</div>
        <div className="space-y-4 border-t border-slate-200 p-4 lg:border-l lg:border-t-0 dark:border-slate-700">
          {controls}
        </div>
      </div>
    </div>
  );
}
