# CardGPT System Architecture

**Version**: 2.0
**Last Updated**: 2026-01-30
**Status**: Production

---

## System Overview

CardGPT is a Next.js 14+ application that recommends Hong Kong credit cards based on user transactions. The architecture consists of:

- **Data Storage**: Vercel Blob (production) / Local JSON (development)
- **Server Components**: Data fetching from blob storage
- **Client Components**: Interactive UI and recommendation calculations
- **Admin Panel**: CRUD operations for card management

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Input Form  │  │  Results     │  │  Admin       │         │
│  │  - Text box  │  │  Display     │  │  Panel       │         │
│  │  - Quick     │  │  - Top cards │  │  - CRUD      │         │
│  │    tags      │  │  - Filters   │  │  - Rules     │         │
│  └──────┬───────┘  └──────▲───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ (1) User Input   │ (4) Ranked       │ (5) CRUD
          ▼                  │     Cards        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NLP TRANSACTION PARSER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  parseTransaction(input: string) → ParseResult                 │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Amount      │  │   Currency    │  │   Category    │      │
│  │  Extraction   │  │   Detection   │  │   Matching    │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ (2) Transaction Object
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  REWARD CALCULATION ENGINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  recommendCards(cards, transaction) → RecommendationResult     │
│                                                                 │
│  1. Match Rules (categories, merchants, conditions)            │
│  2. Apply Priority System (base → bonus → specific)            │
│  3. Handle Spending Caps (monthly limits, fallback rates)      │
│  4. Calculate Fees (foreign transaction fees)                  │
│  5. Rank by Net Value (reward - fees)                          │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ (3) Load Card Data
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Production: Vercel Blob Storage (cards.json)                  │
│  Development: Local file (src/data/cards.json)                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CreditCard {                                            │  │
│  │    id, name, issuer, applyUrl,                          │  │
│  │    rewards: RewardRule[],                               │  │
│  │    fees: { annualFee, foreignTransactionFeeRate }       │  │
│  │  }                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Blob Storage                       │
│                         (cards.json)                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ fetch (no-cache)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Server Components                            │
│  ┌─────────────────┐    ┌─────────────────────────────────┐     │
│  │  page.tsx       │    │  /api/admin/cards/[id]          │     │
│  │  (public)       │    │  (admin CRUD)                   │     │
│  └────────┬────────┘    └─────────────────────────────────┘     │
│           │                                                      │
│           │ loadCards() / getCardByIdAsync()                     │
│           │ (reads from blob)                                    │
└───────────┼─────────────────────────────────────────────────────┘
            │
            │ cards passed as props
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Client Components                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  HomeClient.tsx                                          │    │
│  │  - Receives cards[] as props                             │    │
│  │  - Runs recommendCards() client-side                     │    │
│  │  - No additional API calls for searches                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Development Environment

In development, data is read from `src/data/cards.json` directly via static import, and writes update the local file.

---

## Key Design Decisions

### 1. Server/Client Component Split

**Problem**: The home page was originally a client component that called `loadCards()` directly. In production, `process.env.VERCEL` is not available on the client, so it always fell back to the stale static import bundled at build time.

**Solution**: Split into server component (data fetching) and client component (UI).

| Component | Type | Responsibility |
|-----------|------|----------------|
| `page.tsx` | Server | Fetch cards from blob, pass to client |
| `HomeClient.tsx` | Client | Handle user interactions, run recommendations |

**Benefits**:
- Fresh data on every page load (reads from blob)
- Lower cost (one blob read per page load, not per search)
- Faster UX (recommendations run instantly client-side)
- PWA-friendly (works offline after initial load)

### 2. Force Dynamic Rendering

All routes that read card data use `export const dynamic = 'force-dynamic'` to bypass Next.js static caching:

```typescript
// Forces fresh data fetch on every request
export const dynamic = 'force-dynamic';
```

**Affected files**:
- `src/app/[locale]/page.tsx` - Public home page
- `src/app/api/admin/cards/route.ts` - List all cards
- `src/app/api/admin/cards/[id]/route.ts` - Single card CRUD

### 3. Sync vs Async Data Functions

The `cardRepository.ts` module provides two variants of each function:

