import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";
import Reveal from "../components/Reveal";
import { projects } from "../lib/data";

export const metadata: Metadata = {
  title: "Projects",
  description: "A selection of software projects I've designed and built.",
};

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        subtitle="Software I've designed, built, and shipped — backends, web apps, and marketing sites."
      />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6">
          {projects.map((project, i) => (
            <Reveal
              key={project.title}
              direction={i % 2 === 0 ? "left" : "right"}
            >
              <article className="group rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
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
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
