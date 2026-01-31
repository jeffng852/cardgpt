/**
 * NLP Transaction Parser
 *
 * Parses natural language input into structured Transaction objects.
 * Supports both English and Traditional Chinese (繁體中文).
 *
 * Examples:
 * - "500 HKD dining at restaurant"
 * - "$1000 USD online shopping"
 * - "買衫 $800"
 * - "Netflix subscription 150"
 */

import type { Transaction, Currency, PaymentType } from '@/types/transaction';

/**
 * Parser result with confidence scores
 */
export interface ParseResult {
  transaction: Transaction;
  confidence: {
    amount: number;
    currency: number;
    category: number;
    merchantId: number;
    paymentType: number;
    overall: number;
  };
  warnings: string[];
}

/**
 * Category keywords in English and Traditional Chinese
 * Mapped to TransactionCategory type
 */
const CATEGORY_KEYWORDS: Record<string, { en: string[]; zh: string[] }> = {
  // Groceries / Supermarket
  groceries: {
    en: ['supermarket', 'grocery', 'groceries', 'market', 'vegetables', 'fruits', 'produce', 'mart', 'frozen', 'dairy'],
    zh: ['超市', '超級市場', '街市', '菜市場', '買菜', '雜貨'],
  },
  // Dining
  dining: {
    en: ['dining', 'restaurant', 'food', 'eat', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'brunch', 'supper', 'tea', 'dine', 'bistro', 'eatery', 'cuisine', 'fast food', 'fastfood', 'fast-food', 'burger', 'pizza'],
    zh: ['餐飲', '飲食', '食飯', '餐廳', '食店', '午餐', '晚餐', '早餐', '咖啡', '茶餐廳', '飯館', '快餐', '速食'],
  },
  // Online Shopping / Subscription
  online: {
    en: ['online', 'online shopping', 'ecommerce', 'internet shopping', 'subscription', 'streaming', 'netflix', 'spotify', 'youtube', 'amazon', 'taobao', 'jd', 'shopping online'],
    zh: ['網購', '網上購物', '線上購物', '訂閱', '串流', '淘寶', '京東'],
  },
  // Travel
  travel: {
    en: ['travel', 'flight', 'hotel', 'booking', 'airline', 'trip', 'vacation', 'tourism', 'holiday', 'fly', 'accommodation', 'airbnb', 'hostel', 'resort'],
    zh: ['旅遊', '旅行', '機票', '酒店', '訂房', '渡假', '假期', '民宿'],
  },
  // Local Transport
  transport: {
    en: ['transport', 'taxi', 'uber', 'grab', 'bus', 'mtr', 'train', 'subway', 'metro', 'ride', 'commute', 'transit', 'fuel', 'gas', 'petrol', 'gasoline', 'parking'],
    zh: ['交通', '的士', '巴士', '港鐵', '火車', '搭車', '乘車', '燃油', '汽油', '油站', '加油', '入油', '泊車'],
  },
  // Overseas Spending
  overseas: {
    en: ['overseas', 'foreign', 'abroad', 'international', 'forex', 'exchange'],
    zh: ['海外', '外幣', '境外', '國外', '外國'],
  },
  // Utilities / Bills
  utilities: {
    en: ['utilities', 'electric', 'electricity', 'water', 'phone', 'internet', 'bill', 'broadband', 'towngas', 'gas bill', 'power'],
    zh: ['水電煤', '電費', '水費', '電話', '上網', '帳單', '煤氣', '寬頻'],
  },
  // Financial Services / Insurance
  financial: {
    en: ['insurance', 'premium', 'policy', 'loan', 'mortgage', 'investment', 'bank', 'financial', 'credit'],
    zh: ['保險', '保費', '貸款', '按揭', '投資', '銀行', '金融', '供款'],
  },
  // Government
  government: {
    en: ['government', 'tax', 'taxes', 'fine', 'fines', 'license', 'fee', 'penalty', 'ird', 'stamp duty', 'rates'],
    zh: ['政府', '稅', '罰款', '牌照', '差餉', '地租', '印花稅'],
  },
  // Digital Wallet
  'digital-wallet': {
    en: ['octopus', 'payme', 'alipay', 'wechat pay', 'fps', 'tap and go', 'digital wallet', 'e-wallet', 'mobile payment'],
    zh: ['八達通', '增值', '轉數快', '電子錢包', '支付寶', '微信支付'],
  },
};

