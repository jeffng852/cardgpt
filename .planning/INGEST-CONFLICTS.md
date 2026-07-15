## Conflict Detection Report

Generated 2026-07-15 by gsd-doc-synthesizer. Mode: new. Docs: 17 (1 PRD, 4 SPEC, 12 DOC, 0 ADR).
Precedence: manifest-supplied per-doc integers (lower = higher). Default ADR > SPEC > PRD > DOC
was deliberately overridden — CardGPT has no ADRs, and "CardGPT PRD.md" is pinned to
precedence 0 above the SPECs.

Ground-truth rule applied throughout: **GitHub main wins over any doc's claim about current
system state.** Code was read directly on 2026-07-15 to adjudicate.

### BLOCKERS (0)

None. Nothing gates routing.

Checked and cleared:
  - LOCKED-vs-LOCKED ADR contradiction — impossible. Zero ADR-typed docs; zero docs with
    locked: true. No decision in this set carries binding authority.
  - Existing locked decisions in .planning/ — none. Mode is `new`; no prior context to contradict.
  - UNKNOWN type at low confidence — none. All 17 docs classified with high confidence,
    all with manifest_override: true.
  - Cross-ref cycles — no genuine cycles. See INFO-010 for the three degenerate self-loops.
  - Ref-graph depth — max depth 3 (PROGRESS_SUMMARY → ENGINE_DOCUMENTATION → SCHEMA_DESIGN),
    well under the 50 cap.

### WARNINGS (4)

[WARNING] WARNING-001: Rule-priority taxonomy — docs say `premium`, code says `specific`
  Found: SCHEMA_DESIGN.md (SPEC, precedence 1 — the highest-precedence SPEC) defines three
    rule priorities: `base`, `bonus`, `premium`, where `premium` is "Highest tier (e.g.
    spend-based upgrades)" applied via Math.max override. PROGRESS_SUMMARY.md (DOC, prec 15)
    repeats the same base/bonus/premium taxonomy. ENGINE_DOCUMENTATION.md (DOC, prec 6)
    cross-references SCHEMA_DESIGN.md and inherits it.
  Impact: The code implements `RulePriority = 'base' | 'bonus' | 'specific'`
    (src/types/card.ts:65); calculateReward.ts:206 filters on `r.priority === 'specific'`.
    There is no `premium` anywhere. This is not a pure rename — the semantics differ:
    the doc's `premium` is a highest-tier override for spend-based upgrades, whereas the
    code's `specific` means "replaces base rate entirely (mutually exclusive, e.g. specific
    merchant rates)". Consequently SCHEMA_DESIGN's documented "Tiered Spending Card" pattern
    (a `premium` rule gated on `minMonthlySpending`) has **no direct code equivalent** — the
    code expresses tiers through `monthlySpendingCap` + `fallbackRate` instead. A planner
    reading the SPEC would either plan a non-existent rename or file phantom work to
    "add the missing premium tier".
  → Decide which is intended, then act: (a) if `specific` is correct, rewrite SCHEMA_DESIGN.md
    to the base/bonus/specific model and delete the tiered-spending `premium` pattern; or
    (b) if a spend-tier override is genuinely still wanted, file it as new work and record
    the difference from `specific`. Do not let synthesis pick — the two are different
    concepts wearing similar names.

[WARNING] WARNING-002: Reward-cap model is specified three ways and populated zero ways
  Found: Three incompatible accounts of how a "rewards cap" is modeled.
    (1) PRD (prec 0, canonical): "Rewards Cap (Maximum)" is a first-class parameter that must
        determine the output recommendation.
    (2) SCHEMA_DESIGN.md (SPEC, prec 1): `rewardCap: { unit, redemptionThreshold }`,
        auto-redeem at threshold; "No monthly/yearly limits for Citi Cash Back Card."
    (3) CARD_RESEARCH_SUMMARY.md (DOC w/ SPEC signal, prec 8): proposes adding
        `monthlySpendingCap?: number` **inside** the `RewardCap` interface, to model HSBC
        Red's "$10,000 online at 4%, then 0.4%". Labeled "Minor Addition Needed".
  Impact: Code matches none of them cleanly. `RewardCap` (src/types/card.ts:235-249) exists
    with monthlyLimit / yearlyLimit / unit / redemptionThreshold / currentAccumulated —
    and does NOT contain monthlySpendingCap. The cap that actually ships lives on
    `RewardRule` (card.ts:126) as `monthlySpendingCap` + `fallbackRate`. Most importantly:
    **no card in src/data/cards.json populates `rewardCap` at all** — zero occurrences of
    any rewardCap key across all 11 cards. So the `RewardCap` interface is dead schema, and
    the PRD's cap requirement is met only via a different mechanism on a different type.
    This also blocks REQ-multi-card-split, whose trigger condition is literally "maximum
    rewards cap has met" — a condition nothing currently computes from `rewardCap`.
  → Confirm the intended cap contract before routing. Likely resolution: `RewardCap` is
    obsolete and should be deleted, with per-rule monthlySpendingCap + fallbackRate declared
    canonical — but that decision determines whether REQ-multi-card-split is buildable as
    the PRD describes it, so it needs an explicit call, not an inference.

