/**
 * Script to extract merchants from cards.json and generate category-merchant mapping
 *
 * Run with: npx tsx scripts/generateCategoryMerchants.ts
 *
 * This script:
 * 1. Reads all cards from cards.json
 * 2. Extracts specificMerchants from reward rules
 * 3. Associates merchants with their rule's categories
 * 4. Generates src/data/categoryMerchants.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RewardRule {
  categories?: string[];
  specificMerchants?: string[];
}

interface Card {
  id: string;
  name: string;
  rewards?: RewardRule[];
}

interface CardsData {
  cards: Card[];
}

// Mapping from cards.json categories to our simplified TransactionCategory
const CATEGORY_MAPPING: Record<string, string> = {
  'dining': 'dining',
  'restaurant': 'dining',
  'food': 'dining',
  'groceries': 'groceries',
  'supermarket': 'groceries',
  'online': 'online',
  'online-shopping': 'online',
  'ecommerce': 'online',
  'travel': 'travel',
  'hotel': 'travel',
  'transport': 'transport',
  'fuel': 'transport',
  'overseas': 'overseas',
  'foreign': 'overseas',
  'utilities': 'utilities',
  'bills': 'utilities',
  'insurance': 'financial',
  'financial': 'financial',
  'government': 'government',
  'tax': 'government',
  'digital-wallet': 'digital-wallet',
  'ewallet': 'digital-wallet',
  'retail': 'others',
  'entertainment': 'others',
  'all': 'others', // General merchants go to 'others'
};

// Popular merchants that we want to highlight (with display names)
const MERCHANT_DISPLAY_NAMES: Record<string, { en: string; zh: string }> = {
  'mcdonalds': { en: `McDonald's`, zh: '麥當勞' },
  'wellcome': { en: 'Wellcome', zh: '惠康' },
  'parknshop': { en: 'ParknShop', zh: '百佳' },
  'sushiro': { en: 'Sushiro', zh: '壽司郎' },
  'shell': { en: 'Shell', zh: '蜆殼' },
  'esso': { en: 'Esso', zh: 'Esso' },
  'caltex': { en: 'Caltex', zh: '加德士' },
  'cathay-pacific': { en: 'Cathay Pacific', zh: '國泰航空' },
  'mtr': { en: 'MTR', zh: '港鐵' },
  'starbucks': { en: 'Starbucks', zh: '星巴克' },
  'pacific-coffee': { en: 'Pacific Coffee', zh: 'Pacific Coffee' },
  'watsons': { en: 'Watsons', zh: '屈臣氏' },
  'mannings': { en: 'Mannings', zh: '萬寧' },
  'klook': { en: 'Klook', zh: 'Klook' },
  'agoda': { en: 'Agoda', zh: 'Agoda' },
  'netflix': { en: 'Netflix', zh: 'Netflix' },
  'spotify': { en: 'Spotify', zh: 'Spotify' },
  'apple': { en: 'Apple', zh: 'Apple' },
  'openrice': { en: 'OpenRice', zh: 'OpenRice' },
  'foodpanda': { en: 'foodpanda', zh: 'foodpanda' },
  'deliveroo': { en: 'Deliveroo', zh: 'Deliveroo' },
  '759-store': { en: '759 Store', zh: '759阿信屋' },
  'circle-k': { en: 'Circle K', zh: 'OK便利店' },
  '7-eleven': { en: '7-Eleven', zh: '7-Eleven' },
  'decathlon': { en: 'Decathlon', zh: '迪卡儂' },
  'ikea': { en: 'IKEA', zh: 'IKEA' },
  'muji': { en: 'MUJI', zh: '無印良品' },
  'uniqlo': { en: 'UNIQLO', zh: 'UNIQLO' },
  'hktvmall': { en: 'HKTVmall', zh: 'HKTVmall' },
  'amazon': { en: 'Amazon', zh: 'Amazon' },
  'taobao': { en: 'Taobao', zh: '淘寶' },
  'clp': { en: 'CLP', zh: '中電' },
  'hk-electric': { en: 'HK Electric', zh: '港燈' },
  'towngas': { en: 'Towngas', zh: '煤氣公司' },
  'octopus': { en: 'Octopus', zh: '八達通' },
  'payme': { en: 'PayMe', zh: 'PayMe' },
  'alipay-hk': { en: 'AlipayHK', zh: '支付寶香港' },
  'wechat-pay': { en: 'WeChat Pay', zh: '微信支付' },
  'aia': { en: 'AIA', zh: '友邦' },
  'prudential': { en: 'Prudential', zh: '保誠' },
  'manulife': { en: 'Manulife', zh: '宏利' },
};

function normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_MAPPING[normalized] || 'others';
}

function normalizeMerchantId(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function getMerchantDisplayName(merchantId: string): { en: string; zh: string } {
  const normalized = normalizeMerchantId(merchantId);
  if (MERCHANT_DISPLAY_NAMES[normalized]) {
    return MERCHANT_DISPLAY_NAMES[normalized];
  }
  // Convert merchant ID to display name
  const displayName = merchantId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return { en: displayName, zh: displayName };
}

function main() {
  const cardsPath = path.join(__dirname, '../src/data/cards.json');
  const outputPath = path.join(__dirname, '../src/data/categoryMerchants.ts');

  // Read cards.json
  const cardsData: CardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));

  // Extract merchants by category
  const categoryMerchants: Record<string, Set<string>> = {
    groceries: new Set(),
    dining: new Set(),
    online: new Set(),
    travel: new Set(),
    transport: new Set(),
    overseas: new Set(),
    utilities: new Set(),
    financial: new Set(),
    government: new Set(),
    'digital-wallet': new Set(),
    others: new Set(),
  };

  // Process each card
  for (const card of cardsData.cards) {
    if (!card.rewards) continue;

    for (const rule of card.rewards) {
      if (!rule.specificMerchants || !rule.categories) continue;

      // Get the primary category for this rule
      const primaryCategory = rule.categories[0];
      const normalizedCategory = normalizeCategory(primaryCategory);

      // Add merchants to this category
      for (const merchant of rule.specificMerchants) {
        const merchantId = normalizeMerchantId(merchant);
        if (merchantId) {
          categoryMerchants[normalizedCategory].add(merchantId);
        }
      }
    }
  }

  // Add popular merchants that might not be in rules
  const popularByCategory: Record<string, string[]> = {
    groceries: ['wellcome', 'parknshop', '759-store', '7-eleven', 'circle-k'],
    dining: ['mcdonalds', 'sushiro', 'starbucks', 'pacific-coffee', 'openrice', 'foodpanda', 'deliveroo'],
    online: ['amazon', 'taobao', 'hktvmall', 'netflix', 'spotify', 'apple'],
    travel: ['cathay-pacific', 'klook', 'agoda'],
    transport: ['shell', 'esso', 'caltex', 'mtr'],
    overseas: [],
    utilities: ['clp', 'hk-electric', 'towngas'],
    financial: ['aia', 'prudential', 'manulife'],
    government: [],
    'digital-wallet': ['octopus', 'payme', 'alipay-hk', 'wechat-pay'],
    others: ['watsons', 'mannings', 'ikea', 'muji', 'uniqlo', 'decathlon'],
  };

  for (const [category, merchants] of Object.entries(popularByCategory)) {
    for (const merchant of merchants) {
      categoryMerchants[category].add(merchant);
    }
  }

  // Generate TypeScript output
  let output = `/**
 * Auto-generated file - DO NOT EDIT MANUALLY
 * Generated by: npx tsx scripts/generateCategoryMerchants.ts
 *
 * This file contains merchants grouped by spending category,
 * extracted from card rules in cards.json
 */

