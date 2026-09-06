import { NOISE_GLSL } from '../utils/noise';

import blackHoleVert from './blackHole.vert.glsl?raw';
import blackHoleFrag from './blackHole.frag.glsl?raw';
import accretionDiskVert from './accretionDisk.vert.glsl?raw';
import accretionDiskFragRaw from './accretionDisk.frag.glsl?raw';
import particlesVert from './particles.vert.glsl?raw';
import particlesFrag from './particles.frag.glsl?raw';
import lensingFrag from './lensing.frag.glsl?raw';
import grainFrag from './grain.frag.glsl?raw';

/** Resolve our own `#include <noise>` marker before three.js sees the source. */
const withNoise = (src) => src.replace('#include <noise>', NOISE_GLSL);

export const shaders = {
  blackHoleVert,
  blackHoleFrag,
  accretionDiskVert,
  accretionDiskFrag: withNoise(accretionDiskFragRaw),
  particlesVert,
  particlesFrag,
  lensingFrag,
  grainFrag,
};
