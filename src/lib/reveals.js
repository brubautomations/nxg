import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Stage 2 — scroll-reveal. Generic: walks every .sec section and reveals its
// eyebrow (fade-rise), heading (mask-rise), and content (staggered fade-rise)
// as it scrolls into view. No markup changes needed in components.
// Returns a cleanup function; safely no-ops under reduced-motion.
export function setupReveals(root) {
  if (typeof window === 'undefined') return () => {};
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return () => {};
  const scope = root || document;

  const ctx = gsap.context(() => {
    // eyebrows
    scope.querySelectorAll('.sec > .eyebrow').forEach((el) => {
      gsap.from(el, { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' } });
    });

    // headings rise out of a mask (wrap inner once)
    scope.querySelectorAll('.sec > h2').forEach((h) => {
      if (!h.querySelector('.rise-inner')) {
        const inner = document.createElement('span');
        inner.className = 'rise-inner';
        inner.style.display = 'block';
        while (h.firstChild) inner.appendChild(h.firstChild);
        h.appendChild(inner);
        h.style.overflow = 'hidden';
      }
      const inner = h.querySelector('.rise-inner');
      gsap.from(inner, { yPercent: 115, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: h, start: 'top 88%' } });
    });

    // content (everything that isn't the eyebrow or heading) staggers in
    scope.querySelectorAll('.sec').forEach((sec) => {
      const kids = [].slice.call(sec.children)
        .filter((c) => !c.classList.contains('eyebrow') && c.tagName !== 'H2');
      if (kids.length) {
        gsap.from(kids, { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', stagger: 0.08,
          scrollTrigger: { trigger: sec, start: 'top 72%' } });
      }
    });
  }, scope);

  ScrollTrigger.refresh();
  return () => { ctx.revert(); };
}
