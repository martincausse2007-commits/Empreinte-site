"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { createWoodTexture } from "./textures";
import { useLogoTexture } from "./useLogoTexture";

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

function Bottle({ logoSrc }: { logoSrc: string | null }) {
  const bottleGeometry = useBottleGeometry();
  const woodTexture = useMemo(() => createWoodTexture(), []);
  const labelTexture = useLogoTexture(logoSrc, "label");
  const medallionTexture = useLogoTexture(logoSrc, "medallion");

  return (
    <group>
      {/* socle en bois massif */}
      <mesh position={[0, -0.011, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.11, 0.022, 48]} />
        <meshStandardMaterial map={woodTexture} roughness={0.75} metalness={0} />
      </mesh>

      {/* médaillon logo, gravé sur le socle */}
      <mesh position={[0, 0.0005, 0.075]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.03, 48]} />
        <meshStandardMaterial map={medallionTexture} roughness={0.45} metalness={0.15} />
      </mesh>

      {/* bouteille */}
      <mesh geometry={bottleGeometry} castShadow position={[0, 0, -0.015]}>
        <meshPhysicalMaterial
          color="#0d2416"
          roughness={0.1}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* capsule dorée */}
      <mesh position={[0, 0.276, -0.015]} castShadow>
        <cylinderGeometry args={[0.0138, 0.0132, 0.045, 32]} />
        <meshStandardMaterial color="#c9a24f" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* étiquette */}
      <mesh position={[0, 0.135, 0.0235]}>
        <planeGeometry args={[0.058, 0.058]} />
        <meshStandardMaterial map={labelTexture} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

export function WineBottleScene({ logoSrc }: { logoSrc: string | null }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.08, 0.34, 0.58], fov: 28 }}
      gl={{ antialias: true }}
      className="!touch-none"
    >
      <color attach="background" args={["#eae6dd"]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[0.6, 1, 0.5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-0.6, 0.3, -0.4]} intensity={0.45} />

      <Environment resolution={256}>
        <Lightformer intensity={2.5} color="#ffffff" position={[0, 3, 0]} scale={[6, 6, 1]} form="rect" />
        <Lightformer intensity={1} color="#ffffff" position={[-3, 1, 2]} scale={[3, 3, 1]} form="rect" />
        <Lightformer intensity={0.7} color="#ffe3b8" position={[3, -1, 2]} scale={[3, 3, 1]} form="rect" />
      </Environment>

      <group position={[0, -0.138, 0]}>
        <Bottle logoSrc={logoSrc} />
      </group>

      <ContactShadows
        position={[0, -0.16, 0]}
        opacity={0.55}
        scale={0.5}
        blur={2.2}
        far={0.3}
        resolution={512}
        color="#1c1208"
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
        autoRotate
        autoRotateSpeed={1.4}
      />
    </Canvas>
  );
}
