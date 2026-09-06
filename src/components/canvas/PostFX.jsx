import { useEffect } from 'react';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import Lensing from './LensingEffect';
import FilmGrain from './FilmGrainEffect';
import { useSceneStore } from '../../store/useSceneStore';

/**
 * Order matters and everything here merges into a single full-screen pass
 * (bloom renders its mip chain separately, then composites):
 *   lensing (bends the raw HDR frame, adds the photon ring)
 *   -> bloom (so the ring and the disk's hot edge glow)
 *   -> film grain -> vignette -> ACES tone mapping
 */
export default function PostFX() {
  const tier = useSceneStore((s) => s.tier);

  useEffect(() => {
    useSceneStore.setState({ postfxReady: true });
  }, []);

  return (
    <EffectComposer frameBufferType={THREE.HalfFloatType} multisampling={0} enableNormalPass={false}>
      <Lensing strength={1.0} soft={0.5} />
      <Bloom
        mipmapBlur
        intensity={0.55}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.3}
        radius={0.6}
        levels={tier === 'low' ? 5 : 7}
      />
      <FilmGrain amount={tier === 'low' ? 0.04 : 0.055} />
      <Vignette eskil={false} offset={0.2} darkness={0.8} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
