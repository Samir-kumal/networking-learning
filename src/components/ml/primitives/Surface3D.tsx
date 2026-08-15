"use client";

import { useMemo } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export interface Surface3DProps {
  fn: (x: number, y: number) => number;
  domain: [number, number];
  resolution?: number;
  /** [x, y] of a marker point on the surface. */
  point?: [number, number];
  /** Drag the marker across the surface (reports the math x/y of the pointer). */
  onDragPoint?: (x: number, y: number) => void;
  showGradient?: boolean;
  /** Draws a colored curve slicing the surface at the marker point, holding x or y fixed. */
  slice?: "x" | "y" | null;
  /** Scales fn's output for display — keeps tall/flat functions readable in the fixed-size view. */
  heightScale?: number;
}

function buildGeometry(
  fn: (x: number, y: number) => number,
  domain: [number, number],
  resolution: number,
  heightScale: number,
): THREE.PlaneGeometry {
  const [d0, d1] = domain;
  const geometry = new THREE.PlaneGeometry(d1 - d0, d1 - d0, resolution - 1, resolution - 1);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = fn(x, z) * heightScale;
    position.setY(i, Number.isFinite(y) ? y : 0);
  }
  geometry.computeVertexNormals();
  return geometry;
}

interface SurfaceMeshProps {
  fn: (x: number, y: number) => number;
  domain: [number, number];
  resolution: number;
  heightScale: number;
  onDragPoint?: (x: number, y: number) => void;
}

function SurfaceMesh({ fn, domain, resolution, heightScale, onDragPoint }: SurfaceMeshProps) {
  const geometry = useMemo(
    () => buildGeometry(fn, domain, resolution, heightScale),
    [fn, domain, resolution, heightScale],
  );
  return (
    <mesh
      geometry={geometry}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        if (!onDragPoint || event.buttons !== 1) return;
        onDragPoint(event.point.x, event.point.z);
      }}
    >
      <meshStandardMaterial color="#6366f1" side={THREE.DoubleSide} transparent opacity={0.92} />
    </mesh>
  );
}

function MarkerPoint({
  x,
  y,
  fn,
  heightScale,
}: {
  x: number;
  y: number;
  fn: (x: number, y: number) => number;
  heightScale: number;
}) {
  const z = fn(x, y) * heightScale;
  return (
    <mesh position={[x, z + 0.06, y]}>
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
  );
}

function GradientArrow({
  x,
  y,
  fn,
  heightScale,
  domain,
}: {
  x: number;
  y: number;
  fn: (x: number, y: number) => number;
  heightScale: number;
  domain: [number, number];
}) {
  const span = domain[1] - domain[0];
  const eps = span * 0.001;
  const gx = (fn(x + eps, y) - fn(x - eps, y)) / (2 * eps);
  const gy = (fn(x, y + eps) - fn(x, y - eps)) / (2 * eps);
  const magnitude = Math.hypot(gx, gy) || 1;
  const arrowLength = span * 0.15;
  const dx = (gx / magnitude) * arrowLength;
  const dy = (gy / magnitude) * arrowLength;
  const z0 = fn(x, y) * heightScale + 0.09;
  const points: [number, number, number][] = [
    [x, z0, y],
    [x + dx, z0, y + dy],
  ];
  return <Line points={points} color="#dc2626" lineWidth={2.5} />;
}

function SliceCurve({
  fn,
  domain,
  axis,
  at,
  heightScale,
}: {
  fn: (x: number, y: number) => number;
  domain: [number, number];
  axis: "x" | "y";
  at: number;
  heightScale: number;
}) {
  const points = useMemo<[number, number, number][]>(() => {
    const [d0, d1] = domain;
    const steps = 60;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = d0 + ((d1 - d0) * i) / steps;
      const x = axis === "x" ? t : at;
      const y = axis === "x" ? at : t;
      pts.push([x, fn(x, y) * heightScale + 0.03, y]);
    }
    return pts;
  }, [fn, domain, axis, at, heightScale]);
  return <Line points={points} color="#059669" lineWidth={3} />;
}

/** A resizable, orbit-controlled 3D surface plot (loss surfaces, partial derivatives, gradients). */
export function Surface3D({
  fn,
  domain,
  resolution = 40,
  point,
  onDragPoint,
  showGradient,
  slice = null,
  heightScale = 1,
}: Surface3DProps) {
  const extent = domain[1] - domain[0];
  return (
    <div className="aspect-square w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      <Canvas camera={{ position: [extent * 0.8, extent * 0.7, extent * 0.8], fov: 45 }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[5, 8, 5]} intensity={0.7} />
        <SurfaceMesh fn={fn} domain={domain} resolution={resolution} heightScale={heightScale} onDragPoint={onDragPoint} />
        {point && <MarkerPoint x={point[0]} y={point[1]} fn={fn} heightScale={heightScale} />}
        {point && showGradient && (
          <GradientArrow x={point[0]} y={point[1]} fn={fn} heightScale={heightScale} domain={domain} />
        )}
        {point && slice && (
          <SliceCurve
            fn={fn}
            domain={domain}
            axis={slice}
            at={slice === "x" ? point[1] : point[0]}
            heightScale={heightScale}
          />
        )}
        <gridHelper args={[extent, 10]} />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