/**
 * Specific merchant keywords and aliases
 * Mapped to TransactionCategory type
 */
const MERCHANT_KEYWORDS: Record<string, { aliases: string[]; category: string }> = {
  // === GROCERIES ===
  'wellcome': { aliases: ['wellcome', 'welcome', '惠康', '惠康超市'], category: 'groceries' },
  'parknshop': { aliases: ['parknshop', 'park n shop', 'pns', '百佳', '百佳超市'], category: 'groceries' },
  '759-store': { aliases: ['759', '759 store', '759阿信屋', '阿信屋'], category: 'groceries' },
  'circle-k': { aliases: ['circle k', 'circlek', 'circle-k', 'ok便利店', 'ok'], category: 'groceries' },
  '7-eleven': { aliases: ['7-eleven', '7-11', 'seven eleven', '7仔'], category: 'groceries' },
  'aeon': { aliases: ['aeon', '永旺', 'jusco'], category: 'groceries' },
  'donki': { aliases: ['donki', 'don don donki', 'don quijote', '驚安之殿堂'], category: 'groceries' },
  'city-super': { aliases: ['city super', 'citysuper', 'city\'super'], category: 'groceries' },

  // === DINING ===
  'mcdonalds': { aliases: ['mcdonalds', 'mcdonald', 'mcd', '麥當勞', '麦当劳'], category: 'dining' },
  'sushiro': { aliases: ['sushiro', '壽司郎', '寿司郎'], category: 'dining' },
  'starbucks': { aliases: ['starbucks', '星巴克'], category: 'dining' },
  'pacific-coffee': { aliases: ['pacific coffee', 'pacific', '太平洋咖啡'], category: 'dining' },
  'kfc': { aliases: ['kfc', 'kentucky', '肯德基'], category: 'dining' },
  'fairwood': { aliases: ['fairwood', '大快活'], category: 'dining' },
  'cafe-de-coral': { aliases: ['cafe de coral', '大家樂'], category: 'dining' },
  'maxims': { aliases: ['maxims', '美心', '美心餐廳'], category: 'dining' },
  'genki-sushi': { aliases: ['genki sushi', 'genki', '元氣壽司'], category: 'dining' },
  'tam-jai': { aliases: ['tam jai', 'tamjai', '譚仔', '譚仔三哥'], category: 'dining' },

  // === ONLINE / SUBSCRIPTION ===
  'netflix': { aliases: ['netflix', 'nf'], category: 'online' },
  'spotify': { aliases: ['spotify'], category: 'online' },
  'youtube': { aliases: ['youtube', 'youtube premium', 'yt'], category: 'online' },
  'apple': { aliases: ['apple', 'apple store', 'app store', 'itunes', 'icloud'], category: 'online' },
  'amazon': { aliases: ['amazon', 'aws'], category: 'online' },
  'taobao': { aliases: ['taobao', '淘寶'], category: 'online' },
  'hktvmall': { aliases: ['hktvmall', 'hktv', '香港電視'], category: 'online' },
  'disney-plus': { aliases: ['disney+', 'disney plus'], category: 'online' },

  // === TRAVEL ===
  'cathay-pacific': { aliases: ['cathay pacific', 'cathay', 'cx', '國泰', '國泰航空'], category: 'travel' },
  'hk-express': { aliases: ['hk express', 'hong kong express', '香港快運'], category: 'travel' },
  'klook': { aliases: ['klook'], category: 'travel' },
  'agoda': { aliases: ['agoda'], category: 'travel' },
  'booking': { aliases: ['booking', 'booking.com'], category: 'travel' },
  'expedia': { aliases: ['expedia'], category: 'travel' },
  'airbnb': { aliases: ['airbnb'], category: 'travel' },
  'trip-com': { aliases: ['trip.com', 'trip', 'ctrip', '攜程'], category: 'travel' },

  // === TRANSPORT ===
  'mtr': { aliases: ['mtr', '港鐵'], category: 'transport' },
  'uber': { aliases: ['uber'], category: 'transport' },
  'hkgotaxi': { aliases: ['hkgotaxi', 'gotaxi', 'go taxi'], category: 'transport' },
  'shell': { aliases: ['shell', '蜆殼'], category: 'transport' },
  'caltex': { aliases: ['caltex', '加德士'], category: 'transport' },
  'esso': { aliases: ['esso', '埃索'], category: 'transport' },

  // === UTILITIES ===
  'clp': { aliases: ['clp', '中電', '中華電力'], category: 'utilities' },
  'hk-electric': { aliases: ['hk electric', '港燈'], category: 'utilities' },
  'towngas': { aliases: ['towngas', '煤氣', '中華煤氣'], category: 'utilities' },
  'pccw': { aliases: ['pccw', '電訊盈科'], category: 'utilities' },
  'hkt': { aliases: ['hkt', '香港電訊'], category: 'utilities' },
  'smartone': { aliases: ['smartone', '數碼通'], category: 'utilities' },
  '3hk': { aliases: ['3hk', 'three', '3'], category: 'utilities' },
  'cmhk': { aliases: ['cmhk', '中國移動香港', 'china mobile'], category: 'utilities' },

  // === FINANCIAL SERVICES / INSURANCE ===
  'aia': { aliases: ['aia', '友邦', '友邦保險'], category: 'financial' },
  'prudential': { aliases: ['prudential', '保誠'], category: 'financial' },
  'manulife': { aliases: ['manulife', '宏利'], category: 'financial' },
  'hsbc-insurance': { aliases: ['hsbc insurance', 'hsbc life', '滙豐保險'], category: 'financial' },
  'bochk-insurance': { aliases: ['bochk insurance', 'bochk life', '中銀保險'], category: 'financial' },
  'zurich': { aliases: ['zurich', '蘇黎世'], category: 'financial' },

  // === GOVERNMENT ===
  'ird': { aliases: ['ird', 'inland revenue', '稅務局', '稅局'], category: 'government' },
  'gov-hk': { aliases: ['gov.hk', 'government', '政府'], category: 'government' },
  'td': { aliases: ['transport department', '運輸署', 'td'], category: 'government' },

  // === DIGITAL WALLET ===
  'octopus': { aliases: ['octopus', '八達通'], category: 'digital-wallet' },
  'payme': { aliases: ['payme', 'pay me'], category: 'digital-wallet' },
  'alipay-hk': { aliases: ['alipay hk', 'alipayhk', '支付寶香港'], category: 'digital-wallet' },
  'wechat-pay': { aliases: ['wechat pay', 'wechatpay', '微信支付'], category: 'digital-wallet' },
  'tap-go': { aliases: ['tap & go', 'tap and go', 'tapngo', '拍住賞'], category: 'digital-wallet' },

  // === OTHERS (RETAIL) ===
  'watsons': { aliases: ['watsons', 'watson', '屈臣氏'], category: 'others' },
  'mannings': { aliases: ['mannings', 'manning', '萬寧'], category: 'others' },
  'sasa': { aliases: ['sasa', 'sa sa', '莎莎'], category: 'others' },
  'fortress': { aliases: ['fortress', '豐澤'], category: 'others' },
  'broadway': { aliases: ['broadway', '百老匯'], category: 'others' },
};

