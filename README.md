# CardGPT

AI-powered credit card rewards optimizer for Hong Kong users.

## Overview

CardGPT helps users maximize credit card rewards by recommending the best card(s) to use for specific transactions based on merchant type, spending amount, payment method, and other factors.

Three public surfaces, all bilingual (English + Traditional Chinese):

- **`/`** — the recommender. Describe a purchase and get cards ranked by net value.
- **`/cards`** — the Card Directory: a read-only browse grid over the full active card set, with search and sort, plus a shareable `/cards/[id]` detail page. It ranks nothing and makes no engine call, so globally-available cards stay browsable even when they are out of scope for HK recommendations.
- **`/research`** — a plain-language explainer of how the ranking and the crypto→HKD valuation work.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Data**: Upstash Redis (card corpus + crypto→HKD rate table)
- **Deployment**: Vercel (region `hkg1`)
- **i18n**: next-intl (English + Traditional Chinese)
- **Tests**: Vitest

## Project Status

Currently in development. The app runs on the **v2 design system** (brutalist-editorial) as of the
Phase 11 re-skin, and milestone **v1.1 — Card Directory & Crypto Expansion is complete** (crypto
card support with HKD valuation, the card directory, and the research explainer all shipped). See
the Linear project for detailed requirements and roadmap.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run the test suite
npm test
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
/src
  /app          # Next.js app router pages
  /components   # React components
  /lib          # Utilities and business logic
  /data         # Card data (JSON)
  /i18n         # next-intl routing and message config
  /types        # TypeScript type definitions
```

## Development Workflow

This project uses Linear for task management. Reference Linear issue IDs in commit messages:

```bash
git commit -m "THI-123: Add card recommendation engine"
```

## License

MIT - see [LICENSE](LICENSE)
