import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSceneStore } from '../../store/useSceneStore';
import { content } from '../../content';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll chapters as fractions of the total page, chosen by looking at where the
 * (pacing-remapped) camera actually is:
 *   0.00  far, above the plane (r ≈ 26)         -> opening line
 *   0.28  dropping below the disk (r ≈ 16 → 7)  -> about
 *   0.64  back up through the plane (r ≈ 6 → 4) -> photon sphere
 *   0.84  the shadow swallows the frame (r < 3) -> closing + credits
 */
const CHAPTERS = {
  opening: { out: 0.14 },
  about: { in: 0.28, out: 0.5 },
  photon: { in: 0.64, out: 0.78 },
  closing: { in: 0.84 },
};

/** Split a line into letter spans so it can assemble itself. */
export function Letters({ text, className }) {
  return (
    <span className={className} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className="letter inline-block" aria-hidden="true" style={{ whiteSpace: ch === ' ' ? 'pre' : undefined }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/** Letters fly in from scattered offsets and settle — used for every title. */
export function assembleLetters(scope, { delay = 0, duration = 1.1, spread = 30 } = {}) {
  const letters = scope ? scope.querySelectorAll('.letter') : [];
  if (!letters.length) return null;
  return gsap.fromTo(
    letters,
    {
      opacity: 0,
      y: () => gsap.utils.random(-spread, spread),
      x: () => gsap.utils.random(-spread * 0.6, spread * 0.6),
      rotateX: () => gsap.utils.random(-70, 70),
      filter: 'blur(6px)',
    },
    {
      opacity: 1,
      y: 0,
      x: 0,
      rotateX: 0,
      filter: 'blur(0px)',
      duration,
      delay,
      ease: 'expo.out',
      stagger: { each: 0.035, from: 'random' },
    }
  );
}

export default function HUD() {
  const root = useRef(null);
  const main = useRef(null);
  const opening = useRef(null);
  const about = useRef(null);
  const photon = useRef(null);
  const closing = useRef(null);
  const distanceEl = useRef(null);
  const descentEl = useRef(null);
  const cornersRef = useRef([]);
  const entered = useSceneStore((s) => s.entered);
  const phase = useSceneStore((s) => s.phase);
  const reducedMotion = useSceneStore((s) => s.reducedMotion);

  // scrubbed chapter timeline, normalised to 0..1 across the page
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { start: 0, end: 'max', scrub: reducedMotion ? true : 0.7 },
      });
      tl.to({}, { duration: 1 }, 0);

      const lift = reducedMotion ? 0 : 22;
      const fade = 0.035;

      const reveal = (el, from, to) => {
        gsap.set(el, { autoAlpha: 0, y: lift });
        tl.to(el, { autoAlpha: 1, y: 0, duration: fade }, from);
        if (to != null) tl.to(el, { autoAlpha: 0, y: -lift * 0.6, duration: fade }, to - fade);
      };

      // opening is visible from the start; only its exit is scrubbed. Explicit
      // start values so a very fast first scroll can't record a half-faded state.
      gsap.set(opening.current, { autoAlpha: 0, y: lift });
      tl.fromTo(
        opening.current,
        { autoAlpha: 1, y: 0 },
        { autoAlpha: 0, y: -lift * 0.6, duration: fade, immediateRender: false },
        CHAPTERS.opening.out - fade
      );

      reveal(about.current, CHAPTERS.about.in, CHAPTERS.about.out);
      reveal(photon.current, CHAPTERS.photon.in, CHAPTERS.photon.out);
      reveal(closing.current, CHAPTERS.closing.in, null);
    }, root);
    return () => ctx.revert();
  }, [reducedMotion]);

  // entrance once the intro hands over: the title assembles itself
  useEffect(() => {
    if (!entered) return;
    const ctx = gsap.context(() => {
      gsap.set(opening.current, { autoAlpha: 1, y: 0 });
      assembleLetters(opening.current, { delay: 0.1, duration: reducedMotion ? 0.01 : 1.3 });
      const after = opening.current.querySelectorAll('.after-title');
      if (after.length) {
        gsap.fromTo(after, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1.2, delay: 1.1, ease: 'power2.out' });
      }
      gsap.fromTo(
        cornersRef.current,
        { autoAlpha: 0, y: -6 },
        { autoAlpha: 1, y: 0, duration: 1.2, delay: 0.6, stagger: 0.15, ease: 'power2.out' }
      );
      cornersRef.current.forEach((el, i) => el && assembleLetters(el, { delay: 0.6 + i * 0.15, duration: 0.9, spread: 10 }));
    }, root);
    return () => ctx.revert();
  }, [entered, reducedMotion]);

  // during a jump / while parked at a star the fall's HUD steps aside
  useEffect(() => {
    if (!entered) return;
    const away = phase === 'jump' || phase === 'star';
    gsap.to([main.current, ...cornersRef.current.filter(Boolean)], {
      autoAlpha: away ? 0 : 1,
      duration: away ? 0.25 : 0.8,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [phase, entered]);

  // live readouts — written straight into the DOM, no React re-render
  useEffect(() => {
    const unsub = useSceneStore.subscribe((s, prev) => {
      if (distanceEl.current && s.distance !== prev.distance) {
        distanceEl.current.textContent = s.distance.toFixed(2).padStart(6, '0');
      }
      if (descentEl.current && s.scrollProgress !== prev.scrollProgress) {
        descentEl.current.textContent = String(Math.round(s.scrollProgress * 100)).padStart(3, '0');
      }
    });
    return unsub;
  }, []);

  const revealCredits = () => {
    if (useSceneStore.getState().scrollProgress < CHAPTERS.closing.in) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
    }
  };

  const corner = (i) => (el) => {
    cornersRef.current[i] = el;
  };

  return (
    <div ref={root} className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* corners */}
      <header ref={corner(0)} className="hud absolute left-6 top-6 opacity-0 md:left-10 md:top-9">
        <div className="text-ice">
          <Letters text={content.title} />
        </div>
        <div className="text-dim">
          {content.index} — {content.tagline}
        </div>
      </header>

      <div ref={corner(1)} className="hud absolute right-6 top-6 text-right opacity-0 md:right-10 md:top-9" aria-hidden="true">
        <div>
          <span className="text-dim">r </span>
          <span ref={distanceEl} className="text-ice tabular-nums">
            026.00
          </span>
          <span className="text-dim"> rs</span>
        </div>
        <div>
          <span className="text-dim">descent </span>
          <span ref={descentEl} className="text-ice tabular-nums">
            000
          </span>
          <span className="text-dim"> %</span>
        </div>
      </div>

      <div ref={corner(2)} className="hud absolute bottom-6 left-6 opacity-0 md:bottom-9 md:left-10" aria-hidden="true">
        <div className="text-dim">
          horizon <span className="text-ice">1.00 rs</span>
        </div>
        <div className="text-dim">
          photon sphere <span className="text-ice">1.50 rs</span>
        </div>
      </div>

      <main ref={main}>
        {/* 01 — opening */}
        <section
          ref={opening}
          className="chapter absolute inset-x-0 bottom-[16vh] flex flex-col items-center gap-8 px-6 text-center"
          aria-label="opening"
        >
          <p className="hud-display text-ice text-[clamp(1.35rem,3vw,2.5rem)] lowercase" style={{ perspective: '600px' }}>
            <Letters text={content.chapters.opening} />
          </p>
          <div className="after-title flex flex-col items-center gap-3">
            <span className="hud text-dim">scroll</span>
            <span className="scroll-cue" />
          </div>
        </section>

        {/* 02 — about */}
        <section
          ref={about}
          className="chapter absolute bottom-[14vh] left-6 max-w-md md:left-[9vw]"
          aria-label="about this piece"
        >
          <span className="hud text-dim">02 — about this piece</span>
          <span className="hud-line my-4 w-16" />
          {content.chapters.about.map((line) => (
            <p key={line} className="hud-display text-ice text-[clamp(1rem,1.5vw,1.25rem)] leading-relaxed lowercase">
              {line}
            </p>
          ))}
        </section>

        {/* 03 — photon sphere */}
        <section
          ref={photon}
          className="chapter absolute bottom-[20vh] right-6 max-w-sm text-right md:right-[9vw]"
          aria-label="photon sphere"
        >
          <span className="hud text-dim">03 — 1.50 rs</span>
          <span className="hud-line my-4 ml-auto w-16" />
          <p className="hud-display text-ice text-[clamp(1rem,1.5vw,1.25rem)] leading-relaxed lowercase">
            {content.chapters.photon}
          </p>
        </section>

        {/* 04 — closing + credits */}
        <section
          ref={closing}
          id="credits"
          className="chapter absolute inset-0 grid place-items-center px-6"
          aria-label="credits and contact"
        >
          <div className="flex flex-col items-center gap-10 text-center">
            <div>
              {content.chapters.closing.map((line) => (
                <p key={line} className="hud-display text-ice text-[clamp(1.35rem,3vw,2.5rem)] lowercase">
                  {line}
                </p>
              ))}
            </div>
            <span className="hud-line w-24" />
            <div className="hud pointer-events-auto flex flex-col items-center gap-3">
              <div className="text-dim">
                {content.title} — {content.credits.year}
              </div>
              <div className="text-dim">{content.credits.madeWith}</div>
              <div className="text-dim">by {content.credits.author}</div>
              <nav className="mt-2 flex gap-8" aria-label="links">
                {content.credits.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="hud-link"
                    target="_blank"
                    rel="noreferrer noopener"
                    onFocus={revealCredits}
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
