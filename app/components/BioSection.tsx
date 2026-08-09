"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SITE } from "../lib/data";

gsap.registerPlugin(ScrollTrigger);

/** Shared by both coin faces so the reverse looks like the same object. */
const RING =
  "rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 p-[3px] shadow-[0_0_40px_-8px_rgba(124,58,237,0.55)]";

/** Struck on the back of the coin. Keep these short — they have to fit
 *  inside the inner rim, which is ~68% of the coin's width.
 *
 *  Icons are hand-drawn on a 24 grid to one line weight, rather than
 *  emoji: emoji render as full-colour bitmaps that each platform draws
 *  differently, and they clashed with the coin's engraved look. These
 *  inherit `currentColor` and sit on the same stroke as the rim. */
const FACTS: { label: string; icon: ReactNode }[] = [
  {
    label: "Kansas City",
    icon: (
      <>
        <path d="M3.4 11.2 12 4.1l8.6 7.1" />
        <path d="M5.7 10.1V20a.8.8 0 0 0 .8.8h11a.8.8 0 0 0 .8-.8v-9.9" />
        <path d="M9.9 20.8v-5.2h4.2v5.2" />
      </>
    ),
  },
  {
    // Tiger face, for the Mizzou Tigers. The brow ticks and cheek
    // stripes are what separate it from a house cat at this size.
    label: "CS @ Mizzou",
    icon: (
      <>
        <path d="M7.2 9.4 5.7 4.8l4.4 2.4" />
        <path d="M16.8 9.4 18.3 4.8l-4.4 2.4" />
        <ellipse cx="12" cy="13.6" rx="7" ry="6.4" />
        <path d="M10.7 8.6v1.5M13.3 8.6v1.5" />
        <circle cx="9.6" cy="12.9" r=".95" fill="currentColor" stroke="none" />
        <circle cx="14.4" cy="12.9" r=".95" fill="currentColor" stroke="none" />
        <path d="M11.1 15.6h1.8l-.9 1.1z" fill="currentColor" />
        <path d="M5.1 12.5h1.7M5.4 15h1.7M18.9 12.5h-1.7M18.6 15h-1.7" />
      </>
    ),
  },
  {
    label: "Chinese",
    icon: (
      <>
        <path d="M3.2 11.6h17.6a8.8 8.8 0 0 1-17.6 0z" />
        <path d="M2.2 11.6h19.6" />
        <path d="M13.4 9.9 20.6 3.4" />
        <path d="M15.6 11.2 22.4 5.4" />
      </>
    ),
  },
  {
    label: "Cute animals",
    icon: (
      <>
        <circle cx="6.9" cy="7.4" r="2.6" fill="currentColor" />
        <circle cx="17.1" cy="7.4" r="2.6" fill="currentColor" />
        <circle cx="12" cy="13.4" r="6.7" />
        <ellipse cx="9.4" cy="12.3" rx="1.35" ry="1.7" fill="currentColor" stroke="none" />
        <ellipse cx="14.6" cy="12.3" rx="1.35" ry="1.7" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16" r=".8" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: "Traveling",
    icon: (
      <path d="M12 3.2c.9 0 1.5 1 1.5 2.2v3.9l7.3 4.2v2.2l-7.3-2.2v4.2l2 1.5v1.7L12 19.8l-3.5 1.1v-1.7l2-1.5v-4.2l-7.3 2.2v-2.2l7.3-4.2V5.4c0-1.2.6-2.2 1.5-2.2z" />
    ),
  },
];

/**
 * Bio section whose text, button, and photo slide in *while you scroll*
 * (GSAP ScrollTrigger with `scrub`) rather than snapping in once on
 * entry. Each element travels a different distance over the same scroll
 * range, so they slide at different speeds for a layered, parallax feel
 * — and reverse if you scroll back up. Skipped for reduced-motion
 * users, who just see it in place.
 *
 * The photo itself is a two-sided coin: hovering (or focusing) it spins
 * it on its vertical axis to a struck reverse face. See `.coin` in
 * globals.css.
 */
export default function BioSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      // Drive each element's x/opacity from scroll position across the
      // range where the section rises through the lower viewport.
      const slide = (el: Element | null, fromX: number) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { x: fromX, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              end: "top 40%",
              scrub: 0.6,
            },
          },
        );
      };
      // Different distances → different scroll speeds (layered slide).
      slide(textRef.current, -70);
      slide(buttonRef.current, -120);
      slide(imageRef.current, 90);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      // clip horizontal overflow so the slide-in transforms (esp. the
      // image starting at x:+90) can't widen the page / add a horizontal
      // scrollbar on narrow screens. `clip` (not `hidden`) avoids making
      // this a scroll container, so nothing else is affected.
      className="mx-auto w-full max-w-4xl overflow-x-clip px-6 py-20 sm:py-28"
    >
      <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2 sm:gap-12">
        <div>
          <p ref={textRef} className="text-lg leading-relaxed text-muted">
            Hello! I&apos;m Sky Zheng and I&apos;m currently a Junior studying
            computer science at the University of Missouri (Columbia, MO). I
            like traveling, eating delicious food, exercising, and cute
            animals. Feel free to shoot me a message if you want to get to
            know me better!
          </p>
          <div ref={buttonRef} className="mt-8">
            <Link
              href="/contact"
              className="btn-wipe inline-flex rounded-full px-6 py-3 text-sm font-medium"
            >
              Get in touch
            </Link>
          </div>
        </div>

        <div
          ref={imageRef}
          className="mx-auto w-full max-w-xs"
        >
          {/* Perspective lives here rather than on the ref above, whose
              transform GSAP owns and rewrites every scroll frame. */}
          <div className="coin" tabIndex={0}>
            <div className="coin-inner">
              {/* Heads: the photo, in its gradient ring */}
              <div className={`coin-face ${RING}`}>
                <div className="h-full w-full overflow-hidden rounded-full bg-card">
                  <Image
                    src="/me.png"
                    alt="Sky Zheng"
                    width={512}
                    height={512}
                    className="aspect-square h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Tails: name and role struck around the rim, quick facts inside */}
              <div className={`coin-face coin-back ${RING}`}>
                <div className="coin-back-face relative h-full w-full overflow-hidden rounded-full">
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      {/* Both arcs run left → right so the glyphs sit
                          upright on each; the sweep flag alone decides
                          whether that path goes over the top or under
                          the bottom of the circle. */}
                      <path
                        id="coin-rim-top"
                        d="M 14,100 A 86,86 0 0 1 186,100"
                        fill="none"
                      />
                      <path
                        id="coin-rim-bottom"
                        d="M 14,100 A 86,86 0 0 0 186,100"
                        fill="none"
                      />
                    </defs>
                    <circle
                      cx="100"
                      cy="100"
                      r="72"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    {/* Dots where the two rim texts meet */}
                    <circle cx="16" cy="100" r="2.5" fill="var(--accent)" />
                    <circle cx="184" cy="100" r="2.5" fill="var(--accent-2)" />
                    <text className="coin-rim-text" textAnchor="middle">
                      <textPath href="#coin-rim-top" startOffset="50%">
                        {SITE.name}
                      </textPath>
                    </text>
                    <text className="coin-rim-text" textAnchor="middle">
                      <textPath href="#coin-rim-bottom" startOffset="50%">
                        {SITE.role}
                      </textPath>
                    </text>
                  </svg>

                  {/* Nudged just off the geometric centre: the rows are
                      top-heavy (icons sit above their text baseline), so
                      dead-centre reads high. In `em`, so the offset
                      scales with the coin. */}
                  <ul className="absolute inset-0 flex translate-y-[0.2em] flex-col items-center justify-center gap-[0.7em] px-[12%] text-[5.1cqw] leading-none text-foreground/85">
                    {FACTS.map(({ label, icon }) => (
                      <li key={label} className="flex items-center gap-[0.55em]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[1.45em] w-[1.45em] shrink-0 text-accent-2/85"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.7}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          {icon}
                        </svg>
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
