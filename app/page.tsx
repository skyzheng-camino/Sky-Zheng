import Link from "next/link";
import BioSection from "./components/BioSection";
import HeroBackdrop from "./components/HeroBackdrop";
import HeroStars from "./components/HeroStars";
import PandaParticles from "./components/PandaParticles";
import Reveal from "./components/Reveal";
import ToolDeck from "./components/ToolDeck";
import { SITE, tools } from "./lib/data";

export default function Home() {
  return (
    // Clip horizontal overflow page-wide: scroll-in transforms and the
    // scaled hero backdrop/stars can poke past the viewport edge on
    // narrow screens, which would otherwise add a horizontal scrollbar.
    // `clip` (x-only) leaves vertical scrolling and the sticky navbar
    // (rendered outside this tree) untouched.
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative -mt-16 flex min-h-[100svh] items-center">
        <HeroBackdrop />
        <div className="glow pointer-events-none absolute inset-0 -z-10" />
        {/* Radial scrim: dims the bright planet core behind the headline */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_42%_at_50%_50%,rgba(4,6,12,0.55),transparent_72%)]" />
        <HeroStars />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-center sm:gap-8">
          <p
            className="animate-fade-up text-2xl font-medium uppercase tracking-[0.2em] text-accent-2 drop-shadow-[0_2px_10px_rgba(4,6,12,0.9)] sm:text-right sm:text-3xl"
            style={{ animationDelay: "160ms" }}
          >
            Full-Stack
          </p>
          {/* drop-shadow (not text-shadow): shadows bleed through the
              transparent fill of background-clipped gradient text */}
          <h1 className="animate-fade-up text-center text-5xl font-bold leading-tight tracking-tight drop-shadow-[0_3px_18px_rgba(4,6,12,0.9)] sm:text-7xl md:text-8xl">
            <span className="text-gradient-bright">{SITE.name}</span>
          </h1>
          <p
            className="animate-fade-up text-2xl font-medium uppercase tracking-[0.2em] text-accent-2 drop-shadow-[0_2px_10px_rgba(4,6,12,0.9)] sm:text-3xl"
            style={{ animationDelay: "160ms" }}
          >
            Developer
          </p>
        </div>
      </section>

      {/* Bio: text + CTA on the left, circular photo on the right.
          Slides in on scroll (see BioSection). */}
      <BioSection />

      {/* Intro (below the fold): full-width panda with overlaid copy */}
      <section className="relative w-full overflow-hidden">
        <PandaParticles />
        {/* Overlay sits on the right; pointer-events pass through to the
            canvas except on the buttons themselves. */}
        <div className="pointer-events-none px-6 pb-16 sm:absolute sm:inset-y-0 sm:right-8 sm:flex sm:w-[36%] sm:flex-col sm:justify-center sm:p-0 lg:right-16">
          <Reveal>
            <p className="text-lg leading-relaxed text-muted">
              A full-stack developer who ships industry-grade UI animations and 
              complex software from asynchronous data-ingestion pipelines and 
              REST APIs to authenticated web apps and responsive marketing 
              sites. Also, a lifelong learner who loves to explore new software.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="pointer-events-auto mt-10 flex flex-wrap gap-4">
              <Link
                href="/projects"
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105"
              >
                View my work
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tools section. The heading is held to the text column; the deck
          itself runs full-bleed so the whole width is draggable. */}
      <section className="pb-28">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Tools, Languages &amp; Frameworks
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mb-8 max-w-2xl text-muted">
              The stack I reach for, dealt as a hand of cards. Drag the deck,
              swipe sideways, or use the arrows to bring a card to the top.
            </p>
          </Reveal>
        </div>

        <ToolDeck tools={tools} />
      </section>
    </div>
  );
}
