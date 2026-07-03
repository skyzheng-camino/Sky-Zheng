import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";
import Reveal from "../components/Reveal";
import { experiences } from "../lib/data";

export const metadata: Metadata = {
  title: "Experience",
  description: "My work, research, and academic experiences as a developer.",
};

export default function ExperiencePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Background"
        title="Experience"
        subtitle="Internships, research, teaching, and the experiences that shaped how I build software."
      />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <ol className="relative border-l border-border">
          {experiences.map((exp, i) => (
            <Reveal
              key={exp.title}
              as="li"
              direction="right"
              delay={(i % 3) * 60}
              className="mb-10 ml-6 last:mb-0"
            >
              {/* Timeline node */}
              <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-accent bg-background" />

              <div className="group rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 p-[1.5px] shadow-[0_0_25px_-8px_rgba(124,58,237,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.6)]">
                <div className="rounded-2xl bg-card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {exp.title}
                  </h2>
                  <span className="rounded-full bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent-2 ring-1 ring-accent/25">
                    {exp.period}
                  </span>
                </div>
                <p className="mt-1 text-sm text-accent-2/90">{exp.org}</p>
                <ul className="mt-4 space-y-2">
                  {exp.points.map((point, j) => (
                    <li
                      key={j}
                      className="flex gap-2 text-sm leading-relaxed text-muted"
                    >
                      <span aria-hidden className="mt-2 text-accent">
                        ▹
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>
    </div>
  );
}
