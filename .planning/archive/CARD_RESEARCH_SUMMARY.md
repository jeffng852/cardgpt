# Card Research Summary - 10 Hong Kong Credit Cards

Research completed: 2026-01-20

## Cards Researched

1. CitiBank Cash Back Card ✓
2. Standard Chartered Smart Credit Card ✓
3. Standard Chartered Simply Cash Visa Card ✓
4. Standard Chartered Cathay Mastercard (Standard) ✓
5. Standard Chartered Cathay Mastercard (Priority Banking) ✓
6. Standard Chartered Cathay Mastercard (Priority Private) ✓
7. HSBC EveryMile Credit Card ✓
8. HSBC Red Credit Card ✓
9. DBS Black World Mastercard ✓
10. Hang Seng enJoy Visa Platinum Card ✓

---

## 1. CitiBank Cash Back Card

**Type**: Cashback
**Annual Fee**: $0
**Reward Unit**: Cash

### Reward Structure:
- **Base**: 1% on all eligible spending
- **Foreign Currency**: +1% bonus (2% total, excludes UK/EEA card-present)
- **Local Dining (HKD)**: +1% bonus (2% total)
- **Local Hotels (HKD)**: +1% bonus (2% total)

### Caps:
- Redemption threshold: $200

### Schema Compatibility: ✅ Perfect
Uses cumulative bonus structure (base + bonus)

---

## 2. Standard Chartered Smart Credit Card

**Type**: Cashback
**Annual Fee**: $0
**Reward Unit**: Cash

### Reward Structure (Tiered by Monthly Spending):

**Tier 1: HKD 4,000-14,999/month**
- Designated merchants: 5% (4.44% extra + 0.56% base) on first $5,000
- Other eligible: 0.56% unlimited

**Tier 2: HKD 15,000+/month**
- Designated merchants: 5% (3.80% extra + 1.2% base) on first $5,000
- Other eligible: 1.2% unlimited

**Below HKD 4,000/month**: No rewards

### Designated Merchants:
759 STORE, China Mobile, Circle K, Decathlon, Foodpanda, HK Ticketing, HKTVmall, Japan Home Centre, Klook, McDonald's, Sasa, PARKnSHOP, Watsons, Disney+, Netflix, JOOX, KKBOX, MOOV, Spotify

### Caps:
- Extra cashback: $5,000 monthly at designated merchants
- Total extra cashback: $3,000 per promotion period

### Excluded:
Cash advances, gambling, insurance, securities, bill payments, money transfers

### Schema Compatibility: ⚠️ Complex
**Challenge**: Tiered spending requires `minMonthlySpending` condition + different base rates per tier
**Solution**: Use premium priority for Tier 2, bonus for Tier 1

---

## 3. Standard Chartered Simply Cash Visa Card

**Type**: Cashback
**Annual Fee**: $2,000
**Reward Unit**: Cash

### Reward Structure:
- **Local (HKD)**: 1.5% unlimited
- **Foreign Currency**: 2% unlimited

### Caps: None

### Redemption:
- Minimum: $50 via 360° Rewards Platform

### Schema Compatibility: ✅ Perfect
Simple currency-based rules

---

## 4-6. Standard Chartered Cathay Mastercard (3 Tiers)

**Type**: Miles (Asia Miles)
**Reward Unit**: Miles

### Standard Tier
**Annual Fee**: $2,000 (waived year 1)

**Earning Rates:**
- Cathay/HK Express: HK$2 = 1 mile
- Dining, hotels, overseas: HK$4 = 1 mile
- Other HKD: HK$6 = 1 mile
- Cathay partner restaurants: HK$4 = 2 miles

### Priority Banking Tier
**Annual Fee**: $4,000 (waived with $1M average daily balance)
**Extra Benefit**: 4 shareable business class lounge passes

**Earning Rates:**
- Cathay/HK Express: HK$2 = 1 mile
- **Overseas: HK$3 = 1 mile** (better than standard)
- Dining/hotels: HK$4 = 1 mile
- Other HKD: HK$6 = 1 mile
- Cathay partner restaurants: HK$4 = 2 miles

### Priority Private Tier
**Annual Fee**: $8,000 (waived with $8M average daily balance)
**Extra Benefits**: 2 first class + 8 business class lounge passes

**Earning Rates:**
- Cathay/HK Express: HK$2 = 1 mile
- **Overseas: HK$2 = 1 mile** (best rate)
- Dining/hotels: HK$4 = 1 mile
- Other HKD: HK$6 = 1 mile
- Cathay partner restaurants: HK$4 = 2 miles

### Schema Compatibility: ✅ Perfect
Three separate card entries with different reward rates
Miles use rate as decimal: HK$4 = 1 mile → rewardRate: 0.25

---

## 7. HSBC EveryMile Credit Card

**Type**: Miles (convertible to 16 programs)
**Annual Fee**: Waived year 1, then standard (not disclosed)
**Reward Unit**: RewardCash → Miles

**Minimum Income**: $240,000

### Earning Mechanism:
Earn RewardCash, convert at $1 RC = 20 miles

### Earning Rates:
- **Designated everyday & travel**: 2.5% RC = HK$2 = 1 mile
  - Categories: Cafés, light meals, local transport, cross-border transport, travel services, taxi apps
- **General spending**: 1% RC = HK$5 = 1 mile
- **Overseas (promotional)**: 2.5% RC = HK$2 = 1 mile (with min $12,000 spend)

### Excluded:
- IRD payments
- Policy loan repayments

### Schema Compatibility: ✅ Good
**Note**: Uses intermediate "RewardCash" but we can model as direct miles conversion

