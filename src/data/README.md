# Card Data Directory

This directory contains the credit card database and related utilities.

## Files

- **cards.json** - Main database of credit cards (the static fallback; production reads Upstash Redis)
- **card-template.json** - Template for adding new cards
- **crypto-cards.fixture.json** - Synthetic crypto-card fixture consumed by `scripts/seed-crypto-cards.mjs`
- **pending.json** - Admin pending-submission queue, read/written by `src/lib/data/pendingRepository.ts`
- **examples/** - Worked single-card examples (e.g. `citi-cash-back-card.json`)
- **README.md** - This file

## Card Data Structure

The authoritative contract is the `CreditCard` / `RewardRule` types in `src/types/card.ts`;
`card-template.json` is a starting skeleton (see the caveat under *Adding New Cards*).

### Required Fields

Every card must have:
- `id` - Unique identifier (kebab-case, e.g., "hsbc-red-card")
- `cardType` - `"credit"`, `"crypto"`, or `"prepaid"` (required on create/update by `validateCard` in `src/lib/data/cardRepository.ts`)
- `name` - Full card name
- `issuer` - Bank/issuer name
- `rewards` - Array of reward rules (at least one)
- `fees` - Fee structure object with `annualFee`
- `isActive` - Boolean indicating if card is currently offered
- `lastUpdated` - ISO timestamp of last data update

### Optional Fields

- `applyUrl` - URL to card application page (optional, but must be a valid URL if present)
- `termsUrl` - URL to the card's terms & conditions
- `imageUrl` - Card image URL
- `network` - Card network (Visa, Mastercard, etc.)
- `tags` - Array of tags for categorization
- `rewardPrograms` - Named miles/points/crypto programme details (e.g. "Asia Miles" rather than a bare "miles"); the crypto entry's `shortName` is the key the HKD rate table is resolved by

## Reward Rules

Each reward rule specifies (see `RewardRule` in `src/types/card.ts` for the full contract):
- `id` - Unique rule id, for debugging/tracking
- `categories` - Broad categories this rule applies to; use `["all"]` for a universal rule
- `specificMerchants` - Optional exact merchant names, when a rule is merchant-specific rather than category-wide
- `rewardRate` - Percentage as decimal (e.g., 0.05 = 5%)
- `rewardUnit` - "cash", "miles", "points", or "crypto"
- `priority` - `"base"` (foundation rate) / `"bonus"` (stacks on base) / `"specific"` (replaces base entirely)
- `description` - Human-readable description (`description_zh` for the Traditional Chinese copy)
- `conditions` - Optional conditions (payment type, currency, geography, amount limits, etc.)
- `excludedCategories` / `excludedMerchants` - Optional exclusions
- `monthlySpendingCap` / `fallbackRate` - Optional monthly cap and the rate applied past it

> `merchantTypes` and `isCumulative` are **deprecated** — kept on the type only for backward
> compatibility. Author new rules with `categories`/`specificMerchants` and `priority`.

## Categories

`categories` is an open vocabulary, not a fixed enum. The broad keywords currently used across
`cards.json` are:

- `all` (universal rules)
- `dining`, `light-meal`
- `retail`, `online`, `online-shopping`
- `travel`, `travel-service`
- `transport`, `local-transport`, `cross-border-transport`, `taxi-app`

alongside merchant- or programme-specific keys (e.g. `cathay-pacific`, `hk-express`,
`yuu-partner`, `tamjai-samgor`). Reuse an existing keyword where one fits rather than
introducing a synonym.

## Adding New Cards

1. Copy `card-template.json` — note it still carries the deprecated `merchantTypes` field on its
   reward rules; author `categories`/`specificMerchants` instead
2. Fill in all required fields (including `cardType`)
3. Add reward rules based on card's terms
4. Add the card object to `cards.json` cards array
5. Update `lastUpdated` timestamp
6. Update `metadata.totalCards` count
7. Validate JSON syntax
8. Test with `npm run dev`

## Data Sources

Primary sources for card data:
- [MoneyHero.com.hk](https://www.moneyhero.com.hk/en/credit-card)
- [MoneySmart.hk](https://www.moneysmart.hk/en/credit-card)
- Official bank websites

## Validation

The `loadCards()` function validates:
- All required fields present
- Correct data types
- Non-empty rewards array
- Active status flag

Invalid cards are logged to console and skipped. Note it does **not** gate on `cardType`, so
legacy records predating the crypto fan-out still load; `cardType` is enforced separately by
`validateCard` in `src/lib/data/cardRepository.ts` on create/update.

## Maintenance

- Review card data monthly
- Update reward rates when promotions change
- Mark discontinued cards as `isActive: false`
- Add new cards as they launch
- Update `lastUpdated` on any changes

## Example Card Entry

```json
{
  "id": "example-cash-back",
  "cardType": "credit",
  "name": "Example Cash Back Card",
  "issuer": "Example Bank",
  "network": "Mastercard",
  "applyUrl": "https://example.com/cards/cash-back",
  "tags": ["cashback", "dining"],
  "isActive": true,
  "lastUpdated": "2026-01-30T03:11:29.103Z",
  "rewards": [
    {
      "id": "base-rebate",
      "categories": ["all"],
      "rewardRate": 0.01,
      "rewardUnit": "cash",
      "priority": "base",
      "description": "1% rebate on all eligible spending",
      "excludedMerchants": ["cash-advance", "balance-transfer", "tax-payment"]
    },
    {
      "id": "dining-bonus",
      "categories": ["dining"],
      "rewardRate": 0.03,
      "rewardUnit": "cash",
      "priority": "bonus",
      "description": "Additional 3% on dining (4% total)",
      "monthlySpendingCap": 10000
    }
  ],
  "fees": {
    "annualFee": 0
  }
}
```

For real, fully-populated entries read `cards.json` directly. (`examples/citi-cash-back-card.json` predates the schema migration and still uses `merchantTypes`.)