[WARNING] WARNING-003: Manifest precedence is inverted — the superseded schema doc outranks its successor
  Found: SCHEMA_DESIGN.md is pinned precedence 1; SCHEMA_REFACTOR_NOTES.md is pinned
    precedence 2. By the supplied precedence, SCHEMA_DESIGN wins on contradiction.
    But SCHEMA_REFACTOR_NOTES.md exists **specifically to supersede** SCHEMA_DESIGN's
    merchant model: it identifies `merchantTypes` as an abstraction-level error mixing
    categories ("restaurant") with merchants ("mcdonalds"), and replaces it with
    `categories` + `specificMerchants`. It is dated 2026-01-21 and marked "Status: ✅ Complete".
    SCHEMA_DESIGN.md models the world purely in `merchantTypes`.
  Impact: Code sides with the LOWER-precedence doc. src/types/card.ts:93 retains
    `merchantTypes?` explicitly as the deprecated field; calculateReward.ts:80-87 implements
    it only as an "OLD SCHEMA (backward compatibility)" fallback branch; cardRepository.ts:
    210-212 validates categories OR specificMerchants OR merchantTypes. Applying the supplied
    precedence literally would make synthesis declare a deprecated field canonical and
    reintroduce the exact ambiguity the refactor removed.
    I did NOT apply precedence here — I recorded the refactor as authoritative (CON-merchant-
    taxonomy in constraints.md) on the code-is-ground-truth rule, and am surfacing the
    inversion rather than silently honoring or silently ignoring the manifest.
  → Fix the input, not the output: either re-rank SCHEMA_REFACTOR_NOTES above SCHEMA_DESIGN
    in --manifest and re-run, or mark SCHEMA_DESIGN.md as superseded-in-part and fold the
    refactor into it so one doc holds the schema. Confirm the code-wins call was right.