import type { TransactionCategory } from '@/types/transaction';

export interface MerchantInfo {
  id: string;
  label: string;
  label_zh: string;
}

export const CATEGORY_MERCHANTS: Record<TransactionCategory, MerchantInfo[]> = {
`;

  for (const [category, merchantSet] of Object.entries(categoryMerchants)) {
    const merchants = Array.from(merchantSet).sort();
    output += `  '${category}': [\n`;
    for (const merchantId of merchants) {
      const displayName = getMerchantDisplayName(merchantId);
      // Escape single quotes in labels by using double quotes for strings containing apostrophes
      const enLabel = displayName.en.includes("'") ? `"${displayName.en}"` : `'${displayName.en}'`;
      const zhLabel = displayName.zh.includes("'") ? `"${displayName.zh}"` : `'${displayName.zh}'`;
      output += `    { id: '${merchantId}', label: ${enLabel}, label_zh: ${zhLabel} },\n`;
    }
    output += `  ],\n`;
  }

  output += `};

/**
 * Get all unique merchants across all categories
 */
export function getAllMerchants(): MerchantInfo[] {
  const seen = new Set<string>();
  const result: MerchantInfo[] = [];

  for (const merchants of Object.values(CATEGORY_MERCHANTS)) {
    for (const merchant of merchants) {
      if (!seen.has(merchant.id)) {
        seen.add(merchant.id);
        result.push(merchant);
      }
    }
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get merchants for a specific category
 */
export function getMerchantsForCategory(category: TransactionCategory): MerchantInfo[] {
  return CATEGORY_MERCHANTS[category] || [];
}
`;

  // Write output file
  fs.writeFileSync(outputPath, output, 'utf-8');

  // Print summary
  console.log('Generated categoryMerchants.ts');
  console.log('\\nMerchants per category:');
  for (const [category, merchantSet] of Object.entries(categoryMerchants)) {
    console.log(`  ${category}: ${merchantSet.size} merchants`);
  }
}

main();
