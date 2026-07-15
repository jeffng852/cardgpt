# Schema Refactoring Notes

**Date**: 2026-01-21
**Status**: ✅ Complete

## Problem Identified

The original `merchantTypes` field mixed two different abstraction levels:

```json
// SC Smart Card (BEFORE)
"merchantTypes": [
  "759-store",      // ← Specific merchant
  "circle-k",       // ← Specific merchant
  "mcdonalds",      // ← Specific merchant
  "netflix",        // ← Specific merchant
  ...
]

// Citi Cash Back (BEFORE)
"merchantTypes": [
  "restaurant",     // ← Category
  "dining",         // ← Category
  "cafe"            // ← Category
]
```

**Issues**:
1. **Semantic ambiguity**: Is "mcdonalds" a merchant or a category?
2. **Poor scalability**: Adding new merchants requires updating all card rules
3. **Matching complexity**: Should "restaurant" match "mcdonalds"?
4. **NLP parser confusion**: User says "McDonald's" - match category or merchant?

## Solution: Hierarchical Separation

### New Schema

```typescript
interface RewardRule {
  // Broad categories (optional)
  categories?: string[] | ['all'];  // 'dining', 'retail', 'travel'

  // Specific merchants (optional)
  specificMerchants?: string[];     // 'mcdonalds', '759-store', 'netflix'

  // Deprecated (backward compatible)
  merchantTypes?: string[] | ['all'];
}

interface Transaction {
  // Broad category
  category?: string;        // 'dining', 'retail'

  // Specific merchant ID
  merchantId?: string;      // 'mcdonalds', 'sushiro'

  // Deprecated (backward compatible)
  merchantType?: string;
}
```

### After Refactoring

```json
// SC Smart Card (AFTER)
{
  "specificMerchants": [
    "759-store", "circle-k", "mcdonalds", "netflix", "spotify", ...
  ]
}

// Citi Cash Back (AFTER)
{
  "categories": ["dining"]
}
```

## Matching Logic

**Priority Order**:
1. Check if rule applies to "all" merchants
2. Check specific merchant ID match (highest priority)
3. Check category match

**Example**:
```typescript
// Transaction: McDonald's purchase
{
  category: 'dining',
  merchantId: 'mcdonalds'
}

// SC Smart Card rule (has mcdonalds in specificMerchants)
✅ MATCHES via specificMerchants

// Citi Cash Back rule (has dining in categories)
✅ MATCHES via categories

// Both cards apply! Correctly represents real-world scenario.
```

## Migration Results

**All 10 cards migrated successfully**:

| Card | Categories | Specific Merchants |
|------|-----------|-------------------|
| Citi Cash Back | dining, travel (all) | - |
| SC Smart | all | 19 merchants |
| SC Simply Cash | all | - |
| SC Cathay (all tiers) | dining, travel (all) | - |
| HSBC EveryMile | dining, travel (all) | - |
| HSBC Red | online-retail (all) | 8 merchants |
| DBS Black | all | - |
| Hang Seng enJoy | all | - |

**Total specific merchants**: 27 unique merchant IDs

## Backward Compatibility

The engine supports BOTH schemas:

```typescript
function matchesRule(rule: RewardRule, transaction: Transaction): boolean {
  // NEW SCHEMA: Check categories and specificMerchants
  if (rule.categories || rule.specificMerchants) {
    // New matching logic
  }
  // OLD SCHEMA: Check merchantTypes (deprecated)
  else if (rule.merchantTypes) {
    // Old matching logic (still works!)
  }
}
```

This means:
- ✅ Old data still works
- ✅ New data works better
- ✅ Gradual migration possible
- ✅ No breaking changes

## Benefits

### 1. Clear Semantics
```typescript
// BEFORE: Ambiguous
merchantTypes: ["mcdonalds", "restaurant"]  // Mixed!

// AFTER: Crystal clear
categories: ["dining"]           // Categories here
specificMerchants: ["mcdonalds"] // Merchants here
```

### 2. Better Scalability
```typescript
// BEFORE: Must update every card when adding merchant
Rule 1: merchantTypes: ["mcdonalds", "sushiro", ...]
Rule 2: merchantTypes: ["mcdonalds", "sushiro", ...]
// Adding "tamjai" requires updating all rules!

// AFTER: One transaction change, no card updates needed
Transaction: {
  category: "dining",
  merchantId: "tamjai"  // New merchant, no card changes!
}
```

### 3. NLP Parser Ready
```typescript
// User input: "$500 at McDonald's"
// Parser can now output:
{
  amount: 500,
  category: "dining",      // Inferred category
  merchantId: "mcdonalds"  // Exact merchant
}

// Engine matches both:
// - Cards with "dining" in categories
// - Cards with "mcdonalds" in specificMerchants
```

### 4. Exclusions Support
```typescript
{
  categories: ["dining"],
  excludedMerchants: ["mcdonalds"]  // All dining EXCEPT McDonald's
}

{
  specificMerchants: ["netflix", "spotify"],
  excludedCategories: ["gambling"]  // These merchants EXCEPT gambling
}
```

## Real-World Example: McDonald's Purchase

**Transaction**:
```json
{
  "amount": 500,
  "currency": "HKD",
  "category": "dining",
  "merchantId": "mcdonalds"
}
```

**Matching Cards**:
1. ✅ **SC Smart Card** - matches via `specificMerchants: ["mcdonalds"]`
2. ✅ **Citi Cash Back** - matches via `categories: ["dining"]`
3. ✅ **HSBC EveryMile** - matches via `categories: ["dining"]`

All three cards correctly recognize this as a qualifying transaction!

## Future Enhancements

With this schema, we can now support:

### 1. Merchant Taxonomy Database
```json
// src/data/merchants.json
{
  "mcdonalds": {
    "name": "McDonald's",
    "category": "dining",
    "subcategory": "fast-food",
    "aliases": ["麥當勞", "mcd", "mcdonald"],
    "mcc": "5814"
  }
}
```

### 2. Hierarchical Categories
```json
{
  "categories": ["fast-food"],  // More specific than "dining"
  "excludedCategories": ["fine-dining"]
}
```

### 3. MCC Code Support
```json
{
  "mccCodes": ["5814", "5812"],  // Restaurant MCCs
  "specificMerchants": ["mcdonalds"]
}
```

## Testing

Verified with real card data:

```
✅ All 10 cards load correctly
✅ Engine example runs successfully
✅ TypeScript compiles with 0 errors
✅ Backward compatibility maintained
✅ New matching logic works
```

## Files Changed

1. **src/types/card.ts** - Updated RewardRule interface
2. **src/types/transaction.ts** - Updated Transaction interface
3. **src/types/index.ts** - Fixed export error
4. **src/lib/engine/calculateReward.ts** - Updated matching logic
5. **src/lib/engine/example.ts** - Updated examples
6. **src/data/cards.json** - Migrated all 10 cards
7. **scripts/migrate-schema.ts** - Migration script for reference

## Recommendation for Future

When adding new cards:
- Use `categories` for broad merchant types
- Use `specificMerchants` for exact merchant names
- Never mix them in one field
- Document merchant taxonomy separately

---

**Next Phase**: Build NLP parser (THI-14) that outputs both `category` and `merchantId` from user input.
