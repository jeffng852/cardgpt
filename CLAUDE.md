# CLAUDE.md — CardGPT Development Guide

> Operating model for this repo. This file owns the **process**. The stack/architecture
> reference lives in [`.planning/`](.planning/) — start at [`.planning/PROJECT.md`](.planning/PROJECT.md)
> and [`.planning/ROADMAP.md`](.planning/ROADMAP.md).
>
> **CardGPT was migrated onto GSD on 2026-07-15** (THI-233) after ~6 months off-process.
> Phases 1–5 in `.planning/` are a retrospective **as-built capture** (shipped before GSD, all
> COMPLETE). **Milestone v1.1 — Card Directory & Crypto Expansion (Phases 6–11) is defined** and
> forward work is well underway — **Phases 6, 7, 8 and 11 are complete on `main`** (4/6): schema
> foundation + reward-unit fan-out (THI-252/253/254, PRs #3–#5), crypto HKD valuation with the
> `hkEligible` gate and unit-segmented ranking (THI-279/280, PRs #7–#8), the bulk crypto seed
> machinery with the affiliate CTA and CoinMarketCap rate cron (THI-294, PR #9), and the **v2
> design-system re-skin** (THI-176, PR #10). Phase 9 (Data page / card directory) is planned but
> **parked** — it was re-sequenced *behind* the redesign so the directory gets built into the v2
> system rather than re-skinned later. This line is a snapshot — `git log` is the live tip.

## 🔴 This repository is PUBLIC

`jeffng852/cardgpt` is public. Everything committed here is world-readable, immediately.

- **Never put security findings, exploit details, or unfixed-vulnerability specifics in this repo** —
  not in `.planning/`, not in comments, not in commit messages. They go in the Linear issue, which
  is private. `.planning/ROADMAP.md` OPEN-003 is the worked example: it names the problem and links
  to THI-236, and deliberately withholds the how.
- Never commit secrets. `.env*` and `.vercel` are gitignored (`.gitignore:34`, `:37`) — keep it that way.
- Assume anything ever committed is permanently public, including in git history.

## Agent Team

| Role | Agent | Responsibilities |
|------|-------|-----------------|
| **CTO** | Claude (main) | Architecture, planning, code changes, PR creation, release prep, orchestration |
| **QA** | Karen (`qa-karen`) | PR code review **before merge**, GitHub issue filing |
| **Ops** | Grace (`ops-grace`) | Post-deploy health checks on Vercel; verifies the live site + admin API after each deploy |
| **Data** | Leona | Card-data quality: the corpus **is** the product — accuracy, staleness, coverage of HK issuers |

### QA-Karen
- **MUST review every PR BEFORE merge** — never merge then review
- Reviews for: logic errors, regressions, security, adherence to `.planning/` decisions, API contracts,
  the Vercel timeout budget, **and whether anything security-sensitive is about to be made public**
- Dispatch the `qa-karen` subagent (Agent tool → `subagent_type: qa-karen`) with the PR diff context and the list of changed files — the real global subagent at `~/.claude/agents/qa-karen.md`, which self-adapts to this repo by reading this section
- Enforces the **Linear-link gate** below
- Files GitHub issues with label `qa-karen` for findings; closes them when fixes are verified

### Ops-Grace
- Dispatch the `ops-grace` subagent (Agent tool → `subagent_type: ops-grace`) — the real global subagent at `~/.claude/agents/ops-grace.md`, which self-adapts by reading this section
- After each merge to `main`, Vercel auto-deploys — Grace confirms the production site responds and
  the admin surface still authenticates as intended.
- Redis is the live data store. A deploy cannot corrupt it, but an admin-route change can.

### Data-Leona
- CardGPT's entire value is the accuracy of `src/data/cards.json` (11 cards / 40 reward rules).
- Watches for: reward rules that expired, promotional rules past `validUntil`, issuers missing from
  the corpus, and cards whose T&C changed since ingestion.

## Development Workflow

**GitHub remote is live:** https://github.com/jeffng852/cardgpt
**Linear project:** [CardGPT](https://linear.app/thirdvisor/project/cardgpt-a6eee6b146ee) · team Thirdvisor (`THI`)

> **⚠ Linear issue-mirroring lands on the WRONG repo — known, team-level, not fixable per-project.**
> Confirmed here 2026-07-15: THI-233 mirrored to `polytracker#155`, THI-236 to `polytracker#159`.
> Linear's GitHub **Issue Sync** is bound to one default repo for the whole Thirdvisor team, so every
> CardGPT Linear issue spawns a stray GitHub issue on `jeffng852/polytracker`. There is no per-project
> routing. **Decision: leave it** — mirrors auto-close when the Linear issue hits Done. Don't hand-close
> an *active* issue's mirror; that marks the Linear issue Done.
>
> **Consequence to keep in mind:** the mirror carries the issue's **full body** into polytracker. That's
> tolerable only because polytracker is private. Combined with the public-repo rule above, security
> specifics for CardGPT live in Linear + a private mirror — never here.
>
> **PR↔issue auto-linking is CONFIRMED WORKING for this repo (2026-07-20, PR #3 / THI-252).** PR #3
> was opened with `Closes THI-252`; on squash-merge to `main`, Linear **auto-transitioned THI-252 to
> Done** at the exact merge timestamp (stateHistory: Todo → In Progress → In Review → Done, `completedAt`
> == merge time). So the `Closes THI-XXX` → auto-close half works. You still **manually move Todo → In
> Progress → In Review** and attach the PR link via the Linear MCP during the flow (those are not
> auto-driven); only the final merge→Done transition is automatic. The earlier ambiguity (THI-71 had no
> PR) is resolved — PR #3 is the definitive test and it passed.

### Standard PR Flow (mandatory)
1. **CTO** creates (or locates) the **Linear issue first** in *Todo* via the Linear MCP, then branches with Linear's suggested name `jeffreyn/thi-XXX-...`
2. **CTO** implements changes on that feature branch
3. **CTO** pushes and opens a PR to `main` with **`Closes THI-XXX`** in the body
4. **QA-Karen** (`subagent_type: qa-karen`) reviews the PR (sub-agent with full diff context) and enforces the Linear-link gate
5. **CTO** addresses findings, Karen re-reviews
6. **Only after Karen approves** → squash merge to `main` → Vercel auto-deploys → Linear moves to Done
7. **Ops-Grace** (`subagent_type: ops-grace`) verifies production is healthy post-deploy

> **🔴 ISSUE-FIRST IS ABSOLUTE.** Log a Linear issue (`THI-XXX`, in *Todo*/*In Progress*) **before touching any code** — features, refactors, AND bug fixes discovered mid-execution or at a human-check/verification checkpoint. This holds **even in direct-to-main / bootstrap mode** (no feature branch): create or locate the issue first, then make the change and reference `THI-XXX` in the commit. Never edit first and reconcile later.

### PR Conventions
- **Issue-first (absolute):** never start work — including a checkpoint bug fix — without a Linear issue created *first*; applies in bootstrap/direct-to-main mode too; never create the issue retroactively in "Done"
- PR body **must** include `Closes THI-XXX` (or `Fixes`/`Resolves`)
- Squash merge to `main` (not regular merge or rebase)
- Include the Claude Code session link in the PR body
- Commit messages: describe the "why", not the "what"; reference `THI-XXX`
- After merge, rebase the feature branch onto updated `main` before the next PR

## Source of Truth & Context Sync

| Concern | Source of truth | Notes |
|---------|-----------------|-------|
| **What is actually built** | **GitHub** (`git log`, merged PRs on `main`) — [repo](https://github.com/jeffng852/cardgpt) | Ground truth. Code can't drift. |
| **What's in flight / status** | **Linear** (`THI-XX`) — [project](https://linear.app/thirdvisor/project/cardgpt-a6eee6b146ee) | Issue-first, never retroactive. Auto-sync **pending integration setup** (see gap above). |
| **What & why we're building (intent, decisions)** | **`.planning/` in THIS repo** | Committed alongside code. Refreshed at phase/milestone boundaries, not per-commit. |

**Rules:**
- **GSD is milestone/phase-level.** Plan with the GSD phase loop (`/gsd-discuss-phase` → `/gsd-plan-phase` → `/gsd-execute-phase`). Day-to-day execution runs through the GitHub + Linear loop above.
- **Always run `/gsd-*` from this repo root** (`~/cardgpt`). GSD resolves `.planning/` relative to cwd; running from `~` reads a stale orphan tree.
- **Every commit references its `THI-XX`** so GitHub ↔ Linear stay coupled.
- **On return after a gap:** GitHub is ground truth. Reconcile Linear/GSD *to* GitHub — never the reverse. This project is the cautionary tale: every doc in `.planning/archive/` was stale, and the last stretch of real work existed only in `git log`.
- Runtime: GSD is `@opengsd/gsd-core` (`~/.claude/gsd-core/`). Update with `npx @opengsd/gsd-core@latest`.

### Linear self-sync (mandatory in the PR flow)
1. **Before coding** — create the Linear issue in **Todo** (`THI-XXX`); grab its `gitBranchName`. Reuse an existing issue if one covers the work.
2. **Branch** — `git checkout -b jeffreyn/thi-XXX-...`
3. **Open PR** with `Closes THI-XXX`.
4. **Fallback** (integration not connected — currently the assumed state) — Linear MCP `save_issue(THI-XXX, links:[{url,title}], state:"In Review")`.

**Do NOT** create Linear issues retroactively in "Done".

**QA-Karen gate:** reject any PR that (a) lacks a `Closes/Fixes/Resolves THI-XXX` reference, or (b) whose issue has no PR attachment / is still in Todo after the PR was opened.

### Milestones (GSD phase ↔ Linear project milestone)

| GSD | Linear |
|-----|--------|
| **Release** (in `.planning/`) | Tracked in GSD only |
| **Phase** | **Project milestone** (its own progress bar) |
| **Plan / work-item** | **Issue** tied to that milestone (1 issue ≈ 1 PR) |

The Linear **project** stays fixed (`CardGPT`, id `5643e79a-2bd9-48ed-9a67-9e0c4215519c`).

> **Phases 1–5 are retrospective** — they describe work that shipped before GSD existed here, so they
> were **not** mirrored as Linear milestones. Mirroring starts at the first *real* milestone,
> **v1.1 — Card Directory & Crypto Expansion**, where each phase is wired to a Linear milestone with
> an issue per plan — Phase 6 (THI-252/253/254), Phase 7 (THI-279/280), Phase 8 (THI-294), Phase 11
> (THI-176), all now merged and Done.

## Operational Runbook (Vercel)

- **Production:** https://cardgpt-beta.vercel.app · Vercel project `cardgpt` on the **Thirdvisor (Pro)** team (Vercel slug `polytracker`; moved off the personal hobby team 2026-07-24) · region `hkg1` (Hong Kong — chosen for HK users; keep it).
- **Deploy:** merge to `main` → Vercel auto-deploys. No manual step.
- **Env vars:** read headlessly with `vercel env ls` / `vercel env pull` (CLI is linked). **Do not ask the user to read them out.**
- **Data layer is Upstash Redis**, resolved in this precedence order (`src/lib/data/redisStorage.ts:27`):
  `REAL_STORAGE_KV_REST_API_URL` → `KV_REST_API_URL` → `UPSTASH_REDIS_REST_URL`.
  **As of 2026-07-24 the prod DB is `cardgpt-prod` on Thirdvisor, and the `KV_*` names are the ones actually set**
  (host `grown-starfish-176247.upstash.io`). The old `REAL_STORAGE_*` set was deleted — its original Upstash DB had been
  decommissioned, so the store was re-provisioned + seeded from `cards.json` (see `.planning/phases/06-.../06-05-SUMMARY.md`).
  The code's precedence lists `REAL_STORAGE_*` first only for legacy reasons; it now falls through to `KV_*`.
  ⚠ **When mutating prod Redis from a script, `vercel env pull` a FRESH `.env` first** — a stale local file that still
  carries a removed/old `REAL_STORAGE_*` line will win the precedence and point the script at the wrong (or dead) host.
- **Single quotes in curl** (zsh treats `&` in double quotes as background):
  `curl --max-time 60 'https://cardgpt-beta.vercel.app/api/...'`
- **Timeout budget:** Vercel serverless hard limit ~120s. The AI extraction route (`/api/admin/extract`)
  is the one at risk — PDF parse + Anthropic call. HTTP/2 framing errors = hit the limit.
- **Scheduled job:** one Vercel Cron — `/api/cron/refresh-rates`, daily at **03:00 UTC** (`vercel.json`).
  It refreshes the crypto→HKD rate table from CoinMarketCap so crypto-card valuations aren't stale.
  It is auth-gated, and it **degrades safely**: with no CoinMarketCap key it no-ops, and a failed
  fetch or write leaves the last-known rates intact rather than nulling them.
- **Post-deploy:** Ops-Grace verifies the site responds and admin auth behaves.

## Known Pitfalls

- **🔴 Admin auth is not currently sound — see THI-236 (Urgent) before touching `src/lib/auth/`.**
  Do not treat the admin surface as protected. Details are in Linear, not here (public repo).
- **The test runner now exists** (this reverses a long-standing gap — OPEN-008 is closed). Phase 7
  Wave 0 installed **vitest** (`vitest.config.ts`, `vitest 4.1.10` devDependency) and added the
  `test` / `test:watch` scripts, so `npm test` (= `vitest run`) runs for real. The suite is 14 files
  covering the engine (crypto valuation, `hkEligible`, `minStaking`, unit segmentation, the
  fiat-ranking regression baseline, affiliate neutrality), the data layer (`loadCards`, `rateTable`),
  the affiliate CTA, the rate cron, the transaction parser, the crypto-seed script's pure merge
  helper, and the Phase-11 `buildCardView` view-builder. The `include` globs cover **both** `src/**`
  and `scripts/**` (broadened in Phase 8 so `scripts/__tests__/seed-crypto-cards.test.ts` collects
  without a live Redis). Archived docs that described the pre-vitest state are stale on this point.
- **The UI runs on the v2 design system — read the contract before restyling anything.**
  Phase 11 (THI-176, PR #10) re-skinned the app to the brutalist-editorial system defined in
  [`.planning/design/ui-contract-v2.md`](.planning/design/ui-contract-v2.md); that contract, not any
  individual component, is the source of truth for tokens, badge colors and radii. Two traps:
  (a) `src/app/globals.css` keeps the **legacy token names** (`--background-secondary`,
  `--foreground-muted`, `--accent-purple`, …) alive as *aliases onto* the v2 vars, so surfaces not
  yet restyled (e.g. `/privacy`) still inherit the new palette — repoint the alias, don't reintroduce
  an old literal; (b) dark mode is next-themes' **class-based `.dark` on `<html>`** (not
  `data-theme`), and only the v2 base tokens are overridden there — the legacy aliases flip for free.
  Fonts are Rethink Sans (display) / Inter (sans) / Geist Mono (tabular numbers), wired as CSS vars
  in `src/app/[locale]/layout.tsx`. The shared card is `CreditCardCard.tsx` rendering a typed
  `CardView` from the pure `src/lib/cards/buildCardView.ts` — put derived display logic in the
  builder (unit-testable in node-env vitest), not the component.
- **`docs/ARCHITECTURE.md` is wrong about storage.** It documents Vercel Blob throughout; the data
  layer is Upstash Redis (commits `6fb4d19`, `d43be5e`). `@vercel/blob` survives **only** for card
  *image* upload in `/api/admin/upload`. Its non-storage content (server/client split, `force-dynamic`,
  the sync/async repository rule) is still valid. Rewriting it is real work (OPEN-011).
- **Read `git log` before touching the data layer.** Phase 5 in `.planning/ROADMAP.md` reconstructs a
  sustained fight with CDN caching that ended in the Blob→Redis migration. That context exists nowhere else.
- **`npm run dev` and `npm run build` are gated** by `scripts/health-check.js`. Use `npm run dev:skip-check`
  to bypass when the check itself is the problem.
- **Docs in `.planning/archive/` are stale by construction** — wrong framework versions, wrong card
  counts, a nonexistent `/api/recommend` route. Never cite them as current. Code wins.
- Log warnings for missing/unexpected API fields instead of silently defaulting.

## Commands

```bash
npm install              # required first — a fresh clone has no node_modules
npm run dev              # health-check, then next dev
npm run dev:skip-check   # bypass the health check
npm run build            # health-check, then next build
npm run lint             # eslint
npm test                 # vitest run (14 test files, src/** + scripts/**)
npm run test:watch       # vitest in watch mode
npm run health-check     # scripts/health-check.js on its own
npx tsc --noEmit         # typecheck — there is no `typecheck` script (needs npm install first)
vercel env ls            # inspect production env (CLI is linked)
```

> **`npm test` now works** — the `test` script (`vitest run`) landed with the Phase 7 vitest install,
> replacing the earlier "no runner, `Missing script: test`" state. It is safe to put in CI or a PR
> checklist.
>
> `npx tsc --noEmit` is the typecheck route (`typescript ^5` is a devDependency), but **run
> `npm install` first** — without `node_modules`, `npx` fetches an unrelated stub package and
> prints "This is not the tsc command you are looking for". Not yet run green on this machine.

## Project URLs

- **Production:** https://cardgpt-beta.vercel.app
- **GitHub:** https://github.com/jeffng852/cardgpt (**public**)
- **Linear:** https://linear.app/thirdvisor/project/cardgpt-a6eee6b146ee
- **Urgent open item:** [THI-236 — admin auth hardening](https://linear.app/thirdvisor/issue/THI-236)
