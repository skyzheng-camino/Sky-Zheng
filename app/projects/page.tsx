import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";
import ProjectShowcase from "../components/ProjectShowcase";
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
        subtitle="Software I've designed, built, and shipped: backends, web apps, and marketing sites. Hover a project to see it."
      />

      <section className="mx-auto w-full max-w-[90vw] py-16">
        <Reveal>
          <ProjectShowcase projects={projects} />
        </Reveal>
      </section>
    </div>
  );
}
