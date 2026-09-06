import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useSceneStore } from '../../store/useSceneStore';
import { stars } from '../../stars';
import { jumpToStar } from '../../directors/jump';
import { content } from '../../content';
import { drone } from '../../utils/audio';

/**
 * The company we keep, as a list down the right edge: a dot per object, its name
 * on hover or focus. Keyboard users reach every star from here; pointer users can
 * hop between them without hunting for sprites.
 */
export default function Catalog() {
  const entered = useSceneStore((s) => s.entered);
  const phase = useSceneStore((s) => s.phase);
  const activeStar = useSceneStore((s) => s.activeStar);
  const hoverStar = useSceneStore((s) => s.hoverStar);
  const ref = useRef(null);
  const busy = phase === 'jump' || phase === 'intro';

  useEffect(() => {
    if (!entered || !ref.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current.querySelectorAll('li'),
        { autoAlpha: 0, x: 12 },
        { autoAlpha: 1, x: 0, duration: 0.8, delay: 2.2, stagger: 0.07, ease: 'power2.out' }
      );
    }, ref);
    return () => ctx.revert();
  }, [entered]);

  if (!entered) return null;

  return (
    <nav
      ref={ref}
      className="pointer-events-none fixed right-6 top-1/2 z-30 -translate-y-1/2 md:right-10"
      aria-label={`${content.catalog} objects`}
    >
      <ul className="flex flex-col items-end gap-2.5">
        {stars.map((s) => {
          const active = s.id === activeStar;
          const hot = s.id === hoverStar;
          return (
            <li key={s.id} className="group pointer-events-auto opacity-0">
              <button
                type="button"
                disabled={busy}
                aria-pressed={active}
                aria-label={`jump to ${s.name}, ${s.distance}`}
                onClick={() => jumpToStar(s.id)}
                onMouseEnter={() => {
                  useSceneStore.setState({ hoverStar: s.id });
                  drone.ping(1200);
                }}
                onMouseLeave={() => {
                  if (useSceneStore.getState().hoverStar === s.id) useSceneStore.setState({ hoverStar: null });
                }}
                className="hud flex items-center gap-3 py-0.5 text-dim transition-colors duration-300 hover:text-ice focus-visible:text-ice disabled:opacity-40"
              >
                <span
                  className={`max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-500 group-hover:max-w-[14rem] group-hover:opacity-100 group-focus-within:max-w-[14rem] group-focus-within:opacity-100 ${
                    active || hot ? '!max-w-[14rem] !opacity-100' : ''
                  }`}
                >
                  {s.name}
                </span>
                <span
                  className="block h-[5px] w-[5px] rotate-45 border border-current transition-all duration-300"
                  style={{
                    background: active ? 'currentColor' : hot ? 'rgba(207,224,255,0.5)' : 'transparent',
                    boxShadow: active || hot ? '0 0 10px rgba(127,176,255,0.7)' : 'none',
                    transform: active ? 'rotate(45deg) scale(1.4)' : 'rotate(45deg)',
                  }}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
