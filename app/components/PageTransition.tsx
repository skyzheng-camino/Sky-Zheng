"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { STAR_PATH } from "./StarCursor";

/**
 * Star wipe between routes. Clicks on in-app links are intercepted so
 * the cover can play *before* the navigation commits, and the reveal on
 * the far side is the same motion run backwards:
 *
 *   leaving  — a deep-space veil closes over the page while a north
 *              star spins up out of the centre and small star sparkles
 *              sweep outward past the viewer;
 *   arriving — the mark spins back down the way it came, the sparkles
 *              are drawn in, and the veil lifts off the new page.
 *
 * The mark is a north star: the same family as the four-point sparkle
 * the cursor and hero field are drawn with (see STAR_PATH), stretched
 * along its vertical axis and given diagonal spill rays so it reads as
 * the fixed point everything else turns around. The intro loader owns
 * the S·Z monogram; using it again here would make the two full-screen
 * moments read as the same event.
 *
 * The route is pushed only once the screen is fully covered, so the
 * swap (and the scroll-to-top that comes with it) is never visible.
 * Page entrance animations are held by `is-navigating` on <html> while
 * covered and released as the reveal starts, so the new page animates
 * in behind the shrinking mark rather than burning off underneath it.
 */

const STAR_COUNT = 34;
// Recoloured per transition to match whichever hero is on screen, the
// same way HeroStars does.
const COLORS = ["#a5f3fc", "#a5b4fc", "#e0f2fe"];
const COLORS_PINK = ["#fbcfe8", "#f9a8d4", "#ffe4f3"];

// The cover is quicker than the reveal on purpose: the page being left
// should get out of the way, the page arriving should have room to land.
const COVER = 0.62;
const REVEAL = 0.8;
// The mark's arm span at rest, as a fraction of the viewport diagonal.
// The veil is what hides the page, so the mark never has to fill the
// frame — it's an emblem sitting in space, and it reads as one only
// while it's small enough to take in whole.
const COVER_SPAN = 0.18;
// Three-quarter turn, wound up on the way in and unwound on the way out.
// Not a whole turn: the star is four-fold symmetric, so only the
// gradient running through it makes rotation legible at all, and 270
// leaves that gradient upright at rest.
const SPIN = 270;
// Never strand the visitor behind the cover if a route never commits.
const STALL_MS = 2500;

/* ---- The mark ----
   A north star drawn in a 0..100 box. The rays are needles, and getting
   them that thin is entirely about where the control points sit: each
   side is a cubic with BOTH controls parked on the centre, which drags
   the curve in to a waist about 15% of the ray length. Quadratics can't
   do this — one control can only counter half the pull of the two tips,
   so the waist bottoms out near 30% and the star reads as a diamond
   however the control is placed.

   Two sets: four long rays (vertical full height, horizontal pulled in
   to 8..92) and, under them, four short symmetric ones turned 45
   degrees for the diagonal spill. The diagonals have to clear the main
   star's waist to be seen at all — at 0.5 scale their tips reach radius
   25, well past it, and they're drawn nearly opaque so they read as
   rays rather than as haze. */
const NORTH_STAR =
  "M50 0C50 50 50 50 8 50C50 50 50 50 50 100C50 50 50 50 92 50C50 50 50 50 50 0Z";
const DIAGONAL_STAR =
  "M50 0C50 50 50 50 0 50C50 50 50 50 50 100C50 50 50 50 100 50C50 50 50 50 50 0Z";
// Rotate about the centre, then scale about it: for scale s the
// translate is 50 * (1 - s).
const DIAGONAL_RAYS = "rotate(45 50 50) translate(25 25) scale(0.5)";

type Star = {
  el: HTMLDivElement;
  /** Offset from the star's resting spot, pointing at the centre. */
  dx: number;
  dy: number;
  spin: number;
};

