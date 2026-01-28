/**
 * AI-assisted reward rule extraction from documents
 * Supports multiple AI providers (OpenAI, Anthropic) with fallback
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RewardRule, RewardUnit, RulePriority } from '@/types/card';

/**
 * Load API key from .env.local file as fallback when process.env doesn't work
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

export interface ExtractionResult {
  cardName?: string;
  issuer?: string;
  rules: Partial<RewardRule>[];
  confidence: Record<string, 'high' | 'medium' | 'low'>;
  rawResponse?: string;
  error?: string;
  /** The original T&C text that was extracted from the source */
  sourceText?: string;
  /** URL of the source document (if extracted from URL) */
  sourceUrl?: string;
}

const EXTRACTION_PROMPT = `You are an expert at analyzing credit card terms and conditions documents.

Given the following text from a credit card T&C document, extract ALL reward rules you can find.

For each reward rule, extract:
1. description - A clear, human-readable description of the reward
2. rewardRate - The reward rate as a decimal (e.g., 0.04 for 4%)
3. rewardUnit - One of: "cash", "miles", "points"
4. priority - One of: "base", "bonus", "premium" (base is default/minimum, bonus is enhanced, premium is highest tier)
5. categories - Array of applicable categories from: "dining", "travel", "online-shopping", "retail", "supermarket", "entertainment", "transport", "utilities", "insurance", "education", "medical", "government". Use ["all"] if it applies to all spending.
6. specificMerchants - Array of specific merchant names if mentioned (e.g., ["mcdonalds", "sushiro"])
7. monthlySpendingCap - Maximum monthly spending that qualifies for this rate (if mentioned)
8. fallbackRate - Rate that applies after the cap is reached (if mentioned)
9. validFrom - Start date in YYYY-MM-DD format (if promotional/limited time)
10. validUntil - End date in YYYY-MM-DD format (if promotional/limited time)
11. isPromotional - true if this is a time-limited promotion, false for permanent rewards
12. isCumulative - true if this reward adds to base rewards, false if it replaces
13. conditions.paymentType - One of: "online", "offline", "contactless", "recurring" (if specified)
14. conditions.currency - "HKD", "foreign", or specific currency code (if specified)
15. conditions.minAmount - Minimum transaction amount (if specified)
16. notes - IMPORTANT: Copy the EXACT original text/sentence from the document that describes this reward rate calculation. This is for verification purposes. Include the verbatim quote that shows where you got the rate from.

Also extract:
- cardName: The name of the credit card
- issuer: The issuing bank name

Respond ONLY with valid JSON in this exact format:
{
  "cardName": "string or null",
  "issuer": "string or null",
  "rules": [
    {
      "description": "string",
      "rewardRate": number,
      "rewardUnit": "cash" | "miles" | "points",
      "priority": "base" | "bonus" | "premium",
      "categories": ["string"],
      "specificMerchants": ["string"] | null,
      "monthlySpendingCap": number | null,
      "fallbackRate": number | null,
      "validFrom": "YYYY-MM-DD" | null,
      "validUntil": "YYYY-MM-DD" | null,
      "isPromotional": boolean,
      "isCumulative": boolean,
      "conditions": {
        "paymentType": "string" | null,
        "currency": "string" | null,
        "minAmount": number | null
      } | null,
      "notes": "string - exact quote from source document showing the rate calculation"
    }
  ],
  "confidence": {
    "cardName": "high" | "medium" | "low",
    "issuer": "high" | "medium" | "low",
    "rules": "high" | "medium" | "low"
  }
}

Document text to analyze:
`;

export async function extractRewardsFromText(text: string): Promise<ExtractionResult> {
  // Try OpenAI first, then Anthropic, then return mock data for development
  // Check both process.env and .env.local file directly (fallback for Next.js issues)
  const openaiKey = process.env.OPENAI_API_KEY || loadApiKeyFromFile('OPENAI_API_KEY');
  const anthropicKey = process.env.ANTHROPIC_API_KEY || loadApiKeyFromFile('ANTHROPIC_API_KEY');

  // Debug: log which keys are configured (not the actual values)
  console.log('[extractRewards] OpenAI key configured:', !!openaiKey && openaiKey.length > 0);
  console.log('[extractRewards] Anthropic key configured:', !!anthropicKey && anthropicKey.length > 0);

  if (openaiKey && openaiKey.length > 0) {
    console.log('[extractRewards] Using OpenAI');
    return extractWithOpenAI(text, openaiKey);
  }

  if (anthropicKey && anthropicKey.length > 0) {
    console.log('[extractRewards] Using Anthropic');
    return extractWithAnthropic(text, anthropicKey);
  }

  // Development fallback - return mock extraction
  console.warn('[extractRewards] No AI API key configured. Using mock extraction for development.');
  return getMockExtraction(text);
}

