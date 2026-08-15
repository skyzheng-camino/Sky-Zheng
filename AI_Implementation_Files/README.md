# Portfolio Intake Agent

An AI intake and qualification agent for a Next.js portfolio. A visitor
describes what they need; the agent answers from a curated profile, extracts
structured lead data, writes it to Supabase, and emails a brief.

Runs entirely on free tiers.

---

## File map

```
sql/schema.sql              Run once in the Supabase SQL editor
lib/profile.ts              Knowledge base + system prompt  <- edit this most
app/api/agent/route.ts      Server route: model call, rate limit, DB, email
components/IntakeAgent.tsx  Chat UI (Tailwind)
.env.example                Copy to .env.local
```

Drop these into your existing Next.js App Router project at the same paths.

---

## Setup

**1. Dependency**

```bash
npm install @supabase/supabase-js
```

That's the only one. The Gemini and Resend calls are plain `fetch`.

**2. Database**

Supabase Dashboard → SQL Editor → New query → paste `sql/schema.sql` → Run.

**3. Keys**

```bash
cp .env.example .env.local
```

- `GEMINI_API_KEY` — aistudio.google.com/apikey (free, no card)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API
- `RESEND_API_KEY` — resend.com, optional
- `IP_SALT` — `openssl rand -hex 16`

**4. Mount it**

```tsx
import IntakeAgent from "@/components/IntakeAgent";

export default function ContactPage() {
  return (
    <main>
      <h1>Contact</h1>
      <IntakeAgent />
    </main>
  );
}
```

**5. Run**

```bash
npm run dev
```

Then deploy: push to GitHub, and add the same variables under
Vercel → Project → Settings → Environment Variables. They do not sync from
`.env.local` automatically.

---

## Tuning

Almost all behavior lives in `lib/profile.ts`. Change the prompt, redeploy,
watch the agent behave differently. Things worth adjusting after you watch real
conversations:

- **Too pushy about email?** Loosen the capture rules.
- **Making things up?** Tighten the "answer ONLY from the profile" rule and add
  the missing facts to `PROFILE`.
- **Replies too long?** Lower the word cap in the Voice section.

Read your own transcripts weekly:

```sql
select created_at, fit_score, project_type, email, summary
from inquiries
order by created_at desc
limit 20;
```

The transcripts are the real product. They tell you what visitors actually
want, which is exactly the research you need when pitching this same system to
paying clients.

---

## Reskinning this for a client

The whole point. For a roofing company or a law firm:

1. Replace `PROFILE` with their services, service area, and FAQs.
2. Change the `projectType` and `budgetSignal` enums in `RESPONSE_SCHEMA` to
   their categories (`roof_repair`, `full_replacement`, `inspection`).
3. Point `NOTIFY_EMAIL` at their office, or POST to their CRM instead.
4. Restyle the component.

Roughly a day of work per client after the first one.

---

## Cost at scale

Free tier covers ~1,500 model requests/day. If you outgrow it, Gemini Flash is
cheap enough that a busy contact form costs single-digit dollars a month. The
free tier's real limits are the absent SLA and the training-data clause, not
the request cap.

## Known limits

- **No streaming.** Responses arrive complete after 1–3s. Streaming is a
  worthwhile upgrade but adds real complexity; ship this first.
- **Gemini free tier may train on prompts.** The UI discloses this. Switch to
  Groq or paid Gemini before handling anything sensitive.
- **Rate limit is per-IP.** Fine for a portfolio, trivially bypassed by someone
  determined. Add Turnstile if you get abused.
