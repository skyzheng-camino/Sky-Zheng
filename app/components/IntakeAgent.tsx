"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Floating intake agent. Panda launcher in the bottom-right corner; the chat
 * opens as a card on desktop and as a full-screen sheet on phones.
 *
 * The panda is redrawn as SVG from `public/Panda Chat Icon.html`, which builds
 * the face out of absolutely-positioned divs at a fixed 176x168. Divs at a
 * fixed pixel size can't scale to a 60px launcher without transform math, so
 * the geometry is mapped once into a 400-unit viewBox here and scales for free.
 * Colours and the bob timing are carried over unchanged.
 *
 * Every style lives in this file on purpose — the widget is meant to be liftable
 * into another project without touching globals.css.
 */

type Msg = { role: "user" | "model"; text: string };

const OPENER =
  "Hey — I'm Sky's intake assistant. Tell me what you're working on and I'll tell you whether he's a fit, then pass the details along.";

const PROMPTS = [
  "I want to automate lead follow-up",
  "What has he built with FastAPI?",
  "Is he free for an internship?",
];

const MAX_CHARS = 1000;
const CONTACT = "sky.zheng2019@gmail.com";

/* ------------------------------------------------------------------ *
 * The panda
 * ------------------------------------------------------------------ */

function Panda({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" focusable="false">
      {/* Backdrop sits outside the bobbing group so the head moves against it. */}
      <circle cx="200" cy="200" r="170" fill="#d7e8f5" />
      <g className="pa-bob">
        <circle cx="114" cy="139" r="40" fill="#35302f" />
        <circle cx="286" cy="139" r="40" fill="#35302f" />
        <ellipse cx="200" cy="235" rx="120" ry="112" fill="#f9f6f0" />
        <ellipse className="pa-blush" cx="111" cy="257" rx="21" ry="12" fill="#f2a3ab" />
        <ellipse className="pa-blush" cx="289" cy="257" rx="21" ry="12" fill="#f2a3ab" />
        <ellipse cx="137" cy="210" rx="40" ry="45" fill="#35302f" transform="rotate(-16 137 210)" />
        <ellipse cx="263" cy="210" rx="40" ry="45" fill="#35302f" transform="rotate(16 263 210)" />
        <g className="pa-eyes">
          <ellipse cx="150" cy="217" rx="18" ry="20" fill="#ffffff" />
          <ellipse cx="250" cy="217" rx="18" ry="20" fill="#ffffff" />
          <circle cx="150" cy="218" r="11" fill="#35302f" />
          <circle cx="250" cy="218" r="11" fill="#35302f" />
          {/* Both glints sit right of centre, as in the original — one light source. */}
          <circle cx="156" cy="213" r="4" fill="#ffffff" />
          <circle cx="254" cy="213" r="4" fill="#ffffff" />
        </g>
        <ellipse cx="200" cy="260" rx="14" ry="9" fill="#35302f" />
        <path d="M200 268 v12" stroke="#35302f" strokeWidth="4.3" strokeLinecap="round" />
        <path
          d="M178 281 q11 15 22 0 q11 15 22 0"
          fill="none"
          stroke="#35302f"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Widget
 * ------------------------------------------------------------------ */

export default function IntakeAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "model", text: OPENER }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const atEmptyState = messages.length === 1;

  /* Auto-scroll to the newest message. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, busy, open]);

  /* Focus the input on open; hand focus back to the launcher on close.
     Skipped on mount — `open` starts false, so without this guard the effect
     would fire on every page load, pull focus to the launcher, and leave it
     ringed before the visitor has touched anything. */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (open) {
      inputRef.current?.focus();
    } else {
      launcherRef.current?.focus({ preventScroll: true });
    }
    // Only react to open/close, not to every render.
  }, [open]);

  /* Escape closes. Bound on the document so it works wherever focus sits. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* Lock the page behind the full-screen sheet on phones. Desktop keeps
     scrolling, since the card only covers a corner. */
  useEffect(() => {
    if (!open) return;
    if (!matchMedia("(max-width: 639px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Grow the textarea with its content, up to a ceiling. */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, MAX_CHARS);
      if (!trimmed || busy || done) return;

      const next: Msg[] = [...messages, { role: "user", text: trimmed }];
      setMessages(next);
      setInput("");
      setBusy(true);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const data = await res.json();
        setMessages((m) => [
          ...m,
          {
            role: "model",
            text: data.reply ?? `Something went wrong. Email ${CONTACT} and it'll get through.`,
          },
        ]);
        if (data.done) setDone(true);
      } catch {
        setMessages((m) => [
          ...m,
          { role: "model", text: `Connection dropped. Try again, or email ${CONTACT}.` },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [messages, busy, done]
  );

  /**
   * Start over after a lead has been submitted.
   *
   * Client state only — there is nothing to tear down on the server, since
   * every request carries its own full message array. A second completed
   * conversation writes a second row to `inquiries`, which is the intended
   * behaviour: it's a genuinely separate enquiry.
   */
  const startNewChat = useCallback(() => {
    setMessages([{ role: "model", text: OPENER }]);
    setInput("");
    setDone(false);
    setBusy(false);
    // The textarea is still disabled this frame; focus it once it re-enables.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  return (
    <>
      <style>{`
        @keyframes pa-bob {
          0%, 100% { transform: translateY(0) rotate(-0.5deg); }
          50%      { transform: translateY(-7px) rotate(0.5deg); }
        }
        /* Open almost all the time; the closed frame is a 3% sliver. */
        @keyframes pa-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95%           { transform: scaleY(0.08); }
        }
        @keyframes pa-pop {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes pa-dot { 0%, 80%, 100% { transform: translateY(0); opacity: .45; }
                            40% { transform: translateY(-4px); opacity: 1; } }

        .pa-bob   { animation: pa-bob 5.5s ease-in-out infinite;
                    transform-box: fill-box; transform-origin: 50% 85%; }
        .pa-eyes  { animation: pa-blink 5.2s ease-in-out infinite;
                    transform-box: fill-box; transform-origin: center; }
        .pa-blush { opacity: 0; transition: opacity 240ms ease; }
        .pa-launch:hover .pa-blush,
        .pa-launch:focus-visible .pa-blush { opacity: 1; }
        .pa-panel { animation: pa-pop 260ms cubic-bezier(0.16, 1, 0.3, 1); }
        .pa-dot   { animation: pa-dot 1.1s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .pa-bob, .pa-eyes, .pa-panel, .pa-dot { animation: none !important; }
          .pa-blush { transition: none !important; }
        }
      `}</style>

      {/* ---------------------------------------------------------- *
       * Panel. Full-screen sheet under 640px, corner card above it.
       * ---------------------------------------------------------- */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Chat with Sky's intake assistant"
          className={[
            "pa-panel fixed z-[70] flex flex-col overflow-hidden bg-card",
            // phones: cover the screen, no rounding, respect the notch
            "inset-0 rounded-none",
            // sm+: a card floating above the launcher
            "sm:inset-auto sm:bottom-[6.5rem] sm:right-5 sm:rounded-2xl",
            "sm:h-[min(34rem,calc(100dvh-9rem))] sm:w-[min(23rem,calc(100vw-2.5rem))]",
            "sm:border sm:border-border sm:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]",
          ].join(" ")}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Header */}
          <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
            <Panda className="h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">Intake assistant</p>
              <p className="truncate text-[11px] text-muted">Answers from Sky&apos;s actual work</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </header>

          {/* Transcript. data-lenis-prevent keeps Lenis from stealing the wheel
              and scrolling the page instead of this list. */}
          <div
            ref={scrollRef}
            data-lenis-prevent
            aria-live="polite"
            aria-atomic="false"
            className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[13px] leading-relaxed text-white"
                      : "max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-border bg-background/60 px-3.5 py-2 text-[13px] leading-relaxed text-foreground/90"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-1.5 px-1" role="status" aria-label="Assistant is typing">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="pa-dot h-1.5 w-1.5 rounded-full bg-muted"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            )}

            {atEmptyState && !busy && (
              <div className="flex flex-wrap gap-2 pt-1">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer. Once a lead is in, the input is replaced outright by a
              way to start over — a permanently disabled box is a dead end. */}
          <div className="shrink-0 border-t border-border px-4 py-3">
            {done ? (
              <button
                onClick={startNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-accent hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16.5 8A6.5 6.5 0 105.6 14.2M16.5 4v4h-4" />
                </svg>
                Start a new chat
              </button>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="What are you working on?"
                  maxLength={MAX_CHARS}
                  aria-label="Message"
                  /* 16px keeps iOS Safari from zooming the page on focus. */
                  className="max-h-28 min-h-[2.25rem] flex-1 resize-none bg-transparent text-[16px] leading-snug text-foreground outline-none placeholder:text-muted/70 sm:text-[13px]"
                />
                <button
                  onClick={() => send(input)}
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 10h11M10 5l5 5-5 5" />
                  </svg>
                </button>
              </div>
            )}

            <div className="mt-2 flex items-start justify-between gap-3">
              <p className="text-[10px] leading-relaxed text-muted/70">
                Messages are processed by Google Gemini and may be used to improve their models.
                Don&apos;t send anything confidential.
              </p>
              {input.length > MAX_CHARS - 100 && (
                <span className="shrink-0 text-[10px] tabular-nums text-muted/70">
                  {MAX_CHARS - input.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- *
       * Launcher. Hidden on phones while the sheet covers the screen.
       * ---------------------------------------------------------- */}
      <button
        ref={launcherRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Chat with Sky's intake assistant"}
        className={[
          "pa-launch group fixed z-[60] right-5 bottom-5 flex items-center gap-2.5",
          "rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open ? "hidden sm:flex" : "flex",
        ].join(" ")}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Always visible, at every width. The tail is carried over from the
            original artwork so it reads as a speech bubble rather than a chip. */}
        <span className="pointer-events-none relative rounded-2xl bg-[#cfe3f2] px-3 py-1.5 text-[12px] font-bold whitespace-nowrap text-[#34302f] shadow-lg transition-transform duration-200 group-hover:-translate-x-0.5 sm:text-[13px]">
          Chat with me
          <span className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-tr bg-[#cfe3f2]" />
        </span>
        <span className="grid h-[60px] w-[60px] place-items-center rounded-full shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95 sm:h-[68px] sm:w-[68px]">
          <Panda className="h-full w-full" />
        </span>
      </button>
    </>
  );
}
