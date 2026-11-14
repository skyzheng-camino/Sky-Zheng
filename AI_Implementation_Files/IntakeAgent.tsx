"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "model"; text: string };

const OPENER =
  "Hey — I'm Sky's intake assistant. Tell me what you're working on and I'll tell you whether he's a fit, then pass the details along.";

const PROMPTS = [
  "I run a small business and want to automate lead follow-up",
  "What has he built with FastAPI?",
  "Is he available for a summer internship?",
];

export default function IntakeAgent() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "model", text: OPENER }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

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
      setMessages((m) => [...m, { role: "model", text: data.reply }]);
      if (data.done) setDone(true);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "model", text: "Connection dropped. Try again, or email sky.zheng2019@gmail.com." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-[560px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
      <header className="flex items-center gap-2.5 border-b border-white/10 px-5 py-3.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-sm font-medium tracking-tight text-white/90">Intake assistant</span>
        <span className="ml-auto text-[11px] text-white/40">answers from Sky's actual work</span>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-sm leading-relaxed text-neutral-900"
                  : "max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-white/85"
              }
            >
              {m.text}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex gap-1.5 px-1" aria-label="Thinking">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}

        {messages.length === 1 && !busy && (
          <div className="flex flex-wrap gap-2 pt-1">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/30 hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            disabled={done}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={done ? "Sent — Sky will follow up." : "What are you working on?"}
            maxLength={1000}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm text-white/90 placeholder:text-white/30 focus:outline-none disabled:opacity-40"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || done || !input.trim()}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition disabled:opacity-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Send
          </button>
        </div>
        <p className="mt-2.5 text-[10px] leading-relaxed text-white/30">
          Messages are processed by Google Gemini and may be used to improve their models. Don't
          send anything confidential.
        </p>
      </div>
    </div>
  );
}
