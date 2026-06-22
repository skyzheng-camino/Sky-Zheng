import Image from "next/image";
import Link from "next/link";
import Reveal from "./components/Reveal";
import { SITE, tools, type Tool } from "./lib/data";

const categoryColors: Record<Tool["category"], string> = {
  Language: "text-sky-300 ring-sky-400/30 bg-sky-400/10",
  Framework: "text-violet-300 ring-violet-400/30 bg-violet-400/10",
  Tool: "text-emerald-300 ring-emerald-400/30 bg-emerald-400/10",
  Platform: "text-amber-300 ring-amber-400/30 bg-amber-400/10",
};

function ToolCard({ tool, delay }: { tool: Tool; delay: number }) {
  return (
    <Reveal direction="scale" delay={delay}>
      {/* Gradient border + glow wrapper */}
      <div className="group rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 p-[1.5px] shadow-[0_0_25px_-8px_rgba(124,58,237,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.6)]">
        <div className="relative h-44 overflow-hidden rounded-2xl bg-card p-5">
          {/* Front: logo + category + name */}
          <div className="flex h-full flex-col justify-between transition-opacity duration-300 group-hover:opacity-0">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md ${
                  tool.name === "Vercel" ? "bg-black" : "bg-white"
                }`}
              >
                <Image
                  src={tool.logo}
                  alt={`${tool.name} logo`}
                  width={36}
                  height={36}
                  className={`object-contain ${
                    tool.name === "Python" || tool.name === "Docker"
                      ? "h-9 w-9"
                      : "h-7 w-7"
                  }`}
                  unoptimized
                />
              </span>
              <span
                className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${categoryColors[tool.category]}`}
              >
                {tool.category}
              </span>
            </div>
            <h3 className="text-lg font-semibold leading-snug">{tool.name}</h3>
          </div>

          {/* Back: description (revealed on hover/focus) */}
          <div className="pointer-events-none absolute inset-0 flex items-center rounded-2xl bg-card/95 p-5 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
            <p className="text-sm leading-relaxed text-muted">
              {tool.description}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="glow pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-5xl px-6 py-28 sm:py-36">
          <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.2em] text-accent-2">
            {SITE.role}
          </p>
          <h1
            className="animate-fade-up mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Hello, I&apos;m <span className="text-gradient">{SITE.name}</span>.
            <br />I build things for the web — front to back.
          </h1>
          <p
            className="animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: "160ms" }}
          >
            A full-stack developer who ships industry-grade software — from
            asynchronous data-ingestion pipelines and REST APIs to authenticated
            web apps and responsive marketing sites.
          </p>
          <div
            className="animate-fade-up mt-10 flex flex-wrap gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/projects"
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105"
            >
              View my work
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:border-accent/60 hover:bg-accent/10"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* Tools section */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <Reveal>
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Tools, Languages &amp; Frameworks
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mb-10 max-w-2xl text-muted">
            The stack I reach for. Hover over any card to learn what each one is.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => (
            <ToolCard key={tool.name} tool={tool} delay={(i % 3) * 80} />
          ))}
        </div>
      </section>
    </div>
  );
}
