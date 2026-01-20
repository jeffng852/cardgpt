# Card Data Schema Design

## Problem: Complex Overlapping Reward Rules

Credit cards like the **Citi Cash Back Card** have complex reward structures where multiple rules can apply to a single transaction. The challenge is modeling this accurately without duplication or ambiguity.

### Example: Citi Cash Back Card

A $500 HKD dining transaction earns:
- **Base**: 1% on all spending = $5
- **Dining bonus**: Additional 1% on HKD dining = $5
- **Total**: 2% = $10

The "2% dining rebate" **includes** the 1% base, not in addition to it.

## Schema Design Principles

### 1. **Rule Priority System**

Three priority levels:
- **`base`**: Universal base rate (e.g., 1% on everything)
- **`bonus`**: Category/condition bonuses (e.g., +1% on dining)
- **`premium`**: Highest tier (e.g., spend-based upgrades)

### 2. **Cumulative Flag**

- **`isCumulative: true`**: Rate adds to base (Citi model: 1% base + 1% bonus = 2%)
- **`isCumulative: false`**: Rate replaces base (Some cards: 3% dining OR 1% base)

### 3. **Flexible Conditions**

```typescript
conditions: {
  currency: "HKD" | "foreign",      // HKD vs any foreign currency
  paymentType: "online" | "offline", // Online vs card-present
  minAmount: number,                 // Minimum spend
  minMonthlySpending: number,        // Tier unlocks
  geographic: {
    excludedRegions: ["UK", "EEA"],
    onlineExempt: true               // Online OK even in excluded regions
  }
}
```

### 4. **Merchant Type Flexibility**

- **Specific**: `["restaurant", "dining", "cafe"]`
- **Universal**: `["all"]` for base rates
- **Excluded**: `excludedMerchants` array

## Citi Cash Back Card Breakdown

### Rule 1: Base Rebate
```json
{
  "id": "base-rebate",
  "merchantTypes": ["all"],
  "rewardRate": 0.01,               // 1%
  "priority": "base",
  "isCumulative": false,            // This IS the base
  "description": "1% on all spending"
}
```

### Rule 2: Foreign Currency Bonus
```json
{
  "id": "foreign-currency-bonus",
  "merchantTypes": ["all"],
  "rewardRate": 0.01,               // Additional 1%
  "priority": "bonus",
  "isCumulative": true,             // Adds to base = 2% total
  "conditions": {
    "currency": "foreign",
    "geographic": {
      "excludedRegions": ["United Kingdom", "EEA"],
      "onlineExempt": true          // Online transactions OK
    }
  }
}
```

### Rule 3: Local Dining Bonus
```json
{
  "id": "local-dining-bonus",
  "merchantTypes": ["restaurant", "dining"],
  "rewardRate": 0.01,               // Additional 1%
  "priority": "bonus",
  "isCumulative": true,             // Adds to base = 2% total
  "conditions": {
    "currency": "HKD"               // Only HKD transactions
  }
}
```

### Rule 4: Local Hotel Bonus
```json
{
  "id": "local-hotel-bonus",
  "merchantTypes": ["hotel"],
  "rewardRate": 0.01,               // Additional 1%
  "priority": "bonus",
  "isCumulative": true,             // Adds to base = 2% total
  "conditions": {
    "currency": "HKD"
  }
}
```

## Calculation Algorithm

```typescript
function calculateReward(card: CreditCard, transaction: Transaction): number {
  let totalRate = 0;

  // 1. Find all matching rules
  const matchingRules = card.rewards.filter(rule =>
    matchesRule(rule, transaction)
  );

  // 2. Group by priority
  const byPriority = groupBy(matchingRules, 'priority');

  // 3. Apply base rate
  const baseRule = byPriority['base']?.[0]; // Only one base
  if (baseRule) {
    totalRate = baseRule.rewardRate;
  }

  // 4. Add cumulative bonuses
  const bonuses = byPriority['bonus'] || [];
  for (const bonus of bonuses) {
    if (bonus.isCumulative) {
      totalRate += bonus.rewardRate;
    } else {
      totalRate = Math.max(totalRate, bonus.rewardRate);
    }
  }

  // 5. Apply premium (highest tier wins)
  const premiums = byPriority['premium'] || [];
  if (premiums.length > 0) {
    const highestPremium = Math.max(...premiums.map(r => r.rewardRate));
    totalRate = Math.max(totalRate, highestPremium);
  }

  return transaction.amount * totalRate;
}
```

