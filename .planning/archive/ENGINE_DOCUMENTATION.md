# CardGPT Recommendation Engine Documentation

## Overview

The recommendation engine is the core business logic of CardGPT. It calculates rewards for credit card transactions and ranks cards to provide personalized recommendations.

## Architecture

```
src/lib/engine/
├── calculateReward.ts    # Core reward calculation algorithm
├── recommendCards.ts     # Card ranking and recommendation logic
├── index.ts              # Public API exports
├── example.ts            # Usage examples
└── __tests__/
    └── engine.test.ts    # Unit tests
```

## Core Concepts

### 1. Reward Calculation (`calculateReward`)

Implements the priority + cumulative algorithm defined in `SCHEMA_DESIGN.md`:

**Algorithm Steps:**
1. Find all reward rules matching the transaction
2. Group rules by priority (base, bonus, premium)
3. Apply base rate (only one base rule)
4. Add cumulative bonuses or take max of non-cumulative
5. Apply premium rate (highest wins)
6. Handle monthly spending caps with fallback rates
7. Calculate transaction fees

**Input:**
- `CreditCard`: Card with reward rules
- `Transaction`: User's transaction details
- `options`: Optional settings (monthly spending for cap tracking)

**Output:**
- `RewardCalculation`: Calculated rewards, fees, applied rules

**Example:**
```typescript
const calculation = calculateReward(card, {
  amount: 500,
  currency: 'HKD',
  merchantType: 'restaurant',
  paymentType: 'offline'
});

console.log(calculation.rewardAmount);  // 10 (2% of 500)
console.log(calculation.effectiveRate); // 0.02 (2%)
console.log(calculation.appliedRules); // ['base-rebate', 'local-dining-bonus']
```

### 2. Card Ranking (`recommendCards`)

Ranks all credit cards for a transaction based on net value (reward - fees).

**Algorithm Steps:**
1. Filter inactive and excluded cards
2. Apply user preference filters (reward units, max annual fee)
3. Calculate rewards for all eligible cards
4. Sort by net value with tie-breaking:
   - Higher net value wins
   - If tied, higher reward amount wins
   - If tied, lower annual fee wins
   - If tied, preferred issuer wins
   - If tied, alphabetical order
5. Mark top card as "Recommended"

**Input:**
- `CreditCard[]`: Array of all cards
- `Transaction`: User's transaction
- `RecommendationPreferences`: Optional user preferences

**Output:**
- `RecommendationResult`: Ranked list of card recommendations

**Example:**
```typescript
const result = recommendCards(allCards, transaction, {
  preferredRewardUnits: ['miles'],
  maxAnnualFee: 2000,
  monthlySpending: 15000
});

// Top recommendation
const topCard = result.recommendations[0];
console.log(topCard.card.name);          // "DBS Black World Mastercard"
console.log(topCard.isRecommended);      // true
console.log(topCard.netValue);           // 45.5 (reward - fees)
```

## Transaction Matching Logic

A reward rule matches a transaction when:

1. **Merchant Type Matches**:
   - Rule has `merchantTypes: ['all']`, OR
   - Transaction's merchant type is in rule's `merchantTypes` array

2. **Not Excluded**:
   - Transaction's merchant type is NOT in rule's `excludedMerchants`

3. **Conditions Met** (if present):
   - Payment type matches (online/offline)
   - Currency matches (HKD, foreign, or specific currency)
   - Not in excluded currencies
   - Day of week matches (if specified)
   - Amount within min/max range
   - Geographic restrictions respected

## Real-World Examples

### Example 1: Citi Cash Back Card - HKD Dining

**Transaction:**
```typescript
{
  amount: 500,
  currency: 'HKD',
  merchantType: 'restaurant',
  paymentType: 'offline'
}
```

**Matching Rules:**
1. Base rebate (1%, priority: base, cumulative: false)
2. Local dining bonus (1%, priority: bonus, cumulative: true)

**Calculation:**
- Base rate: 0.01 (1%)
- Cumulative bonus: +0.01 (1%)
- **Total rate: 0.02 (2%)**
- Reward: $500 × 0.02 = **$10**

### Example 2: HSBC Red - Online Shopping with Cap

**Transaction:**
```typescript
{
  amount: 2000,
  currency: 'HKD',
  merchantType: 'online-shopping',
  paymentType: 'online'
}
```

**Card Rules:**
- Online purchases: 4% on first $10,000/month, then 0.4%

**Calculation (user already spent $9,000 this month):**
- $1,000 remaining at 4% cap → $40
- $1,000 at fallback 0.4% → $4
- **Total reward: $44**

### Example 3: SC Cathay Mastercard - Overseas Miles

**Transaction:**
```typescript
{
  amount: 1000,
  currency: 'USD',
  merchantType: 'hotel',
  paymentType: 'online',
  location: 'United States'
}
```

