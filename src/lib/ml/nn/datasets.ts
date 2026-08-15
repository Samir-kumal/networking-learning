import type { Sample } from "./network";
import { seededRng } from "./rng";

/** XOR — 4 fixed points, the classic "a linear model cannot solve this" demo (Chapter 7). */
export function xorDataset(): Sample[] {
  return [
    { input: [0, 0], target: [0] },
    { input: [0, 1], target: [1] },
    { input: [1, 0], target: [1] },
    { input: [1, 1], target: [0] },
  ];
}

/** Two concentric rings, inputs scaled to roughly [-1, 1]. */
export function circlesDataset(n = 200, noise = 0.05, seed = 1): Sample[] {
  const rng = seededRng(seed);
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const label = i % 2;
    const baseRadius = label === 0 ? 0.5 : 1.0;
    const radius = baseRadius + (rng() - 0.5) * noise;
    const angle = rng() * Math.PI * 2;
    samples.push({ input: [radius * Math.cos(angle), radius * Math.sin(angle)], target: [label] });
  }
  return samples;
}

/** Two interleaving spiral arms, inputs scaled to roughly [-1, 1]. */
export function spiralDataset(n = 200, noise = 0.1, seed = 1): Sample[] {
  const rng = seededRng(seed);
  const samples: Sample[] = [];
  const perClass = Math.floor(n / 2);
  for (let label = 0; label < 2; label++) {
    for (let i = 0; i < perClass; i++) {
      const t = i / perClass;
      const radius = t * 5;
      const angle = label * Math.PI + t * 4 + (rng() - 0.5) * noise;
      samples.push({
        input: [(radius * Math.sin(angle)) / 5, (radius * Math.cos(angle)) / 5],
        target: [label],
      });
    }
  }
  return samples;
}

export type ToyDataset = "xor" | "circles" | "spiral";

export function generateDataset(name: ToyDataset, options?: { n?: number; noise?: number; seed?: number }): Sample[] {
  switch (name) {
    case "xor":
      return xorDataset();
    case "circles":
      return circlesDataset(options?.n, options?.noise, options?.seed);
    case "spiral":
      return spiralDataset(options?.n, options?.noise, options?.seed);
  }
}
