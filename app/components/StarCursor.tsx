"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Custom cursor + mouse trail (GSAP trail pattern): the native cursor
 * is replaced by a pulsing star that eases after the pointer, and
 * movement sprinkles small star sparkles that pop in, drift, and fade
 * out. Desktop pointers only (pointer: fine); skipped entirely for
 * reduced-motion users, who keep the native cursor.
 */
const COLORS = ["#a5f3fc", "#a5b4fc", "#e0f2fe", "#67e8f9"];
// 4-point sparkle in a 24x24 box (shared with HeroStars)
export const STAR_PATH =
  "M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z";
const SPAWN_INTERVAL_MS = 28;

export default function StarCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = wrapRef.current;
    const cursor = cursorRef.current;
    if (!wrap || !cursor) return;

    const root = document.documentElement;
    root.classList.add("star-cursor");

    const ctx = gsap.context(() => {
      gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -100, y: -100 });
      // The pulse scales the inner svg so it doesn't fight the
      // positioning transform on the wrapper.
      gsap.to(cursor.firstElementChild, {
        scale: 1.35,
        duration: 0.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      const xTo = gsap.quickSetter(cursor, "x", "px");
      const yTo = gsap.quickSetter(cursor, "y", "px");

      const spawn = (x: number, y: number) => {
        const el = document.createElement("div");
        el.className = "trail-star";
        el.style.color = COLORS[(Math.random() * COLORS.length) | 0];
        const size = 6 + Math.random() * 10;
        el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="${STAR_PATH}"/></svg>`;
        wrap.appendChild(el);
        gsap.set(el, {
          x: x + (Math.random() - 0.5) * 16,
          y: y + (Math.random() - 0.5) * 16,
          xPercent: -50,
          yPercent: -50,
          scale: 0,
          rotation: Math.random() * 90,
        });
        gsap
          .timeline({ onComplete: () => el.remove() })
          .to(el, { scale: 1, duration: 0.15, ease: "power2.out" })
          .to(
            el,
            {
              scale: 0,
              opacity: 0,
              x: `+=${(Math.random() - 0.5) * 70}`,
              y: `+=${(Math.random() - 0.5) * 70 + 24}`,
              rotation: `+=${(Math.random() - 0.5) * 120}`,
              duration: 0.55 + Math.random() * 0.4,
              ease: "power1.in",
            },
            0.1,
          );
      };

      let lastSpawn = 0;
      const onMove = (e: PointerEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
        cursor.style.opacity = "1";
        const now = performance.now();
        if (now - lastSpawn < SPAWN_INTERVAL_MS) return;
        lastSpawn = now;
        spawn(e.clientX, e.clientY);
      };
      const onLeave = () => {
        cursor.style.opacity = "0";
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
      };
    }, wrap);

    return () => {
      root.classList.remove("star-cursor");
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90]"
    >
      <div ref={cursorRef} className="absolute left-0 top-0 opacity-0">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="#a5f3fc"
          style={{ filter: "drop-shadow(0 0 6px rgba(103,232,249,0.9))" }}
        >
          <path d={STAR_PATH} />
        </svg>
      </div>
    </div>
  );
}