---

## 8. HSBC Red Credit Card

**Type**: Cashback (RewardCash)
**Annual Fee**: $0 (perpetual waiver)
**Reward Unit**: RewardCash (cash equivalent)

### Earning Rates:

**Designated Merchants (8% RC)**
- First $1,250/month: 8% RC
- After cap: 0.4% RC unlimited
- Merchants: Sushiro, TamJai, Coffee Academïcs, GU, Decathlon, lululemon, NAMCO, TAITO STATION

**Online Purchases (4% RC)**
- First $10,000/month: 4% RC
- After cap: 0.4% RC unlimited

**McDonald's**
- Reward+ stamps program (up to $30/month with $30+ transactions)

**Red Hot Rewards of Your Choice (2026 program)**
- Allocate 5X extra RC across 5 categories
- Categories: Dining, Lifestyle, Home, Shopping, Overseas & Mainland China
- Up to 6X total (base 1X + extra 5X) = 2.4% RC
- Cap: $100,000 eligible spending

### Schema Compatibility: ⚠️ Complex
**Challenges**:
- Monthly spending caps with different rates
- Flexible category allocation (user chooses)
**Solution**: Model static rates + note customization in description

---

## 9. DBS Black World Mastercard

**Type**: Miles (via DBS$ points)
**Annual Fee**: Waived year 1
**Reward Unit**: DBS$ → Miles

**Minimum Income**: $240,000

### Earning Mechanism:
Earn DBS$ points, convert DBS$48 = 1,000 miles

### Base Earning Rates:
- **Local**: HK$250 = DBS$2 → ~HK$6 = 1 mile
- **Overseas**: HK$250 = DBS$3 → ~HK$4 = 1 mile

### Promotional Rate (2026):
- **Overseas**: HK$2 = 1 mile
- **Condition**: Register + spend $20,000+ in calendar month

### Conversion Programs:
Asia Miles, Avios, KrisFlyer, PhoenixMiles

### Schema Compatibility: ✅ Good
**Note**: Uses intermediate DBS$ but we can model as effective miles rate

---

## 10. Hang Seng enJoy Visa Platinum Card

**Type**: Points (yuu Rewards)
**Annual Fee**: $0 (perpetual waiver)
**Reward Unit**: yuu Points

### Earning Rates:
- **Base**: HK$1 = 1 yuu point (0.5% value)
- **Designated Merchants**: Up to 4X yuu points (2% value)

### Redemption Value:
- 200 yuu points = HK$1
- Therefore: 1 yuu point = HK$0.005

### Schema Compatibility: ✅ Perfect
**Note**: Use 'points' reward unit, redemption value in description

---

## Schema Analysis Summary

### ✅ Perfect Fit (6 cards):
1. CitiBank Cash Back - cumulative bonuses
3. SC Simply Cash - currency-based
4-6. SC Cathay (all tiers) - straightforward miles
10. Hang Seng enJoy - points system

### ✅ Good Fit (2 cards):
7. HSBC EveryMile - intermediate currency handled
9. DBS Black World - intermediate currency handled

### ⚠️ Complex But Supported (2 cards):
2. SC Smart - tiered spending with `minMonthlySpending`
8. HSBC Red - monthly caps + flexible categories

---

## Recommended Schema Enhancements

### Already Supported:
✅ Cumulative bonuses (isCumulative flag)
✅ Currency conditions (HKD vs foreign)
✅ Spending tiers (minMonthlySpending)
✅ Geographic restrictions
✅ Merchant exclusions
✅ Priority system

### Minor Addition Needed:
**Monthly Spending Caps** - Add to RewardCap:
```typescript
interface RewardCap {
  monthlyLimit?: number;
  yearlyLimit?: number;
  monthlySpendingCap?: number;  // NEW: Cap on qualifying spend
  unit: RewardUnit;
  redemptionThreshold?: number;
}
```

This handles HSBC Red's "$10,000 online at 4%, then 0.4%" structure.

---

## Conversion Rates Reference

### Miles Cards:
- **Cathay cards**: Direct Asia Miles
- **HSBC EveryMile**: $1 RC = 20 miles (various programs)
- **DBS Black**: DBS$48 = 1,000 miles → 1 mile = DBS$0.048

### Cashback Cards:
- **Citi, SC Smart, SC Simply Cash**: Direct cash percentage
- **HSBC Red**: RewardCash = cash equivalent

### Points Cards:
- **Hang Seng enJoy**: 200 yuu points = HK$1

---

## Sources

- [CitiBank Cash Back T&C](https://www.citibank.com.hk/english/credit-cards/cashback-card-spending-rebate-tnc/)
- [Standard Chartered Smart Card](https://www.sc.com/hk/credit-cards/smart/)
- [Standard Chartered Simply Cash](https://www.sc.com/hk/credit-cards/simplycash/)
- [Standard Chartered Cathay Mastercard](https://www.sc.com/hk/credit-cards/cathay/)
- [HSBC EveryMile](https://www.hsbc.com.hk/credit-cards/products/everymile/)
- [HSBC Red](https://www.hsbc.com.hk/credit-cards/products/red/)
- [DBS Black World Mastercard](https://www.dbs.com.hk/personal/credit-cards/credit-cards/black-mc)
- [Hang Seng enJoy Card](https://www.hangseng.com/en-hk/personal/cards/products/co-branded/enjoy-card/)

---

**Conclusion**: Our enhanced schema successfully handles all 10 cards with only one minor addition needed (monthlySpendingCap). The priority + cumulative system elegantly models overlapping rewards across all card types.
