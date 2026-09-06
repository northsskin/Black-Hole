# Singularity

An experimental, single-scene 3D website built around a living black hole. No product,
no copy to sell — one continuous fall from deep space to the event horizon, driven by
scroll, disturbed by the pointer.

![Singularity — the accretion disk folded over the shadow by gravitational lensing](public/media/og.jpg)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview    # serve the production build
```

Deploys to Vercel or Netlify with zero configuration: both detect Vite and run `npm run build`.

### GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the site and publishes `dist/` on
every push. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Do not use "Deploy from a branch": that serves the raw source tree, and `index.html` points at
`/src/main.jsx`, so the page stays blank. Project pages live under `/<repo>/`, which is why the
workflow sets `VITE_BASE=/<repo>/` before building; all asset URLs go through
`import.meta.env.BASE_URL` (see `src/utils/assets.js`). To build for a sub-path locally:

```bash
VITE_BASE=/Black-Hole/ npm run build && npm run preview   # http://localhost:4173/Black-Hole/
```

## What's in the scene

| Piece | Where | Notes |
| --- | --- | --- |
| Event horizon | `src/components/canvas/BlackHole.jsx`, `src/shaders/blackHole.*.glsl` | Pure black sphere with a thin Fresnel rim. |
| Accretion disk | same, `src/shaders/accretionDisk.frag.glsl` | Flat HDR ring, additive. Keplerian differential rotation shears seamless polar noise into filaments; relativistic beaming brightens the approaching side. Spins up briefly on fast scrolls. |
| Gravitational lensing | `src/components/canvas/LensingEffect.jsx`, `src/shaders/lensing.frag.glsl` | Custom `postprocessing` effect. A softened point-mass lens equation warps the whole frame around the projected singularity, so the far side of the disk folds over and under the shadow and the shadow comes out ~1.6× the geometric sphere. Per-channel dispersion grows toward the edge; a small twist fakes frame dragging; a photon ring sits on the solved shadow edge. |
| Particle field | `src/components/canvas/ParticleField.jsx`, `src/shaders/particles.*.glsl` | One `Points` draw call. Half are distant stars on a shell, half are matter that orbits, spirals in faster as it nears the horizon, and respawns. Positions are computed on the GPU from a per-particle seed. The pointer is a soft push-and-swirl field. |
| Camera | `src/components/canvas/CameraRig.jsx`, `src/utils/curve.js` | Scroll progress → eased position on a Catmull-Rom spline, remapped so the close approach gets most of the scroll. Pointer parallax and a slow drift on top. |
| Post stack | `src/components/canvas/PostFX.jsx` | lensing → bloom → film grain (from the scanned grain texture) → vignette → ACES. Lazy-loaded as its own chunk. |
| HUD | `src/components/ui/HUD.jsx`, `src/content.js` | GSAP ScrollTrigger timeline scrubbed across the page. Live readouts (distance in horizon radii, descent %) are written straight to the DOM. All copy lives in `content.js`. |
| Loader | `src/components/ui/Loader.jsx` | A ring of particles fills with load progress, then spirals into a black core before handing over. |
| Audio | `src/utils/audio.js` | Synthesised drone (no file), starts on the first gesture, mute toggle bottom-right, remembered in `localStorage`. |

## Performance & accessibility

- Device tier from `hardwareConcurrency` / `deviceMemory` / touch sets particle count (3.5k–16k) and DPR cap (`src/utils/deviceTier.js`).
- `prefers-reduced-motion`: fixed camera vantage, no drift, static particles, half the particle budget, no scroll lift on text.
- No WebGL: the generated approach shot plays as a video behind the same words (poster only under reduced motion).
- Keyboard: a "skip to credits" link is first in the tab order; focusing any credits link scrolls the credits into view. The 3D canvas is `aria-hidden`.

## Assets

`public/textures/` — equirectangular starfield, scanned grain tile, soft particle sprite, HUD grid.
`public/media/` — `approach.mp4` (8 s dolly toward the black hole, 720p), its poster, and the OG image.

## Debugging

The zustand store is exposed as `window.__scene`; `window.__scene.getState()` shows scroll progress, camera distance, tier and flags.
