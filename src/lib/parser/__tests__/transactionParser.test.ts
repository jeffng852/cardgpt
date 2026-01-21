/**
 * Unit tests for Transaction Parser
 */

import { parseTransaction, getSupportedCategories, getSupportedMerchants } from '../transactionParser';

describe('Transaction Parser', () => {
  describe('Amount Extraction', () => {
    it('should extract amount with $ prefix', () => {
      const result = parseTransaction('$500 dining');
      expect(result.transaction.amount).toBe(500);
      expect(result.confidence.amount).toBeGreaterThan(0.8);
    });

    it('should extract amount with commas', () => {
      const result = parseTransaction('$1,000 shopping');
      expect(result.transaction.amount).toBe(1000);
    });

    it('should extract decimal amounts', () => {
      const result = parseTransaction('$99.99 subscription');
      expect(result.transaction.amount).toBe(99.99);
    });

    it('should extract amount without $ symbol', () => {
      const result = parseTransaction('500 HKD dining');
      expect(result.transaction.amount).toBe(500);
    });

    it('should extract amount at start of string', () => {
      const result = parseTransaction('1500 restaurant meal');
      expect(result.transaction.amount).toBe(1500);
    });
  });

  describe('Currency Detection', () => {
    it('should detect HKD currency', () => {
      const result = parseTransaction('500 HKD dining');
      expect(result.transaction.currency).toBe('HKD');
      expect(result.confidence.currency).toBeGreaterThan(0.8);
    });

    it('should detect USD currency', () => {
      const result = parseTransaction('$1000 USD shopping');
      expect(result.transaction.currency).toBe('USD');
    });

    it('should detect Chinese HKD (港元)', () => {
      const result = parseTransaction('500港元 餐飲');
      expect(result.transaction.currency).toBe('HKD');
    });

    it('should detect Chinese USD (美金)', () => {
      const result = parseTransaction('500美金 購物');
      expect(result.transaction.currency).toBe('USD');
    });

    it('should default to HKD if no currency specified', () => {
      const result = parseTransaction('500 dining');
      expect(result.transaction.currency).toBe('HKD');
      expect(result.confidence.currency).toBeLessThan(0.5);
    });

    it('should detect EUR currency', () => {
      const result = parseTransaction('€100 shopping');
      expect(result.transaction.currency).toBe('EUR');
    });

    it('should detect GBP currency', () => {
      const result = parseTransaction('£50 meal');
      expect(result.transaction.currency).toBe('GBP');
    });
  });

  describe('Category Detection', () => {
    it('should detect dining category from "restaurant"', () => {
      const result = parseTransaction('$500 restaurant');
      expect(result.transaction.category).toBe('dining');
      expect(result.confidence.category).toBeGreaterThan(0.6);
    });

    it('should detect dining category from "食飯"', () => {
      const result = parseTransaction('500 食飯');
      expect(result.transaction.category).toBe('dining');
    });

    it('should detect travel category', () => {
      const result = parseTransaction('$5000 flight booking');
      expect(result.transaction.category).toBe('travel');
    });

    it('should detect online-shopping category', () => {
      const result = parseTransaction('$800 online shopping');
      expect(result.transaction.category).toBe('online-shopping');
    });

    it('should detect supermarket category from Chinese', () => {
      const result = parseTransaction('500 超市');
      expect(result.transaction.category).toBe('supermarket');
    });

    it('should detect streaming category', () => {
      const result = parseTransaction('$150 netflix subscription');
      expect(result.transaction.category).toBe('streaming');
    });
  });

  describe('Merchant Detection', () => {
    it('should detect McDonald\'s and infer category', () => {
      const result = parseTransaction('$50 mcdonalds');
      expect(result.transaction.merchantId).toBe('mcdonalds');
      expect(result.transaction.category).toBe('fast-food');
      expect(result.confidence.merchantId).toBeGreaterThan(0.8);
    });

    it('should detect McDonald\'s in Chinese', () => {
      const result = parseTransaction('50 麥當勞');
      expect(result.transaction.merchantId).toBe('mcdonalds');
      expect(result.transaction.category).toBe('fast-food');
    });

    it('should detect Netflix', () => {
      const result = parseTransaction('$150 netflix');
      expect(result.transaction.merchantId).toBe('netflix');
      expect(result.transaction.category).toBe('streaming');
    });

    it('should detect 759 store in Chinese', () => {
      const result = parseTransaction('200 759阿信屋');
      expect(result.transaction.merchantId).toBe('759-store');
      expect(result.transaction.category).toBe('supermarket');
    });

    it('should detect Circle K', () => {
      const result = parseTransaction('$100 circle k');
      expect(result.transaction.merchantId).toBe('circle-k');
    });

    it('should detect Starbucks', () => {
      const result = parseTransaction('$80 starbucks');
      expect(result.transaction.merchantId).toBe('starbucks');
      expect(result.transaction.category).toBe('dining');
    });

    it('should detect Starbucks in Chinese', () => {
      const result = parseTransaction('80 星巴克');
      expect(result.transaction.merchantId).toBe('starbucks');
    });
  });

  describe('Payment Type Detection', () => {
    it('should detect online payment type', () => {
      const result = parseTransaction('$500 online shopping');
      expect(result.transaction.paymentType).toBe('online');
    });

    it('should detect contactless payment type', () => {
      const result = parseTransaction('$100 apple pay restaurant');
      expect(result.transaction.paymentType).toBe('contactless');
    });

    it('should detect recurring payment type', () => {
      const result = parseTransaction('$150 netflix subscription');
      expect(result.transaction.paymentType).toBe('recurring');
    });

    it('should infer recurring from streaming merchant', () => {
      const result = parseTransaction('$150 spotify');
      expect(result.transaction.paymentType).toBe('recurring');
    });

    it('should infer online from online-shopping category merchant', () => {
      const result = parseTransaction('$500 apple store');
      expect(result.transaction.paymentType).toBe('online');
    });

    it('should default to offline with low confidence', () => {
      const result = parseTransaction('$500 restaurant');
      expect(result.transaction.paymentType).toBe('offline');
      expect(result.confidence.paymentType).toBeLessThan(0.5);
    });
  });

  describe('Complex Real-World Examples', () => {
    it('should parse: "$500 HKD dining at restaurant"', () => {
      const result = parseTransaction('$500 HKD dining at restaurant');
      expect(result.transaction.amount).toBe(500);
      expect(result.transaction.currency).toBe('HKD');
      expect(result.transaction.category).toBe('dining');
      expect(result.confidence.overall).toBeGreaterThan(0.6);
    });

    it('should parse: "$1000 USD online shopping"', () => {
      const result = parseTransaction('$1000 USD online shopping');
      expect(result.transaction.amount).toBe(1000);
      expect(result.transaction.currency).toBe('USD');
      expect(result.transaction.category).toBe('online-shopping');
      expect(result.transaction.paymentType).toBe('online');
    });

    it('should parse: "買衫 $800"', () => {
      const result = parseTransaction('買衫 $800');
      expect(result.transaction.amount).toBe(800);
      expect(result.transaction.category).toBe('retail');
    });

    it('should parse: "Netflix subscription 150"', () => {
      const result = parseTransaction('Netflix subscription 150');
      expect(result.transaction.amount).toBe(150);
      expect(result.transaction.merchantId).toBe('netflix');
      expect(result.transaction.category).toBe('streaming');
      expect(result.transaction.paymentType).toBe('recurring');
    });

    it('should parse: "$2,500 flight to Japan"', () => {
      const result = parseTransaction('$2,500 flight to Japan');
      expect(result.transaction.amount).toBe(2500);
      expect(result.transaction.category).toBe('travel');
    });

    it('should parse: "500港元 麥當勞"', () => {
      const result = parseTransaction('500港元 麥當勞');
      expect(result.transaction.amount).toBe(500);
      expect(result.transaction.currency).toBe('HKD');
      expect(result.transaction.merchantId).toBe('mcdonalds');
      expect(result.transaction.category).toBe('fast-food');
    });

    it('should parse: "$99.99 Spotify monthly"', () => {
      const result = parseTransaction('$99.99 Spotify monthly');
      expect(result.transaction.amount).toBe(99.99);
      expect(result.transaction.merchantId).toBe('spotify');
      expect(result.transaction.paymentType).toBe('recurring');
    });

    it('should parse: "超市 200 惠康"', () => {
      const result = parseTransaction('超市 200 惠康');
      expect(result.transaction.amount).toBe(200);
      expect(result.transaction.category).toBe('supermarket');
      expect(result.transaction.merchantId).toBe('wellcome');
    });
  });

  describe('Edge Cases', () => {
    it('should handle input without amount', () => {
      const result = parseTransaction('dining at restaurant');
      expect(result.transaction.amount).toBe(0);
      expect(result.warnings).toContain('Could not detect transaction amount');
    });

    it('should handle input with only amount', () => {
      const result = parseTransaction('$500');
      expect(result.transaction.amount).toBe(500);
      expect(result.transaction.category).toBeUndefined();
    });

    it('should handle empty input', () => {
      const result = parseTransaction('');
      expect(result.transaction.amount).toBe(0);
      expect(result.confidence.overall).toBeLessThan(0.3);
    });

    it('should preserve raw input', () => {
      const input = '$500 HKD McDonald\'s';
      const result = parseTransaction(input);
      expect(result.transaction.rawInput).toBe(input);
    });

    it('should handle very large amounts', () => {
      const result = parseTransaction('$50,000 shopping');
      expect(result.transaction.amount).toBe(50000);
    });
  });

  describe('Confidence Scores', () => {
    it('should have high confidence for well-formed input', () => {
      const result = parseTransaction('$500 HKD McDonald\'s');
      expect(result.confidence.overall).toBeGreaterThan(0.7);
    });

    it('should have low confidence for ambiguous input', () => {
      const result = parseTransaction('500');
      expect(result.confidence.overall).toBeLessThan(0.4);
    });

    it('should have medium confidence for partial input', () => {
      const result = parseTransaction('$500 shopping');
      expect(result.confidence.overall).toBeGreaterThan(0.4);
      expect(result.confidence.overall).toBeLessThan(0.7);
    });
  });

  describe('Helper Functions', () => {
    it('should return supported categories', () => {
      const categories = getSupportedCategories();
      expect(categories).toContain('dining');
      expect(categories).toContain('travel');
      expect(categories).toContain('online-shopping');
      expect(categories.length).toBeGreaterThan(5);
    });

    it('should return supported merchants', () => {
      const merchants = getSupportedMerchants();
      expect(merchants).toContain('mcdonalds');
      expect(merchants).toContain('netflix');
      expect(merchants).toContain('starbucks');
      expect(merchants.length).toBeGreaterThan(10);
    });
  });
});
