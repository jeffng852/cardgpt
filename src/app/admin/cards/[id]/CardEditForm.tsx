'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Logo } from '@/components/Logo';
import type { CreditCard, RewardRule, FeeStructure } from '@/types/card';

interface CardEditFormProps {
  cardId: string;
}

const emptyCard: Partial<CreditCard> = {
  id: '',
  name: '',
  issuer: '',
  applyUrl: '',
  imageUrl: '',
  network: '',
  rewards: [],
  fees: {
    annualFee: 0,
  },
  isActive: true,
  lastUpdated: new Date().toISOString(),
};

const emptyRule: Partial<RewardRule> = {
  id: '',
  rewardRate: 0,
  rewardUnit: 'cash',
  priority: 'base',
  isPromotional: false,
  description: '',
  categories: ['all'],
};

// Generate a unique rule ID based on card ID, priority, category, and index
function generateRuleId(cardId: string, priority: string, categories: string[], existingRuleCount: number): string {
  const cardSlug = cardId || 'card';
  const priorityCode = priority === 'specific' ? 'spc' : priority === 'bonus' ? 'bns' : 'bas';
  const categoryCode = categories.length > 0 && categories[0] !== 'all'
    ? categories[0].substring(0, 3).toLowerCase()
    : 'all';
  const index = String(existingRuleCount + 1).padStart(2, '0');
  return `${cardSlug}-${priorityCode}-${categoryCode}-${index}`;
}

