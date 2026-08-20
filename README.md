# ACC WealthOps AI — Prototype

AI-assisted wealth operations demo built for **Vijay WealthDesk, powered by ACC**.
This is a sales and discovery prototype: synthetic data, demo authentication,
deterministic mock AI, no real financial transactions. See the companion
**BRD** and **SOW** documents for full requirements and delivery scope.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM
· PostgreSQL · Zod · Recharts · lucide-react · next-themes

> **Note on the BRD's technical architecture section:** the BRD specifies
> Prisma. This build uses **Drizzle ORM** instead — same Postgres target, same
> schema, but pure TypeScript with no native binary downloads, which made it
> possible to build and verify in a network-restricted environment. Migrating
> back to Prisma is a schema-definition change only; nothing above the data
> layer depends on which ORM is used.

## Architecture

The app is built around two swap seams described in the BRD, so production
components can replace demo components without touching the UI:

- **`DataProvider`** (`src/services/data/`) — today, `MockDataProvider` reads
  seeded records from Postgres. `NJWealthProvider`, `CRMProvider` and
  `MarketDataProvider` implement the same interface once an authorized
  integration mechanism exists (BRD §12, §29).
- **`AIService`** (`src/services/ai/`) — today, `MockAIService` generates
  review briefs and assistant replies deterministically from the database.
  `BedrockAIService` implements the same interface with grounded retrieval
  and tool calling (BRD §13).

The priority/opportunity engine (`src/services/priority/engine.ts`) is a
transparent rule engine, not a model — every score is a sum of named,
human-readable factors. Weights are configuration, not hard-coded UI logic
(BRD §8).

Document storage (`src/services/storage/`) uses Amazon S3 when
`S3_BUCKET`/AWS credentials are set, and degrades to metadata-only tracking
otherwise — a missing AWS key should never break a sales demo.

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Point at a Postgres database.** Copy `.env.example` to `.env` and fill in
   `DATABASE_URL` (any Postgres 14+ works — local, Docker, Render, Supabase,
   Neon). Also set `SESSION_SECRET` to a random string.

3. **Create the schema and load the demo dataset**
   ```bash
   npm run db:push
   npx tsx --env-file=.env scripts/seed.ts
   ```
   `db:seed` is deterministic — the same 8 named demo scenarios and the same
   ~80 clients every time, which matters when a demo script names specific
   clients (Rajesh Sharma, Neha Shah, Kavita Desai, …).

   > **Why not `npm run setup`?** The `setup` script calls `npm run db:seed`,
   > which runs `tsx scripts/seed.ts` without loading `.env`. That works on
   > Render (env vars come from the platform) but locally `DATABASE_URL` won't
   > be in scope. Either run the two commands above, or `export DATABASE_URL=...`
   > in your shell first, then `npm run setup` will work too.

4. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, and pick any seeded persona to sign in — there
   are no passwords.

### Resetting the demo data

```bash
npx tsx --env-file=.env scripts/seed.ts --reset
```

Or with `DATABASE_URL` already exported in your shell:

```bash
npm run db:reset
```

## Demo script (7–10 minutes)

Mirrors the storyboard in the SOW appendix:

1. **Login** — pick a Relationship Manager persona.
2. **Dashboard** — "the system tells the RM who needs attention." Point out
   the AUM tile's sparkline, the priority queue, and that every card is
   scored, not just listed.
3. **Open Rajesh Sharma** (or any critical-priority client) from the queue —
   Client 360 shows portfolio, allocation, and *why this client scored this
   way* with the exact point breakdown.
4. **Generate a review brief** — one click produces a structured meeting
   prep document from the same data just shown, labelled as RM assistance,
   never as advice.
5. **Log an interaction / add a task** from the client page — shows the
   follow-up loop closing.
6. **Assistant** — ask "What should I follow up on today?" or "Prepare a
   review brief for Neha Shah." Answers are grounded in the same database,
   with clickable source links back to the client.
7. **Analytics** — switch to a manager's-eye view of workload and AUM by
   segment and by RM.
8. **Admin** (as the admin persona) — data-provider status showing
   NJWealthProvider/CRMProvider as *not yet connected*, and the CSV import
   flow with per-row validation.

## Deploying to Render

`render.yaml` defines a free-tier Postgres instance and a web service that
builds and runs the app. From the Render dashboard:

1. **New → Blueprint**, point it at this repo. Render reads `render.yaml`
   and provisions the database and service together.
2. Render auto-generates `SESSION_SECRET` and wires `DATABASE_URL` from the
   provisioned database. Leave the AWS_* variables blank unless you want real
   S3 document storage.
3. After the first deploy, open a shell on the service and run:
   ```bash
   npm run db:push
   npm run db:seed
   ```
   to create the schema and load the demo dataset. On Render, `npm run db:seed`
   works directly because `DATABASE_URL` is injected by the platform — no `.env`
   file needed. This is not run automatically on every deploy, so redeploys don't
   silently wipe demo data someone added during a live session.
4. Visit the service URL and sign in as any seeded persona.

> **Warm up before any live demo.** The free-tier service spins down after
> 15 minutes idle and takes 30–60 seconds to wake. Load the URL once before
> presenting.

## Project structure

```
src/
  app/                 Next.js routes (pages + API handlers)
    (app)/              Authenticated app shell — dashboard, clients, etc.
    api/                REST endpoints (BRD §15)
    login/              Demo persona picker
  components/
    ui/                 Ported Atlas design-system primitives
    layout/              Sidebar, topbar, app shell
    charts/              Recharts wrappers
  services/
    data/                DataProvider interface + MockDataProvider
    ai/                  AIService interface + MockAIService
    priority/            Explainable scoring engine
    storage/             S3 / metadata-only document storage
  server/
    schema.ts            Drizzle schema — the 12 BRD entities
    db.ts                Lazy Postgres client
    auth.ts               Demo session + role capability checks
    audit.ts             Activity logging (FR-014)
scripts/
  seed.ts                Deterministic demo data generator
```

## What's out of scope here (per the SOW)

Real client data, real NJ Wealth credentials or API access, autonomous
investment execution, production-grade SSO/MFA, and guaranteed financial
outcomes. See the SOW's "Out of Scope for Prototype" section for the full
list.
