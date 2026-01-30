# CardGPT Architecture

This document describes the data architecture and key design decisions for the CardGPT application.

## Overview

CardGPT is a Next.js 14+ application that recommends Hong Kong credit cards based on user transactions. The architecture separates concerns between:

- **Data Storage**: Vercel Blob (production) / Local JSON (development)
- **Server Components**: Data fetching and initial rendering
- **Client Components**: Interactive UI and recommendation calculations

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

**Problem**: The home page was a client component that called `loadCards()` directly. In production, `process.env.VERCEL` is not available on the client, so it always fell back to the stale static import bundled at build time.

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

## File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   └── page.tsx              # Server component - loads cards
│   └── api/
│       └── admin/
│           └── cards/
│               ├── route.ts      # List/create cards (force-dynamic)
│               └── [id]/
│                   └── route.ts  # Get/update/delete card (force-dynamic)
├── components/
│   └── HomeClient.tsx            # Client component - UI & recommendations
├── lib/
│   ├── data/
│   │   ├── blobStorage.ts        # Vercel Blob read/write
│   │   ├── cardRepository.ts     # Sync/async data access
│   │   ├── cardWriter.ts         # Write operations
│   │   └── loadCards.ts          # Card loading with validation
│   └── engine/
│       ├── calculateReward.ts    # Reward calculation logic
│       └── recommendCards.ts     # Card ranking algorithm
└── data/
    └── cards.json                # Local card database (dev only)
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

## Changelog

### 2026-01-30

**Fixed**: Admin card saves not persisting
- Root cause: `GET /api/admin/cards/[id]` used sync `getCardById()` which read from static import
- Fix: Added `force-dynamic`, switched to `getCardByIdAsync()`

**Fixed**: Public recommendations showing stale data
- Root cause: `page.tsx` was a client component, `loadCards()` fell back to static import
- Fix: Split into server component (`page.tsx`) + client component (`HomeClient.tsx`)

---

## Related Documents

- [CardGPT PRD](../CardGPT%20PRD.md) - Product requirements
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
