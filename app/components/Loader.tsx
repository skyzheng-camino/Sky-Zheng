"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Full-screen intro loader on a black screen. The "S · Z" monogram
 * writes itself in as a light-blue gradient: hand-traced centerline
 * strokes of each glyph are drawn via stroke-dashoffset (S, then a
 * dabbed dot, then Z) and stay as those brush strokes. When the zoom
 * begins, the light-blue marks crossfade into transparent cutouts (so
 * the page shows through them) while the whole screen zooms through the
 * dot cutout to reveal the homepage.
 *
 * Two stacked layers make the color→transparent transition work:
 *  - a black <rect> whose letter/dot HOLES (in `loader-hole-mask`)
 *    start hidden and fade in at zoom time — that's the transparent
 *    state;
 *  - a light-blue gradient <rect> masked to the SAME mark shapes (in
 *    `loader-blue-mask`, the write-on layer) sitting on top, which fades
 *    out at zoom time.
 *
 * Page entrance animations are held paused via the `is-loading` class
 * on <html> (added by an inline script in layout.tsx before first
 * paint) and released just as the zoom starts. The navbar is held by
 * the separate `is-nav-loading` class and released a beat after the
 * overlay has fully faded out, so it slides in after the intro.
 */

/**
 * Glyph write-on traces, hand-authored against Qwitcher Grypen 700 in
 * a 1000x1000 em box whose center (500,500) matches the <text> anchor
 * (textAnchor=middle + dominantBaseline=central). Scaled/translated at
 * runtime to each glyph's rendered position and font size.
 */
const TRACE_S =
  "M 722 435 C 748 402, 760 370, 750 347 C 730 310, 637 285, 570 291 C 498 299, 417 348, 392 414 C 376 458, 408 508, 462 545 C 518 583, 585 612, 618 650 C 646 688, 630 726, 578 757 C 500 790, 405 800, 348 784 C 312 770, 308 747, 326 722 C 350 691, 430 665, 505 662 C 572 660, 638 674, 668 700 C 685 715, 688 732, 680 746";
const TRACE_Z =
  "M 342 390 C 380 368, 470 345, 560 333 C 640 324, 720 326, 762 340 C 782 348, 790 355, 782 368 C 745 415, 612 496, 490 570 C 408 624, 335 682, 285 708 C 260 722, 256 737, 276 741 C 338 745, 480 719, 590 704 C 658 696, 714 699, 740 716 C 758 730, 748 768, 716 794";
