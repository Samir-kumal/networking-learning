"use client";

import type { Matrix2x2 } from "@/components/ml/primitives";

export interface TwoMatrixInputsProps {
  label: string;
  matrix: Matrix2x2;
  onChange: (matrix: Matrix2x2) => void;
}

/**
 * Compact 2x2 numeric-only matrix input (no transformed-grid canvas) — used when two or more
 * matrices need to sit side by side in a controls rail and a full MatrixGrid per matrix would
 * be too visually heavy. Mirrors MatrixGrid's own input styling for consistency.
 */
export function TwoMatrixInputs({ label, matrix, onChange }: TwoMatrixInputsProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{label}</p>
      <div className="grid w-[140px] grid-cols-2 gap-1.5">
        {([0, 1] as const).flatMap((row) =>
          ([0, 1] as const).map((col) => (
            <input
              key={`${row}-${col}`}
              type="number"
              step="0.5"
              value={matrix[row][col]}
              aria-label={`${label} row ${row + 1} column ${col + 1}`}
              onChange={(event) => {
                const next: Matrix2x2 = [
                  [matrix[0][0], matrix[0][1]],
                  [matrix[1][0], matrix[1][1]],
                ];
                next[row][col] = Number(event.target.value);
                onChange(next);
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center font-mono text-[13px] dark:border-slate-600 dark:bg-slate-900"
            />
          )),
        )}
      </div>
    </div>
  );
}
