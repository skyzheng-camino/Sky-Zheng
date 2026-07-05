"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Bio section whose text, button, and photo slide in *while you scroll*
 * (GSAP ScrollTrigger with `scrub`) rather than snapping in once on
 * entry. Each element travels a different distance over the same scroll
 * range, so they slide at different speeds for a layered, parallax feel
 * — and reverse if you scroll back up. Skipped for reduced-motion
 * users, who just see it in place.
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
      className="mx-auto max-w-5xl px-6 py-20 sm:py-28"
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
              className="inline-flex rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:border-accent/60 hover:bg-accent/10"
            >
              Get in touch
            </Link>
          </div>
        </div>

        <div
          ref={imageRef}
          className="mx-auto w-full max-w-xs sm:ml-auto sm:mr-0"
        >
          {/* Gradient ring around the circular photo */}
          <div className="rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 p-[3px] shadow-[0_0_40px_-8px_rgba(124,58,237,0.55)]">
            <div className="overflow-hidden rounded-full bg-card">
              <Image
                src="/me.png"
                alt="Sky Zheng"
                width={512}
                height={512}
                className="aspect-square h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
