import type { Metadata } from "next";
import Image from "next/image";
import PageHeader from "../components/PageHeader";
import Reveal from "../components/Reveal";
import { projects } from "../lib/data";

export const metadata: Metadata = {
  title: "Projects",
  description: "A selection of software projects I've designed and built.",
};

function ImagePlaceholder() {
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-border bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-cyan-400/10">
      <div className="flex flex-col items-center gap-2 text-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-10 w-10 opacity-60"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <span className="text-xs">Image coming soon</span>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        subtitle="Software I've designed, built, and shipped — backends, web apps, and marketing sites."
      />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="space-y-10">
          {projects.map((project, i) => {
            const imageFirst = i % 2 === 1;
            return (
              <Reveal key={project.title} direction={imageFirst ? "right" : "left"}>
                <div className="group rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 p-[1.5px] shadow-[0_0_25px_-8px_rgba(124,58,237,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.6)]">
                <article className="grid items-center gap-8 rounded-2xl bg-card p-6 sm:p-8 md:grid-cols-2">
                  {/* Image side */}
                  <div className={imageFirst ? "md:order-2" : ""}>
                    {project.image ? (
                      <Image
                        src={project.image}
                        alt={`${project.title} preview`}
                        width={800}
                        height={600}
                        className="aspect-[4/3] w-full rounded-xl object-cover"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>

                  {/* Text side */}
                  <div className={imageFirst ? "md:order-1" : ""}>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-2">
                      Project {String(i + 1).padStart(2, "0")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {project.title}
                      </h2>
                      <span className="text-sm font-medium text-accent-2">
                        {project.org}
                      </span>
                    </div>
                    <p className="mt-3 leading-relaxed text-muted">
                      {project.description}
                    </p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {project.stack.map((tech) => (
                        <li
                          key={tech}
                          className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground/80 transition-colors group-hover:border-accent/40"
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </div>
  );
}