export default function CardEditForm({ cardId }: CardEditFormProps) {
  const router = useRouter();
  const isNew = cardId === 'new';

  const [card, setCard] = useState<Partial<CreditCard>>(emptyCard);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [editingRule, setEditingRule] = useState<Partial<RewardRule> | null>(null);

  // Image upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI extraction state
  const [extractUrl, setExtractUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractSuccess, setExtractSuccess] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetchCard();
    }
  }, [cardId, isNew]);

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
    } catch (err) {
      setError('Failed to load card data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const url = isNew ? '/api/admin/cards' : `/api/admin/cards/${cardId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.validationErrors) {
          setError(data.validationErrors.join('\n'));
        } else {
          setError(data.message || 'Failed to save card');
        }
        return;
      }

      setSuccess('Card saved successfully!');
      if (isNew && data.card?.id) {
        router.push(`/admin/cards/${data.card.id}`);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateCard = (updates: Partial<CreditCard>) => {
    setCard((prev) => ({ ...prev, ...updates }));
  };

  const updateFees = (updates: Partial<FeeStructure>) => {
    setCard((prev) => ({
      ...prev,
      fees: { ...prev.fees!, ...updates },
    }));
  };

  // Reward rule management
  const addRule = () => {
    const ruleIndex = card.rewards?.length || 0;
    const newRule: RewardRule = {
      ...emptyRule,
      id: generateRuleId(card.id || '', 'base', ['all'], ruleIndex),
    } as RewardRule;
    setEditingRuleIndex(ruleIndex);
    setEditingRule(newRule);
  };

  const editRule = (index: number) => {
    setEditingRuleIndex(index);
    setEditingRule({ ...card.rewards![index] });
  };

  const saveRule = () => {
    if (!editingRule || editingRuleIndex === null) return;

    const newRewards = [...(card.rewards || [])];
    if (editingRuleIndex >= newRewards.length) {
      newRewards.push(editingRule as RewardRule);
    } else {
      newRewards[editingRuleIndex] = editingRule as RewardRule;
    }
    updateCard({ rewards: newRewards });
    setEditingRuleIndex(null);
    setEditingRule(null);
  };

  const cancelRuleEdit = () => {
    setEditingRuleIndex(null);
    setEditingRule(null);
  };

  const deleteRule = (index: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    const newRewards = card.rewards?.filter((_, i) => i !== index) || [];
    updateCard({ rewards: newRewards });
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate card ID exists for new cards
    if (!card.id) {
      setUploadError('Please enter a Card ID first before uploading an image.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cardId', card.id);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.error || 'Upload failed');
        return;
      }

      // Update the card with the new image URL
      updateCard({ imageUrl: data.imageUrl });
    } catch (err) {
      setUploadError('Network error during upload');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // AI extraction handler
  const handleExtractFromUrl = async () => {
    if (!extractUrl) return;

    setIsExtracting(true);
    setExtractError('');
    setExtractSuccess('');

    try {
      const response = await fetch('/api/admin/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        setExtractError(data.error || 'Extraction failed');
        return;
      }

      // Apply extracted data to the card
      if (data.cardName && !card.name) {
        updateCard({ name: data.cardName });
      }
      if (data.issuer && !card.issuer) {
        updateCard({ issuer: data.issuer });
      }

      // Save the source T&C content and URL
      const termsUpdates: Partial<CreditCard> = {};
      if (data.sourceText) {
        termsUpdates.termsContent = data.sourceText;
        termsUpdates.termsExtractedAt = new Date().toISOString();
      }
      if (data.sourceUrl) {
        termsUpdates.termsUrl = data.sourceUrl;
      }
      if (Object.keys(termsUpdates).length > 0) {
        updateCard(termsUpdates);
      }

      // Merge extracted rules with existing rules
      if (data.rules && data.rules.length > 0) {
        const existingRules = card.rewards || [];
        const newRules = data.rules.map((rule: Partial<RewardRule>, index: number) => ({
          ...rule,
          id: generateRuleId(
            card.id || 'card',
            rule.priority || 'base',
            (rule.categories as string[]) || ['all'],
            existingRules.length + index
          ),
        }));
        updateCard({ rewards: [...existingRules, ...newRules] });
        setExtractSuccess(`Extracted ${newRules.length} reward rule(s) from the URL. T&C content saved.`);
      } else {
        setExtractSuccess('Extraction complete, but no reward rules were found. T&C content saved.');
      }

      setExtractUrl('');
    } catch (err) {
      setExtractError('Network error during extraction');
    } finally {
      setIsExtracting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground-muted">Loading card...</p>
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
                onClick={() => router.push('/admin')}
                className="text-foreground-muted hover:text-foreground"
              >
                ← Back
              </button>
              <Logo size={32} />
              <h1 className="text-lg font-bold text-foreground">
                {isNew ? 'Add New Card' : 'Edit Card'}
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Card'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Basic Info */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Card ID</label>
              <input
                type="text"
                value={card.id || ''}
                onChange={(e) => updateCard({ id: e.target.value })}
                disabled={!isNew}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground disabled:opacity-50"
                placeholder="e.g., hsbc-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Card Name *</label>
              <input
                type="text"
                value={card.name || ''}
                onChange={(e) => updateCard({ name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., HSBC Red Credit Card"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Issuer *</label>
              <input
                type="text"
                value={card.issuer || ''}
                onChange={(e) => updateCard({ issuer: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., HSBC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Network</label>
              <select
                value={card.network || ''}
                onChange={(e) => updateCard({ network: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="">Select network</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="UnionPay">UnionPay</option>
                <option value="American Express">American Express</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Apply URL *</label>
              <input
                type="url"
                value={card.applyUrl || ''}
                onChange={(e) => updateCard({ applyUrl: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Card Image</label>
              <div className="flex items-start gap-4">
                {/* Image Preview */}
                <div className="w-32 h-20 rounded-lg border border-border bg-background-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.name || 'Card image'}
                      width={128}
                      height={80}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-xs text-foreground-muted">No image</span>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="card-image-upload"
                    />
                    <label
                      htmlFor="card-image-upload"
                      className={`px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                        isUploading
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Image'}
                    </label>
                    {card.imageUrl && (
                      <button
                        type="button"
                        onClick={() => updateCard({ imageUrl: '' })}
                        className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-sm text-red-500">{uploadError}</p>
                  )}

                  <p className="text-xs text-foreground-muted">
                    PNG, JPEG, or WebP. Max 5MB. Will be saved as /card-images/{card.id || '{cardId}'}.ext
                  </p>

                  {/* Manual URL input as fallback */}
                  <input
                    type="url"
                    value={card.imageUrl || ''}
                    onChange={(e) => updateCard({ imageUrl: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    placeholder="Or enter image URL manually..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Min. Annual Income (HKD)
              </label>
              <input
                type="number"
                value={card.minIncomeRequirement || ''}
                onChange={(e) =>
                  updateCard({
                    minIncomeRequirement: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., 150000"
              />
              <p className="text-xs text-foreground-muted mt-1">
                Minimum annual income required for card application
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={card.isActive ?? true}
                onChange={(e) => updateCard({ isActive: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="isActive" className="text-sm text-foreground">
                Card is active (visible to users)
              </label>
            </div>
          </div>
        </section>

        {/* AI Extraction */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Import from T&C</h2>
          <p className="text-sm text-foreground-muted mb-4">
            Paste a URL to a credit card T&C page to automatically extract reward rules using AI.
          </p>

          {extractError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{extractError}</p>
            </div>
          )}
          {extractSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{extractSuccess}</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="url"
              value={extractUrl}
              onChange={(e) => setExtractUrl(e.target.value)}
              placeholder="https://www.bank.com/credit-card-rewards"
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              disabled={isExtracting}
            />
            <button
              onClick={handleExtractFromUrl}
              disabled={isExtracting || !extractUrl}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
            >
              {isExtracting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Extracting...
                </span>
              ) : (
                'Extract Rules'
              )}
            </button>
          </div>
          <p className="text-xs text-foreground-muted mt-2">
            Extracted rules will be added to the Reward Rules section below for review.
          </p>
        </section>

        {/* T&C Content (if extracted) */}
        {card.termsContent && (
          <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Stored T&C Content</h2>
                <p className="text-sm text-foreground-muted">
                  {card.termsExtractedAt && (
                    <>Extracted on {new Date(card.termsExtractedAt).toLocaleDateString()}</>
                  )}
                  {card.termsUrl && (
                    <> from <a href={card.termsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{card.termsUrl}</a></>
                  )}
                </p>
              </div>
              <button
                onClick={() => updateCard({ termsContent: undefined, termsExtractedAt: undefined })}
                className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                Clear
              </button>
            </div>
            <div className="bg-background rounded-lg border border-border p-4 max-h-48 overflow-y-auto">
              <pre className="text-xs text-foreground-muted whitespace-pre-wrap font-mono">
                {card.termsContent.length > 2000
                  ? card.termsContent.substring(0, 2000) + '...\n\n[Content truncated - ' + card.termsContent.length + ' total characters]'
                  : card.termsContent}
              </pre>
            </div>
            <p className="text-xs text-foreground-muted mt-2">
              {card.termsContent.length.toLocaleString()} characters stored. This content will be saved with the card for future reference.
            </p>
          </section>
        )}

        {/* Fees */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Fees</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Annual Fee (HKD)</label>
              <input
                type="number"
                value={card.fees?.annualFee || 0}
                onChange={(e) => updateFees({ annualFee: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                FX Fee Rate (e.g., 0.0195 = 1.95%)
              </label>
              <input
                type="number"
                step="0.0001"
                value={card.fees?.foreignTransactionFeeRate || ''}
                onChange={(e) =>
                  updateFees({
                    foreignTransactionFeeRate: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="0.0195"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Cash Advance Fee (HKD)
              </label>
              <input
                type="number"
                value={card.fees?.cashAdvanceFee || ''}
                onChange={(e) =>
                  updateFees({
                    cashAdvanceFee: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Redemption Fee (HKD)
              </label>
              <input
                type="number"
                value={card.fees?.redemptionFee || ''}
                onChange={(e) =>
                  updateFees({
                    redemptionFee: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="e.g., 50"
              />
              <p className="text-xs text-foreground-muted mt-1">
                Fee for converting points/miles to cash or vouchers
              </p>
            </div>
          </div>
        </section>

        {/* Reward Rules */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Reward Rules ({card.rewards?.length || 0})
              </h2>
              {!isNew && (
                <button
                  onClick={() => router.push(`/admin/cards/${cardId}/rules`)}
                  className="text-sm text-primary hover:underline"
                >
                  View full rules manager →
                </button>
              )}
            </div>
            <button
              onClick={addRule}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90"
            >
              + Add Rule
            </button>
          </div>

          {/* Rule List */}
          <div className="space-y-3">
            {card.rewards?.map((rule, index) => (
              <div
                key={rule.id || index}
                className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{rule.description}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        rule.priority === 'specific'
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                          : rule.priority === 'bonus'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {rule.priority}
                    </span>
                    {rule.isPromotional && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                        Promo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground-muted mt-1">
                    {(rule.rewardRate * 100).toFixed(2)}% {rule.rewardUnit}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editRule(index)}
                    className="px-3 py-1 text-sm text-primary border border-primary rounded hover:bg-primary/10"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRule(index)}
                    className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {(!card.rewards || card.rewards.length === 0) && (
              <p className="text-center text-foreground-muted py-6">
                No reward rules yet. Click "Add Rule" to create one.
              </p>
            )}
          </div>
        </section>

        {/* Rule Editor Modal */}
        {editingRule && (
          <RuleEditor
            rule={editingRule}
            cardId={card.id || ''}
            ruleIndex={editingRuleIndex ?? 0}
            onChange={setEditingRule}
            onSave={saveRule}
            onCancel={cancelRuleEdit}
          />
        )}
      </main>
    </div>
  );
}

function RuleEditor({
  rule,
  cardId,
  ruleIndex,
  onChange,
  onSave,
  onCancel,
}: {
  rule: Partial<RewardRule>;
  cardId: string;
  ruleIndex: number;
  onChange: (rule: Partial<RewardRule>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (updates: Partial<RewardRule>) => {
    const updatedRule = { ...rule, ...updates };
    // Auto-regenerate ID when priority or categories change
    if ('priority' in updates || 'categories' in updates) {
      updatedRule.id = generateRuleId(
        cardId,
        updatedRule.priority || 'base',
        updatedRule.categories || ['all'],
        ruleIndex
      );
    }
    onChange(updatedRule);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Edit Reward Rule</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Rule ID (auto-generated)</label>
            <input
              type="text"
              value={rule.id || ''}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-border bg-background-secondary text-foreground-muted cursor-not-allowed font-mono text-sm"
            />
            <p className="text-xs text-foreground-muted mt-1">
              Format: {'{cardId}'}-{'{priority}'}-{'{category}'}-{'{index}'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description *</label>
            <input
              type="text"
              value={rule.description || ''}
              onChange={(e) => update({ description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              placeholder="e.g., 4% cashback on supermarkets"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Reward Rate (as decimal)
              </label>
              <input
                type="number"
                step="0.0001"
                value={rule.rewardRate || 0}
                onChange={(e) => update({ rewardRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="0.04 for 4%"
              />
              <p className="text-xs text-foreground-muted mt-1">
                {((rule.rewardRate || 0) * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Reward Unit</label>
              <select
                value={rule.rewardUnit || 'cash'}
                onChange={(e) => update({ rewardUnit: e.target.value as RewardRule['rewardUnit'] })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="cash">Cash</option>
                <option value="miles">Miles</option>
                <option value="points">Points</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select
                value={rule.priority || 'base'}
                onChange={(e) => update({ priority: e.target.value as RewardRule['priority'] })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="base">Base (foundation rate)</option>
                <option value="bonus">Bonus (stacks on base)</option>
                <option value="specific">Specific (replaces base)</option>
              </select>
              <p className="text-xs text-foreground-muted mt-1">
                {rule.priority === 'base' && 'Foundation rate applied first'}
                {rule.priority === 'bonus' && 'Stacks cumulatively on top of base'}
                {rule.priority === 'specific' && 'Replaces base for specific merchants'}
              </p>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rule.isPromotional ?? false}
                  onChange={(e) => update({ isPromotional: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Promotional (time-limited)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Categories (comma-separated)
            </label>
            <input
              type="text"
              value={rule.categories?.join(', ') || ''}
              onChange={(e) =>
                update({
                  categories: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                })
              }
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              placeholder="e.g., dining, travel or 'all' for everything"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Specific Merchants (comma-separated, optional)
            </label>
            <input
              type="text"
              value={rule.specificMerchants?.join(', ') || ''}
              onChange={(e) =>
                update({
                  specificMerchants: e.target.value
                    ? e.target.value.split(',').map((c) => c.trim()).filter(Boolean)
                    : undefined,
                })
              }
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              placeholder="e.g., mcdonalds, sushiro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Valid From (optional)
              </label>
              <input
                type="date"
                value={rule.validFrom || ''}
                onChange={(e) => update({ validFrom: e.target.value || undefined })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Valid Until (optional)
              </label>
              <input
                type="date"
                value={rule.validUntil || ''}
                onChange={(e) => update({ validUntil: e.target.value || undefined })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Action Required (optional)
            </label>
            <input
              type="text"
              value={rule.actionRequired || ''}
              onChange={(e) => update({ actionRequired: e.target.value || undefined })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              placeholder="e.g., Register online, Activate in app"
            />
            <p className="text-xs text-foreground-muted mt-1">
              Action user must take to activate this reward
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Source URL (optional)
            </label>
            <input
              type="url"
              value={rule.sourceUrl || ''}
              onChange={(e) => update({ sourceUrl: e.target.value || undefined })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes (optional)
            </label>
            <textarea
              value={rule.notes || ''}
              onChange={(e) => update({ notes: e.target.value || undefined })}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              placeholder="Any special conditions or caveats..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-foreground-muted border border-border rounded-lg hover:bg-background-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Save Rule
          </button>
        </div>
      </div>
    </div>
  );
}
