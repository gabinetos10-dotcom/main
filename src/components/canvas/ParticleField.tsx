"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Props = { count: number };

/**
 * Weightless particle cloud. Two nested shells drift and rotate; the whole
 * system parallaxes toward the pointer for an "infinite aired space" feel.
 * All motion is done at the group level (cheap) rather than per‑vertex.
 */
export function ParticleField({ count }: Props) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Points>(null);
  const outer = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  const innerData = useMemo(() => buildShell(count, 5, ["#7b61ff", "#2de2e6"]), [count]);
  const outerData = useMemo(
    () => buildShell(Math.floor(count * 0.55), 9, ["#c4b5fd", "#7b61ff"]),
    [count]
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Smooth pointer parallax (state.pointer is normalised -1..1).
    const px = state.pointer.x;
    const py = state.pointer.y;

    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        px * 0.35,
        0.04
      );
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        -py * 0.25,
        0.04
      );
    }
    if (inner.current) inner.current.rotation.y += delta * 0.04;
    if (outer.current) {
      outer.current.rotation.y -= delta * 0.02;
      outer.current.rotation.z = Math.sin(t * 0.1) * 0.05;
    }
  });

  return (
    <group ref={group} scale={Math.min(1, viewport.width / 10)}>
      <Shell reference={inner} data={innerData} size={0.05} opacity={0.95} />
      <Shell reference={outer} data={outerData} size={0.08} opacity={0.6} />
    </group>
  );
}

function Shell({
  reference,
  data,
  size,
  opacity,
}: {
  reference: React.RefObject<THREE.Points | null>;
  data: { positions: Float32Array; colors: Float32Array };
  size: number;
  opacity: number;
}) {
  return (
    <points ref={reference}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Distributes points in a soft spherical shell with a colour gradient. */
function buildShell(count: number, radius: number, palette: [string, string]) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cA = new THREE.Color(palette[0]);
  const cB = new THREE.Color(palette[1]);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Fibonacci‑ish sphere with jitter for organic clumping.
    const r = radius * (0.6 + Math.random() * 0.4);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    positions[i * 3 + 2] = r * Math.cos(phi);

    tmp.copy(cA).lerp(cB, Math.random());
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  return { positions, colors };
}
