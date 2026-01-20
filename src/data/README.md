# Card Data Directory

This directory contains the credit card database and related utilities.

## Files

- **cards.json** - Main database of credit cards
- **card-template.json** - Template for adding new cards
- **README.md** - This file

## Card Data Structure

See `card-template.json` for a complete example of the card data format.

### Required Fields

Every card must have:
- `id` - Unique identifier (kebab-case, e.g., "hsbc-red-card")
- `name` - Full card name
- `issuer` - Bank/issuer name
- `applyUrl` - URL to card application page
- `rewards` - Array of reward rules (at least one)
- `fees` - Fee structure object with `annualFee`
- `isActive` - Boolean indicating if card is currently offered
- `lastUpdated` - ISO timestamp of last data update

### Optional Fields

- `imageUrl` - Card image URL
- `network` - Card network (Visa, Mastercard, etc.)
- `tags` - Array of tags for categorization
- `rewardCap` - Monthly/yearly reward limits

## Reward Rules

Each reward rule specifies:
- `merchantTypes` - Array of merchant categories this rule applies to
- `rewardRate` - Percentage as decimal (e.g., 0.05 = 5%)
- `rewardUnit` - "cash", "miles", or "points"
- `description` - Human-readable description
- `conditions` - Optional conditions (payment type, amount limits, etc.)

## Merchant Types

Standard merchant type keywords:
- `restaurant` / `dining`
- `supermarket` / `grocery`
- `online-shopping` / `ecommerce`
- `gas-station` / `petrol`
- `department-store`
- `travel`
- `entertainment`
- `utilities`
- `healthcare`
- `education`

## Adding New Cards

1. Copy `card-template.json`
2. Fill in all required fields
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

Invalid cards are logged to console and skipped.

## Maintenance

- Review card data monthly
- Update reward rates when promotions change
- Mark discontinued cards as `isActive: false`
- Add new cards as they launch
- Update `lastUpdated` on any changes

## Example Card Entry

```json
{
  "id": "hsbc-red",
  "name": "HSBC Red Credit Card",
  "issuer": "HSBC",
  "applyUrl": "https://www.hsbc.com.hk/credit-cards/products/red/",
  "rewards": [
    {
      "merchantTypes": ["online-shopping", "supermarket", "dining"],
      "rewardRate": 0.04,
      "rewardUnit": "cash",
      "description": "4% online/supermarket/dining rewards"
    }
  ],
  "fees": {
    "annualFee": 0
  },
  "isActive": true,
  "lastUpdated": "2026-01-20T00:00:00.000Z"
}
```
