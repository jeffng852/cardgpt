# CardGPT

AI-powered credit card rewards optimizer for Hong Kong users.

## Overview

CardGPT helps users maximize credit card rewards by recommending the best card(s) to use for specific transactions based on merchant type, spending amount, payment method, and other factors.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Deployment**: Vercel
- **i18n**: next-intl (English + Traditional Chinese)

## Project Status

Currently in development. See Linear project for detailed requirements and roadmap.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
/src
  /app          # Next.js app router pages
  /components   # React components
  /lib          # Utilities and business logic
  /data         # Card data (JSON)
  /types        # TypeScript type definitions
```

## Development Workflow

This project uses Linear for task management. Reference Linear issue IDs in commit messages:

```bash
git commit -m "THI-123: Add card recommendation engine"
```

## License

Proprietary - All rights reserved
