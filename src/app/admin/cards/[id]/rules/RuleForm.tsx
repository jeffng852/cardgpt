'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import type { CreditCard, RewardRule, RewardCondition, PaymentType, Currency } from '@/types/card';

interface RuleFormProps {
  cardId: string;
  ruleIndex: number | null; // null = new rule
}

const CATEGORIES = [
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
];

const PAYMENT_TYPES: PaymentType[] = ['online', 'offline', 'contactless', 'recurring'];
const CURRENCIES: Currency[] = ['HKD', 'USD', 'CNY', 'JPY', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD', 'TWD'];

// Generate a unique rule ID based on card ID, priority, category, and index
function generateRuleId(cardId: string, priority: string, categories: string[], index: number): string {
  const cardSlug = cardId || 'card';
  const priorityCode = priority === 'premium' ? 'prm' : priority === 'bonus' ? 'bns' : 'bas';
  const categoryCode = categories.length > 0 && categories[0] !== 'all'
    ? categories[0].substring(0, 3).toLowerCase()
    : 'all';
  const indexStr = String(index + 1).padStart(2, '0');
  return `${cardSlug}-${priorityCode}-${categoryCode}-${indexStr}`;
}

const emptyRule: RewardRule = {
  id: '',
  description: '',
  rewardRate: 0,
  rewardUnit: 'cash',
  priority: 'base',
  isCumulative: false,
  isPromotional: false,
  categories: ['all'],
};

export default function RuleForm({ cardId, ruleIndex }: RuleFormProps) {
  const router = useRouter();
  const isNew = ruleIndex === null;

  const [card, setCard] = useState<CreditCard | null>(null);
  const [rule, setRule] = useState<RewardRule>(emptyRule);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Collapsible sections
  const [showConditions, setShowConditions] = useState(false);
  const [showCaps, setShowCaps] = useState(false);
  const [showSource, setShowSource] = useState(false);

  // Category selection mode
  const [allCategories, setAllCategories] = useState(true);

  useEffect(() => {
    fetchCard();
  }, [cardId]);

  const fetchCard = async () => {
    try {
      const response = await fetch(`/api/admin/cards/${cardId}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        if (response.status === 404) {
          setError('Card not found');
          return;
        }
        throw new Error('Failed to fetch card');
      }
      const data = await response.json();
      setCard(data.card);

      if (ruleIndex !== null && data.card.rewards[ruleIndex]) {
        const existingRule = data.card.rewards[ruleIndex];
        setRule(existingRule);
        setAllCategories(
          existingRule.categories?.includes('all') ||
          !existingRule.categories ||
          existingRule.categories.length === 0
        );

        // Expand sections if they have data
        if (existingRule.conditions) setShowConditions(true);
        if (existingRule.monthlySpendingCap) setShowCaps(true);
        if (existingRule.sourceUrl || existingRule.notes) setShowSource(true);
      } else {
        // New rule - generate ID
        const newIndex = data.card.rewards.length;
        setRule({
          ...emptyRule,
          id: generateRuleId(cardId, 'base', ['all'], newIndex),
        });
      }
    } catch (err) {
      setError('Failed to load card data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRule = (updates: Partial<RewardRule>) => {
    setRule((prev) => {
      const updated = { ...prev, ...updates };

      // Regenerate ID when priority or categories change
      if ('priority' in updates || 'categories' in updates) {
        const index = ruleIndex !== null ? ruleIndex : (card?.rewards.length || 0);
        updated.id = generateRuleId(
          cardId,
          updated.priority || 'base',
          updated.categories || ['all'],
          index
        );
      }

      return updated;
    });
  };

  const updateConditions = (updates: Partial<RewardCondition>) => {
    setRule((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, ...updates },
    }));
  };

  const handleSave = async () => {
    if (!card) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      // Prepare updated rewards array
      let newRewards: RewardRule[];
      if (isNew) {
        newRewards = [...card.rewards, rule];
      } else {
        newRewards = card.rewards.map((r, i) => (i === ruleIndex ? rule : r));
      }

      // Update source verification date
      if (rule.sourceUrl) {
        rule.sourceLastVerified = new Date().toISOString().split('T')[0];
      }

      const response = await fetch(`/api/admin/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...card, rewards: newRewards }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to save rule');
        return;
      }

      setSuccess('Rule saved successfully!');
      setTimeout(() => {
        router.push(`/admin/cards/${cardId}/rules`);
      }, 500);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = rule.categories || [];
    if (currentCategories.includes(category)) {
      updateRule({ categories: currentCategories.filter((c) => c !== category) });
    } else {
      updateRule({ categories: [...currentCategories.filter((c) => c !== 'all'), category] });
    }
  };

  const handleAllCategoriesToggle = (checked: boolean) => {
    setAllCategories(checked);
    if (checked) {
      updateRule({ categories: ['all'] });
    } else {
      updateRule({ categories: [] });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/admin/cards/${cardId}/rules`)}
                className="text-foreground-muted hover:text-foreground"
              >
                ← Back
              </button>
              <Logo size={32} />
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {isNew ? 'Add New Rule' : 'Edit Rule'}
                </h1>
                <p className="text-sm text-foreground-muted">{card?.name}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Core Section */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Core Information</h2>

          <div className="space-y-4">
            {/* Rule ID (read-only) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Rule ID (auto-generated)
              </label>
              <input
                type="text"
                value={rule.id}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-border bg-background-secondary text-foreground-muted cursor-not-allowed font-mono text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description *
              </label>
              <textarea
                value={rule.description}
                onChange={(e) => updateRule({ description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., 4% cashback on all dining transactions"
              />
            </div>

            {/* Rate and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reward Rate (decimal) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={rule.rewardRate}
                  onChange={(e) => updateRule({ rewardRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                  placeholder="0.04 for 4%"
                />
                <p className="text-xs text-foreground-muted mt-1">
                  = {((rule.rewardRate || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reward Unit *
                </label>
                <select
                  value={rule.rewardUnit}
                  onChange={(e) => updateRule({ rewardUnit: e.target.value as RewardRule['rewardUnit'] })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="cash">Cash</option>
                  <option value="miles">Miles</option>
                  <option value="points">Points</option>
                </select>
              </div>
            </div>

            {/* Priority and Cumulative */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Priority
                </label>
                <select
                  value={rule.priority}
                  onChange={(e) => updateRule({ priority: e.target.value as RewardRule['priority'] })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="base">Base (lowest)</option>
                  <option value="bonus">Bonus</option>
                  <option value="premium">Premium (highest)</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rule.isCumulative}
                    onChange={(e) => updateRule({ isCumulative: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Cumulative (adds to base)</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Merchant Targeting Section */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Merchant Targeting</h2>

          <div className="space-y-4">
            {/* All Categories Toggle */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allCategories}
                  onChange={(e) => handleAllCategoriesToggle(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">All categories (universal rule)</span>
              </label>
            </div>

            {/* Category Multi-select */}
            {!allCategories && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Categories
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((category) => (
                    <label key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(rule.categories as string[])?.includes(category) || false}
                        onChange={() => handleCategoryToggle(category)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground capitalize">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Merchants */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Specific Merchants (comma-separated)
              </label>
              <input
                type="text"
                value={rule.specificMerchants?.join(', ') || ''}
                onChange={(e) =>
                  updateRule({
                    specificMerchants: e.target.value
                      ? e.target.value.split(',').map((m) => m.trim()).filter(Boolean)
                      : undefined,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., mcdonalds, sushiro, netflix"
              />
            </div>

            {/* Excluded Categories */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Excluded Categories (comma-separated)
              </label>
              <input
                type="text"
                value={rule.excludedCategories?.join(', ') || ''}
                onChange={(e) =>
                  updateRule({
                    excludedCategories: e.target.value
                      ? e.target.value.split(',').map((c) => c.trim()).filter(Boolean)
                      : undefined,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., insurance, government"
              />
            </div>

            {/* Excluded Merchants */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Excluded Merchants (comma-separated)
              </label>
              <input
                type="text"
                value={rule.excludedMerchants?.join(', ') || ''}
                onChange={(e) =>
                  updateRule({
                    excludedMerchants: e.target.value
                      ? e.target.value.split(',').map((m) => m.trim()).filter(Boolean)
                      : undefined,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., government-fees, bill-payments"
              />
            </div>
          </div>
        </section>

        {/* Conditions Section (Collapsible) */}
        <section className="bg-background-secondary rounded-xl border border-border mb-6">
          <button
            onClick={() => setShowConditions(!showConditions)}
            className="w-full px-6 py-4 flex justify-between items-center text-left"
          >
            <h2 className="text-lg font-semibold text-foreground">Conditions</h2>
            <span className="text-foreground-muted">{showConditions ? '−' : '+'}</span>
          </button>

          {showConditions && (
            <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Payment Type
                  </label>
                  <select
                    value={rule.conditions?.paymentType || ''}
                    onChange={(e) =>
                      updateConditions({
                        paymentType: e.target.value ? (e.target.value as PaymentType) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="">Any</option>
                    {PAYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Currency
                  </label>
                  <select
                    value={rule.conditions?.currency || ''}
                    onChange={(e) =>
                      updateConditions({
                        currency: e.target.value ? (e.target.value as Currency | 'foreign') : undefined,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="">Any</option>
                    <option value="foreign">Foreign (non-HKD)</option>
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Min Amount */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Min Transaction Amount (HKD)
                  </label>
                  <input
                    type="number"
                    value={rule.conditions?.minAmount || ''}
                    onChange={(e) =>
                      updateConditions({
                        minAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="e.g., 100"
                  />
                </div>

                {/* Max Amount */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Max Transaction Amount (HKD)
                  </label>
                  <input
                    type="number"
                    value={rule.conditions?.maxAmount || ''}
                    onChange={(e) =>
                      updateConditions({
                        maxAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="e.g., 10000"
                  />
                </div>
              </div>

              {/* Min Monthly Spending */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Min Monthly Spending to Unlock (HKD)
                </label>
                <input
                  type="number"
                  value={rule.conditions?.minMonthlySpending || ''}
                  onChange={(e) =>
                    updateConditions({
                      minMonthlySpending: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                  placeholder="e.g., 5000"
                />
                <p className="text-xs text-foreground-muted mt-1">
                  Rule only applies after reaching this monthly spending threshold
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Spending Caps Section (Collapsible) */}
        <section className="bg-background-secondary rounded-xl border border-border mb-6">
          <button
            onClick={() => setShowCaps(!showCaps)}
            className="w-full px-6 py-4 flex justify-between items-center text-left"
          >
            <h2 className="text-lg font-semibold text-foreground">Spending Caps</h2>
            <span className="text-foreground-muted">{showCaps ? '−' : '+'}</span>
          </button>

          {showCaps && (
            <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Monthly Spending Cap (HKD)
                  </label>
                  <input
                    type="number"
                    value={rule.monthlySpendingCap || ''}
                    onChange={(e) =>
                      updateRule({
                        monthlySpendingCap: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="e.g., 10000"
                  />
                  <p className="text-xs text-foreground-muted mt-1">
                    This rate applies to the first X dollars of monthly spending
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Fallback Rate (after cap)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={rule.fallbackRate || ''}
                    onChange={(e) =>
                      updateRule({
                        fallbackRate: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="0.01 for 1%"
                    disabled={!rule.monthlySpendingCap}
                  />
                  <p className="text-xs text-foreground-muted mt-1">
                    {rule.fallbackRate ? `= ${(rule.fallbackRate * 100).toFixed(2)}%` : 'Set cap first'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Temporal Section */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Validity Period</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Valid From
                </label>
                <input
                  type="date"
                  value={rule.validFrom || ''}
                  onChange={(e) => updateRule({ validFrom: e.target.value || undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={rule.validUntil || ''}
                  onChange={(e) => updateRule({ validUntil: e.target.value || undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rule.isPromotional}
                onChange={(e) => updateRule({ isPromotional: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">
                Promotional (time-limited offer, will show warning to users)
              </span>
            </label>
          </div>
        </section>

        {/* Source Tracking Section (Collapsible) */}
        <section className="bg-background-secondary rounded-xl border border-border mb-6">
          <button
            onClick={() => setShowSource(!showSource)}
            className="w-full px-6 py-4 flex justify-between items-center text-left"
          >
            <h2 className="text-lg font-semibold text-foreground">Source & Notes</h2>
            <span className="text-foreground-muted">{showSource ? '−' : '+'}</span>
          </button>

          {showSource && (
            <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Source URL
                </label>
                <input
                  type="url"
                  value={rule.sourceUrl || ''}
                  onChange={(e) => updateRule({ sourceUrl: e.target.value || undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                  placeholder="https://..."
                />
                {rule.sourceLastVerified && (
                  <p className="text-xs text-foreground-muted mt-1">
                    Last verified: {rule.sourceLastVerified}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  value={rule.notes || ''}
                  onChange={(e) => updateRule({ notes: e.target.value || undefined })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                  placeholder="Any special conditions, caveats, or edge cases..."
                />
              </div>
            </div>
          )}
        </section>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.push(`/admin/cards/${cardId}/rules`)}
            className="px-4 py-2 text-sm text-foreground-muted border border-border rounded-lg hover:bg-background-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </main>
    </div>
  );
}
