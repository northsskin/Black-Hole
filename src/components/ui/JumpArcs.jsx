import { useEffect, useRef } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import { sim } from '../../utils/sim';

const BOLTS = 12;

/**
 * Electric arcs crawling in from the frame edge while a jump charges. Drawn on a
 * 2D canvas above the post-processing stack so the warp streaks never smear them:
 * these need to stay crisp and white-hot.
 */
export default function JumpArcs() {
  const phase = useSceneStore((s) => s.phase);
  const ref = useRef(null);

  useEffect(() => {
    if (phase !== 'jump') return undefined;
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const bolts = Array.from({ length: BOLTS }, () => ({ pts: [], branch: [], life: 0, alpha: 1 }));

    const spawn = (b, w, h, c) => {
      const side = Math.floor(Math.random() * 4);
      const u = Math.random();
      let ax;
      let ay;
      if (side === 0) {
        ax = u * w;
        ay = 0;
      } else if (side === 1) {
        ax = u * w;
        ay = h;
      } else if (side === 2) {
        ax = 0;
        ay = u * h;
      } else {
        ax = w;
        ay = u * h;
      }
      const reach = (0.1 + Math.random() * 0.38 * c) * Math.min(w, h);
      const cx = w / 2 + (Math.random() - 0.5) * w * 0.5;
      const cy = h / 2 + (Math.random() - 0.5) * h * 0.5;
      const dx = cx - ax;
      const dy = cy - ay;
      const L = Math.hypot(dx, dy) || 1;
      const ex = ax + (dx / L) * reach;
      const ey = ay + (dy / L) * reach;
      const nx = -dy / L;
      const ny = dx / L;
      const n = 14;
      const pts = [];
      let off = 0;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        off += (Math.random() - 0.5) * reach * 0.22;
        off *= 0.78;
        const taper = Math.sin(t * Math.PI);
        pts.push([ax + (ex - ax) * t + nx * off * taper, ay + (ey - ay) * t + ny * off * taper]);
      }
      b.pts = pts;
      // one short branch off the middle
      b.branch = [];
      if (Math.random() < 0.7) {
        const k = 4 + Math.floor(Math.random() * 6);
        const [bx, by] = pts[k];
        const len = reach * (0.2 + Math.random() * 0.3);
        const ang = Math.atan2(ey - ay, ex - ax) + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.7);
        const m = 6;
        let boff = 0;
        for (let i = 0; i < m; i++) {
          const t = i / (m - 1);
          boff += (Math.random() - 0.5) * len * 0.3;
          boff *= 0.75;
          b.branch.push([bx + Math.cos(ang) * len * t - Math.sin(ang) * boff, by + Math.sin(ang) * len * t + Math.cos(ang) * boff]);
        }
      }
      b.life = 2 + Math.floor(Math.random() * 4);
      b.alpha = 0.45 + Math.random() * 0.55;
    };

    const stroke = (pts, width, color, blur) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.shadowBlur = blur;
      ctx.stroke();
    };

    let raf = 0;
    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      const c = sim.charge;
      if (c > 0.01 && sim.flash < 0.6) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(120,170,255,0.95)';
        for (const b of bolts) {
          if (b.life <= 0 && Math.random() < 0.1 + c * 0.5) spawn(b, w, h, c);
          if (b.life <= 0) continue;
          b.life -= 1;
          const a = b.alpha * Math.min(1, c * 1.5);
          stroke(b.pts, 2.2, `rgba(120,170,255,${a * 0.55})`, 18);
          stroke(b.pts, 0.9, `rgba(235,244,255,${a})`, 0);
          if (b.branch.length) {
            stroke(b.branch, 1.4, `rgba(120,170,255,${a * 0.4})`, 12);
            stroke(b.branch, 0.6, `rgba(235,244,255,${a * 0.8})`, 0);
          }
        }
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [phase]);

  if (phase !== 'jump') return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[25]" aria-hidden="true" />;
}
