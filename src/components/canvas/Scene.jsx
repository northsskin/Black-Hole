import { Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import BlackHole from './BlackHole';
import ParticleField from './ParticleField';
import Starfield from './Starfield';
import CameraRig from './CameraRig';
import { useSceneStore } from '../../store/useSceneStore';

// The whole post-processing pipeline (postprocessing + effects) is its own chunk.
const PostFX = lazy(() => import('./PostFX'));

export default function Scene() {
  const particleCount = useSceneStore((s) => s.particleCount);
  const dpr = useSceneStore((s) => s.dpr);

  return (
    <Canvas
      dpr={dpr}
      camera={{ fov: 62, near: 0.1, far: 1000, position: [0, 5, 26] }}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000', 1);
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#000000']} />
      <CameraRig />
      <Suspense fallback={null}>
        <Starfield />
        <BlackHole />
        <ParticleField count={particleCount} />
      </Suspense>
      <Suspense fallback={null}>
        <PostFX />
      </Suspense>
    </Canvas>
  );
}
