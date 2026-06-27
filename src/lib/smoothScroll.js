import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Initialise buttery smooth scrolling and wire it to GSAP's ticker so that
// ScrollTrigger-driven animations (added in later stages) stay perfectly in sync.
// Returns a cleanup function. No-ops (gracefully) if the user prefers reduced motion.
export function initSmoothScroll() {
  if (typeof window === 'undefined') return () => {};
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return () => {};

  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    // gentle, weighted easing — the "expensive" glide
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  lenis.on('scroll', ScrollTrigger.update);

  const onTick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(onTick);
  gsap.ticker.lagSmoothing(0);

  // expose for nav anchor smooth-scroll (used by App)
  window.__lenis = lenis;

  return () => {
    gsap.ticker.remove(onTick);
    lenis.destroy();
    if (window.__lenis === lenis) delete window.__lenis;
  };
}
