/**
 * Migration script: merchantTypes → categories + specificMerchants
 *
 * Run with: npx tsx scripts/migrate-schema.ts
 */

import fs from 'fs';
import path from 'path';

// Category mappings for known merchant types
const CATEGORY_MAP: Record<string, string> = {
  // Dining
  'restaurant': 'dining',
  'dining': 'dining',
  'fast-food': 'dining',
  'cafe': 'dining',

  // Travel
  'hotel': 'travel',
  'accommodation': 'travel',
  'airline': 'travel',
  'transport': 'travel',

  // Shopping
  'supermarket': 'retail',
  'grocery': 'retail',
  'online-shopping': 'online-retail',

  // Entertainment
  'entertainment': 'entertainment',
  'streaming': 'entertainment',

  // Services
  'utilities': 'services',
  'insurance': 'services',

  // Special
  'all': 'all',
};

// Known specific merchants (not categories)
const SPECIFIC_MERCHANTS = new Set([
  // SC Smart Card designated merchants
  '759-store', 'china-mobile', 'circle-k', 'decathlon', 'foodpanda',
  'hk-ticketing', 'hktvmall', 'japan-home-centre', 'klook', 'mcdonalds',
  'sasa', 'parknshop', 'watsons', 'disney-plus', 'netflix', 'joox',
  'kkbox', 'moov', 'spotify', 'sushiro', 'tamjai',

  // Payment types (not merchants)
  'fps-transfer', 'cash-advance', 'balance-transfer', 'installment',
  'tax-payment', 'bill-payment', 'charity', 'mutual-fund', 'casino',
  'government-fee',
]);

function migrateRewardRule(rule: any): any {
  const { merchantTypes, ...rest } = rule;

  if (!merchantTypes) {
    return rule; // Already migrated or no merchant types
  }

  // If already has new fields, skip
  if (rule.categories || rule.specificMerchants) {
    return rule;
  }

  const categories: string[] = [];
  const specificMerchants: string[] = [];

  for (const type of merchantTypes) {
    if (SPECIFIC_MERCHANTS.has(type)) {
      // It's a specific merchant
      specificMerchants.push(type);
    } else if (CATEGORY_MAP[type]) {
      // It's a known category
      const category = CATEGORY_MAP[type];
      if (!categories.includes(category)) {
        categories.push(category);
      }
    } else if (type === 'all') {
      categories.push('all');
    } else {
      // Unknown - assume it's a category
      console.log(`  ⚠️  Unknown merchant type: "${type}" - treating as category`);
      if (!categories.includes(type)) {
        categories.push(type);
      }
    }
  }

  const migrated: any = { ...rest };

  // Add new fields
  if (categories.length > 0) {
    migrated.categories = categories.length === 1 && categories[0] === 'all'
      ? ['all']
      : categories;
  }

  if (specificMerchants.length > 0) {
    migrated.specificMerchants = specificMerchants;
  }

  // Keep merchantTypes for backward compatibility (commented)
  // migrated.merchantTypes = merchantTypes;

  return migrated;
}

function migrateCard(card: any): any {
  return {
    ...card,
    rewards: card.rewards.map((rule: any) => migrateRewardRule(rule))
  };
}

async function main() {
  const cardsPath = path.join(process.cwd(), 'src/data/cards.json');

  console.log('📦 Loading cards.json...');
  const data = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));

  console.log(`\n🔄 Migrating ${data.cards.length} cards...\n`);

  const migratedCards = data.cards.map((card: any, index: number) => {
    console.log(`${index + 1}. ${card.name}`);
    const migrated = migrateCard(card);

    // Count changes
    const oldRules = card.rewards.filter((r: any) => r.merchantTypes);
    const newCategories = migrated.rewards.filter((r: any) => r.categories);
    const newMerchants = migrated.rewards.filter((r: any) => r.specificMerchants);

    console.log(`   Rules: ${card.rewards.length}`);
    if (newCategories.length > 0) {
      console.log(`   ✓ ${newCategories.length} rules with categories`);
    }
    if (newMerchants.length > 0) {
      console.log(`   ✓ ${newMerchants.length} rules with specific merchants`);
    }
    console.log();

    return migrated;
  });

  const migratedData = {
    ...data,
    cards: migratedCards,
    _migrated: true,
    _migrationDate: new Date().toISOString(),
  };

  // Write to new file first
  const newPath = path.join(process.cwd(), 'src/data/cards-migrated.json');
  fs.writeFileSync(newPath, JSON.stringify(migratedData, null, 2));

  console.log('✅ Migration complete!');
  console.log(`📄 Output: src/data/cards-migrated.json`);
  console.log('\nPlease review the migrated file, then:');
  console.log('  mv src/data/cards-migrated.json src/data/cards.json');
}

main().catch(console.error);