**Card: Priority Private Tier**
- Overseas: HK$2 = 1 mile → rate: 0.5 miles per HKD
- Conversion: $1000 USD ≈ $7800 HKD
- **Reward: 3,900 miles**

## Utility Functions

### `formatReward(calculation)`
Formats reward amount for display.

```typescript
formatReward(calculation);
// "$10.00" for cash
// "500 miles" for miles
// "1000 points" for points
```

### `formatEffectiveRate(calculation)`
Formats effective rate as percentage.

```typescript
formatEffectiveRate(calculation);
// "2.00%"
```

### `calculateNetValue(calculation)`
Calculates net value (reward - fees).

```typescript
const netValue = calculateNetValue(calculation);
// 10.00 - 0.00 = 10.00
```

### `getTopRecommendations(result, count)`
Get top N recommendations.

```typescript
const top3 = getTopRecommendations(result, 3);
```

### `filterByRewardUnit(result, rewardUnit)`
Filter recommendations by reward type.

```typescript
const milesCards = filterByRewardUnit(result, 'miles');
```

### `groupByRewardUnit(result)`
Group recommendations by reward type.

```typescript
const grouped = groupByRewardUnit(result);
console.log(grouped.cash);   // All cashback cards
console.log(grouped.miles);  // All miles cards
console.log(grouped.points); // All points cards
```

### `compareTwoCards(card1, card2)`
Compare two cards to show potential savings.

```typescript
const comparison = compareTwoCards(currentCard, alternativeCard);
console.log(comparison.savingsAmount);     // 5.50
console.log(comparison.savingsPercentage); // 22%
console.log(comparison.isBetter);          // true
```

## User Preferences

The `RecommendationPreferences` interface allows filtering:

```typescript
interface RecommendationPreferences {
  preferredRewardUnits?: Array<'cash' | 'miles' | 'points'>;
  minRewardRate?: number;
  maxAnnualFee?: number;
  monthlySpending?: number;
  preferredIssuers?: string[];
  excludedCardIds?: string[];
}
```

**Example:**
```typescript
const preferences = {
  preferredRewardUnits: ['miles'],
  maxAnnualFee: 2000,
  monthlySpending: 15000,
  preferredIssuers: ['HSBC', 'DBS']
};

const result = recommendCards(allCards, transaction, preferences);
```

## Edge Cases Handled

1. **No matching rules**: Returns 0 reward with empty `appliedRules`
2. **Excluded merchants** (casino, cash advance): Returns 0 reward
3. **Multiple cumulative bonuses**: All rates add up correctly
4. **Premium rate lower than base + bonus**: Base + bonus wins
5. **Monthly cap reached**: Uses fallback rate automatically
6. **Tie-breaking**: Follows defined priority order consistently
7. **Foreign transaction fees**: Calculated for non-HKD currencies
8. **Geographic restrictions**: Online transactions bypass exclusions if `onlineExempt: true`

## Testing

Run unit tests:
```bash
npm test
```

Run example demo:
```bash
npx tsx src/lib/engine/example.ts
```

## Integration

### In React Components

```typescript
'use client';
import { recommendCards } from '@/lib/engine';
import { loadCards } from '@/lib/data/loadCards';

export default function RecommendationPage() {
  const [result, setResult] = useState<RecommendationResult | null>(null);

  async function handleSubmit(transaction: Transaction) {
    const cards = await loadCards();
    const recommendations = recommendCards(cards, transaction);
    setResult(recommendations);
  }

  // ... rest of component
}
```

### In API Routes

```typescript
// app/api/recommend/route.ts
import { NextResponse } from 'next/server';
import { recommendCards } from '@/lib/engine';
import { loadCards } from '@/lib/data/loadCards';

export async function POST(request: Request) {
  const transaction = await request.json();
  const cards = await loadCards();
  const result = recommendCards(cards, transaction);

  return NextResponse.json(result);
}
```

## Performance Considerations

- **Card database**: Currently 10 cards with 36 rules total
- **Calculation time**: < 1ms per card on modern hardware
- **Total recommendation time**: < 10ms for all 10 cards
- **Scalability**: Linear O(n×m) where n=cards, m=rules per card
- **Optimization**: Could add caching for repeated transactions

## Future Enhancements

1. **Monthly spending tracking**: Persist user's monthly spending for accurate cap calculations
2. **Historical analysis**: Track which cards user owns and suggest better alternatives
3. **Reward redemption tracking**: Factor in accumulated rewards near redemption threshold
4. **Multi-transaction optimization**: Suggest card combinations for multiple purchases
5. **Annual fee amortization**: Calculate effective rate considering annual fee spread
6. **Time-based promotions**: Support limited-time bonus rates
7. **Spending forecast**: Recommend cards based on predicted monthly spending

---

**Last Updated**: 2026-01-21
**Version**: 1.0.0
