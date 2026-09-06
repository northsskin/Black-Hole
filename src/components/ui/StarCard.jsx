import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useSceneStore } from '../../store/useSceneStore';
import { getStar, stars } from '../../stars';
import { returnToFall } from '../../directors/jump';
import { sim } from '../../utils/sim';
import { content } from '../../content';
import { Letters, assembleLetters } from './HUD';

/** Readout card for the object we are parked at. */
export default function StarCard() {
  const phase = useSceneStore((s) => s.phase);
  const activeStar = useSceneStore((s) => s.activeStar);
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const ref = useRef(null);
  const star = getStar(activeStar);
  const show = phase === 'star' && !!star;

  useEffect(() => {
    if (!show || !ref.current) return undefined;
    const ctx = gsap.context(() => {
      const el = ref.current;
      gsap.set(el, { autoAlpha: 1 });
      if (reducedMotion) return;
      assembleLetters(el.querySelector('.card-title'), { delay: 0.45, duration: 1.2, spread: 26 });
      gsap.fromTo(el.querySelector('.card-line'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, delay: 0.7, ease: 'expo.out', transformOrigin: 'left' });
      gsap.fromTo(
        el.querySelectorAll('.card-row'),
        { autoAlpha: 0, x: -10 },
        { autoAlpha: 1, x: 0, duration: 0.7, delay: 0.9, stagger: 0.09, ease: 'power2.out' }
      );
      gsap.fromTo(el.querySelector('.card-lore'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1, delay: 1.4, ease: 'power2.out' });
      gsap.fromTo(el.querySelector('.card-actions'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, delay: 1.8 });
      // distance counts up
      const num = el.querySelector('.card-distance');
      const target = star.ly;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.4,
        delay: 0.95,
        ease: 'power3.out',
        onUpdate: () => {
          num.textContent = formatLy(obj.v, target);
        },
      });
    }, ref);
    return () => ctx.revert();
  }, [show, activeStar, reducedMotion, star]);

  if (!show) return null;
  const index = stars.findIndex((s) => s.id === star.id) + 1;

  return (
    <aside
      ref={ref}
      className="pointer-events-none fixed bottom-[12vh] left-6 z-30 max-w-md opacity-0 md:left-[9vw]"
      aria-live="polite"
      aria-label={`${star.name}, ${star.type}, ${star.distance}`}
    >
      <div className="hud text-dim">
        {content.catalog} · {String(index).padStart(2, '0')} / {String(stars.length).padStart(2, '0')}
      </div>
      <h2 className="card-title hud-display mt-2 text-[clamp(1.6rem,3.4vw,2.8rem)] lowercase text-ice" style={{ perspective: '600px' }}>
        <Letters text={star.name} />
      </h2>
      <span className="card-line hud-line my-4 block w-24" />
      <dl className="hud grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        <dt className="card-row text-dim">designation</dt>
        <dd className="card-row text-ice">{star.designation}</dd>
        <dt className="card-row text-dim">type</dt>
        <dd className="card-row text-ice lowercase">{star.type}</dd>
        <dt className="card-row text-dim">class</dt>
        <dd className="card-row text-ice">{star.spectral}</dd>
        <dt className="card-row text-dim">distance</dt>
        <dd className="card-row text-ice tabular-nums">
          <span className="card-distance">{formatLy(star.ly, star.ly)}</span>
        </dd>
      </dl>
      <p className="card-lore hud-display mt-5 text-[clamp(0.95rem,1.4vw,1.15rem)] leading-relaxed lowercase text-ice/85">{star.lore}</p>
      <div className="card-actions pointer-events-auto mt-6 flex items-center gap-8">
        <button type="button" className="hud hud-link text-ice" onClick={returnToFall}>
          {content.returnLabel}
        </button>
        <span className="hud text-dim">esc · scroll</span>
      </div>
    </aside>
  );
}

function formatLy(v, target) {
  if (target >= 1e6) return `${(v / 1e6).toFixed(2)} million light-years`;
  if (target >= 1000) return `${Math.round(v).toLocaleString('en-US')} light-years`;
  if (target >= 100) return `≈ ${Math.round(v)} light-years`;
  return `${v.toFixed(2)} light-years`;
}

/** The "88 mph" moment: a velocity readout that climbs and stutters while charging. */
export function JumpOverlay() {
  const phase = useSceneStore((s) => s.phase);
  const numRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (phase !== 'jump') return undefined;
    let raf = 0;
    const tick = () => {
      const v = sim.velocity;
      if (numRef.current) {
        numRef.current.textContent = String(Math.round(v)).padStart(2, '0');
        // flicker harder as it climbs
        numRef.current.style.opacity = Math.random() < 0.08 + (v / 88) * 0.25 ? '0.35' : '1';
      }
      if (wrapRef.current) {
        wrapRef.current.style.opacity = sim.flash > 0.5 ? '0' : String(Math.min(1, sim.charge * 3));
        const shake = sim.charge * 3;
        wrapRef.current.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase !== 'jump') return null;
  return (
    <div ref={wrapRef} className="pointer-events-none fixed inset-0 z-30 grid place-items-center" aria-hidden="true" style={{ opacity: 0 }}>
      <div className="hud text-center text-ice">
        <div className="text-dim">velocity</div>
        <div ref={numRef} className="hud-display text-[clamp(3rem,9vw,7rem)] leading-none tabular-nums">
          00
        </div>
        <div className="text-dim">mph</div>
      </div>
    </div>
  );
}
