"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Momentum scrolling for the whole site, tuned to match lamalama.com.
 *
 * Lenis doesn't fake the scroll with a transformed wrapper — it swallows
 * the wheel event and drives the real window scroll toward the target
 * over time, so `window.scrollY`, native scroll events,
 * IntersectionObserver (Reveal), and position:sticky all keep working
 * exactly as they did.
 *
 * The feel is entirely these two numbers, and they are the ones that
 * site uses: a one-second glide on an exponential-out curve, which
 * covers most of the distance in the first few frames and then eases
 * off for a long tail. Lenis's own default is `lerp: 0.1` instead —
 * frame-rate-normalised smoothing that settles noticeably faster and
 * reads as damping rather than as weight.
 *
 * Wheel and touch multipliers stay at 1: one notch still travels the
 * distance the OS asked for, it just takes the scenic route there.
 * Touch is deliberately left alone (`syncTouch` defaults to false) —
 * phones already have inertia in the compositor, and intercepting it
 * trades a native-smooth gesture for a JS-driven approximation.
 */
export default function SmoothScroll() {
  useEffect(() => {
    // Reduced motion gets the browser's instant scroll, untouched.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1,
      // Expo-out. The t === 1 guard is only there because 2^-10 never
      // quite reaches 0, which would otherwise leave the last fraction
      // of a pixel unscrolled.
      easing: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
    });

    // One rAF loop for the site, not two: GSAP's ticker already runs
    // every frame for the scrubbed timelines, and driving Lenis from a
    // second loop would let the two disagree about what frame it is —
    // which shows up as the BioSection slide lagging a frame behind the
    // page it's pinned to. `lagSmoothing(0)` stops GSAP from clamping
    // the delta after a stall, since Lenis needs the real elapsed time
    // to know how far along its glide it should be.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Scroll now advances between native scroll events, so ScrollTrigger
    // has to be told to re-read the position on every Lenis frame.
    const update = () => ScrollTrigger.update();
    lenis.on("scroll", update);

    return () => {
      lenis.off("scroll", update);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33); // GSAP's default
      lenis.destroy();
    };
  }, []);

  return null;
}