/**
 * Payment type keywords
 */
const PAYMENT_TYPE_KEYWORDS: Record<PaymentType, { en: string[]; zh: string[] }> = {
  online: {
    en: ['online', 'internet', 'web', 'ecommerce', 'digital'],
    zh: ['網上', '線上', '網購', '數碼'],
  },
  offline: {
    en: ['offline', 'in-store', 'physical', 'retail'],
    zh: ['實體', '店內', '面對面'],
  },
  contactless: {
    en: ['contactless', 'tap', 'nfc', 'apple pay', 'google pay', 'samsung pay'],
    zh: ['非接觸', '拍卡', 'apple pay', 'google pay'],
  },
  recurring: {
    en: ['recurring', 'subscription', 'monthly', 'recurring payment'],
    zh: ['定期', '訂閱', '每月'],
  },
};

/**
 * Currency symbols and codes
 */
const CURRENCY_PATTERNS: Record<Currency, RegExp[]> = {
  HKD: [/HKD/i, /HK\$/i, /HK\s*\$/i, /港[元幣]/], // HK$ or HKD explicitly
  USD: [/USD/i, /US\$/i, /US\s*\$/i, /美[元金]/], // USD or US$ explicitly - bare $ defaults to HKD
  EUR: [/EUR/i, /€/, /歐[元羅]/],
  GBP: [/GBP/i, /£/, /英鎊/],
  JPY: [/JPY/i, /¥/, /[日円圓]/],
  CNY: [/CNY/i, /RMB/i, /人民[幣币]/],
  AUD: [/AUD/i, /A\$/i, /澳[元幣]/],
  CAD: [/CAD/i, /C\$/i, /加[元幣]/],
  SGD: [/SGD/i, /S\$/i, /新[元幣加坡]/],
  TWD: [/TWD/i, /NT\$/i, /台[幣币元]/],
};

