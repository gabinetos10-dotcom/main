"use client";

import { Canvas } from "@react-three/fiber";
import { ParticleField } from "./ParticleField";

export default function Scene({ count }: { count: number }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 11], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // Pause rendering when the canvas isn't visible to save the battery.
      frameloop="always"
      className="!absolute inset-0"
    >
      <ParticleField count={count} />
    </Canvas>
  );
}
