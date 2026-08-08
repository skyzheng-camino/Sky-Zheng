"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Tool } from "../lib/data";

/**
 * The tools section as a hand of playing cards: the active card sits
 * face-up at the top of the pile and the rest lie underneath it, fanned
 * out just far enough that each one's outer edge still shows. Dragging,
 * swiping sideways, or nudging with the arrows spins the pile like a
 * character-selection roulette — and it wraps, so it never runs out.
 *
 * Every card's position is a pure function of its distance from the
 * playhead (`p`, a float index), so the whole deck interpolates for free:
 * one tween on `p` and the cards slide, tilt, dim, and re-stack together.
 * The same function renders the initial layout on the server (as a CSS
 * `calc()` transform), so the deck is already dealt before JS loads.
 */

/** Suit, legend label, and accent colour per category — the four suits. */
const SUITS = {
  Language: { glyph: "♠", label: "Languages", color: "#7dd3fc" },
  Framework: { glyph: "♥", label: "Frameworks", color: "#c4b5fd" },
  Tool: { glyph: "♣", label: "Tools", color: "#6ee7b7" },
  Platform: { glyph: "♦", label: "Platforms", color: "#fcd34d" },
} as const satisfies Record<
  Tool["category"],
  { glyph: string; label: string; color: string }
>;

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/**
 * Each card behind the top one peeks out by this fraction of the gap the
 * card in front of it took. Below 1 the offsets form a converging
 * geometric series, so the pile has a finite width however deep it runs —
 * the far cards compress into a stack of slivers instead of marching off
 * screen.
 */
const FALLOFF = 0.72;
/**
 * First card's gap, as a fraction of card width. Deliberately small: the
 * cards behind should lie *mostly* under the one on top, showing an edge
 * rather than half a face.
 */
const GAP_RATIO = 0.34;
/** Depth past which cards stop tilting/dropping further. */
const DEPTH_CAP = 5;

/** Shortest signed distance from the playhead, wrapped into [-n/2, n/2). */
function wrapOffset(d: number, n: number) {
  return (((d % n) + n + n / 2) % n) - n / 2;
}

/**
 * Everything about a card at signed distance `d` from the playhead.
 * `xUnits` is in gaps, not pixels — the caller scales it, which is what
 * lets the server emit the same layout without knowing the card's size.
 */
function geometry(d: number) {
  const side = Math.sign(d);
  const depth = Math.abs(d);
  const capped = Math.min(depth, DEPTH_CAP);
  return {
    xUnits: (side * (1 - FALLOFF ** depth)) / (1 - FALLOFF),
    // Every card is the same size — a real deck's are. Depth reads from
    // overlap, the fan of the tilt, the drop shadow, and the scrim, not
    // from perspective scaling.
    y: 10 * capped ** 1.05,
    rotation: side * 3.5 * capped ** 0.8,
    // Gone well before the |d| = n/2 wrap seam, so cards recycling from
    // one end of the deck to the other are never caught doing it.
    opacity: depth <= 3.5 ? 1 : Math.max(0, 1 - (depth - 3.5) / 2),
    // Strictly decreasing in depth, so the stacking order is correct at
    // every in-between frame, not just when the deck is at rest.
    zIndex: Math.round(1000 - depth * 100),
    scrim: (Math.min(depth, 4) / 4) * 0.62,
    glow: Math.max(0, 1 - depth),
    detail: Math.max(0, 1 - depth * 1.6),
  };
}

/**
 * The dealt-at-rest layout, as inline style. React re-renders recompute
 * this to the identical values, so React never writes to the style
 * attribute again and can't clobber what GSAP puts there after mount.
 */
function restingStyle(d: number): React.CSSProperties {
  const g = geometry(d);
  const x = (g.xUnits * GAP_RATIO).toFixed(4);
  return {
    transform: `translate(calc(var(--deck-card-w) * ${x}), ${g.y.toFixed(2)}px) rotate(${g.rotation.toFixed(2)}deg)`,
    opacity: g.opacity,
    zIndex: g.zIndex,
  };
}

/** Deals ranks per suit: the three Languages become ♠A ♠2 ♠3, and so on. */
function dealRanks(tools: Tool[]) {
  const dealt: Record<string, number> = {};
  return tools.map((tool) => {
    dealt[tool.category] = (dealt[tool.category] ?? 0) + 1;
    return RANKS[dealt[tool.category] - 1] ?? "★";
  });
}