type Phase = "idle" | "covering" | "covered" | "revealing";

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();

  const overlayRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const starWrapRef = useRef<HTMLDivElement>(null);

  const phaseRef = useRef<Phase>("idle");
  const revealRef = useRef<() => void>(() => {});

  useEffect(() => {
    const overlay = overlayRef.current;
    const veil = veilRef.current;
    const mark = markRef.current;
    const starWrap = starWrapRef.current;
    if (!overlay || !veil || !mark || !starWrap) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;

    // Built empty and scattered per transition (see scatterStars). The
    // elements are made here rather than rendered because their layout
    // is random, which the server has no way to agree with.
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const el = document.createElement("div");
      el.className = "pt-star";
      const size = 7 + Math.random() * 13;
      el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="${STAR_PATH}"/></svg>`;
      stars.push({ el, dx: 0, dy: 0, spin: 0 });
      starWrap.appendChild(el);
    }
    const starEls = stars.map((s) => s.el);

    let stallTimer: number | undefined;
    let tl: gsap.core.Timeline | undefined;

    const ctx = gsap.context(() => {
      // Centred here rather than with a margin: GSAP owns `transform` on
      // these, so the offset has to live inside it.
      gsap.set(starEls, { xPercent: -50, yPercent: -50 });

      /** Scale at which the mark reaches its full on-screen span. */
      const coverScale = () =>
        (Math.hypot(window.innerWidth, window.innerHeight) /
          (mark.offsetWidth || 1)) *
        COVER_SPAN;

      /**
       * Throws the whole field somewhere new. Runs once per cover, so no
       * two navigations show the same sky — reusing one scatter for a
       * whole session makes the wipe read as a fixed graphic rather than
       * as passing through space. Positions are percentages, so a resize
       * between transitions can't strand a star off-screen.
       */
      const scatterStars = () => {
        const palette = root.dataset.hero === "pink" ? COLORS_PINK : COLORS;
        for (const star of stars) {
          const nx = Math.random();
          const ny = Math.random();
          star.el.style.left = `${nx * 100}%`;
          star.el.style.top = `${ny * 100}%`;
          star.el.style.color = palette[(Math.random() * palette.length) | 0];
          // Unit vector from the viewport centre, so each star sweeps
          // along its own radius instead of every star sliding the same
          // way. Dead centre would divide by zero; any direction will do.
          const ux = nx - 0.5;
          const uy = ny - 0.5;
          const len = Math.hypot(ux, uy) || 1;
          const dist = 70 + Math.random() * 130;
          star.dx = (-ux / len) * dist;
          star.dy = (-uy / len) * dist;
          star.spin = (Math.random() - 0.5) * 140;
        }
      };

      // Idle shimmer while the cover waits for the route to commit, so a
      // slow navigation reads as deep space rather than a frozen frame.
      const twinkle = () => {
        for (const el of starEls) {
          gsap.to(el, {
            opacity: 0.4 + Math.random() * 0.35,
            scale: 0.75 + Math.random() * 0.25,
            duration: 0.9 + Math.random() * 1.1,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        }
      };

      const reveal = () => {
        if (phaseRef.current !== "covered") return;
        phaseRef.current = "revealing";
        window.clearTimeout(stallTimer);
        gsap.killTweensOf(starEls);
        // Let the new page's entrance animations run with the reveal.
        root.classList.remove("is-navigating");

        tl = gsap
          .timeline({
            onComplete: () => {
              phaseRef.current = "idle";
              gsap.set(overlay, { autoAlpha: 0 });
            },
          })
          .to(veil, { opacity: 0, duration: REVEAL * 0.6, ease: "power2.out" }, 0)
          .to(
            mark,
            {
              scale: 0,
              rotation: -SPIN,
              duration: REVEAL,
              ease: "back.in(1.6)",
            },
            0,
          )
          .to(
            starEls,
            {
              x: (i: number) => stars[i].dx,
              y: (i: number) => stars[i].dy,
              rotation: (i: number) => stars[i].spin,
              scale: 0.25,
              opacity: 0,
              duration: REVEAL * 0.85,
              ease: "power2.in",
              stagger: { each: 0.01, from: "random" },
            },
            0,
          )
          // Hand the page back as soon as the veil is off it, rather
          // than at the end: waiting for the mark to finish shrinking
          // would leave the arriving page dead to clicks for most of a
          // second, which reads as the site having hung.
          .set(overlay, { pointerEvents: "none" }, REVEAL * 0.6);
      };
      revealRef.current = reveal;

      /**
       * `resume` picks the cover up from wherever the reveal had got to,
       * for the visitor who clicks a second link while the first page is
       * still arriving; a cold cover starts from a closed mark.
       */
      const cover = (href: string, resume: boolean) => {
        phaseRef.current = "covering";
        gsap.set(overlay, { autoAlpha: 1, pointerEvents: "auto" });
        if (!resume) {
          scatterStars();
          gsap.set(veil, { opacity: 0 });
          gsap.set(mark, { scale: 0, rotation: -SPIN });
          gsap.set(starEls, {
            x: (i: number) => stars[i].dx,
            y: (i: number) => stars[i].dy,
            rotation: (i: number) => stars[i].spin,
            scale: 0.25,
            opacity: 0,
          });
        }

        tl = gsap
          .timeline({
            onComplete: () => {
              phaseRef.current = "covered";
              twinkle();
              // Pushed only now: the swap and its scroll-to-top happen
              // entirely behind the cover. Entrance animations are held
              // from the same moment, so the outgoing page (already
              // hidden) never flickers back to its pre-reveal state.
              root.classList.add("is-navigating");
              router.push(href);
              // The commit lands in the effect below, which calls back
              // into reveal(); this only covers a route that never comes.
              stallTimer = window.setTimeout(reveal, STALL_MS);
            },
          })
          .to(
            mark,
            {
              scale: coverScale(),
              rotation: 0,
              duration: COVER,
              ease: "back.out(1.6)",
            },
            0,
          )
          .to(
            starEls,
            {
              x: 0,
              y: 0,
              rotation: 0,
              scale: 1,
              opacity: 1,
              duration: COVER * 1.05,
              ease: "power2.out",
              stagger: { each: 0.01, from: "random" },
            },
            0,
          )
          // Does all the covering: the mark is a small star sitting on
          // top of it, not the thing hiding the page. Leads the mark's
          // landing so the spin finishes against space rather than
          // against the page it's leaving.
          .to(veil, { opacity: 1, duration: COVER * 0.8, ease: "power2.in" }, COVER * 0.2);
      };

      const onClick = (e: MouseEvent) => {
        // A cover already on its way owns the navigation; a reveal still
        // playing can be turned around into the next one.
        if (phaseRef.current === "covering" || phaseRef.current === "covered")
          return;
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const anchor = (e.target as Element | null)?.closest?.("a");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        if (anchor.hasAttribute("download")) return;
        if (anchor.target && anchor.target !== "_self") return;

        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Static files under /public aren't routes — let the browser have them.
        if (/\.[a-z0-9]+$/i.test(url.pathname)) return;
        // Same page (including bare #hash links): nothing to transition to.
        if (url.pathname === window.location.pathname) return;

        e.preventDefault();
        const resume = phaseRef.current === "revealing";
        if (resume) {
          tl?.kill();
          gsap.killTweensOf(starEls);
          window.clearTimeout(stallTimer);
        }
        cover(url.pathname + url.search + url.hash, resume);
      };

      // Capture phase, so the cover starts even if something downstream
      // stops propagation. preventDefault still lets React's own
      // handlers run (the mobile menu closes itself on the same click).
      document.addEventListener("click", onClick, true);
      return () => document.removeEventListener("click", onClick, true);
    }, overlay);

    return () => {
      window.clearTimeout(stallTimer);
      tl?.kill();
      ctx.revert();
      starWrap.replaceChildren();
      root.classList.remove("is-navigating");
      phaseRef.current = "idle";
      revealRef.current = () => {};
    };
  }, [router]);

  // Fires when the pushed route commits, which is what starts the
  // reveal. Navigations we didn't cover (the browser's own back/forward)
  // find the overlay idle and are left alone.
  useEffect(() => {
    if (phaseRef.current === "covered") revealRef.current();
  }, [pathname]);

  return (
    <div ref={overlayRef} aria-hidden className="pt-overlay">
      <div ref={veilRef} className="pt-veil" />
      <div ref={markRef} className="pt-mark">
        <div className="pt-mark-glow" />
        <svg className="pt-mark-star" viewBox="0 0 100 100">
          <defs>
            {/* Radial, not linear: a star is lit from its own centre, so
                the fill has to run white core to coloured tips rather
                than top to bottom. userSpaceOnUse keeps one gradient
                across both ray sets instead of restarting inside each
                path's bounding box. */}
            <radialGradient
              id="pt-mark-grad"
              gradientUnits="userSpaceOnUse"
              cx="50"
              cy="50"
              r="52"
            >
              <stop className="pt-stop-a" offset="0%" stopColor="#ffffff" />
              <stop className="pt-stop-b" offset="40%" stopColor="#ddf4ff" />
              <stop className="pt-stop-c" offset="100%" stopColor="#8fd0ff" />
            </radialGradient>
            {/* The blown-out centre. Wide enough to swallow the point
                where all eight rays meet, which is the one place the
                needles would otherwise show their seams. */}
            <radialGradient id="pt-mark-core" cx="50%" cy="50%" r="50%">
              <stop className="pt-stop-a" offset="0%" stopColor="#ffffff" />
              <stop
                className="pt-stop-b"
                offset="30%"
                stopColor="#ffffff"
                stopOpacity="0.85"
              />
              <stop
                className="pt-stop-c"
                offset="60%"
                stopColor="#cfeeff"
                stopOpacity="0.3"
              />
              <stop offset="100%" stopColor="#cfeeff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d={DIAGONAL_STAR}
            transform={DIAGONAL_RAYS}
            fill="url(#pt-mark-grad)"
            opacity="0.95"
          />
          <path d={NORTH_STAR} fill="url(#pt-mark-grad)" />
          <circle cx="50" cy="50" r="20" fill="url(#pt-mark-core)" />
        </svg>
      </div>
      <div ref={starWrapRef} className="absolute inset-0" />
    </div>
  );
}
