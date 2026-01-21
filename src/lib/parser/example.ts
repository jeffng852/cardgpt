/**
 * Transaction Parser Usage Examples
 *
 * Run this file to see how the parser handles various inputs
 */

import { parseTransaction, getSupportedCategories, getSupportedMerchants, suggestCorrections } from './transactionParser';

console.log('🔤 Transaction Parser Examples\n');
console.log('=' .repeat(80));

const examples = [
  // English examples
  '$500 HKD dining at restaurant',
  '$1000 USD online shopping',
  '$2,500 flight to Tokyo',
  'Netflix subscription 150',
  '$99.99 Spotify monthly',
  '$50 McDonald\'s lunch',
  '800 Starbucks coffee',
  '$200 Circle K shopping',
  '$3,000 hotel booking',
  '150 Apple Pay at cafe',

  // Chinese examples
  '500港元 餐飲',
  '買衫 $800',
  '500 麥當勞',
  '超市 200 惠康',
  '1000美金 網購',
  '150 星巴克',
  '2000 超級市場',

  // Edge cases
  '$500',  // Amount only
  'dining',  // Category only
  '',  // Empty
  'shopping at some store for about 500 bucks',  // Verbose
];

examples.forEach((input, index) => {
  console.log(`\n${index + 1}. Input: "${input}"`);
  console.log('-'.repeat(80));

  const result = parseTransaction(input);
  const { transaction, confidence, warnings } = result;

  // Display parsed transaction
  console.log('📋 Parsed Transaction:');
  console.log(`   Amount: $${transaction.amount.toFixed(2)}`);
  console.log(`   Currency: ${transaction.currency}`);
  console.log(`   Category: ${transaction.category || 'N/A'}`);
  console.log(`   Merchant ID: ${transaction.merchantId || 'N/A'}`);
  console.log(`   Payment Type: ${transaction.paymentType}`);

  // Display confidence scores
  console.log('\n📊 Confidence Scores:');
  console.log(`   Amount: ${(confidence.amount * 100).toFixed(0)}%`);
  console.log(`   Currency: ${(confidence.currency * 100).toFixed(0)}%`);
  console.log(`   Category: ${(confidence.category * 100).toFixed(0)}%`);
  console.log(`   Merchant: ${(confidence.merchantId * 100).toFixed(0)}%`);
  console.log(`   Payment Type: ${(confidence.paymentType * 100).toFixed(0)}%`);
  console.log(`   Overall: ${(confidence.overall * 100).toFixed(0)}%`);

  // Display warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  // Display suggestions for low-confidence parses
  const suggestions = suggestCorrections(result);
  if (suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    suggestions.forEach(suggestion => console.log(`   - ${suggestion}`));
  }

  // Confidence indicator
  const confidenceEmoji = confidence.overall >= 0.7 ? '✅' : confidence.overall >= 0.4 ? '⚠️' : '❌';
  console.log(`\n${confidenceEmoji} Overall Confidence: ${(confidence.overall * 100).toFixed(0)}%`);
});

// Display supported categories and merchants
console.log('\n' + '='.repeat(80));
console.log('\n📚 Supported Categories:');
const categories = getSupportedCategories();
console.log(`   ${categories.join(', ')}`);
console.log(`   Total: ${categories.length} categories`);

console.log('\n🏪 Supported Merchants:');
const merchants = getSupportedMerchants();
console.log(`   ${merchants.slice(0, 10).join(', ')}, ...`);
console.log(`   Total: ${merchants.length} merchants`);

console.log('\n' + '='.repeat(80));
console.log('\n✨ Parser is ready for use!\n');