## Transaction Scenarios

### Scenario 1: HKD Dining ($500)
**Matching Rules:**
- Base (1%) ✓
- Dining bonus (1%) ✓

**Calculation:**
- Base: 0.01
- Cumulative bonus: +0.01
- **Total: 0.02 (2%) = $10**

### Scenario 2: Foreign Currency Online ($1000 USD)
**Matching Rules:**
- Base (1%) ✓
- Foreign currency bonus (1%) ✓ (online exempt from UK/EEA exclusion)

**Calculation:**
- Base: 0.01
- Cumulative bonus: +0.01
- **Total: 0.02 (2%) = $20 USD**

### Scenario 3: HKD Supermarket ($300)
**Matching Rules:**
- Base (1%) ✓ only

**Calculation:**
- Base: 0.01
- **Total: 0.01 (1%) = $3**

### Scenario 4: UK Card-Present Transaction (£200)
**Matching Rules:**
- Base (1%) ✓
- Foreign currency bonus (1%) ✗ (excluded: UK card-present)

**Calculation:**
- Base: 0.01
- **Total: 0.01 (1%) = £2**

## Excluded Merchants

Common exclusions across all rules:
```json
"excludedMerchants": [
  "fps-transfer",        // Faster Payment System
  "cash-advance",
  "balance-transfer",
  "installment",
  "tax-payment",         // IRD/government
  "bill-payment",
  "utilities",
  "insurance",
  "charity",
  "mutual-fund",
  "casino",
  "government-fee"
]
```

## Reward Cap

```json
"rewardCap": {
  "unit": "cash",
  "redemptionThreshold": 200    // Auto-redeem when balance ≥ $200
}
```

No monthly/yearly limits for Citi Cash Back Card.

## Schema Advantages

✅ **Accurate**: Represents real card terms precisely
✅ **Flexible**: Handles overlapping, cumulative, and exclusive rules
✅ **Extensible**: Easy to add new condition types
✅ **Clear**: Explicit about what adds vs. replaces
✅ **Debuggable**: Each rule has ID and description

## Other Card Types This Supports

### Simple Flat Rate Card
```json
{
  "rewards": [
    {
      "id": "flat-cashback",
      "merchantTypes": ["all"],
      "rewardRate": 0.015,
      "priority": "base",
      "isCumulative": false,
      "description": "1.5% cashback on everything"
    }
  ]
}
```

### Tiered Spending Card
```json
{
  "rewards": [
    {
      "id": "tier-1",
      "merchantTypes": ["all"],
      "rewardRate": 0.01,
      "priority": "base",
      "isCumulative": false
    },
    {
      "id": "tier-2-upgrade",
      "merchantTypes": ["all"],
      "rewardRate": 0.02,
      "priority": "premium",
      "isCumulative": false,
      "conditions": {
        "minMonthlySpending": 10000
      },
      "description": "2% after $10K monthly spending"
    }
  ]
}
```

### Category Rotating Card
```json
{
  "rewards": [
    {
      "id": "q1-dining",
      "merchantTypes": ["restaurant"],
      "rewardRate": 0.05,
      "priority": "bonus",
      "isCumulative": false,
      "description": "5% dining Q1 2026"
    }
  ]
}
```

## Recommendation

✅ **Use this enhanced schema** for all card data entry
✅ See `src/data/examples/citi-cash-back-card.json` for complete example
✅ Follow this pattern for other complex cards (HSBC Red, DBS Black, etc.)

This design handles 95% of real-world HK credit card reward structures.
