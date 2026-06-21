import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";
import Reveal from "../components/Reveal";
import { SITE } from "../lib/data";

export const metadata: Metadata = {
  title: "Contact",
  description: `Send a message to ${SITE.name}.`,
};

const inputClasses =
  "w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/30";

function RequiredMark() {
  return (
    <span aria-hidden className="text-red-400">
      {" "}
      *
    </span>
  );
}

export default function ContactPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Say hello"
        title="Contact"
        subtitle="Have a project, role, or question in mind? Send a message and I'll get back to you."
      />

      <section className="mx-auto max-w-2xl px-6 py-16">
        <Reveal>
          <form
            action={`https://formsubmit.co/${SITE.email}`}
            method="POST"
            className="space-y-5 rounded-2xl border border-border bg-card p-7"
          >
            {/* FormSubmit configuration */}
            <input
              type="hidden"
              name="_subject"
              value="New message from your portfolio"
            />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            {/* Honeypot spam trap (kept off-screen) */}
            <input
              type="text"
              name="_honey"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
            />

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Name
                <RequiredMark />
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your name"
                className={inputClasses}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Email
                <RequiredMark />
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className={inputClasses}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium"
              >
                Phone <span className="text-muted">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(optional)"
                className={inputClasses}
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium"
              >
                Message
                <RequiredMark />
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="What's on your mind?"
                className={`${inputClasses} resize-y`}
              />
            </div>

            <p className="text-xs text-muted">
              Fields marked with <span className="text-red-400">*</span> are
              required.
            </p>

            <button
              type="submit"
              className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-100"
            >
              Send message
            </button>
          </form>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-8 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:gap-6">
            <span>Or reach me directly:</span>
            <a
              href={`mailto:${SITE.email}`}
              className="text-foreground transition-colors hover:text-accent-2"
            >
              {SITE.email}
            </a>
            <a
              href={`tel:${SITE.phone.replace(/[^0-9]/g, "")}`}
              className="text-foreground transition-colors hover:text-accent-2"
            >
              {SITE.phone}
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
