import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SYSTEM_PROMPT } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 60; // Cold calls to Gemini have been measured near 30s.

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */

const MODEL = "gemini-3.6-flash"; // Flash tier = generous free quota. Never a Pro model: 50 req/day.
const MAX_TURNS = 24; // messages, not exchanges
const MAX_CHARS = 1000; // per message
const RATE_LIMIT = 30; // requests per IP...
const RATE_WINDOW_MIN = 60; // ...per this many minutes
// Per attempt. Two attempts plus backoff must fit inside maxDuration, so this
// is capped well under it: 25 + 1.2 + 25 = ~51s worst case.
const MODEL_TIMEOUT_MS = 25_000;
const RETRY_BACKOFF_MS = 1_200;

const CONTACT = "sky.zheng2019@gmail.com";

/**
 * Lazily built, not created at module scope.
 *
 * `next build` imports this module to collect page data, so a top-level
 * createClient() call makes the *build* depend on runtime secrets — it throws
 * "supabaseUrl is required" anywhere the vars aren't present, which is exactly
 * what happens on a fresh Vercel deploy. Deferring it to the first request
 * keeps the build environment-independent.
 */
let _supabase: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only, never NEXT_PUBLIC_
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");

  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

/* ------------------------------------------------------------------ *
 * The shape we force the model to return.
 * Gemini validates against this, so we never parse freeform text.
 * ------------------------------------------------------------------ */

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    readyToSubmit: { type: "BOOLEAN" },
    lead: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", nullable: true },
        email: { type: "STRING", nullable: true },
        company: { type: "STRING", nullable: true },
        projectType: {
          type: "STRING",
          enum: [
            "automation",
            "web_app",
            "api_backend",
            "marketing_site",
            "job_opportunity",
            "other",
            "unknown",
          ],
        },
        budgetSignal: {
          type: "STRING",
          enum: ["unknown", "under_1k", "1k_5k", "5k_15k", "over_15k"],
        },
        timeline: {
          type: "STRING",
          enum: ["unknown", "asap", "weeks", "months", "exploring"],
        },
        fitScore: { type: "INTEGER" },
        summary: { type: "STRING" },
      },
      required: ["projectType", "budgetSignal", "timeline", "fitScore", "summary"],
    },
  },
  required: ["reply", "readyToSubmit", "lead"],
};

type Msg = { role: "user" | "model"; text: string };

type Lead = {
  name: string | null;
  email: string | null;
  company: string | null;
  projectType: string;
  budgetSignal: string;
  timeline: string;
  fitScore: number;
  summary: string;
};

type ModelOutput = {
  reply: string;
  readyToSubmit: boolean;
  lead: Lead;
};

/* ------------------------------------------------------------------ *
 * Rate limiting — hashed IP, stored in Supabase. No extra service.
 * ------------------------------------------------------------------ */

function hashIp(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256")
    .update(ip + (process.env.IP_SALT ?? ""))
    .digest("hex");
}

async function underLimit(ipHash: string): Promise<boolean> {
  // Fail open throughout: a broken or unconfigured rate limiter should not
  // take the widget down with it. Most visitors only ever ask questions, and
  // those cost nothing to serve.
  try {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();

    const { count } = await db()
      .from("agent_hits")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    // count is null when the query itself failed.
    if ((count ?? 0) >= RATE_LIMIT) return false;

    await db().from("agent_hits").insert({ ip_hash: ipHash });
    return true;
  } catch (err) {
    console.error("[agent] rate limit unavailable:", err instanceof Error ? err.message : err);
    return true;
  }
}

/* ------------------------------------------------------------------ *
 * Model call. Swapping providers means rewriting only this function.
 * ------------------------------------------------------------------ */

async function callModel(messages: Msg[]): Promise<ModelOutput> {
  // Gemini returns transient 503s often enough to be visible to visitors, and
  // a cold call has been measured near 30s while warm ones land in ~5s. One
  // retry covers both. This is not a second extraction pass — the first call
  // produced nothing. 429 is never retried; that would only deepen the limit.
  try {
    return await callModelOnce(messages);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const retryable = msg === "UPSTREAM_UNAVAILABLE" || /timeout|aborted/i.test(msg);
    if (!retryable) throw err;

    console.warn("[agent] retrying after:", msg);
    await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
    return callModelOnce(messages);
  }
}