/**
 * Main parser function
 */
export function parseTransaction(input: string): ParseResult {
  const warnings: string[] = [];
  const normalizedInput = input.toLowerCase().trim();

  // Extract amount
  const { amount, confidence: amountConfidence } = extractAmount(normalizedInput);
  if (amount === null) {
    warnings.push('Could not detect transaction amount');
  }

  // Extract currency
  const { currency, confidence: currencyConfidence } = extractCurrency(input);

  // Extract category and merchant
  const {
    category,
    merchantId,
    categoryConfidence,
    merchantConfidence,
  } = extractCategoryAndMerchant(normalizedInput, input);

  // Extract payment type
  const { paymentType, confidence: paymentTypeConfidence } = extractPaymentType(normalizedInput, merchantId);

  // Calculate overall confidence
  const overallConfidence = (
    amountConfidence * 0.3 +
    currencyConfidence * 0.1 +
    categoryConfidence * 0.25 +
    merchantConfidence * 0.25 +
    paymentTypeConfidence * 0.1
  );

  const transaction: Transaction = {
    amount: amount || 0,
    currency,
    category,
    merchantId,
    paymentType,
    rawInput: input,
    merchantTypeConfidence: categoryConfidence,
  };

  return {
    transaction,
    confidence: {
      amount: amountConfidence,
      currency: currencyConfidence,
      category: categoryConfidence,
      merchantId: merchantConfidence,
      paymentType: paymentTypeConfidence,
      overall: overallConfidence,
    },
    warnings,
  };
}

/**
 * Extract amount from input using regex patterns
 * Supports:
 * - $500, $1,000.50 (with $ symbol)
 * - 500 dollars, 1000元 (with currency word)
 * - 500 (plain integers - assumes HKD)
 * - Numbers at start, middle, or end of input
 */
function extractAmount(input: string): { amount: number | null; confidence: number } {
  // Pattern priority (higher patterns = higher confidence)
  const patterns: Array<{ regex: RegExp; confidence: number }> = [
    // Explicit currency markers (highest confidence)
    { regex: /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/, confidence: 0.95 },  // $500, $1,000.50
    { regex: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:dollars?|hkd|usd|eur|gbp|元|蚊)/i, confidence: 0.95 },  // 500 dollars, 1000元
    // Plain numbers (assume HKD)
    { regex: /^([0-9,]+(?:\.[0-9]{1,2})?)\s/, confidence: 0.85 },    // 500 at the start
    { regex: /\s([0-9,]+(?:\.[0-9]{1,2})?)\s/, confidence: 0.85 },   // 500 in the middle
    { regex: /\s([0-9,]+(?:\.[0-9]{1,2})?)$/, confidence: 0.85 },    // 500 at the end
    { regex: /^([0-9,]+(?:\.[0-9]{1,2})?)$/, confidence: 0.85 },     // Just a number (e.g., "5000")
  ];

  for (const { regex, confidence } of patterns) {
    const match = input.match(regex);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        return { amount, confidence };
      }
    }
  }

  return { amount: null, confidence: 0 };
}

/**
 * Extract currency from input
 */
function extractCurrency(input: string): { currency: Currency; confidence: number } {
  for (const [currency, patterns] of Object.entries(CURRENCY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return { currency: currency as Currency, confidence: 0.9 };
      }
    }
  }

  // Default to HKD (Hong Kong market default)
  return { currency: 'HKD', confidence: 0.7 };
}

/**
 * Extract category and merchant from input
 */
