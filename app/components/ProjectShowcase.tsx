"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Project } from "../lib/data";

/**
 * Metalab-style project index: a list of project links on the left, and
 * a stage on the right where hovering a link uncovers that project's
 * artwork plus its org, title, and description. The three text blocks
 * are scattered to different spots for every project, so the reveal
 * feels hand-composed rather than templated. The first project is
 * active on load so the stage is never empty.
 */

/**
 * mulberry32. The scatter has to render identically on the server and
 * the client or hydration blows up, so the positions come from a seeded
 * PRNG rather than Math.random().
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Starting clip-paths — each block is wiped open from a random edge. */
const WIPES = [
  "inset(0% 0% 100% 0%)",
  "inset(100% 0% 0% 0%)",
  "inset(0% 100% 0% 0%)",
  "inset(0% 0% 0% 100%)",
];

type Placement = { top: number; left: number; delay: number; clip: string };
type BlockKey = "org" | "title" | "description";

/**
 * Each block's height as a share of the stage, rounded up: one line of
 * org label, a two-line title, a five-line description plus its stack
 * line. Overestimating is safe — a block that renders shorter just
 * leaves more air under it.
 */
const HEIGHTS: Record<BlockKey, number> = {
  org: 6,
  title: 15,
  description: 44,
};

/**
 * The artwork's own height as a share of the stage, at 46% width and a
 * 16/11 crop. Used to seat the bottom anchors and to centre Jaeli's.
 */
const IMAGE_HEIGHT = 50;

/** The four corners the artwork can occupy, dealt out without repeats. */
const ANCHORS = [
  { side: "left", vertical: "top" },
  { side: "right", vertical: "top" },
  { side: "left", vertical: "bottom" },
  { side: "right", vertical: "bottom" },
] as const;

type Anchor = (typeof ANCHORS)[number];

type Tweak = {
  /**
   * Overrides the artwork's vertical position: a % of the stage, or
   * "center" to seat it dead-centre at any viewport (a percentage
   * can't, since the artwork's height follows the stage's width).
   */
  imageTop?: number | "center";
  /**
   * Raises a centred artwork by this % of the stage. Applied as bottom
   * inset on the centring box, so it stays exact at any viewport.
   */
  imageLift?: number;
  /** Re-deals this project's text from a different seed. */
  textSeed?: number;
  /** Overrides a block's horizontal position, as a % of the stage. */
  left?: Partial<Record<BlockKey, number>>;
  /** Overrides a block's vertical position, as a % of the stage. */
  top?: Partial<Record<BlockKey, number>>;
};

/**
 * Art-directed nudges on top of the generated composition, by project
 * index. The generator gets each project into its own corner of the
 * stage; these are the adjustments made by eye afterwards. A `left` or
 * `top` override can push a block out of its dealt lane, so each one is
 * only safe where it stays clear of the artwork and the other blocks.
 */
const TWEAKS: Record<number, Tweak> = {
  // Camino: title pushed right, stopping short of the artwork column,
  // and the artwork lifted off its dealt bottom anchor.
  0: { imageTop: 30, left: { title: 28 } },
  // Data-Ingestion: artwork stays where it is, text dealt a fresh hand,
  // and the project name parked centred along the bottom edge — well
  // below both the artwork and the other two blocks.
  1: { textSeed: 0x2b7, left: { title: 27 }, top: { title: 72 } },
  // Client Web App: company name pulled well left of the stage's middle.
  2: { left: { org: 24 } },
  // Jaeli: artwork centred vertically, then lifted slightly above centre.
  3: { imageTop: "center", imageLift: 4 },
};