export default function ToolDeck({ tools }: { tools: Tool[] }) {
  const n = tools.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<(HTMLLIElement | null)[]>([]);
  const goToRef = useRef<(index: number) => void>(() => {});
  const [active, setActive] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    const slots = slotsRef.current.filter((el): el is HTMLLIElement => !!el);
    if (!stage || slots.length !== n) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // One setter per animated property per card, resolved once. These
    // run on every frame of a spin, so they skip GSAP's per-call plumbing.
    const cards = slots.map((el) => ({
      el,
      x: gsap.quickSetter(el, "x", "px"),
      y: gsap.quickSetter(el, "y", "px"),
      rotation: gsap.quickSetter(el, "rotation", "deg"),
      opacity: gsap.quickSetter(el, "opacity"),
      scrim: gsap.quickSetter(el.querySelector("[data-scrim]")!, "opacity"),
      glow: gsap.quickSetter(el.querySelector("[data-glow]")!, "opacity"),
      detail: gsap.quickSetter(el.querySelector("[data-detail]")!, "opacity"),
    }));

    const playhead = { p: 0 };
    let gap = slots[0].offsetWidth * GAP_RATIO;

    const render = () => {
      for (let i = 0; i < n; i++) {
        const card = cards[i];
        const g = geometry(wrapOffset(i - playhead.p, n));
        card.x(g.xUnits * gap);
        card.y(g.y);
        card.rotation(g.rotation);
        card.opacity(g.opacity);
        card.scrim(g.scrim);
        card.glow(g.glow);
        card.detail(g.detail);
        card.el.style.zIndex = String(g.zIndex);
      }
      setActive(((Math.round(playhead.p) % n) + n) % n);
    };

    let spin: gsap.core.Tween | null = null;
    const goTo = (target: number, duration = 0.85, ease = "power3.out") => {
      spin?.kill();
      spin = gsap.to(playhead, {
        p: target,
        duration: reduced ? 0 : duration,
        ease,
        onUpdate: render,
      });
    };
    // Card clicks and the arrow buttons come in through here.
    goToRef.current = (index) =>
      goTo(Math.round(playhead.p + wrapOffset(index - playhead.p, n)));

    render();

    /**
     * Ends a gesture the way the deck always ends one: carry the last
     * measured speed a little further, then settle on a whole card.
     * `cardsPerSecond` is the playhead's velocity in the deck's own
     * units, which is what lets a drag and a sideways scroll — whose raw
     * inputs have opposite signs — share the exact same release.
     */
    const settle = (cardsPerSecond: number) => {
      const carry = gsap.utils.clamp(-5, 5, cardsPerSecond * 0.3);
      goTo(Math.round(playhead.p + carry), 1);
    };

    // ---- Drag (pointer, so mouse and touch share one path) ----
    let pointerId: number | null = null;
    let startX = 0;
    let startP = 0;
    let moved = 0;
    // Last sample, for the flick velocity on release.
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (pointerId !== null || e.button !== 0) return;
      pointerId = e.pointerId;
      stage.setPointerCapture(e.pointerId);
      spin?.kill();
      startX = lastX = e.clientX;
      startP = playhead.p;
      lastT = e.timeStamp;
      moved = 0;
      velocity = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = ((e.clientX - lastX) / dt) * 1000;
      lastX = e.clientX;
      lastT = e.timeStamp;
      moved = Math.max(moved, Math.abs(e.clientX - startX));
      playhead.p = startP - (e.clientX - startX) / gap;
      render();
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      // Dragging right pulls the deck backwards, hence the sign flip.
      settle(-velocity / gap);
    };

    // ---- Sideways wheel / trackpad swipe ----
    // Only horizontal intent is taken; vertical wheel stays with the page.
    // The deck tracks the scroll one-to-one with a drag — scrolling right
    // pushes it the same way dragging left does — and because a wheel
    // gesture has no "release" event, the end of one is inferred from the
    // events stopping.
    let wheelTimer = 0;
    let wheelVelocity = 0;
    let wheelLastT = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      spin?.kill();
      const dt = e.timeStamp - wheelLastT;
      // A long gap means this is a fresh gesture, not a continuation, so
      // the previous one's speed must not leak into this one's release.
      wheelVelocity = dt > 0 && dt < 120 ? (e.deltaX / dt) * 1000 : 0;
      wheelLastT = e.timeStamp;
      playhead.p += e.deltaX / gap;
      render();
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => settle(wheelVelocity / gap), 90);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      goTo(Math.round(playhead.p) + (e.key === "ArrowRight" ? 1 : -1), 0.6);
    };

    // A drag that travelled shouldn't also count as a click on whichever
    // card happened to be under the pointer when it stopped.
    const onClickCapture = (e: MouseEvent) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
        moved = 0;
      }
    };

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("keydown", onKeyDown);
    stage.addEventListener("click", onClickCapture, true);

    // Card width is fluid, so the gap it drives has to be re-measured.
    const resize = new ResizeObserver(() => {
      gap = slots[0].offsetWidth * GAP_RATIO;
      render();
    });
    resize.observe(stage);

    // Roulette flourish: the first time the deck comes into view it spins
    // a full revolution and lands back on the card it started on.
    let intro: IntersectionObserver | null = null;
    if (!reduced) {
      intro = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            intro?.disconnect();
            goTo(playhead.p + n, 2.2, "power4.out");
          }
        },
        { threshold: 0.3 },
      );
      intro.observe(stage);
    }

    return () => {
      spin?.kill();
      clearTimeout(wheelTimer);
      resize.disconnect();
      intro?.disconnect();
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", endDrag);
      stage.removeEventListener("pointercancel", endDrag);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKeyDown);
      stage.removeEventListener("click", onClickCapture, true);
    };
  }, [n]);

  const ranks = dealRanks(tools);

  return (
    <div>
      {/* Legend — doubles as the key to what each suit means */}
      <div className="mx-auto mb-6 flex max-w-5xl flex-wrap gap-x-5 gap-y-2 px-6 text-xs text-muted">
        {Object.entries(SUITS).map(([category, suit]) => (
          <span key={category} className="inline-flex items-center gap-1.5">
            <span aria-hidden style={{ color: suit.color }} className="text-sm">
              {suit.glyph}
            </span>
            {suit.label}
          </span>
        ))}
      </div>

      <div
        ref={stageRef}
        tabIndex={-1}
        role="group"
        aria-roledescription="carousel"
        aria-label="Tools, languages and frameworks"
        // Full-bleed: the whole width of the page is draggable, so the
        // deck can be grabbed anywhere along the band it sits in.
        className="deck-stage w-full cursor-grab active:cursor-grabbing"
      >
        <ul>
          {tools.map((tool, i) => {
            const suit = SUITS[tool.category];
            const isActive = i === active;
            return (
              <li
                key={tool.name}
                ref={(el) => {
                  slotsRef.current[i] = el;
                }}
                className="deck-slot"
                style={restingStyle(wrapOffset(i, n))}
              >
                <button
                  type="button"
                  onClick={() => goToRef.current(i)}
                  onFocus={() => goToRef.current(i)}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`${tool.name} — ${tool.category}`}
                  className="group relative block h-full w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
                >
                  {/* Glow behind the top card only, faded in by GSAP */}
                  <span
                    data-glow
                    aria-hidden
                    style={{ opacity: geometry(wrapOffset(i, n)).glow }}
                    className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-br from-violet-500/40 via-indigo-500/30 to-cyan-400/40 blur-xl"
                  />

                  {/* Card face. Sizes below are all `em`, so the printing
                      scales with the card — see `.deck-face`. */}
                  <span className="deck-face relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(160deg,#1b1c28_0%,#0d0e16_100%)] p-[1em] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.95)]">
                    {/* The hairline printed just inside a card's edge */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-[0.55em] rounded-xl ring-1 ring-inset ring-white/10"
                    />

                    {/* Corner index, top-left */}
                    <span
                      aria-hidden
                      className="relative flex w-[1.6em] flex-col items-center leading-none"
                      style={{ color: suit.color }}
                    >
                      <span className="text-[1.05em] font-bold">{ranks[i]}</span>
                      <span className="text-[1.2em]">{suit.glyph}</span>
                    </span>

                    <span className="relative flex flex-1 flex-col items-center justify-center gap-[0.8em] px-[0.3em] text-center">
                      <span
                        className={`flex h-[4.5em] w-[4.5em] shrink-0 items-center justify-center rounded-full shadow-md ${
                          tool.name === "Vercel" ? "bg-black" : "bg-white"
                        }`}
                      >
                        <Image
                          src={tool.logo}
                          alt=""
                          width={40}
                          height={40}
                          className={`object-contain ${
                            tool.name === "Python" || tool.name === "Docker"
                              ? "h-[3.2em] w-[3.2em]"
                              : "h-[2.6em] w-[2.6em]"
                          }`}
                          unoptimized
                        />
                      </span>
                      <span className="text-[1.2em] font-semibold leading-snug">
                        {tool.name}
                      </span>
                      <span
                        className="text-[0.8em] uppercase tracking-[0.16em]"
                        style={{ color: suit.color }}
                      >
                        {tool.category}
                      </span>

                      {/* Description: only legible on the card that's up.
                          Its space is reserved on every card, so fading it
                          in doesn't shift the cluster above it. */}
                      <p
                        data-detail
                        style={{ opacity: geometry(wrapOffset(i, n)).detail }}
                        className="text-[0.95em] leading-relaxed text-muted"
                      >
                        {tool.description}
                      </p>
                    </span>

                    {/* Corner index, bottom-right (upside down, as printed) */}
                    <span
                      aria-hidden
                      className="relative mt-[0.5em] flex w-[1.6em] rotate-180 flex-col items-center self-end leading-none"
                      style={{ color: suit.color }}
                    >
                      <span className="text-[1.05em] font-bold">{ranks[i]}</span>
                      <span className="text-[1.2em]">{suit.glyph}</span>
                    </span>

                    {/* Darkens cards the deeper they lie in the pile */}
                    <span
                      data-scrim
                      aria-hidden
                      style={{ opacity: geometry(wrapOffset(i, n)).scrim }}
                      className="pointer-events-none absolute inset-0 rounded-2xl bg-[#05060c]"
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Controls + position readout */}
      <div className="mt-6 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => goToRef.current(active - 1)}
          aria-label="Previous card"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden className="h-5 w-5">
            <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="font-mono text-xs tabular-nums text-muted">
          {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </p>
        <button
          type="button"
          onClick={() => goToRef.current(active + 1)}
          aria-label="Next card"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden className="h-5 w-5">
            <path d="M10 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
