"use client";

import { Slider as UiSlider } from "@/components/ui/slider";

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
      <UiSlider
        className="h-4"
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        thumbLabel={label}
        onValueChange={(next) => {
          const [nextValue] = next;
          if (nextValue !== undefined) onChange(nextValue);
        }}
      />
    </div>
  );
}
