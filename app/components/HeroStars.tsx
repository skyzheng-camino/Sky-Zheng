"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { STAR_PATH } from "./StarCursor";

/**
 * Hidden stars scattered across the hero section. A click anywhere in
 * the section fades them in with a random stagger, each star twinkles
 * (opacity/scale pulse) on its own rhythm, and 3s after the click they
 * fade back out; the next click replays the show. Star positions are
 * random, so they're created client-side in the effect rather than
 * rendered (avoids a hydration mismatch).
 */
const VISIBLE_SECONDS = 3;
const COUNT = 26;
const COLORS = ["#a5f3fc", "#a5b4fc", "#e0f2fe"];

export default function HeroStars() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const section = wrap.closest("section");
    if (!section) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement("div");
      el.className = "hero-star";
      el.style.left = `${2 + Math.random() * 96}%`;
      el.style.top = `${4 + Math.random() * 92}%`;
      el.style.color = COLORS[(Math.random() * COLORS.length) | 0];
      const size = 8 + Math.random() * 10;
      el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="${STAR_PATH}"/></svg>`;
      frag.appendChild(el);
    }
    wrap.appendChild(frag);
    const stars = Array.from(wrap.children);

    let fadeTimer: gsap.core.Tween | undefined;
    // Every click (re)starts the show and resets the fade-out timer.
    const reveal = () => {
      fadeTimer?.kill();
      gsap.killTweensOf(stars);
      if (reduced) {
        gsap.set(stars, { opacity: 0.9 });
        fadeTimer = gsap.delayedCall(VISIBLE_SECONDS, () =>
          gsap.set(stars, { opacity: 0 }),
        );
        return;
      }
      gsap.fromTo(
        stars,
        { opacity: 0, scale: 0.3, rotation: () => (Math.random() - 0.5) * 60 },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 0.8,
          ease: "power2.out",
          stagger: { each: 0.05, from: "random" },
          onComplete: () => {
            for (const s of stars) {
              gsap.to(s, {
                opacity: 0.35 + Math.random() * 0.3,
                scale: 0.7 + Math.random() * 0.2,
                duration: 0.9 + Math.random() * 1.2,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut",
                delay: Math.random(),
              });
            }
          },
        },
      );
      // Fade back out a beat after the click.
      fadeTimer = gsap.delayedCall(VISIBLE_SECONDS, () => {
        gsap.killTweensOf(stars);
        gsap.to(stars, {
          opacity: 0,
          scale: 0.3,
          duration: 0.8,
          ease: "power2.in",
          stagger: { each: 0.03, from: "random" },
        });
      });
    };

    section.addEventListener("click", reveal);
    return () => {
      section.removeEventListener("click", reveal);
      fadeTimer?.kill();
      gsap.killTweensOf(stars);
      wrap.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
    />
  );
}
