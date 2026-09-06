import { Suspense, lazy, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import BlackHole from './BlackHole';
import ParticleField from './ParticleField';
import Starfield from './Starfield';
import CameraRig from './CameraRig';
import { useSceneStore } from '../../store/useSceneStore';

// The whole post-processing pipeline (postprocessing + effects) is its own chunk.
const PostFX = lazy(() => import('./PostFX'));

export default function Scene() {
  const particleCount = useSceneStore((s) => s.particleCount);
  const dprRange = useSceneStore((s) => s.dpr);

  // Resolution is the biggest lever on GPU cost (bloom + lensing are full-screen
  // passes). Start at the tier's cap and let the monitor walk it down between
  // the tier bounds when the frame rate sags, and back up when it recovers.
  const [minDpr, maxDpr] = dprRange;
  const [dpr, setDpr] = useState(() =>
    Math.min(maxDpr, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  );
  const onChange = useCallback(
    ({ factor }) => {
      const target = Math.min(maxDpr, window.devicePixelRatio || 1);
      // factor: 1 = smooth, 0 = struggling
      const next = Math.round((minDpr + (target - minDpr) * factor) * 20) / 20;
      setDpr(next);
    },
    [minDpr, maxDpr]
  );

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
      <PerformanceMonitor
        ms={250}
        iterations={8}
        flipflops={4}
        onChange={onChange}
        onFallback={() => setDpr(minDpr)}
      />
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
