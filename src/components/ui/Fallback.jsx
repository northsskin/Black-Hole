import { useSceneStore } from '../../store/useSceneStore';
import { content } from '../../content';
import { asset } from '../../utils/assets';

/**
 * No WebGL? The visitor still gets the piece: the generated approach shot,
 * looping quietly behind the same words. With reduced motion we hold on the
 * poster frame instead of playing the video.
 */
export default function Fallback() {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);

  return (
    <div className="fixed inset-0 bg-black text-ice">
      {reducedMotion ? (
        <img
          src={asset('media/approach-poster.jpg')}
          alt="A black hole with a glowing blue accretion disk, seen from far away against the Milky Way."
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
      ) : (
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          autoPlay
          muted
          loop
          playsInline
          poster={asset('media/approach-poster.jpg')}
          aria-label="A slow approach toward a black hole in deep space."
        >
          <source src={asset('media/approach.mp4')} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" aria-hidden="true" />

      <header className="hud absolute left-6 top-6 md:left-10 md:top-9">
        <div className="text-ice">{content.title}</div>
        <div className="text-dim">
          {content.index} — {content.tagline}
        </div>
      </header>

      <main className="absolute inset-x-0 bottom-[12vh] flex flex-col items-center gap-8 px-6 text-center">
        <p className="hud-display text-[clamp(1.35rem,3vw,2.5rem)] lowercase">{content.chapters.opening}</p>
        <p className="hud-display max-w-xl text-[clamp(0.95rem,1.4vw,1.15rem)] leading-relaxed text-dim lowercase">
          {content.chapters.about[0]} this browser cannot run the live scene, so here it is as film.
        </p>
        <nav id="credits" className="hud flex gap-8" aria-label="links">
          {content.credits.links.map((l) => (
            <a key={l.href} href={l.href} className="hud-link" target="_blank" rel="noreferrer noopener">
              {l.label}
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
