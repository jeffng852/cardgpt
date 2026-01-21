/**
 * Example usage of the recommendation engine
 *
 * Run with: npx tsx src/lib/engine/example.ts
 */

import { loadCards } from '../data/loadCards';
import { recommendCards, formatReward, formatEffectiveRate } from './index';
import type { Transaction } from '@/types/transaction';

async function demo() {
  // Load all cards from database
  const cards = await loadCards();
  console.log(`Loaded ${cards.length} credit cards\n`);

  // Example 1: HKD Dining Transaction
  console.log('=== Example 1: $500 HKD Dining ===');
  const diningTransaction: Transaction = {
    amount: 500,
    currency: 'HKD',
    category: 'dining',
    merchantId: 'restaurant',
    paymentType: 'offline'
  };

  const diningResult = recommendCards(cards, diningTransaction);
  console.log(`Top 3 recommendations for dining:`);
  diningResult.recommendations.slice(0, 3).forEach((rec, i) => {
    console.log(`\n${i + 1}. ${rec.card.name} (${rec.card.issuer})`);
    console.log(`   Reward: ${formatReward(rec.calculation)}`);
    console.log(`   Rate: ${formatEffectiveRate(rec.calculation)}`);
    console.log(`   Fees: $${rec.calculation.fees.toFixed(2)}`);
    console.log(`   Net Value: $${rec.netValue.toFixed(2)}`);
    if (rec.isRecommended) {
      console.log(`   ⭐ RECOMMENDED`);
    }
  });

  // Example 2: Foreign Currency Online Shopping
  console.log('\n\n=== Example 2: $1000 USD Online Shopping ===');
  const foreignTransaction: Transaction = {
    amount: 1000,
    currency: 'USD',
    category: 'online-retail',
    paymentType: 'online'
  };

  const foreignResult = recommendCards(cards, foreignTransaction);
  console.log(`Top 3 recommendations for foreign currency:`);
  foreignResult.recommendations.slice(0, 3).forEach((rec, i) => {
    console.log(`\n${i + 1}. ${rec.card.name} (${rec.card.issuer})`);
    console.log(`   Reward: ${formatReward(rec.calculation)}`);
    console.log(`   Rate: ${formatEffectiveRate(rec.calculation)}`);
    console.log(`   Fees: $${rec.calculation.fees.toFixed(2)}`);
    console.log(`   Net Value: $${rec.netValue.toFixed(2)}`);
    if (rec.isRecommended) {
      console.log(`   ⭐ RECOMMENDED`);
    }
  });

  // Example 3: Filter by preferred reward type (miles only)
  console.log('\n\n=== Example 3: $2000 HKD Supermarket (Miles Only) ===');
  const supermarketTransaction: Transaction = {
    amount: 2000,
    currency: 'HKD',
    category: 'retail',
    paymentType: 'offline'
  };

  const milesResult = recommendCards(cards, supermarketTransaction, {
    preferredRewardUnits: ['miles']
  });

  console.log(`Top 3 miles cards:`);
  milesResult.recommendations.slice(0, 3).forEach((rec, i) => {
    console.log(`\n${i + 1}. ${rec.card.name} (${rec.card.issuer})`);
    console.log(`   Reward: ${formatReward(rec.calculation)}`);
    console.log(`   Rate: ${formatEffectiveRate(rec.calculation)}`);
    console.log(`   Net Value: ${rec.netValue.toFixed(0)} miles`);
    if (rec.isRecommended) {
      console.log(`   ⭐ RECOMMENDED`);
    }
  });

  console.log('\n\n=== Summary ===');
  console.log(`Total cards evaluated: ${cards.length}`);
  console.log(`Engine is ready for production use!`);
}

// Run demo if executed directly
if (require.main === module) {
  demo().catch(console.error);
}

export { demo };
