/**
 * Resolve a file in /public against Vite's base URL, so the site works both at a
 * domain root and under a sub-path such as GitHub project pages (/Black-Hole/).
 *
 *   asset('textures/starfield.jpg') -> '/textures/starfield.jpg'            (base '/')
 *   asset('textures/starfield.jpg') -> '/Black-Hole/textures/starfield.jpg' (base '/Black-Hole/')
 */
const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function asset(path) {
  return `${base}/${String(path).replace(/^\/+/, '')}`;
}
