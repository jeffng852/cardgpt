/**
 * Integration Example: Parser + Engine
 *
 * Demonstrates the complete flow from user input to card recommendations
 */

import { parseTransaction } from './parser/transactionParser';
import { recommendCards } from './engine';
import { loadCards } from './data/loadCards';
import { formatReward, formatEffectiveRate } from './engine/calculateReward';

async function demonstrateIntegration() {
  console.log('🔗 Parser + Engine Integration Example\n');
  console.log('='.repeat(80));

  // Load cards once
  const cards = await loadCards();
  console.log(`\n✅ Loaded ${cards.length} credit cards\n`);

  // Example inputs
  const examples = [
    '$500 HKD McDonald\'s',
    '1000 USD online shopping',
    '買衫 $800',
    'Netflix subscription 150',
    '2500 flight booking',
    '200 超市 惠康',
  ];

  for (const input of examples) {
    console.log('─'.repeat(80));
    console.log(`\n💬 User Input: "${input}"\n`);

    // Step 1: Parse input
    const parseResult = parseTransaction(input);
    const { transaction, confidence } = parseResult;

    console.log('📝 Parsed Transaction:');
    console.log(`   Amount: $${transaction.amount.toFixed(2)}`);
    console.log(`   Currency: ${transaction.currency}`);
    console.log(`   Category: ${transaction.category || 'N/A'}`);
    console.log(`   Merchant: ${transaction.merchantId || 'N/A'}`);
    console.log(`   Payment Type: ${transaction.paymentType}`);
    console.log(`   Confidence: ${(confidence.overall * 100).toFixed(0)}% ${confidence.overall >= 0.7 ? '✅' : confidence.overall >= 0.4 ? '⚠️' : '❌'}`);

    // Step 2: Get recommendations
    const result = recommendCards(cards, transaction);

    // Step 3: Display top 3 recommendations
    console.log('\n🏆 Top 3 Card Recommendations:\n');

    const top3 = result.rankedCards.slice(0, 3);
    top3.forEach((rec, index) => {
      const card = cards.find(c => c.id === rec.calculation.cardId);
      if (!card) return;

      console.log(`${index + 1}. ${card.name} (${card.issuer})`);
      console.log(`   Reward: ${formatReward(rec.calculation)}`);
      console.log(`   Rate: ${formatEffectiveRate(rec.calculation)}`);
      console.log(`   Net Value: $${rec.netValue.toFixed(2)}`);
      if (index === 0) console.log('   ⭐ RECOMMENDED');
      console.log('');
    });

    // Show warnings if confidence is low
    if (parseResult.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      parseResult.warnings.forEach(w => console.log(`   - ${w}`));
      console.log('');
    }
  }

  console.log('─'.repeat(80));
  console.log('\n✨ Integration complete!\n');
  console.log('Next: Build UI to accept input and display recommendations\n');
}

// Run the example
demonstrateIntegration().catch(console.error);