function buildOne(anchor: Anchor, rand: () => number, tweak: Tweak = {}) {
  const pick = (xs: readonly string[]) => xs[Math.floor(rand() * xs.length)];

  // The artwork takes one half of the stage and the text scatters down
  // the other, so the two can never collide however long a description
  // runs. The anchor fixes which corner the artwork lands in; the text
  // always takes the opposite column.
  const textColumn = anchor.side === "left" ? 50 : 0;

  // Walk down the stage stacking the blocks in a shuffled order.
  // Advancing by each block's own height means a long description can
  // never run into whatever was dealt below it, and the worst-case
  // stack still bottoms out inside the stage.
  const dealText = (r: () => number) => {
    const order: BlockKey[] = ["org", "title", "description"];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const text = {} as Record<BlockKey, Placement>;
    let top = 1 + r() * 3;
    order.forEach((key, i) => {
      // Draw before applying the override, never after: skipping the
      // call would desync the shared stream and silently relayout every
      // project dealt after this one.
      const generatedLeft = textColumn + r() * 4;
      text[key] = {
        top: tweak.top?.[key] ?? top,
        left: tweak.left?.[key] ?? generatedLeft,
        delay: 0.12 + i * 0.1,
        clip: WIPES[Math.floor(r() * WIPES.length)],
      };
      top += HEIGHTS[key] + 3 + r() * 7;
    });
    return text;
  };

  // Always draw from the shared stream so the projects after this one
  // are unaffected, then re-deal from the tweak's own seed if it has
  // one. That keeps a re-shuffle local to the project asking for it.
  let text = dealText(rand);
  if (tweak.textSeed !== undefined) text = dealText(mulberry32(tweak.textSeed));

  const generatedTop =
    anchor.vertical === "top"
      ? 2 + rand() * 6
      : 100 - IMAGE_HEIGHT - 2 - rand() * 6;

  return {
    image: {
      top: tweak.imageTop ?? generatedTop,
      lift: tweak.imageLift,
      left: anchor.side === "left" ? 0 : 52,
      width: 46,
      clip: pick(WIPES),
    },
    ...text,
  };
}

/**
 * Builds every project's layout in one pass, dealing the artwork
 * anchors from a shuffled deck so no two projects uncover their image
 * in the same corner of the stage (and, because the text always takes
 * the opposite column, no two share a text position either).
 */
function buildLayouts(count: number) {
  const rand = mulberry32(0x5eed);
  const deck: Anchor[] = [];
  while (deck.length < count) {
    const batch = [...ANCHORS];
    for (let i = batch.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [batch[i], batch[j]] = [batch[j], batch[i]];
    }
    deck.push(...batch);
  }
  return Array.from({ length: count }, (_, i) =>
    buildOne(deck[i], rand, TWEAKS[i] ?? {}),
  );
}

/** Turns a Placement into the custom properties `.showcase-item` reads. */
function itemStyle(p: Placement) {
  return {
    top: `${p.top}%`,
    left: `${p.left}%`,
    "--clip": p.clip,
    "--delay": `${p.delay}s`,
  } as React.CSSProperties;
}

