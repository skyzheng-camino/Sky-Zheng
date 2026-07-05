"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Full-bleed hero backdrop: the planet artwork tilts in 3D toward the
 * pointer (GreenSock quickTo tilt pattern — rotationX/rotationY eased
 * toward values proportional to the cursor's offset from the viewport
 * center). The artwork (a centered planet on dark space) fills the
 * hero (object-cover) and is zoomed past the viewport so the tilt can
 * never pull an image edge into view. The two tilt axes compound: the
 * horizontal half-width feeds depth into the vertical pull-in too, so
 * the worst-case corner shrink is roughly
 * 1 - p / (p + (w/2 + h/2) * sin(MAX_TILT)); the perspective scales
 * with viewport width to bound it, and ZOOM overscans past it with
 * margin. Skipped for reduced-motion users.
 */
const MAX_TILT = 12; // degrees at the viewport edges
const ZOOM = 1.4; // overscan; keep above the worst-case tilt shrink

export default function HeroBackdrop() {
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.set(el, {
        transformPerspective: Math.max(1000, window.innerWidth * 0.9),
        scale: ZOOM,
      });
      const rotX = gsap.quickTo(el, "rotationX", {
        duration: 0.7,
        ease: "power3.out",
      });
      const rotY = gsap.quickTo(el, "rotationY", {
        duration: 0.7,
        ease: "power3.out",
      });

      const onMove = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5; // -0.5 .. 0.5
        const ny = e.clientY / window.innerHeight - 0.5;
        rotY(nx * 2 * MAX_TILT);
        rotX(-ny * 2 * MAX_TILT);
      };
      const onLeave = () => {
        rotX(0);
        rotY(0);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      };
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    // Sized to the hero exactly (no bleed — that would enlarge the
    // cover image); the bottom gradient fades the artwork into the
    // page background so its black merges seamlessly into the panda
    // section instead of ending on a hard line.
    <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
      <div ref={tiltRef} className="absolute inset-0 will-change-transform">
        {/* When swapping artwork, save it under a NEW filename — the
            optimizer and browser cache by URL (4h), and Next rejects
            query-string versioning on local images. */}
        <Image
          src="/hero-planet-2.png"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
      </div>
      {/* Fade the tail end into the page background */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
