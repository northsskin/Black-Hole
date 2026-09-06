import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { asset } from '../../utils/assets';

/**
 * Equirectangular starfield on the inside of a large sphere. Kept dim on purpose:
 * the black hole is the only bright thing here, and the lensing pass needs some
 * faint structure behind it to bend.
 */
export default function Starfield() {
  const texture = useTexture(asset('textures/starfield.jpg'));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;

  return (
    <mesh scale={[-1, 1, 1]} rotation-y={Math.PI * 0.35} renderOrder={-1}>
      <sphereGeometry args={[420, 64, 32]} />
      {/* dim: the texture is far below screen resolution, so its stars would smear.
          It supplies the Milky Way haze; the crisp stars are the particle field. */}
      <meshBasicMaterial map={texture} side={THREE.BackSide} color="#4c566e" depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
}
