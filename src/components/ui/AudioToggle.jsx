import { useSceneStore } from '../../store/useSceneStore';
import { drone } from '../../utils/audio';

/** Bottom-right sound toggle. Three thin bars breathe while the drone plays. */
export default function AudioToggle() {
  const muted = useSceneStore((s) => s.muted);
  const setMuted = useSceneStore((s) => s.setMuted);
  const entered = useSceneStore((s) => s.entered);
  const reducedMotion = useSceneStore((s) => s.reducedMotion);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    if (!next) {
      // unmuting is itself the user gesture the autoplay policy wants
      if (!drone.started) drone.start();
      else drone.resume();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? 'turn sound on' : 'turn sound off'}
      className={`hud fixed bottom-6 right-6 z-30 flex items-center gap-3 text-dim transition-opacity duration-1000 hover:text-ice md:bottom-9 md:right-10 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="flex h-3 items-end gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-px bg-current"
            style={{
              height: muted ? '4px' : '12px',
              transformOrigin: 'bottom',
              animation: muted || reducedMotion ? 'none' : `bar 1.${4 + i * 3}s ease-in-out ${i * 0.2}s infinite alternate`,
              opacity: muted ? 0.5 : 1,
              transition: 'height 300ms ease, opacity 300ms ease',
            }}
          />
        ))}
      </span>
      <span>sound {muted ? 'off' : 'on'}</span>
      <style>{`@keyframes bar { from { transform: scaleY(0.25); } to { transform: scaleY(1); } }`}</style>
    </button>
  );
}