[WARNING] WARNING-004: The canonical PRD does not describe roughly half the built system
  Found: "CardGPT PRD.md" is pinned precedence 0 as the canonical statement of product
    intent. It is dated 2026-01-09 and still carries `Status: Exploring` with a
    `Next Review: January 16, 2026` that passed ~6 months ago. It describes a free, no-login,
    desktop web tool: tags → NLP text input → ranked cards → Apply Here.
    It is entirely silent on: the admin panel, admin authentication, card CRUD UI,
    AI-assisted PDF card extraction, the pending-review/approval workflow, Redis storage,
    /api/parse-activity, and PWA/mobile. PROGRESS_SUMMARY.md goes further and asserts a
    "No Backend for MVP" decision — "Client-side recommendation engine… No user data to
    persist… Simpler deployment".
  Impact: The live system has 12 server API routes — /api/parse-activity plus
    /api/admin/{auth, cards, cards/[id], export-cards, init-redis, extract, stats, upload,
    pending, pending/[id], pending/[id]/approve} — an admin UI under src/app/admin/**,
    Upstash Redis persistence, and Anthropic + pdf-parse dependencies. The "no backend"
    premise is dead. Routing off the pinned canonical PRD would treat a large, working,
    load-bearing subsystem as out of scope — risking it being dropped from the roadmap,
    planned as new work, or regressed. This is the highest-leverage ambiguity in the set:
    it is a question about what CardGPT *is* now, which no document answers.
  → Decide scope before routing: is the admin/ingestion subsystem in scope for GSD, and is
    the PRD still the canonical intent doc? Most likely the PRD needs a v2 covering the admin
    surface and the Redis architecture, and the "No Backend for MVP" decision needs explicit
    retirement. Do not route until the canonical doc covers the system it is canonical for.

### INFO (14)

[INFO] INFO-001: Auto-resolved — code beats ARCHITECTURE.md on the storage layer
  Found: docs/ARCHITECTURE.md (SPEC, prec 3, "Version 2.0 / Status: Production") documents
    Vercel Blob as the production data layer throughout — blobStorage.ts, BLOB_READ_WRITE_TOKEN,
    isBlobConfigured(), "Vercel Blob Storage (cards.json)" in both architecture diagrams.
  Note: Superseded by code. Commits 6fb4d19 ("Migrate from Vercel Blob to Upstash Redis") and
    d43be5e ("Fix Redis env var mismatch and remove dead blob code") are authoritative.
    src/lib/data/redisStorage.ts exists; blobStorage.ts does not. @upstash/redis 1.36.1 is a
    dependency. @vercel/blob 2.0.1 survives but is used only by /api/admin/upload for image
    upload — not card data. Env vars accept both KV_REST_API_* and UPSTASH_REDIS_* (18a038c).
    Resolved in favor of code; constraints.md records Redis as authoritative and marks
    CON-data-layer STALE. ARCHITECTURE.md itself still needs rewriting — that is real work,
    not a synthesis artifact. Its non-storage content (server/client split, force-dynamic,
    sync/async repository rule) remains valid and was retained.

[INFO] INFO-002: Framework version claims are stale across three docs
  Note: docs/ARCHITECTURE.md says "Next.js 14+"; README.md and PROGRESS_SUMMARY.md say
    "Next.js 15". package.json pins next 16.1.4 with react 19.2.3. Cosmetic, but it means no
    doc in the set has been touched since at least two major framework upgrades.

[INFO] INFO-003: Auto-resolved — dark mode toggle shipped; the higher-precedence SPEC missed it
  Found: COLOR_SYSTEM.md (SPEC, prec 5) states "Dark mode is not forced - respects user's
    system settings" and files a manual toggle under "Future Enhancements" — "If manual dark
    mode toggle is needed: 1. Add [data-theme="dark"]… 2. Create state management… 3. Persist
    in localStorage".
  Note: The toggle shipped. next-themes 0.4.4 is a dependency; src/components/ThemeProvider.tsx
    and src/components/DarkModeToggle.tsx both exist. DARK_MODE_IMPLEMENTATION.md (DOC, prec 10)
    documents it accurately, and the PRD (prec 0) requires "Light and Dark Mode".
    Resolved in favor of code + PRD + the lower-precedence DOC against the higher-precedence
    SPEC. Noteworthy pattern: here a prec-10 DOC was more accurate than a prec-5 SPEC —
    precedence tracks intended authority, not freshness.

[INFO] INFO-004: The proposed monthlySpendingCap field shipped — on a different type than proposed
  Found: CARD_RESEARCH_SUMMARY.md (DOC, prec 8) proposes monthlySpendingCap as a NEW field
    inside the RewardCap interface ("Minor Addition Needed"), to handle HSBC Red's tiered cap.
    The ingest brief asked that this be surfaced as proposed-but-maybe-unimplemented rather
    than silently treated as built.
  Note: Checked against code — it IS built, but not where proposed. monthlySpendingCap lives
    on RewardRule (src/types/card.ts:126), paired with fallbackRate, and is wired through
    src/types/recommendation.ts:45, the admin RuleForm, PendingReviewView.tsx, and
    CardRecommendationList.tsx:337 (renders "Cap: $X/month"). The RewardCap interface
    (card.ts:235-249) does NOT contain it. So: proposal accepted, implementation relocated.
    The doc's cap reasoning is sound and still describes real behavior; only its proposed
    location is wrong. See WARNING-002 for the unresolved part.

[INFO] INFO-005: PROGRESS_SUMMARY's 5 decisions recorded as UNLOCKED candidates, not promoted
  Found: PROGRESS_SUMMARY.md (DOC, prec 15) carries a "Technical Decisions" section with 5
    ADR-shaped entries in problem/solution/rationale form: (1) priority + cumulative rewards,
    (2) monthly spending caps, (3) no backend for MVP, (4) TypeScript strict mode,
    (5) Tailwind CSS v4.
  Note: Per the ingest brief these were NOT auto-promoted to locked decisions — they are
    retrospective log entries in a progress doc, with no status field and no standalone
    authority. Captured as CAND-001…CAND-005 in decisions.md, all unlocked, each with a
    verification verdict from code:
      CAND-001 priority+cumulative — PARTIAL, taxonomy drifted (see WARNING-001)
      CAND-002 monthly caps — YES, built, different type (see INFO-004)
      CAND-003 no backend for MVP — NO, contradicted by 12 API routes (see WARNING-004)
      CAND-004 TS strict mode — not independently checked, uncontradicted
      CAND-005 Tailwind v4 — YES, confirmed in package.json + globals.css
    Two of five no longer hold. Promote to real ADRs only after deciding WARNING-001 and
    WARNING-004; CAND-003 should probably be retired rather than promoted. Note also two
    undocumented de-facto decisions with no doc source at all — CAND-006 (Redis migration)
    and CAND-007 (admin panel) — which are stronger ADR candidates than several of the five.

[INFO] INFO-006: LANDING_PAGE_REDESIGN constraints extracted as CLAIMED, not verified
  Found: LANDING_PAGE_REDESIGN.md is typed SPEC (prec 4) but reads retrospective — "What Was
    Built", past tense, and a "Sign-Off" section asserting "All requirements met ✅" for
    THI-25/THI-24.
  Note: Its entire Testing Checklist is unchecked — every box under Desktop, Mobile,
    Accessibility, and Performance is "- [ ]". The sign-off is therefore unsupported by the
    doc's own evidence. All its constraints are recorded in constraints.md as CLAIMED, NOT
    VERIFIED: breakpoints (<768 / 768-1024 / >1024), 44x44px tap targets, <100ms analysis,
    Lighthouse >90 / <3s load / 60fps, WCAG AA, prefers-reduced-motion, PWA manifest fields.
    One exception — CON-brand-palette VERIFIED: --accent-purple #9333ea, --accent-orange
    #f59e0b, --accent-blue #3b82f6 all confirmed at src/app/globals.css:20-25, and
    --primary #10a37f at line 15. Also note its "<100ms analysis" marketing stat is looser
    than ARCHITECTURE.md's own budget (<20ms total search latency; <100ms is that doc's
    *card load* figure) — the two docs measure different things under similar words.

[INFO] INFO-007: Card corpus has grown past every doc's count
  Note: All docs say 10 cards / 36 reward rules (PROGRESS_SUMMARY, CARD_RESEARCH_SUMMARY,
    SCHEMA_REFACTOR_NOTES' migration table, LANDING_PAGE_REDESIGN's "10+ HK Cards" stat).
    Actual: 11 cards / 40 reward rules in src/data/cards.json. The 11th is `sim-card`
    (sim Credit Card, United Asia Finance Limited, Mastercard — 8% cashback on eligible
    online retail ≥HKD500, fallbackRate 0.4%, priority "specific"). It appears in no research
    doc. Still well within the PRD's "<100 cards" bound. Its rule payload also exercises
    fallbackRate / isPromotional / notes — fields present in code but in no SPEC.

[INFO] INFO-008: PRD requirement REQ-multi-card-split is entirely unbuilt
  Found: The PRD (prec 0) requires: "We can recommend multiple cards for one transaction, but
    it should only be for cases where maximum rewards cap has met and also if the merchant
    allows transaction splitting with different cards (e.g. wedding venue deposits)".
  Note: No split logic exists anywhere in src/lib/engine/. There is no "merchant allows
    splitting" flag on any card, merchant, or transaction type. This is the largest unbuilt
    PRD requirement and is recorded in requirements.md as NOT IMPLEMENTED. It is also
    downstream of WARNING-002 — its trigger condition ("maximum rewards cap has met") depends
    on a cap model that currently computes nothing from rewardCap. Not a conflict, a gap:
    prime roadmap input. Related partial gap: `dayOfWeek` is a PRD reward parameter and is
    honored by calculateReward.ts:131, but appears 0 times in cards.json — supported, unused.

[INFO] INFO-009: Lower-precedence SPECs expanded product scope beyond the canonical PRD
  Note: The PRD (prec 0) scopes CardGPT to a **desktop** website. LANDING_PAGE_REDESIGN.md
    (SPEC, prec 4) specifies a mobile-first installable PWA — mobile breakpoints, 44x44px tap
    targets, install prompts, standalone display, Apple web-app meta tags. PWA appears
    nowhere in the PRD. Similarly, the PRD asks for a ChatGPT-referenced colour tone
    (delivered by COLOR_SYSTEM.md's minimal palette), while LANDING_PAGE_REDESIGN layers a
    "Modern & Playful fintech" direction with purple/orange/blue accents and gradients on
    top. Both palettes coexist in globals.css, so this is an extension rather than a
    contradiction — but the two design directions are not obviously reconciled anywhere, and
    the mobile/PWA scope was never ratified by the canonical doc. Flagging as drift for the
    roadmapper; folded into WARNING-004's scope question rather than raised separately.

[INFO] INFO-010: Three self-referencing cross-refs — degenerate, non-blocking
  Found: Cycle detection (DFS, three-colour) over the cross_refs graph found three 1-node
    self-loops: docs/ARCHITECTURE.md → "docs/ARCHITECTURE.md";
    LANDING_PAGE_REDESIGN.md → "LANDING_PAGE_REDESIGN.md";
    PROGRESS_SUMMARY.md → "PROGRESS_SUMMARY.md".
  Note: All three are artifacts of each doc listing itself in its own "Files Created" or
    "Documentation" table ("— This file"). A self-loop cannot produce a synthesis loop —
    there is no mutual dependency, and the doc is already in scope when it names itself.
    Treated as non-blocking rather than as cycle BLOCKERs; synthesis proceeded on all three.
    Recording the judgment explicitly since the strict reading of the cycle rule would have
    blocked the entire ingest on three cosmetic self-citations. No genuine multi-node cycles
    exist. Longest real chain: PROGRESS_SUMMARY → ENGINE_DOCUMENTATION → SCHEMA_DESIGN
    (depth 3, cap 50).

[INFO] INFO-011: DEPLOYMENT_READY.md references a repo path that no longer exists
  Note: DEPLOYMENT_READY.md (DOC, prec 14) contains commands rooted at
    "/Users/jeffreyng/Desktop/CODE STUDIO/CardGPT". Current repo root is
    "/Users/jeffreyng/cardgpt". Any command copy-pasted from this doc will fail. The doc's
    Vercel env-var guidance also predates the Redis migration and should not be trusted.

[INFO] INFO-012: Zero ADRs — the decisions layer of this project is empty
  Note: 17 docs, 0 ADR-typed, 0 with locked: true, 0 with an ADR status field. Consequently
    decisions.md contains no locked decisions and no LOCKED-vs-LOCKED contradiction was
    possible — which is the main reason this report has no BLOCKERs. Every decision CardGPT
    has made lives in retrospective prose (PROGRESS_SUMMARY) or only in git history
    (the Redis migration, the admin panel). This is the project's biggest structural
    documentation gap and the clearest early win for GSD adoption: promote CAND-001…CAND-007
    into real ADRs once WARNING-001 and WARNING-004 are decided.

[INFO] INFO-013: ENGINE_DOCUMENTATION references an API route that does not exist
  Note: ENGINE_DOCUMENTATION.md (DOC, prec 6) documents integration via
    "app/api/recommend/route.ts". No /api/recommend route exists in the current API surface.
    Recommendations run client-side per the ARCHITECTURE server/client split
    (HomeClient.tsx). The integration example is stale; the engine API itself
    (calculateReward, recommendCards) is accurate.

[INFO] INFO-014: The last six months of work are undocumented
  Note: Not a doc-vs-doc conflict, but the dominant signal in this ingest. The most recent
    doc in the set is docs/ARCHITECTURE.md (2026-01-30); last code activity is 2026-02-24 at
    87 commits. The intervening work — the Blob→Redis migration, a run of CDN-caching and
    write-verification fixes (8762842 "Trust put() operation instead of immediate read-back
    verification", c17c7bf "Add cacheControlMaxAge: 0", 8e3a91b "Switch to unique URLs per
    write to bypass CDN caching"), the export-cards endpoint, and env-var reconciliation —
    is recorded nowhere but git. That commit sequence reads as a sustained fight with storage
    consistency, ending in the migration. Whoever plans the next phase should read that
    history before touching the data layer. Captured under "Known documentation gaps" in
    context.md.
