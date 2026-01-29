/**
 * AI-powered activity parsing using MCC (Merchant Category Codes)
 *
 * Flow:
 * 1. AI determines the most likely MCC code for the activity
 * 2. We map MCC → user-friendly category
 *
 * This approach is more accurate than direct category classification
 * because MCC codes are the industry standard used by banks.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Valid categories that match our reward rules
export const VALID_CATEGORIES = [
  'dining',
  'travel',
  'online-shopping',
  'retail',
  'supermarket',
  'entertainment',
  'transport',
  'utilities',
  'insurance',
  'education',
  'medical',
  'government',
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

export interface ActivityParseResult {
  category: Category;
  confidence: number; // 0-1
  mcc?: string; // The MCC code determined by AI
  reasoning?: string;
  error?: string;
}

/**
 * MCC to Category mapping
 * Curated list of ~80 common MCCs relevant to HK market
 */
const MCC_TO_CATEGORY: Record<string, Category> = {
  // Dining (5811-5814)
  '5811': 'dining', // Caterers
  '5812': 'dining', // Eating Places, Restaurants
  '5813': 'dining', // Drinking Places (Bars, Taverns)
  '5814': 'dining', // Fast Food Restaurants
  '5441': 'dining', // Candy, Nut, Confectionery Stores
  '5451': 'dining', // Dairy Products Stores
  '5462': 'dining', // Bakeries
  '5499': 'dining', // Misc Food Stores

  // Supermarkets & Groceries (5411, 5422, 5441, 5451, 5462)
  '5411': 'supermarket', // Grocery Stores, Supermarkets
  '5422': 'supermarket', // Freezer and Locker Meat Provisioners
  '5331': 'supermarket', // Variety Stores (like 759 Store)

  // Travel (3000-3999 Airlines, 7011 Hotels, 4722 Travel Agencies)
  '3000': 'travel', // Airlines (3000-3999 range)
  '3001': 'travel', // Airlines
  '3099': 'travel', // Airlines
  '4511': 'travel', // Airlines, Air Carriers
  '7011': 'travel', // Hotels, Motels, Resorts
  '7012': 'travel', // Timeshares
  '4722': 'travel', // Travel Agencies
  '4723': 'travel', // Package Tour Operators
  '7512': 'travel', // Car Rental

  // Transport (4111-4789, 5541-5542)
  '4111': 'transport', // Local/Suburban Commuter Transportation
  '4112': 'transport', // Passenger Railways
  '4121': 'transport', // Taxicabs and Limousines
  '4131': 'transport', // Bus Lines
  '4784': 'transport', // Tolls and Bridge Fees
  '4789': 'transport', // Transportation Services
  '5541': 'transport', // Service Stations (Gas)
  '5542': 'transport', // Automated Fuel Dispensers
  '7523': 'transport', // Parking Lots and Garages
  '7531': 'transport', // Auto Body Repair

  // Online Shopping
  '5262': 'online-shopping', // Marketplaces (online)
  '5964': 'online-shopping', // Direct Marketing - Catalog Merchant
  '5965': 'online-shopping', // Direct Marketing - Combination
  '5966': 'online-shopping', // Direct Marketing - Outbound Telemarketing
  '5967': 'online-shopping', // Direct Marketing - Inbound Teleservices
  '5968': 'online-shopping', // Direct Marketing - Subscription
  '5969': 'online-shopping', // Direct Marketing - Other

  // Retail (5200-5699 various retail)
  '5192': 'retail', // Books, Periodicals, Newspapers
  '5193': 'retail', // Florists
  '5200': 'retail', // Home Supply Warehouse Stores
  '5211': 'retail', // Building Materials, Lumber Stores
  '5231': 'retail', // Glass, Paint, Wallpaper Stores
  '5251': 'retail', // Hardware Stores
  '5261': 'retail', // Lawn and Garden Supply Stores
  '5271': 'retail', // Mobile Home Dealers
  '5300': 'retail', // Wholesale Clubs
  '5309': 'retail', // Duty Free Stores
  '5310': 'retail', // Discount Stores
  '5311': 'retail', // Department Stores
  '5399': 'retail', // Misc General Merchandise
  '5611': 'retail', // Men's Clothing Stores
  '5621': 'retail', // Women's Clothing Stores
  '5631': 'retail', // Women's Accessory Stores
  '5641': 'retail', // Children's Clothing Stores
  '5651': 'retail', // Family Clothing Stores
  '5661': 'retail', // Shoe Stores
  '5681': 'retail', // Furriers
  '5691': 'retail', // Men's/Women's Clothing Stores
  '5699': 'retail', // Misc Apparel Stores
  '5712': 'retail', // Furniture Stores
  '5713': 'retail', // Floor Covering Stores
  '5714': 'retail', // Drapery Stores
  '5718': 'retail', // Fireplace Stores
  '5719': 'retail', // Misc Home Furnishing Stores
  '5722': 'retail', // Household Appliance Stores
  '5732': 'retail', // Electronics Stores
  '5733': 'retail', // Music Stores
  '5734': 'retail', // Computer Software Stores
  '5735': 'retail', // Record Stores
  '5941': 'retail', // Sporting Goods Stores
  '5942': 'retail', // Book Stores
  '5943': 'retail', // Stationery Stores
  '5944': 'retail', // Jewelry Stores
  '5945': 'retail', // Hobby, Toy, Game Shops
  '5946': 'retail', // Camera and Photographic Supply Stores
  '5947': 'retail', // Gift, Card, Novelty Shops
  '5948': 'retail', // Luggage and Leather Goods Stores
  '5949': 'retail', // Sewing, Needlework Stores
  '5950': 'retail', // Glassware/Crystal Stores
  '5970': 'retail', // Artist Supply Stores
  '5971': 'retail', // Art Dealers and Galleries
  '5972': 'retail', // Stamp and Coin Stores
  '5973': 'retail', // Religious Goods Stores
  '5975': 'retail', // Hearing Aids
  '5976': 'retail', // Orthopedic Goods
  '5977': 'retail', // Cosmetic Stores
  '5978': 'retail', // Typewriter Stores
  '5983': 'retail', // Fuel Dealers
  '5992': 'retail', // Florists
  '5993': 'retail', // Cigar Stores
  '5994': 'retail', // News Dealers
  '5995': 'retail', // Pet Shops
  '5996': 'retail', // Swimming Pool Supplies
  '5997': 'retail', // Electric Razor Stores
  '5998': 'retail', // Tent Stores
  '5999': 'retail', // Miscellaneous Specialty Retail

  // Entertainment (7832, 7841, 7911-7999)
  '7829': 'entertainment', // Motion Picture Production
  '7832': 'entertainment', // Motion Picture Theaters
  '7841': 'entertainment', // Video Tape Rental Stores
  '7911': 'entertainment', // Dance Halls, Studios, Schools
  '7922': 'entertainment', // Theatrical Producers
  '7929': 'entertainment', // Bands, Orchestras
  '7932': 'entertainment', // Billiard/Pool Establishments
  '7933': 'entertainment', // Bowling Alleys
  '7941': 'entertainment', // Athletic Fields, Sports Clubs
  '7991': 'entertainment', // Tourist Attractions
  '7992': 'entertainment', // Golf Courses
  '7993': 'entertainment', // Video Amusement Game Supplies
  '7994': 'entertainment', // Video Game Arcades
  '7995': 'entertainment', // Betting/Casino Gambling
  '7996': 'entertainment', // Amusement Parks, Circuses
  '7997': 'entertainment', // Country Clubs
  '7998': 'entertainment', // Aquariums, Dolphinariums
  '7999': 'entertainment', // Recreation Services

  // Utilities (4812-4900)
  '4812': 'utilities', // Telecommunication Equipment
  '4813': 'utilities', // Key-entry Telecom Merchant
  '4814': 'utilities', // Telecommunication Services
  '4816': 'utilities', // Computer Network Services
  '4821': 'utilities', // Telegraph Services
  '4829': 'utilities', // Wire Transfer
  '4899': 'utilities', // Cable and Other Pay TV Services
  '4900': 'utilities', // Utilities - Electric, Gas, Water

  // Insurance
  '5960': 'insurance', // Direct Marketing - Insurance Services
  '6300': 'insurance', // Insurance Sales, Underwriting

  // Education (8211-8299)
  '8211': 'education', // Elementary and Secondary Schools
  '8220': 'education', // Colleges, Universities
  '8241': 'education', // Correspondence Schools
  '8244': 'education', // Business and Secretarial Schools
  '8249': 'education', // Vocational Schools
  '8299': 'education', // Schools and Educational Services

  // Medical (4119, 5912, 8011-8099)
  '4119': 'medical', // Ambulance Services
  '5912': 'medical', // Drug Stores, Pharmacies
  '8011': 'medical', // Doctors
  '8021': 'medical', // Dentists
  '8031': 'medical', // Osteopaths
  '8041': 'medical', // Chiropractors
  '8042': 'medical', // Optometrists
  '8043': 'medical', // Opticians
  '8049': 'medical', // Podiatrists, Chiropodists
  '8050': 'medical', // Nursing Care Facilities
  '8062': 'medical', // Hospitals
  '8071': 'medical', // Medical and Dental Laboratories
  '8099': 'medical', // Medical Services

  // Government (9211-9405)
  '9211': 'government', // Court Costs
  '9222': 'government', // Fines
  '9223': 'government', // Bail and Bond Payments
  '9311': 'government', // Tax Payments
  '9399': 'government', // Government Services
  '9402': 'government', // Postal Services
  '9405': 'government', // Intra-Government Purchases
};