// Wide enough to cover the glyph's stroke thickness while writing.
const TRACE_WIDTH = 64;

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

    // Wait for the webfont: mark shapes rasterized with the fallback
    // font don't reliably repaint when the font arrives, which leaves
    // mismatched sizes. Everything starts invisible (opacity 0 / r=0),
    // so nothing shows during the wait.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const wrap = ref.current;
      if (!wrap) return;
      ctx = gsap.context(() => {
        // Position the em-box traces over their rendered glyphs. The
        // hidden measuring texts are anchored center/central, so the
        // trace box center (500,500) maps to the anchor point. (getBBox
        // is useless on mask content — it returns zeros — but computed
        // font-size and the % anchors are enough.)
        const sampleText = wrap.querySelector("text.loader-mark");
        const fontPx = sampleText
          ? parseFloat(getComputedStyle(sampleText).fontSize)
          : 208;
        const s = fontPx / 1000;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const place = (el: Element | null, anchorX: number) => {
          el?.setAttribute(
            "transform",
            `translate(${anchorX * vw - 500 * s} ${0.5 * vh - 500 * s}) scale(${s})`,
          );
        };
        // Blue write-on strokes (visible layer).
        const traceS = wrap.querySelector(".loader-trace-s") as SVGPathElement;
        const traceZ = wrap.querySelector(".loader-trace-z") as SVGPathElement;
        // Matching hole strokes (transparent layer), always full-drawn.
        place(traceS, 0.44);
        place(traceZ, 0.56);
        place(wrap.querySelector(".loader-hole-s"), 0.44);
        place(wrap.querySelector(".loader-hole-z"), 0.56);

        for (const trace of [traceS, traceZ]) {
          const len = trace.getTotalLength();
          gsap.set(trace, {
            strokeDasharray: len,
            strokeDashoffset: len,
          });
        }
        gsap.set(".loader-traces", { opacity: 1 });
        // Hide the Z until it starts writing: a fully-offset stroke with
        // round caps still shows a "dot" at its start point, which would
        // otherwise sit visible next to the S the whole time.
        gsap.set(traceZ, { opacity: 0 });

        const tl = gsap.timeline({
          onComplete: () => {
            window.clearTimeout(failsafe);
            setDone(true);
            // Beat after the overlay is gone, then start the navbar.
            releaseNav();
          },
        });

        // Write S, dab the dot, write Z; the light-blue brush strokes
        // then hold as the final letterforms.
        tl.to(traceS, {
          strokeDashoffset: 0,
          duration: 0.75,
          ease: "power1.inOut",
        })
          .to(
            ".loader-dot",
            { attr: { r: "0.75%" }, duration: 0.3, ease: "back.out(2.5)" },
            ">-0.05",
          )
          // Reveal the Z exactly as it begins to write (its start cap
          // becomes the pen-down dot, then draws from there).
          .set(traceZ, { opacity: 1 }, ">-0.1")
          .to(
            traceZ,
            { strokeDashoffset: 0, duration: 0.75, ease: "power1.inOut" },
            "<",
          )
          // Release the page animations right as the zoom begins so they
          // play while the black screen flies past.
          .call(release, undefined, "+=0.6")
          // As the zoom starts, crossfade the light-blue marks into
          // transparent letter-holes (blue fades out, holes fade in).
          .to(".loader-blue-layer", { opacity: 0, duration: 0.45 }, "<")
          .to(".loader-holes", { opacity: 1, duration: 0.45 }, "<")
          // Zoom through the dot cutout; the origin matches its cx/cy.
          .to(
            ref.current,
            {
              scale: 130,
              transformOrigin: "50% 50%",
              duration: 1.1,
              ease: "power3.in",
            },
            "<",
          )
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
          {/* Light-blue gradient the letters/dot are painted in. */}
          <linearGradient id="loader-blue-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4f5ff" />
            <stop offset="50%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#6aa8f0" />
          </linearGradient>

          {/* Black rect's mask: solid until the letter/dot HOLES fade in
              at zoom time, turning the marks transparent. */}
          <mask id="loader-hole-mask">
            <rect width="100%" height="100%" fill="#fff" />
            <g className="loader-holes" opacity="0">
              <circle cx="50%" cy="50%" r="0.75%" fill="#000" />
              <g
                fill="none"
                stroke="#000"
                strokeWidth={TRACE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path className="loader-hole-s" d={TRACE_S} />
                <path className="loader-hole-z" d={TRACE_Z} />
              </g>
            </g>
          </mask>

          {/* Blue rect's mask: white = show the gradient. The write-on
              strokes and dot are the visible light-blue marks. */}
          <mask id="loader-blue-mask">
            {/* Kept invisible: not displayed, but the effect reads its
                rendered font-size to scale the write-on traces. */}
            <g className="loader-glyphs" opacity="0">
              <text
                className="loader-mark"
                x="44%"
                y="50%"
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="central"
              >
                S
              </text>
              <text
                className="loader-mark"
                x="56%"
                y="50%"
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="central"
              >
                Z
              </text>
            </g>
            <circle className="loader-dot" cx="50%" cy="50%" r="0" fill="#fff" />
            {/* Write-on strokes; opacity 0 until the effect sets their
                dash state (else they'd flash fully drawn). */}
            <g
              className="loader-traces"
              opacity="0"
              fill="none"
              stroke="#fff"
              strokeWidth={TRACE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="loader-trace-s" d={TRACE_S} />
              <path className="loader-trace-z" d={TRACE_Z} />
            </g>
          </mask>
        </defs>

        {/* Bottom: black screen, gains transparent letter-holes at zoom. */}
        <rect
          width="100%"
          height="100%"
          fill="#000"
          mask="url(#loader-hole-mask)"
        />
        {/* Top: light-blue gradient marks, fade out at zoom. */}
        <rect
          className="loader-blue-layer"
          width="100%"
          height="100%"
          fill="url(#loader-blue-grad)"
          mask="url(#loader-blue-mask)"
        />
      </svg>
    </div>
  );
}