function extractCategoryAndMerchant(normalizedInput: string, originalInput: string): {
  category?: string;
  merchantId?: string;
  categoryConfidence: number;
  merchantConfidence: number;
} {
  let category: string | undefined;
  let merchantId: string | undefined;
  let categoryConfidence = 0;
  let merchantConfidence = 0;

  // First, check for specific merchants (highest priority)
  for (const [merchant, data] of Object.entries(MERCHANT_KEYWORDS)) {
    for (const alias of data.aliases) {
      if (normalizedInput.includes(alias.toLowerCase()) || originalInput.includes(alias)) {
        merchantId = merchant;
        merchantConfidence = 0.9;
        category = data.category;
        categoryConfidence = 0.8; // Category inferred from merchant
        return { category, merchantId, categoryConfidence, merchantConfidence };
      }
    }
  }

  // Then, check for category keywords
  // Track all possible category matches with scores
  const categoryMatches: Array<{ category: string; score: number }> = [];

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of [...keywords.en, ...keywords.zh]) {
      const keywordLower = keyword.toLowerCase();

      // Check for exact word match (higher score)
      const wordBoundaryRegex = new RegExp(`\\b${keywordLower}\\b`, 'i');
      if (wordBoundaryRegex.test(normalizedInput) || wordBoundaryRegex.test(originalInput.toLowerCase())) {
        categoryMatches.push({ category: cat, score: 0.8 });
      }
      // Check for substring match (lower score)
      else if (normalizedInput.includes(keywordLower) || originalInput.toLowerCase().includes(keywordLower)) {
        categoryMatches.push({ category: cat, score: 0.6 });
      }
    }
  }

  // Pick the category with highest score
  if (categoryMatches.length > 0) {
    // Sort by score descending
    categoryMatches.sort((a, b) => b.score - a.score);
    category = categoryMatches[0].category;
    categoryConfidence = categoryMatches[0].score;
  }

  return { category, merchantId, categoryConfidence, merchantConfidence };
}

/**
 * Extract payment type from input
 */
function extractPaymentType(normalizedInput: string, merchantId?: string): {
  paymentType: PaymentType;
  confidence: number;
} {
  // Check for explicit payment type keywords
  for (const [type, keywords] of Object.entries(PAYMENT_TYPE_KEYWORDS)) {
    for (const keyword of [...keywords.en, ...keywords.zh]) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        return { paymentType: type as PaymentType, confidence: 0.8 };
      }
    }
  }

  // Infer from merchant (streaming services like Netflix/Spotify are usually recurring)
  if (merchantId) {
    const merchant = MERCHANT_KEYWORDS[merchantId];
    // Netflix, Spotify, YouTube are entertainment category but recurring payments
    if (['netflix', 'spotify', 'youtube'].includes(merchantId)) {
      return { paymentType: 'recurring', confidence: 0.6 };
    }
    if (merchant?.category === 'online-shopping') {
      return { paymentType: 'online', confidence: 0.6 };
    }
  }

  // Default to offline with low confidence
  return { paymentType: 'offline', confidence: 0.3 };
}

/**
 * Get all supported categories
 */
export function getSupportedCategories(): string[] {
  return Object.keys(CATEGORY_KEYWORDS);
}

/**
 * Get all supported merchants
 */
export function getSupportedMerchants(): string[] {
  return Object.keys(MERCHANT_KEYWORDS);
}

/**
 * Get merchant aliases for autocomplete
 */
export function getMerchantAliases(merchantId: string): string[] {
  return MERCHANT_KEYWORDS[merchantId]?.aliases || [];
}

/**
 * Suggest corrections for low-confidence parses
 */
export function suggestCorrections(result: ParseResult): string[] {
  const suggestions: string[] = [];

  if (result.confidence.amount < 0.5) {
    suggestions.push('Specify amount more clearly (e.g., "$500" or "500 HKD")');
  }

  if (result.confidence.category < 0.5) {
    suggestions.push(`Consider adding category keyword: ${getSupportedCategories().slice(0, 5).join(', ')}, etc.`);
  }

  if (result.confidence.merchantId < 0.3 && result.confidence.category > 0.5) {
    suggestions.push('Add specific merchant name for more accurate recommendations');
  }

  return suggestions;
}
