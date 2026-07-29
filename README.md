# CardGPT

AI-powered credit card rewards optimizer for Hong Kong users.

## Overview

CardGPT helps users maximize credit card rewards by recommending the best card(s) to use for specific transactions based on merchant type, spending amount, payment method, and other factors.

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
Phase 11 re-skin. See Linear project for detailed requirements and roadmap.

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
