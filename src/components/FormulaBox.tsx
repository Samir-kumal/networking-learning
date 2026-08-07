"use client";

import CopyButton from "@/components/CopyButton";

interface FormulaBoxProps {
  /** The formula, command, or technical value to display */
  value: string;
  /** Optional label shown above the value (e.g. "Formula", "Command") */
  label?: string;
  /** indigo = technical/formula content, emerald = examples/results */
  variant?: "indigo" | "emerald";
  /** Show a copy-to-clipboard button */
  copyable?: boolean;
  className?: string;
}

const VARIANT_STYLES = {
  indigo: {
    box: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    label: "text-indigo-500 dark:text-indigo-400",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  emerald: {
    box: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    label: "text-emerald-500 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
  },
} as const;

export default function FormulaBox({
  value,
  label,
  variant = "indigo",
  copyable = false,
  className = "",
}: FormulaBoxProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={`rounded-lg border p-3 ${styles.box} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label && (
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${styles.label}`}>
              {label}
            </div>
          )}
          <code className={`font-mono text-sm font-semibold break-all ${styles.text}`}>
            {value}
          </code>
        </div>
        {copyable && <CopyButton text={value} className="flex-shrink-0" />}
      </div>
    </div>
  );
}
