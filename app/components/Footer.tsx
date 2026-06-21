import { SITE } from "../lib/data";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="text-lg font-semibold tracking-tight">{SITE.name}</p>
          <p className="text-sm text-muted">{SITE.role}</p>
        </div>

        <div className="flex flex-col gap-2 text-sm sm:items-end">
          <a
            href={`mailto:${SITE.email}`}
            className="group inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground"
          >
            <span aria-hidden className="text-accent-2">
              ✉
            </span>
            <span className="group-hover:underline">{SITE.email}</span>
          </a>
          <a
            href={`tel:${SITE.phone.replace(/[^0-9]/g, "")}`}
            className="group inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground"
          >
            <span aria-hidden className="text-accent-2">
              ✆
            </span>
            <span className="group-hover:underline">{SITE.phone}</span>
          </a>
        </div>
      </div>

      <div className="border-t border-border/60">
        <p className="mx-auto max-w-5xl px-6 py-4 text-xs text-muted">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
