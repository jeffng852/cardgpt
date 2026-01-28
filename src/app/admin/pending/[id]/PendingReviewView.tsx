'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import type { PendingItem } from '@/lib/data/pendingRepository';
import type { CreditCard, RewardRule } from '@/types/card';

interface PendingReviewViewProps {
  pendingId: string;
}

export default function PendingReviewView({ pendingId }: PendingReviewViewProps) {
  const router = useRouter();
  const [item, setItem] = useState<PendingItem | null>(null);
  const [originalCard, setOriginalCard] = useState<CreditCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPendingItem();
  }, [pendingId]);

  const fetchPendingItem = async () => {
    try {
      const response = await fetch(`/api/admin/pending/${pendingId}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        if (response.status === 404) {
          setError('Pending item not found');
          return;
        }
        throw new Error('Failed to fetch pending item');
      }

      const data = await response.json();
      setItem(data.item);

      // If this is an edit, fetch the original card for comparison
      if (data.item.changeType === 'update' && data.item.cardId) {
        const cardResponse = await fetch(`/api/admin/cards/${data.item.cardId}`);
        if (cardResponse.ok) {
          const cardData = await cardResponse.json();
          setOriginalCard(cardData.card);
        }
      }
    } catch (err) {
      setError('Failed to load pending item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this item and publish to production?')) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/pending/${pendingId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.message || 'Failed to approve item');
        return;
      }

      router.push('/admin/pending');
    } catch {
      alert('Network error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Reject this item? This will permanently delete the pending changes.')) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/pending/${pendingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Failed to reject item');
        return;
      }

      router.push('/admin/pending');
    } catch {
      alert('Network error');
    } finally {
      setIsProcessing(false);
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

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || 'Item not found'}</p>
          <button
            onClick={() => router.push('/admin/pending')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/pending')}
                className="text-foreground-muted hover:text-foreground"
              >
                ← Back
              </button>
              <Logo size={32} />
              <div>
                <h1 className="text-lg font-bold text-foreground">Review Pending Change</h1>
                <p className="text-sm text-foreground-muted">
                  {item.type === 'card' ? 'Card' : 'Rule'} • {item.changeType}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Approve & Publish'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metadata */}
        <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Change Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-foreground-muted">Type</p>
              <p className="font-medium text-foreground capitalize">{item.type}</p>
            </div>
            <div>
              <p className="text-foreground-muted">Change Type</p>
              <p className="font-medium text-foreground capitalize">{item.changeType}</p>
            </div>
            <div>
              <p className="text-foreground-muted">Source</p>
              <p className="font-medium text-foreground">
                {item.source === 'ai-extracted' ? 'AI Extracted' : 'Manual'}
              </p>
            </div>
            <div>
              <p className="text-foreground-muted">Created</p>
              <p className="font-medium text-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          {item.sourceUrl && (
            <div className="mt-4">
              <p className="text-foreground-muted text-sm">Source URL</p>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                {item.sourceUrl}
              </a>
            </div>
          )}
          {item.notes && (
            <div className="mt-4">
              <p className="text-foreground-muted text-sm">Notes</p>
              <p className="text-foreground text-sm">{item.notes}</p>
            </div>
          )}
        </section>

        {/* Content Preview */}
        {item.type === 'card' && item.cardData && (
          <CardPreview
            cardData={item.cardData}
            originalData={item.changeType === 'update' ? originalCard : null}
            isDelete={item.changeType === 'delete'}
          />
        )}

        {item.type === 'rule' && item.ruleData && (
          <RulePreview
            ruleData={item.ruleData}
            cardId={item.cardId}
            isDelete={item.changeType === 'delete'}
          />
        )}
      </main>
    </div>
  );
}

function CardPreview({
  cardData,
  originalData,
  isDelete,
}: {
  cardData: Partial<CreditCard>;
  originalData: CreditCard | null;
  isDelete: boolean;
}) {
  const showComparison = originalData !== null;

  if (isDelete) {
    return (
      <section className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Card to be Deleted
        </h2>
        <p className="text-foreground">
          <strong>{cardData.name}</strong> by {cardData.issuer}
        </p>
        <p className="text-sm text-foreground-muted mt-2">
          This action will deactivate the card. It can be reactivated later.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-background-secondary rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {showComparison ? 'Card Changes' : 'New Card'}
      </h2>

      {showComparison ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original */}
          <div>
            <h3 className="text-sm font-medium text-foreground-muted mb-3">Current (Live)</h3>
            <div className="space-y-2 text-sm">
              <FieldRow label="Name" value={originalData.name} />
              <FieldRow label="Issuer" value={originalData.issuer} />
              <FieldRow label="Network" value={originalData.network} />
              <FieldRow label="Annual Fee" value={`HKD ${originalData.fees?.annualFee || 0}`} />
              <FieldRow label="Status" value={originalData.isActive ? 'Active' : 'Inactive'} />
            </div>
          </div>

          {/* New */}
          <div>
            <h3 className="text-sm font-medium text-foreground-muted mb-3">Pending Changes</h3>
            <div className="space-y-2 text-sm">
              <FieldRow
                label="Name"
                value={cardData.name}
                changed={cardData.name !== originalData.name}
              />
              <FieldRow
                label="Issuer"
                value={cardData.issuer}
                changed={cardData.issuer !== originalData.issuer}
              />
              <FieldRow
                label="Network"
                value={cardData.network}
                changed={cardData.network !== originalData.network}
              />
              <FieldRow
                label="Annual Fee"
                value={`HKD ${cardData.fees?.annualFee || 0}`}
                changed={cardData.fees?.annualFee !== originalData.fees?.annualFee}
              />
              <FieldRow
                label="Status"
                value={cardData.isActive ? 'Active' : 'Inactive'}
                changed={cardData.isActive !== originalData.isActive}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <FieldRow label="ID" value={cardData.id} />
          <FieldRow label="Name" value={cardData.name} />
          <FieldRow label="Issuer" value={cardData.issuer} />
          <FieldRow label="Network" value={cardData.network} />
          <FieldRow label="Annual Fee" value={`HKD ${cardData.fees?.annualFee || 0}`} />
          <FieldRow label="Apply URL" value={cardData.applyUrl} />
          <FieldRow label="Rules Count" value={String(cardData.rewards?.length || 0)} />
        </div>
      )}
    </section>
  );
}

function RulePreview({
  ruleData,
  cardId,
  isDelete,
}: {
  ruleData: Partial<RewardRule>;
  cardId?: string;
  isDelete: boolean;
}) {
  if (isDelete) {
    return (
      <section className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Rule to be Deleted
        </h2>
        <p className="text-foreground">{ruleData.description}</p>
        <p className="text-sm text-foreground-muted mt-2">
          This rule will be permanently removed from card: {cardId}
        </p>
      </section>
    );
  }

  return (
    <section className="bg-background-secondary rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Rule Details</h2>
      <div className="space-y-2 text-sm">
        <FieldRow label="Card ID" value={cardId} />
        <FieldRow label="Rule ID" value={ruleData.id} />
        <FieldRow label="Description" value={ruleData.description} />
        <FieldRow
          label="Reward Rate"
          value={`${((ruleData.rewardRate || 0) * 100).toFixed(2)}%`}
        />
        <FieldRow label="Reward Unit" value={ruleData.rewardUnit} />
        <FieldRow label="Priority" value={ruleData.priority} />
        <FieldRow
          label="Categories"
          value={(ruleData.categories as string[])?.join(', ') || 'all'}
        />
        <FieldRow label="Cumulative" value={ruleData.isCumulative ? 'Yes' : 'No'} />
        <FieldRow label="Promotional" value={ruleData.isPromotional ? 'Yes' : 'No'} />
        {ruleData.validFrom && <FieldRow label="Valid From" value={ruleData.validFrom} />}
        {ruleData.validUntil && <FieldRow label="Valid Until" value={ruleData.validUntil} />}
        {ruleData.monthlySpendingCap && (
          <FieldRow label="Monthly Cap" value={`HKD ${ruleData.monthlySpendingCap}`} />
        )}
      </div>
    </section>
  );
}

function FieldRow({
  label,
  value,
  changed = false,
}: {
  label: string;
  value?: string;
  changed?: boolean;
}) {
  return (
    <div className="flex justify-between py-1 border-b border-border last:border-0">
      <span className="text-foreground-muted">{label}</span>
      <span
        className={`font-medium ${
          changed
            ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 rounded'
            : 'text-foreground'
        }`}
      >
        {value || '-'}
      </span>
    </div>
  );
}
