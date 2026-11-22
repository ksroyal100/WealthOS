'use client';
import { useEffect } from 'react';

/** Progressive enhancement: content is visible by default; with JS, sections fade up as they enter view. */
export default function RevealObserver() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    document.documentElement.classList.add('rv');
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
    return () => { io.disconnect(); document.documentElement.classList.remove('rv'); };
  }, []);
  return null;
}