| Function | Type | Use Case |
|----------|------|----------|
| `getCardById()` | Sync | Build-time, static generation |
| `getCardByIdAsync()` | Async | Runtime, checks blob storage |
| `getAllCards()` | Sync | Build-time, static generation |
| `getAllCardsAsync()` | Async | Runtime, checks blob storage |

**Rule**: Admin and public pages should always use async variants to get fresh data.

---

## Complete User Journey

```
1. User Input
   ↓
   User types: "$500 HKD McDonald's"
   ↓
2. Parser Extraction (client-side)
   ↓
   parseTransaction('$500 HKD McDonald\'s')
   ↓
   {
     amount: 500,
     currency: 'HKD',
     category: 'fast-food',
     merchantId: 'mcdonalds',
     paymentType: 'offline',
     confidence: { overall: 0.76 }
   }
   ↓
3. Cards Already Loaded (from server component)
   ↓
   cards[] passed as props on page load
   ↓
4. Calculate Rewards (client-side, for each card)
   ↓
   For SC Smart Card:
     - Match: specificMerchants includes 'mcdonalds' ✓
     - Rule: HK$15 = 1 point (6.67%)
     - Reward: 500 × 0.0667 = 33.33 points
   ↓
   For Citi Cash Back:
     - Match: categories includes 'dining' ✓
     - Rules: 1% base + 1% dining = 2% cumulative
     - Reward: 500 × 0.02 = $10.00 cash
   ↓
5. Rank Cards
   ↓
   Sort by net value (reward - fees):
     1. HSBC EveryMile: 250 miles (50%)
     2. SC Cathay: 125 miles (25%)
     3. Citi Cash Back: $10 cash (2%)
   ↓
6. Display Results (instant, no API call)
   ↓
   Show top 3 with:
   - Card name + issuer
   - Reward amount + unit
   - Effective rate
   - Net value
   - "Apply Here" link
```

---

## File Structure

```
CardGPT/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx              # Server component - loads cards
│   │   └── api/
│   │       ├── parse-activity/       # AI activity parsing (server-side)
│   │       └── admin/
│   │           ├── auth/             # Admin authentication
│   │           └── cards/
│   │               ├── route.ts      # List/create (force-dynamic)
│   │               └── [id]/
│   │                   └── route.ts  # Get/update/delete (force-dynamic)
│   │
│   ├── components/
│   │   ├── HomeClient.tsx            # Client component - UI & recommendations
│   │   ├── TransactionInput.tsx      # User input form
│   │   ├── CardRecommendationList.tsx # Results display
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── parser/                   # NLP Transaction Parser
│   │   │   ├── transactionParser.ts  # Core parser
│   │   │   └── __tests__/
│   │   │
│   │   ├── engine/                   # Reward Engine
│   │   │   ├── calculateReward.ts    # Calculation logic
│   │   │   ├── recommendCards.ts     # Ranking logic
│   │   │   └── index.ts              # Public API
│   │   │
│   │   ├── data/
│   │   │   ├── blobStorage.ts        # Vercel Blob read/write
│   │   │   ├── cardRepository.ts     # Sync/async data access
│   │   │   ├── cardWriter.ts         # Write operations
│   │   │   └── loadCards.ts          # Card loading with validation
│   │   │
│   │   └── ai/
│   │       └── parseActivity.ts      # AI-powered activity parsing
│   │
│   ├── types/
│   │   ├── card.ts                   # CreditCard, RewardRule
│   │   ├── transaction.ts            # Transaction, UserPreferences
│   │   └── recommendation.ts         # RewardCalculation, CardRecommendation
│   │
│   ├── data/
│   │   ├── cards.json                # Local card database (dev only)
│   │   └── card-template.json        # Template for new cards
│   │
│   └── i18n/                         # Internationalization
│       ├── routing.ts
│       └── request.ts
│
├── messages/                         # Translation Files
│   ├── en.json
│   └── zh-HK.json
│
└── docs/
    └── ARCHITECTURE.md               # This file
```

---

## Environment Detection

```typescript
// src/lib/data/blobStorage.ts

export function isProductionEnvironment(): boolean {
  return process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';
}

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}
```

**Important**: These checks only work on the server. Client components cannot access `process.env.VERCEL`.

---

## Type Safety

All components are fully typed with TypeScript strict mode:

