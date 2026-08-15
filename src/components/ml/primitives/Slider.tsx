"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
}

/** A labeled, accessible drag slider with a live numeric readout. */
export function Slider({ label, value, min, max, step, onChange, format, disabled }: SliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-mono text-slate-500 dark:text-slate-400">{format ? format(value) : value}</span>
      </div>
      <SliderPrimitive.Root
        className="relative flex h-4 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={(next) => {
          const [nextValue] = next;
          if (nextValue !== undefined) onChange(nextValue);
        }}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-slate-200 dark:bg-slate-700">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-indigo-500" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-4 w-4 rounded-full border-2 border-indigo-500 bg-white shadow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-40 dark:bg-slate-900"
          aria-label={label}
        />
      </SliderPrimitive.Root>
    </div>
  );
}
