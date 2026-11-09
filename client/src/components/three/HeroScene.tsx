import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, RoundedBox, Sparkles, ContactShadows } from '@react-three/drei';
import type { Group } from 'three';

type Props = { brand: string; accent: string; reduceMotion?: boolean };

/** A small parcel that circles the gem on a tilted orbit. */
function Parcel({ radius, speed, offset, tilt, size, color }: { radius: number; speed: number; offset: number; tilt: number; size: number; color: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    const g = ref.current!;
    g.position.set(Math.cos(t) * radius, Math.sin(t) * radius * tilt, Math.sin(t) * radius * 0.6);
    g.rotation.set(t * 0.8, t * 1.1, 0);
  });
  return (
    <group ref={ref}>
      <RoundedBox args={[size, size * 0.8, size]} radius={size * 0.12} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
      </RoundedBox>
      {/* Tape strip across the box. */}
      <mesh position={[0, size * 0.401, 0]}>
        <boxGeometry args={[size * 0.22, 0.001, size * 1.001]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/** Tilts the whole scene a little towards the pointer. */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ pointer }, dt) => {
    const g = ref.current!;
    g.rotation.y += (pointer.x * 0.35 - g.rotation.y) * Math.min(dt * 3, 1);
    g.rotation.x += (-pointer.y * 0.2 - g.rotation.x) * Math.min(dt * 3, 1);
  });
  return <group ref={ref}>{children}</group>;
}

export default function HeroScene({ brand, accent, reduceMotion }: Props) {
  const parcels = useMemo(
    () => [
      { radius: 2.3, speed: 0.5, offset: 0, tilt: 0.35, size: 0.42, color: accent },
      { radius: 2.0, speed: 0.4, offset: 2.1, tilt: -0.5, size: 0.32, color: '#f8fafc' },
      { radius: 2.6, speed: 0.32, offset: 4.2, tilt: 0.2, size: 0.36, color: brand },
      { radius: 1.8, speed: 0.6, offset: 5.3, tilt: 0.7, size: 0.26, color: accent },
    ],
    [brand, accent],
  );

  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      frameloop={reduceMotion ? 'demand' : 'always'}
      aria-hidden
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 3]} intensity={1.6} />
      <pointLight position={[-4, -2, 2]} intensity={25} color={accent} />
      <pointLight position={[3, -3, -2]} intensity={15} color={brand} />

      <Rig>
        <Float speed={reduceMotion ? 0 : 1.6} rotationIntensity={0.6} floatIntensity={1.2}>
          <mesh scale={1.35}>
            <icosahedronGeometry args={[1, 24]} />
            <MeshDistortMaterial color={brand} roughness={0.15} metalness={0.35} distort={0.35} speed={reduceMotion ? 0 : 1.8} />
          </mesh>
          {/* Thin ring around the gem. */}
          <mesh rotation={[Math.PI / 2.4, 0, 0]}>
            <torusGeometry args={[2.05, 0.015, 16, 120]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
          </mesh>
        </Float>
        {parcels.map((p, i) => <Parcel key={i} {...p} />)}
        <Sparkles count={60} scale={6} size={2.5} speed={reduceMotion ? 0 : 0.4} color={accent} />
      </Rig>

      <ContactShadows position={[0, -2.4, 0]} opacity={0.35} scale={9} blur={2.6} far={4} color={brand} />
    </Canvas>
  );
}