```typescript
// Parser types
parseTransaction(input: string): ParseResult
  → ParseResult {
      transaction: Transaction
      confidence: ConfidenceScores
      warnings: string[]
    }

// Engine types
calculateReward(card: CreditCard, transaction: Transaction): RewardCalculation
  → RewardCalculation {
      cardId: string
      rewardAmount: number
      rewardUnit: RewardUnit
      effectiveRate: number
      fees: number
    }

recommendCards(cards: CreditCard[], transaction: Transaction): RecommendationResult
  → RecommendationResult {
      recommendations: CardRecommendation[]
      transaction: Transaction
    }
```

---

## Performance Characteristics

| Component | Avg Time | Notes |
|-----------|----------|-------|
| **Parser** | < 2ms | Regex + keyword matching |
| **Engine (per card)** | < 1ms | Rule matching + calculation |
| **Full Recommendation** | < 15ms | All cards × all rules |
| **Card Loading (blob)** | < 100ms | Network fetch (once per page load) |
| **Total Search Latency** | < 20ms | After initial page load |

**Scalability**:
- Parser: O(n) where n = input length
- Engine: O(c × r) where c = cards, r = rules per card
- Current: ~50 cards × ~5 rules avg = 250 rule checks
- Handles 100+ cards without performance issues

---

## Security Considerations

### What's Exposed to Client

| Data | Exposed? | Notes |
|------|----------|-------|
| Card data (names, rates, fees) | Yes | Public marketing info, not sensitive |
| API keys (OpenAI, Anthropic) | No | Only accessed in API routes |
| Blob token | No | Server-side only |

### API Key Protection

AI-powered features (activity parsing) run through server-side API routes:
- `/api/parse-activity` - Uses OpenAI/Anthropic keys, rate-limited
- Keys are never sent to the client

---

## Common Pitfalls

### 1. Static Import Caching

**Don't do this in API routes**:
```typescript
import cardsData from '@/data/cards.json';

export async function GET() {
  return Response.json(cardsData); // Stale! Bundled at build time
}
```

**Do this instead**:
```typescript
import { getAllCardsAsync } from '@/lib/data/cardRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cards = await getAllCardsAsync(); // Fresh from blob
  return Response.json(cards);
}
```

### 2. Client-Side Environment Variables

**Don't do this**:
```typescript
'use client';

// process.env.VERCEL is undefined on client!
if (process.env.VERCEL) {
  // This never runs
}
```

**Do this instead**: Move environment checks to server components or API routes.

### 3. Missing force-dynamic

If a page/route reads dynamic data but doesn't have `force-dynamic`, Next.js may cache the response at build time.

---

## Internationalization

**Supported Locales**:
- English (en)
- Traditional Chinese (zh-HK)

**i18n Coverage**:
- ✅ Parser keywords (bilingual)
- ✅ UI labels (next-intl)
- ✅ Card names (from database)
- ✅ Error messages
- ✅ Category names

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Vercel                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │   Next.js 14+ App                                        │   │
│  │   - Server Components (data fetching)                   │   │
│  │   - Client Components (interactive UI)                  │   │
│  │   - API Routes (admin CRUD, AI parsing)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │   Vercel Blob Storage                                    │   │
│  │   - cards.json (persistent card database)               │   │
│  │   - Read/write via @vercel/blob SDK                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Features:                                                      │
│  - Edge Functions (fast global delivery)                        │
│  - Automatic HTTPS                                              │
│  - Preview deployments                                          │
│  - Analytics                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Changelog

### 2026-01-30 (v2.0)

**Fixed**: Admin card saves not persisting
- Root cause: `GET /api/admin/cards/[id]` used sync `getCardById()` which read from static import
- Fix: Added `force-dynamic`, switched to `getCardByIdAsync()`

**Fixed**: Public recommendations showing stale data
- Root cause: `page.tsx` was a client component, `loadCards()` fell back to static import
- Fix: Split into server component (`page.tsx`) + client component (`HomeClient.tsx`)

**Added**: This architecture document (merged from original ARCHITECTURE.md)

### 2026-01-21 (v1.0)

- Initial architecture document
- Parser and engine documentation
- File structure and type definitions

---

## Related Documents

- [CardGPT PRD](../CardGPT%20PRD.md) - Product requirements
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