async function extractWithOpenAI(text: string, apiKey: string): Promise<ExtractionResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured data from credit card terms and conditions. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: EXTRACTION_PROMPT + text.slice(0, 15000), // Limit text length
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return parseAIResponse(content);
  } catch (error) {
    console.error('OpenAI extraction failed:', error);
    return {
      rules: [],
      confidence: {},
      error: `OpenAI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function extractWithAnthropic(text: string, apiKey: string): Promise<ExtractionResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT + text.slice(0, 15000),
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    console.log('[extractRewards] Anthropic raw response:', JSON.stringify(data, null, 2));
    const content = data.content?.[0]?.text;

    if (!content) {
      console.error('[extractRewards] No content in response. Full response:', data);
      throw new Error('No response from Anthropic');
    }

    console.log('[extractRewards] Anthropic content:', content.substring(0, 500) + '...');
    return parseAIResponse(content);
  } catch (error) {
    console.error('Anthropic extraction failed:', error);
    return {
      rules: [],
      confidence: {},
      error: `Anthropic extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

function parseAIResponse(content: string): ExtractionResult {
  try {
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clean up the response
    const rules: Partial<RewardRule>[] = (parsed.rules || []).map((rule: Record<string, unknown>, index: number) => ({
      id: `extracted-${index + 1}`,
      description: String(rule.description || ''),
      rewardRate: typeof rule.rewardRate === 'number' ? rule.rewardRate : 0,
      rewardUnit: validateRewardUnit(rule.rewardUnit),
      priority: validatePriority(rule.priority),
      categories: Array.isArray(rule.categories) ? rule.categories : ['all'],
      specificMerchants: Array.isArray(rule.specificMerchants) ? rule.specificMerchants : undefined,
      monthlySpendingCap: typeof rule.monthlySpendingCap === 'number' ? rule.monthlySpendingCap : undefined,
      fallbackRate: typeof rule.fallbackRate === 'number' ? rule.fallbackRate : undefined,
      validFrom: typeof rule.validFrom === 'string' ? rule.validFrom : undefined,
      validUntil: typeof rule.validUntil === 'string' ? rule.validUntil : undefined,
      isPromotional: Boolean(rule.isPromotional),
      isCumulative: Boolean(rule.isCumulative),
      conditions: rule.conditions ? {
        paymentType: (rule.conditions as Record<string, unknown>).paymentType as string | undefined,
        currency: (rule.conditions as Record<string, unknown>).currency as string | undefined,
        minAmount: typeof (rule.conditions as Record<string, unknown>).minAmount === 'number'
          ? (rule.conditions as Record<string, unknown>).minAmount as number
          : undefined,
      } : undefined,
      notes: typeof rule.notes === 'string' ? rule.notes : undefined,
    }));

    return {
      cardName: parsed.cardName || undefined,
      issuer: parsed.issuer || undefined,
      rules,
      confidence: parsed.confidence || { rules: 'medium' },
      rawResponse: content,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      rules: [],
      confidence: {},
      error: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      rawResponse: content,
    };
  }
}

function validateRewardUnit(unit: unknown): RewardUnit {
  if (unit === 'cash' || unit === 'miles' || unit === 'points') {
    return unit;
  }
  return 'cash';
}

function validatePriority(priority: unknown): RulePriority {
  if (priority === 'base' || priority === 'bonus' || priority === 'premium') {
    return priority;
  }
  return 'base';
}

function getMockExtraction(text: string): ExtractionResult {
  // Simple mock that looks for common patterns
  const rules: Partial<RewardRule>[] = [];

  // Look for percentage patterns like "4% cashback"
  const percentMatches = text.match(/(\d+(?:\.\d+)?)\s*%\s*(cashback|cash\s*back|rebate|回贈)/gi);
  if (percentMatches) {
    percentMatches.forEach((match, index) => {
      const rateMatch = match.match(/(\d+(?:\.\d+)?)/);
      if (rateMatch) {
        rules.push({
          id: `mock-${index + 1}`,
          description: `${rateMatch[1]}% cashback (extracted pattern)`,
          rewardRate: parseFloat(rateMatch[1]) / 100,
          rewardUnit: 'cash',
          priority: 'base',
          categories: ['all'],
          isPromotional: false,
          isCumulative: false,
        });
      }
    });
  }

  // Look for card name patterns
  let cardName: string | undefined;
  const cardNameMatch = text.match(/([\w\s]+)\s*(Credit\s*Card|信用卡)/i);
  if (cardNameMatch) {
    cardName = cardNameMatch[0].trim();
  }

  // Look for issuer patterns
  let issuer: string | undefined;
  const issuerPatterns = ['HSBC', 'Hang Seng', 'Standard Chartered', 'Citi', 'DBS', 'BOC', 'BEA'];
  for (const pattern of issuerPatterns) {
    if (text.toLowerCase().includes(pattern.toLowerCase())) {
      issuer = pattern;
      break;
    }
  }

  return {
    cardName,
    issuer,
    rules: rules.length > 0 ? rules : [{
      id: 'mock-default',
      description: 'Sample reward rule (configure AI API key for real extraction)',
      rewardRate: 0.01,
      rewardUnit: 'cash',
      priority: 'base',
      categories: ['all'],
      isPromotional: false,
      isCumulative: false,
    }],
    confidence: {
      cardName: cardName ? 'low' : 'low',
      issuer: issuer ? 'medium' : 'low',
      rules: rules.length > 0 ? 'low' : 'low',
    },
  };
}

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CardGPT/1.0; +https://cardgpt.app)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle PDF files
    if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
      try {
        // Use require for Node.js compatibility in Next.js server context
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const buffer = await response.arrayBuffer();
        const data = await pdfParse(Buffer.from(buffer));
        console.log('[extractTextFromUrl] PDF parsed, extracted', data.text.length, 'characters');
        return data.text;
      } catch (pdfError) {
        console.error('[extractTextFromUrl] PDF parsing failed:', pdfError);
        throw new Error('PDF parsing failed. Please ensure pdf-parse is installed, or paste the T&C text directly.');
      }
    }

    const text = await response.text();

    if (contentType.includes('text/html')) {
      // Simple HTML to text conversion (strip tags)
      return text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
