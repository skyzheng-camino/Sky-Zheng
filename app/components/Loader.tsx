"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Full-screen intro loader: a vibrant light-blue screen with "S Z"
 * knocked out as transparent cutouts (SVG mask), so the page shows
 * through the letters. The letters bounce in with a stagger, then the
 * whole screen zooms through the "S" cutout to reveal the homepage.
 * Page entrance animations are held paused via the `is-loading` class
 * on <html> (added by an inline script in layout.tsx before first
 * paint) and released just as the zoom starts. The navbar is held by
 * the separate `is-nav-loading` class and released a beat after the
 * overlay has fully faded out, so it slides in after the intro.
 */
export default function Loader() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("is-loading")) {
      root.classList.remove("is-nav-loading");
      setDone(true);
      return;
    }
    // Keep the overlay visible after `is-loading` is released mid-zoom
    // (a CSS rule hides the overlay whenever the class is absent, which
    // otherwise guards against a pre-hydration flash for skipped intros).
    ref.current?.classList.add("loader-active");

    const release = () => {
      root.classList.remove("is-loading");
    };
    const releaseNav = () => {
      root.classList.remove("is-nav-loading");
    };
    // Safety net: never trap the page if the timeline fails.
    const failsafe = window.setTimeout(() => {
      release();
      releaseNav();
      setDone(true);
    }, 6000);

    let ctx: gsap.Context | undefined;
    let cancelled = false;
    let navTimer: number | undefined;

    // Wait for the webfont: <text> inside a mask rasterized with the
    // fallback font doesn't reliably repaint when Geist arrives, which
    // leaves mismatched letter sizes. The marks are opacity-0 until the
    // timeline starts, so nothing is visible during the wait.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          onComplete: () => {
            window.clearTimeout(failsafe);
            setDone(true);
            // Beat after the overlay is gone, then start the navbar.
            releaseNav();
          },
        });

        tl.fromTo(
          ".loader-mark",
          { y: -320, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "bounce.out",
            stagger: 0.15,
          },
        )
          // Release the page animations right as the zoom begins so they
          // play while the blue screen flies past.
          .call(release, undefined, "+=0.35")
          // Zoom through the dot cutout between the letters; the origin
          // matches the circle's cx/cy. (getBBox can't be used here —
          // it returns zeros for mask content.)
          .to(ref.current, {
            scale: 130,
            transformOrigin: "48% 53%",
            duration: 1.1,
            ease: "power3.in",
          })
          .to(ref.current, { opacity: 0, duration: 0.2 }, "-=0.12");
      }, ref);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      window.clearTimeout(navTimer);
      ctx?.revert();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="loader-overlay fixed inset-0 z-[100] will-change-transform"
    >
      <svg className="h-full w-full">
        <defs>
          <mask id="loader-sz-mask">
            <rect width="100%" height="100%" fill="#fff" />
            <text
              className="loader-mark"
              x="42%"
              y="50%"
              fill="#000000"
              textAnchor="middle"
              dominantBaseline="central"
            >
              S
            </text>
            <circle
              className="loader-mark"
              cx="48%"
              cy="53%"
              r="1.5%"
              fill="#000/"
            />
            <text
              className="loader-mark"
              x="54%"
              y="50%"
              fill="#000000"
              textAnchor="middle"
              dominantBaseline="central"
            >
              Z
            </text>
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="var(--accent-2)"
          mask="url(#loader-sz-mask)"
        />
      </svg>
    </div>
  );
}
