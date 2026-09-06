import { forwardRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Effect, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { shaders } from '../../shaders';

const GRAIN_TILE = 512;

class FilmGrainEffectImpl extends Effect {
  constructor(texture, amount) {
    super('FilmGrainEffect', shaders.grainFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uGrain', new THREE.Uniform(texture)],
        ['uAmount', new THREE.Uniform(amount)],
        ['uOffset', new THREE.Uniform(new THREE.Vector2())],
        ['uScale', new THREE.Uniform(new THREE.Vector2(1, 1))],
      ]),
    });
  }
}

const FilmGrain = forwardRef(function FilmGrain({ amount = 0.07 }, ref) {
  const texture = useTexture('/textures/grain.jpg');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const effect = useMemo(() => new FilmGrainEffectImpl(texture, amount), [texture, amount]);
  const { size, gl } = useThree();

  useFrame(() => {
    const u = effect.uniforms;
    const pr = gl.getPixelRatio();
    u.get('uScale').value.set((size.width * pr) / GRAIN_TILE, (size.height * pr) / GRAIN_TILE);
    u.get('uOffset').value.set(Math.random(), Math.random());
  });

  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default FilmGrain;
