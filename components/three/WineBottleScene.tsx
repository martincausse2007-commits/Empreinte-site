"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LABEL_HEIGHT, LABEL_WIDTH } from "./textures";
import { useLabelTexture } from "./useLabelTexture";

/** Profil (rayon, hauteur en mètres) d'une bouteille de Bordeaux, tournée en lathe. */
const BOTTLE_PROFILE: Array<[number, number]> = [
  [0, 0],
  [0.033, 0.004],
  [0.038, 0.012],
  [0.038, 0.2],
  [0.036, 0.216],
  [0.026, 0.236],
  [0.014, 0.256],
  [0.012, 0.262],
  [0.012, 0.29],
  [0.0145, 0.293],
  [0.0145, 0.296],
  [0, 0.296],
];

function useBottleGeometry() {
  return useMemo(() => {
    const points = BOTTLE_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
    const geometry = new THREE.LatheGeometry(points, 64);
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

const LABEL_ASPECT = LABEL_WIDTH / LABEL_HEIGHT;
const LABEL_PLANE_HEIGHT = 0.135;
const LABEL_PLANE_WIDTH = LABEL_PLANE_HEIGHT * LABEL_ASPECT;

function Bottle({ logoSrc }: { logoSrc: string | null }) {
  const bottleGeometry = useBottleGeometry();
  const labelTexture = useLabelTexture(logoSrc);

  return (
    <group>
      {/* bouteille */}
      <mesh geometry={bottleGeometry} castShadow>
        <meshPhysicalMaterial
          color="#0d2416"
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.6}
        />
      </mesh>

      {/* capsule, feuille rouge */}
      <mesh position={[0, 0.276, 0]} castShadow>
        <cylinderGeometry args={[0.0138, 0.0132, 0.045, 32]} />
        <meshStandardMaterial color="#7c1f2b" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.298, 0]} castShadow>
        <cylinderGeometry args={[0.0146, 0.0138, 0.006, 32]} />
        <meshStandardMaterial color="#5e1620" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* étiquette */}
      <mesh position={[0, 0.128, 0.0385]}>
        <planeGeometry args={[LABEL_PLANE_WIDTH, LABEL_PLANE_HEIGHT]} />
        <meshStandardMaterial map={labelTexture} roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

export function WineBottleScene({ logoSrc }: { logoSrc: string | null }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.08, 0.22, 0.62], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      className="!touch-none"
    >
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[0.6, 1, 0.5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-0.6, 0.3, -0.4]} intensity={0.4} />

      <Environment resolution={256}>
        <Lightformer intensity={2.5} color="#ffffff" position={[0, 3, 0]} scale={[6, 6, 1]} form="rect" />
        <Lightformer intensity={1} color="#ffffff" position={[-3, 1, 2]} scale={[3, 3, 1]} form="rect" />
        <Lightformer intensity={0.7} color="#ffe3b8" position={[3, -1, 2]} scale={[3, 3, 1]} form="rect" />
      </Environment>

      <group position={[0, -0.148, 0]}>
        <Bottle logoSrc={logoSrc} />
      </group>

      <ContactShadows
        position={[0, -0.148, 0]}
        opacity={0.5}
        scale={0.4}
        blur={2.4}
        far={0.25}
        resolution={512}
        color="#1c1208"
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
        autoRotate
        autoRotateSpeed={1.4}
      />
    </Canvas>
  );
}
