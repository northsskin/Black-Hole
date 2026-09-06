import { useCallback } from 'react';
import Scene from './components/canvas/Scene';
import Loader from './components/ui/Loader';
import HUD from './components/ui/HUD';
import AudioToggle from './components/ui/AudioToggle';
import Fallback from './components/ui/Fallback';
import { useSceneStore } from './store/useSceneStore';
import { useScrollDriver, usePointer, useAudioBoot } from './hooks/useInteraction';

export const SCROLL_LENGTH_VH = 720;
export const SCROLL_LENGTH_REDUCED_VH = 460;

export default function App() {
  const webgl = useSceneStore((s) => s.webgl);
  const reducedMotion = useSceneStore((s) => s.reducedMotion);

  useScrollDriver();
  usePointer();
  useAudioBoot();

  const skipToCredits = useCallback((e) => {
    e.preventDefault();
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
    // give the scrubbed timeline a beat to reveal the section, then focus it
    window.setTimeout(() => {
      const credits = document.getElementById('credits');
      credits?.querySelector('a')?.focus();
    }, 350);
  }, []);

  if (!webgl) return <Fallback />;

  return (
    <>
      <a href="#credits" className="skip-link hud" onClick={skipToCredits}>
        skip to credits
      </a>

      <div className="fixed inset-0 z-0" aria-hidden="true">
        <Scene />
      </div>

      <HUD />
      <AudioToggle />
      <Loader />

      {/* invisible runway: the page's scroll length is the length of the fall */}
      <div
        aria-hidden="true"
        style={{ height: `${reducedMotion ? SCROLL_LENGTH_REDUCED_VH : SCROLL_LENGTH_VH}vh` }}
      />
    </>
  );
}
