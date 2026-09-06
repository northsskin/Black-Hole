import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useSceneStore } from '../../store/useSceneStore';
import { content } from '../../content';

const TAU = Math.PI * 2;
const PARTICLES = 150;

/**
 * Loading screen: a ring of glowing particles fills clockwise with load progress.
 * When everything is ready they spiral inward and vanish into a small black core —
 * the first fall of the piece, before the real one begins.
 */
export default function Loader() {
  const { progress, active } = useProgress();
  const postfxReady = useSceneStore((s) => s.postfxReady);
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setEntered = useSceneStore((s) => s.setEntered);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const pctRef = useRef(null);
  const [gone, setGone] = useState(false);

  const live = useRef({ progress: 0, active: false, postfxReady: false });
  live.current.progress = progress;
  live.current.active = active;
  live.current.postfxReady = postfxReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');

    const parts = Array.from({ length: PARTICLES }, (_, i) => ({
      a: (i / PARTICLES) * TAU - Math.PI / 2,
      jitter: (Math.random() - 0.5) * 5,
      size: 0.8 + Math.random() * 1.4,
      tw: Math.random() * TAU,
      lag: Math.random(),
    }));

    const t0 = performance.now();
    const minDuration = reducedMotion ? 500 : 1800;
    const convergeDuration = reducedMotion ? 320 : 1400;
    let shown = 0;
    let phase = 'load';
    let phaseStart = 0;
    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const easeInCubic = (x) => x * x * x;

    const frame = (now) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const elapsed = now - t0;
      const L = live.current;

      // if nothing ever registers with the loading manager, don't hang forever
      let target = L.progress / 100;
      if (!L.active && elapsed > 2500) target = 1;
      if (elapsed > 12000) target = 1;
      shown += (target - shown) * 0.07;
      if (target >= 1 && shown > 0.992) shown = 1;

      const assetsReady = shown >= 1 && (L.postfxReady || elapsed > 12000);
      if (phase === 'load' && assetsReady && elapsed > minDuration) {
        phase = 'converge';
        phaseStart = now;
      }

      let conv = 0;
      if (phase === 'converge') conv = Math.min((now - phaseStart) / convergeDuration, 1);
      const e = reducedMotion ? conv : easeInCubic(conv);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.16;
      const coreR = R * (0.26 + 0.22 * e);

      ctx.clearRect(0, 0, w, h);

      // the core: a black disc with a faint cold rim
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, TAU);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(127,176,255,${0.16 + 0.55 * e})`;
      ctx.stroke();
      if (e > 0) {
        const glow = ctx.createRadialGradient(cx, cy, coreR * 0.9, cx, cy, coreR * (1.3 + e));
        glow.addColorStop(0, `rgba(127,176,255,${0.35 * e})`);
        glow.addColorStop(1, 'rgba(127,176,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * (1.3 + e), 0, TAU);
        ctx.fill();
      }

      // the ring of particles
      const lit = Math.floor(shown * PARTICLES + 1e-4);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < PARTICLES; i++) {
        const p = parts[i];
        const isLit = i < lit || phase !== 'load';
        // each particle falls on its own slightly delayed schedule
        const pe = reducedMotion ? e : easeInCubic(Math.min(Math.max(conv * 1.25 - p.lag * 0.25, 0), 1));
        const ang = p.a + pe * 2.6;
        const rad = (R + p.jitter) * (1 - pe) + coreR * 0.98 * pe;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        const tw = 0.7 + 0.3 * Math.sin(now * 0.004 + p.tw);

        if (isLit) {
          const s = p.size * (1.7 - pe * 1.1) * tw;
          const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4);
          g.addColorStop(0, 'rgba(225,238,255,0.95)');
          g.addColorStop(0.28, 'rgba(127,176,255,0.55)');
          g.addColorStop(1, 'rgba(127,176,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, s * 4, 0, TAU);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(207,224,255,0.13)';
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      if (pctRef.current) {
        pctRef.current.textContent = String(Math.round(shown * 100)).padStart(3, '0');
      }

      if (phase === 'converge' && conv >= 1) {
        phase = 'done';
        wrap.style.opacity = '0';
        setEntered(true);
        window.setTimeout(() => setGone(true), 900);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // the loop reads live values through a ref; it must only be created once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-50 bg-black transition-opacity duration-700 ease-out"
      role="status"
      aria-label="loading singularity"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      {/* the counter changes every frame; keep it out of the accessibility tree */}
      <div className="hud absolute inset-x-0 bottom-[11vh] flex flex-col items-center gap-2 text-dim" aria-hidden="true">
        <span className="text-ice">{content.title}</span>
        <span>
          <span ref={pctRef} className="text-ice">
            000
          </span>{' '}
          %
        </span>
      </div>
    </div>
  );
}