export default function ProjectShowcase({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState(0);
  const layouts = useMemo(() => buildLayouts(projects.length), [projects.length]);

  return (
    <>
      {/* ---- Desktop: hover-driven index + stage ---- */}
      {/* The index is pinned to 20% of the section width so the stage
          gets the rest of the room for the artwork. */}
      <div className="hidden gap-10 lg:grid lg:grid-cols-[20%_minmax(0,1fr)]">
        <ul className="border-t border-border">
          {projects.map((project, i) => {
            const isActive = i === active;
            return (
              <li key={project.title}>
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  data-active={isActive}
                  aria-current={isActive ? "true" : undefined}
                  className="group flex items-baseline gap-3 border-b border-border py-5 outline-none transition-colors"
                >
                  <span
                    className={`font-mono text-xs transition-colors ${
                      isActive ? "text-accent-2" : "text-muted/60"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-lg font-semibold tracking-tight transition-all duration-300 xl:text-xl ${
                        isActive
                          ? "translate-x-1 text-foreground"
                          : "text-muted/70"
                      }`}
                    >
                      {project.title}
                    </span>
                    <span
                      className={`mt-1 block text-[10px] uppercase tracking-[0.18em] transition-colors ${
                        isActive ? "text-accent-2" : "text-muted/50"
                      }`}
                    >
                      {project.org}
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                    className={`h-5 w-5 shrink-0 transition-all duration-300 ${
                      isActive
                        ? "translate-x-0 text-accent-2 opacity-100"
                        : "-translate-x-2 opacity-0"
                    }`}
                  >
                    <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" />
                  </svg>
                </a>
              </li>
            );
          })}
        </ul>

        {/* Stage: every project is mounted and stacked, so switching is a
            crossfade rather than a mount (and the artwork is already
            decoded by the time the pointer reaches the list). */}
        <div className="showcase-stage relative h-[660px]">
          {projects.map((project, i) => {
            const layout = layouts[i];
            const isActive = i === active;
            const artwork = (
              <div className="relative w-full shrink-0 aspect-[16/11] overflow-hidden rounded-xl border border-border shadow-[0_24px_70px_-20px_rgba(0,0,0,0.95)]">
                {project.image ? (
                  <Image
                    src={project.image}
                    alt={`${project.title} preview`}
                    fill
                    loading="eager"
                    sizes="40vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-cyan-400/20" />
                )}
              </div>
            );
            return (
              <div
                key={project.title}
                data-active={isActive}
                aria-hidden={!isActive}
                className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              >
                <div
                  className={`showcase-item absolute ${
                    layout.image.top === "center" ? "flex items-center" : ""
                  }`}
                  style={
                    {
                      top: layout.image.top === "center" ? 0 : `${layout.image.top}%`,
                      // Shrinking the centring box from the bottom
                      // raises its centred child by half that amount.
                      bottom:
                        layout.image.top === "center"
                          ? `${(layout.image.lift ?? 0) * 2}%`
                          : undefined,
                      left: `${layout.image.left}%`,
                      width: `${layout.image.width}%`,
                      "--clip": layout.image.clip,
                      "--delay": "0s",
                    } as React.CSSProperties
                  }
                >
                  {/* The stage swallows pointer events so the index keeps
                      control of the hover; the artwork of whichever project
                      is showing takes them back so it can be clicked
                      through to the live site. The hidden ones stay inert
                      and out of the tab order. */}
                  {project.link ? (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={isActive ? undefined : -1}
                      aria-label={`${project.title} — open live site`}
                      className={`block w-full shrink-0 outline-none ${
                        isActive ? "pointer-events-auto" : ""
                      }`}
                    >
                      {artwork}
                    </a>
                  ) : (
                    artwork
                  )}
                </div>

                <p
                  className="showcase-item absolute w-[46%] text-[length:var(--stage-org)] font-medium uppercase tracking-[0.12em] text-accent-2"
                  style={itemStyle(layout.org)}
                >
                  {project.org}
                </p>
                <h2
                  className="showcase-item absolute w-[46%] text-[length:var(--stage-title)] font-semibold leading-tight tracking-tight"
                  style={itemStyle(layout.title)}
                >
                  {project.title}
                </h2>
                <div
                  className="showcase-item absolute w-[46%]"
                  style={itemStyle(layout.description)}
                >
                  <p className="line-clamp-7 text-[length:var(--stage-desc)] leading-relaxed text-muted">
                    {project.description}
                  </p>
                  <p className="mt-4 font-mono text-xs text-muted/70">
                    {project.stack.join(" · ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Small screens: hover has no meaning, so stack the cards ---- */}
      <div className="space-y-12 lg:hidden">
        {projects.map((project, i) => (
          <article key={project.title}>
            <p className="font-mono text-xs text-accent-2">
              {String(i + 1).padStart(2, "0")} — {project.org}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              {project.link ? (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-accent-2"
                >
                  {project.title}
                </a>
              ) : (
                project.title
              )}
            </h2>
            {project.image &&
              (project.link ? (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.title} — open live site`}
                  className="mt-4 block"
                >
                  <Image
                    src={project.image}
                    alt={`${project.title} preview`}
                    width={800}
                    height={600}
                    sizes="100vw"
                    className="aspect-[16/11] w-full rounded-xl border border-border object-cover"
                  />
                </a>
              ) : (
                <Image
                  src={project.image}
                  alt={`${project.title} preview`}
                  width={800}
                  height={600}
                  sizes="100vw"
                  className="mt-4 aspect-[16/11] w-full rounded-xl border border-border object-cover"
                />
              ))}
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {project.description}
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted">
              {project.stack.join(" · ")}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