/**
 * Load API key from .env.local file as fallback
 */
function loadApiKeyFromFile(keyName: string): string | undefined {
  try {
    const envPath = join(process.cwd(), '.env.local');
    if (!existsSync(envPath)) {
      return undefined;
    }
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(new RegExp(`^${keyName}=(.+)$`, 'm'));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Map MCC code to our category
 * Falls back to 'retail' for unknown MCCs
 */
function mccToCategory(mcc: string): Category {
  // Direct lookup
  if (MCC_TO_CATEGORY[mcc]) {
    return MCC_TO_CATEGORY[mcc];
  }

  // Handle airline range (3000-3999)
  const mccNum = parseInt(mcc, 10);
  if (mccNum >= 3000 && mccNum <= 3999) {
    return 'travel';
  }

  // Default fallback
  return 'retail';
}

const ACTIVITY_PARSE_PROMPT = `You are a payment processing expert. Given a spending activity description, determine the most likely MCC (Merchant Category Code) that would be assigned to this transaction.

Output ONLY valid JSON:
{
  "mcc": "4-digit MCC code",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}

Common MCC examples:
- 5812: Restaurants
- 5814: Fast Food
- 5411: Supermarkets/Groceries
- 5541/5542: Gas Stations
- 7011: Hotels
- 4511: Airlines
- 5311: Department Stores
- 5945: Hobby/Toy/Game Shops
- 5944: Jewelry Stores
- 7941: Sports Clubs/Event Venues
- 5999: Miscellaneous Retail

Activity: `;

/**
 * Parse a user activity description to determine the merchant category
 * Uses AI to determine MCC, then maps to our category system
 * Supports: OpenRouter (preferred), Anthropic, OpenAI
 */
export async function parseActivity(
  activity: string
): Promise<ActivityParseResult> {
  const openrouterKey =
    process.env.OPENROUTER_API_KEY || loadApiKeyFromFile('OPENROUTER_API_KEY');
  const anthropicKey =
    process.env.ANTHROPIC_API_KEY || loadApiKeyFromFile('ANTHROPIC_API_KEY');
  const openaiKey =
    process.env.OPENAI_API_KEY || loadApiKeyFromFile('OPENAI_API_KEY');

  // Debug logging
  console.log('[parseActivity] Checking API keys...');
  console.log('[parseActivity] OpenRouter configured:', !!openrouterKey);
  console.log('[parseActivity] OpenAI configured:', !!openaiKey);
  console.log('[parseActivity] Anthropic configured:', !!anthropicKey);

  // Determine which API to use (OpenRouter first - no geo-restrictions)
  let apiUrl: string;
  let headers: Record<string, string>;
  let body: object;
  let extractContent: (data: unknown) => string | undefined;

  if (openrouterKey) {
    console.log('[parseActivity] Using OpenRouter');
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://cardgpt.app',
    };
    body = {
      model: 'google/gemini-2.0-flash-001',
      max_tokens: 150,
      messages: [{ role: 'user', content: ACTIVITY_PARSE_PROMPT + activity }],
    };
    extractContent = (data: unknown) => {
      const d = data as { choices?: { message?: { content?: string } }[] };
      return d.choices?.[0]?.message?.content;
    };
  } else if (openaiKey) {
    console.log('[parseActivity] Using OpenAI');
    apiUrl = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    };
    body = {
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [{ role: 'user', content: ACTIVITY_PARSE_PROMPT + activity }],
    };
    extractContent = (data: unknown) => {
      const d = data as { choices?: { message?: { content?: string } }[] };
      return d.choices?.[0]?.message?.content;
    };
  } else if (anthropicKey) {
    console.log('[parseActivity] Using Anthropic');
    apiUrl = 'https://api.anthropic.com/v1/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    };
    body = {
      model: 'claude-3-5-haiku-latest',
      max_tokens: 150,
      messages: [{ role: 'user', content: ACTIVITY_PARSE_PROMPT + activity }],
    };
    extractContent = (data: unknown) => {
      const d = data as { content?: { text?: string }[] };
      return d.content?.[0]?.text;
    };
  } else {
    console.error('[parseActivity] No AI API key configured');
    return {
      category: 'retail',
      confidence: 0,
      error:
        'AI service not configured. Please be more specific about the merchant type.',
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parseActivity] API error:', errorText);
      return {
        category: 'retail',
        confidence: 0,
        error: 'Failed to analyze activity. Please try again or be more specific.',
      };
    }

    const data = await response.json();
    const content = extractContent(data);

    if (!content) {
      console.error('[parseActivity] No content in response');
      return {
        category: 'retail',
        confidence: 0,
        error: 'Failed to analyze activity. Please try again.',
      };
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[parseActivity] No JSON in response:', content);
      return {
        category: 'retail',
        confidence: 0,
        error: 'Failed to parse AI response.',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const mcc = String(parsed.mcc || '5999').padStart(4, '0');
    const category = mccToCategory(mcc);

    console.log(
      `[parseActivity] Activity: "${activity}" → MCC: ${mcc} → Category: ${category}`
    );

    return {
      category,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      mcc,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('[parseActivity] Error:', error);
    return {
      category: 'retail',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred.',
    };
  }
}