async function callModelOnce(messages: Msg[]): Promise<ModelOutput> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
        generationConfig: {
          temperature: 0.4,
          // Reasoning tokens count against this budget (measured 270-460 of
          // them per turn), and a truncated response is invalid JSON. The
          // headroom is free — only tokens actually produced are billed.
          maxOutputTokens: 3000,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    }
  );

  if (res.status === 429) throw new Error("RATE_LIMITED_UPSTREAM");
  // 500/503 are transient upstream blips; the visitor should be told to retry,
  // not that something is permanently broken.
  if (res.status >= 500) throw new Error("UPSTREAM_UNAVAILABLE");
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty completion");

  return JSON.parse(text) as ModelOutput;
}

/* ------------------------------------------------------------------ *
 * Notification
 * ------------------------------------------------------------------ */

async function emailBrief(lead: Lead, transcript: Msg[]): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const body = [
    `Fit score: ${lead.fitScore}/100`,
    `Name:      ${lead.name ?? "—"}`,
    `Email:     ${lead.email ?? "—"}`,
    `Company:   ${lead.company ?? "—"}`,
    `Type:      ${lead.projectType}`,
    `Budget:    ${lead.budgetSignal}`,
    `Timeline:  ${lead.timeline}`,
    ``,
    lead.summary,
    ``,
    `--- transcript ---`,
    ...transcript.map((m) => `${m.role === "user" ? "Visitor" : "Agent"}: ${m.text}`),
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Portfolio Agent <onboarding@resend.dev>", // swap for your domain once verified
      to: [process.env.NOTIFY_EMAIL],
      subject: `[${lead.fitScore}] ${lead.projectType} — ${lead.name ?? lead.email ?? "new inquiry"}`,
      text: body,
    }),
  });

  if (!res.ok) {
    console.error("[agent] resend", res.status, await res.text());
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * Persistence. Isolated so a database failure never costs the visitor
 * their reply — the conversation already succeeded at this point.
 * ------------------------------------------------------------------ */

async function persistLead(lead: Lead, transcript: Msg[]): Promise<void> {
  try {
    const emailed = await emailBrief(lead, transcript);

    // fit_score has a 0-100 CHECK constraint. Clamp rather than let a stray
    // model value reject the whole insert.
    const fitScore = Math.max(0, Math.min(100, Math.round(Number(lead.fitScore) || 0)));

    const { error } = await db().from("inquiries").insert({
      name: lead.name ?? null,
      email: lead.email ?? null,
      company: lead.company ?? null,
      project_type: lead.projectType,
      budget_signal: lead.budgetSignal,
      timeline: lead.timeline,
      fit_score: fitScore,
      summary: lead.summary,
      transcript,
      emailed,
    });

    if (error) console.error("[agent] insert", error.message);
  } catch (err) {
    console.error("[agent] persist", err instanceof Error ? err.message : err);
  }
}

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */

export async function POST(req: Request) {
  try {
    const ipHash = hashIp(req);
    if (!(await underLimit(ipHash))) {
      return Response.json(
        {
          reply: `You've hit the message limit for now. Email ${CONTACT} and I'll get back to you directly.`,
          done: true,
        },
        { status: 429 }
      );
    }

    const { messages } = (await req.json()) as { messages?: Msg[] };

    // Validate client input. Never trust the browser.
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { reply: "I didn't catch that — try sending your message again.", done: false },
        { status: 400 }
      );
    }
    const clean: Msg[] = messages.slice(-MAX_TURNS).map((m) => ({
      role: m?.role === "model" ? "model" : "user",
      text: String(m?.text ?? "").slice(0, MAX_CHARS),
    }));

    const out = await callModel(clean);

    if (out.readyToSubmit && out.lead) {
      const transcript: Msg[] = [...clean, { role: "model", text: out.reply }];
      await persistLead(out.lead, transcript);
    }

    // Only the reply crosses the wire. Scores and internal fields stay server-side.
    return Response.json({ reply: out.reply, done: out.readyToSubmit });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agent]", message);

    const transient =
      message === "RATE_LIMITED_UPSTREAM" ||
      message === "UPSTREAM_UNAVAILABLE" ||
      /timeout|aborted/i.test(message);

    const reply = transient
      ? `I'm getting a lot of traffic right now. Try again in a minute, or email ${CONTACT}.`
      : `Something broke on my end. Email ${CONTACT} and it'll get through.`;

    // HTTP 200 on purpose. A broken widget is worse than a graceful one.
    return Response.json({ reply, done: false }, { status: 200 });
  }
}
