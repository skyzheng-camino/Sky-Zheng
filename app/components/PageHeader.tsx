import Reveal from "./Reveal";

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="glow pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto max-w-5xl px-6 py-20">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent-2">
            {eyebrow}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-4 max-w-2xl text-lg text-muted">{subtitle}</p>
        </Reveal>
      </div>
    </section>
  );
}
