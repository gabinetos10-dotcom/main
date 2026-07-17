"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PALETTE } from "@/lib/palette";
import { pointerStore, scrollStore } from "@/lib/store";
import { clamp } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════
   Scène « flux de données » GJS
   — Particules additives (glow lime SANS post-processing : le
     blending additif + sprites doux donnent la lueur à coût quasi nul)
   — Répulsion/surbrillance autour du curseur, flux accéléré par la
     vélocité de scroll, formes filaires en parallaxe.
   — instancing implicite (THREE.Points), géométries légères,
     rendu coupé quand l'onglet est masqué.
   ══════════════════════════════════════════════════════════════ */

const VERT = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform float uPixelRatio;
attribute float aScale;
attribute float aSpeed;
attribute float aOffset;
attribute vec3 aColor;
varying vec3 vColor;
varying float vGlow;

void main() {
  vec3 p = position;
  float t = uTime * aSpeed;

  // dérive horizontale bouclée (le "flux") + ondulations organiques
  p.x = mod(p.x + t * 0.9 + aOffset * 24.0, 24.0) - 12.0;
  p.y += sin(t * 1.4 + aOffset * 6.2831 + p.x * 0.35) * 0.55;
  p.z += cos(t * 1.1 + aOffset * 12.566) * 0.45;

  // répulsion douce + énergie autour du pointeur
  vec2 toMouse = p.xy - uMouse;
  float d = length(toMouse);
  float influence = smoothstep(3.2, 0.0, d);
  p.xy += normalize(toMouse + 1e-4) * influence * 1.15;

  vGlow = influence;
  vColor = aColor;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aScale * uPixelRatio * (34.0 / -mv.z) * (1.0 + influence * 1.5);
}
`;

const FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uAccent;
varying vec3 vColor;
varying float vGlow;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.06, d);
  if (alpha < 0.02) discard;
  // près du curseur, les particules virent au Mindaro : le visiteur
  // « énergise » littéralement le flux de données.
  vec3 col = mix(vColor, uAccent, vGlow * 0.85);
  col += smoothstep(0.16, 0.0, d) * 0.35;
  gl_FragColor = vec4(col, alpha * (0.5 + vGlow * 0.5));
}
`;

function Particles({ count }: { count: number }) {
  const mouseTarget = useRef(new THREE.Vector2(60, 60));

  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const base = [PALETTE.royal, PALETTE.air, PALETTE.cambridge, PALETTE.sage];
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      scales[i] = 0.7 + Math.random() * 1.9;
      speeds[i] = 0.35 + Math.random() * 1.15;
      offsets[i] = Math.random();
      // ~8 % d'étincelles Mindaro — l'accent reste rare et précieux
      c.set(Math.random() < 0.08 ? PALETTE.mindaro : base[Math.floor(Math.random() * base.length)]!);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(60, 60) },
        uPixelRatio: { value: 1 },
        uAccent: { value: new THREE.Color(PALETTE.mindaro) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }, [count]);

  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    },
    [points]
  );

  useFrame((state, delta) => {
    const mat = points.material as THREE.ShaderMaterial;
    const d = Math.min(delta, 0.05);
    // la vélocité de scroll accélère le flux — le site « réagit »
    const boost = 1 + Math.min(Math.abs(scrollStore.velocity) * 0.02, 1.3);
    mat.uniforms.uTime!.value += d * boost;
    mat.uniforms.uPixelRatio!.value = state.gl.getPixelRatio();

    // pointeur → coordonnées monde (plan z = 0)
    mouseTarget.current.set(
      (pointerStore.nx * state.viewport.width) / 2,
      (pointerStore.ny * state.viewport.height) / 2
    );
    (mat.uniforms.uMouse!.value as THREE.Vector2).lerp(mouseTarget.current, 1 - Math.pow(0.002, d));

    // léger travelling + rotation liés au scroll
    points.position.y = scrollStore.progress * 1.6;
    points.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.04 + scrollStore.progress * 0.07;
  });

  return <primitive object={points} />;
}

/** Solides filaires flottants — repères géométriques en parallaxe. */
function FloatingShapes() {
  const shapes = useMemo(() => {
    const icoGeo = new THREE.IcosahedronGeometry(2.6, 1);
    const icoEdges = new THREE.EdgesGeometry(icoGeo);
    icoGeo.dispose();
    const octGeo = new THREE.OctahedronGeometry(1.5, 0);
    const octEdges = new THREE.EdgesGeometry(octGeo);
    octGeo.dispose();

    const matA = new THREE.LineBasicMaterial({
      color: new THREE.Color(PALETTE.royal),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const matB = new THREE.LineBasicMaterial({
      color: new THREE.Color(PALETTE.sage),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { a: new THREE.LineSegments(icoEdges, matA), b: new THREE.LineSegments(octEdges, matB) };
  }, []);

  useEffect(
    () => () => {
      shapes.a.geometry.dispose();
      (shapes.a.material as THREE.Material).dispose();
      shapes.b.geometry.dispose();
      (shapes.b.material as THREE.Material).dispose();
    },
    [shapes]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    shapes.a.rotation.x = t * 0.08;
    shapes.a.rotation.y = t * 0.11;
    shapes.b.rotation.x = -t * 0.12;
    shapes.b.rotation.z = t * 0.09;
    // parallaxe : l'icosaèdre accompagne le hero, l'octaèdre émerge plus bas
    shapes.a.position.set(4.7 + pointerStore.nx * 0.35, 1.2 + scrollStore.progress * 5, -3);
    shapes.b.position.set(-5.4 - pointerStore.nx * 0.25, -7 + scrollStore.progress * 11, -2.2);
  });

  return (
    <group>
      <primitive object={shapes.a} />
      <primitive object={shapes.b} />
    </group>
  );
}

/** Prévient le preloader dès la première frame réellement rendue. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onReady();
    }
  });
  return null;
}

export default function Scene({
  quality,
  onReady,
}: {
  quality: "high" | "low";
  onReady: () => void;
}) {
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  /* Pause complète du rendu quand l'onglet est masqué */
  useEffect(() => {
    const onVis = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* Mobile : le gyroscope remplace le curseur (Android sans permission ;
     iOS restera piloté par le scroll, jamais d'écran de permission surprise) */
  useEffect(() => {
    if (quality !== "low") return;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      pointerStore.nx = clamp(e.gamma / 28, -1, 1);
      pointerStore.ny = clamp(-(e.beta - 40) / 28, -1, 1);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [quality]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        frameloop={frameloop}
        dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
        camera={{ position: [0, 0, 9], fov: 50, near: 0.1, far: 60 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <Particles count={quality === "high" ? 4200 : 1500} />
        <FloatingShapes />
        <ReadySignal onReady={onReady} />
      </Canvas>
    </div>
  );
}
