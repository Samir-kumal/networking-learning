"use client";

export type Matrix2x2 = [[number, number], [number, number]];

export interface MatrixGridProps {
  matrix: Matrix2x2;
  onChange?: (matrix: Matrix2x2) => void;
  /** Half-width of the square view, in world units. */
  domain?: number;
  /** Shows a numeric determinant readout ("area scale factor"). Default true. */
  showDeterminant?: boolean;
}

const SIZE = 360;

/** 2x2 matrix input with a live-transformed grid and unit-square overlay (area = |det|). */
export function MatrixGrid({ matrix, onChange, domain = 3, showDeterminant = true }: MatrixGridProps) {
  const scale = SIZE / (domain * 2);
  const toScreen = (x: number, y: number) => ({ x: SIZE / 2 + x * scale, y: SIZE / 2 - y * scale });
  const apply = (x: number, y: number) => ({
    x: matrix[0][0] * x + matrix[0][1] * y,
    y: matrix[1][0] * x + matrix[1][1] * y,
  });

  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let g = -domain; g <= domain; g++) {
    const a = apply(g, -domain);
    const b = apply(g, domain);
    gridLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    const c = apply(-domain, g);
    const d = apply(domain, g);
    gridLines.push({ x1: c.x, y1: c.y, x2: d.x, y2: d.y });
  }

  const unitSquare = [apply(0, 0), apply(1, 0), apply(1, 1), apply(0, 1)].map((p) => toScreen(p.x, p.y));
  const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full max-w-md" role="img" aria-label="Transformed grid">
        {gridLines.map((l, i) => {
          const p1 = toScreen(l.x1, l.y1);
          const p2 = toScreen(l.x2, l.y2);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={unitSquare.map((p) => `${p.x},${p.y}`).join(" ")}
          className="fill-indigo-500/20 stroke-indigo-500"
          strokeWidth={2}
        />
      </svg>

      {onChange && (
        <div className="grid max-w-[176px] grid-cols-2 gap-2">
          {([0, 1] as const).flatMap((row) =>
            ([0, 1] as const).map((col) => (
              <input
                key={`${row}-${col}`}
                type="number"
                step="0.1"
                value={matrix[row][col]}
                aria-label={`matrix row ${row + 1} column ${col + 1}`}
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
      )}

      {showDeterminant && (
        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          det = {determinant.toFixed(2)} (signed area scale factor)
        </p>
      )}
    </div>
  );
}
