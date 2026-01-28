'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import type { CreditCard, RewardRule } from '@/types/card';

interface RuleListViewProps {
  cardId: string;
}

type RuleStatus = 'live' | 'pending' | 'expired';

function getRuleStatus(rule: RewardRule): RuleStatus {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (rule.validFrom && rule.validFrom > today) {
    return 'pending';
  }
  if (rule.validUntil && rule.validUntil < today) {
    return 'expired';
  }
  return 'live';
}

function formatRate(rule: RewardRule): string {
  const percentage = (rule.rewardRate * 100).toFixed(rule.rewardRate < 0.01 ? 2 : 1);
  return `${percentage}%`;
}

function formatValidity(rule: RewardRule): string {
  if (!rule.validFrom && !rule.validUntil) {
    return 'Ongoing';
  }
  const from = rule.validFrom || 'Start';
  const until = rule.validUntil || 'Ongoing';
  return `${from} → ${until}`;
}

export default function RuleListView({ cardId }: RuleListViewProps) {
  const router = useRouter();
  const [card, setCard] = useState<CreditCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<RuleStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'promotional' | 'base'>('all');

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
    } catch (err) {
      setError('Failed to load card data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRule = async (ruleIndex: number) => {
    if (!card) return;
    const rule = card.rewards[ruleIndex];
    if (!confirm(`Delete rule "${rule.description}"?`)) return;

    const newRewards = card.rewards.filter((_, i) => i !== ruleIndex);

    try {
      const response = await fetch(`/api/admin/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...card, rewards: newRewards }),
      });

      if (response.ok) {
        setCard({ ...card, rewards: newRewards });
      } else {
        alert('Failed to delete rule');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleDuplicateRule = async (ruleIndex: number) => {
    if (!card) return;
    const rule = card.rewards[ruleIndex];

    // Create a copy with new ID and set as pending (future date)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const newRule: RewardRule = {
      ...rule,
      id: `${rule.id}-copy-${Date.now()}`,
      description: `${rule.description} (Copy)`,
      validFrom: tomorrowStr,
      validUntil: undefined,
    };

    const newRewards = [...card.rewards, newRule];

    try {
      const response = await fetch(`/api/admin/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...card, rewards: newRewards }),
      });

      if (response.ok) {
        setCard({ ...card, rewards: newRewards });
      } else {
        alert('Failed to duplicate rule');
      }
    } catch {
      alert('Network error');
    }
  };

  const filteredRules = useMemo(() => {
    if (!card) return [];

    return card.rewards.filter((rule, index) => {
      const status = getRuleStatus(rule);

      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      if (typeFilter === 'promotional' && !rule.isPromotional) {
        return false;
      }
      if (typeFilter === 'base' && rule.isPromotional) {
        return false;
      }

      return true;
    }).map((rule, filteredIndex) => ({
      rule,
      originalIndex: card.rewards.indexOf(rule),
    }));
  }, [card, statusFilter, typeFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground-muted">Loading rules...</p>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || 'Card not found'}</p>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/admin/cards/${cardId}`)}
                className="text-foreground-muted hover:text-foreground"
              >
                ← Back
              </button>
              <Logo size={32} />
              <div>
                <h1 className="text-lg font-bold text-foreground">Reward Rules</h1>
                <p className="text-sm text-foreground-muted">{card.name}</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/admin/cards/${cardId}/rules/new`)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              + Add New Rule
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-background-secondary rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-foreground-muted mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="all">All Status</option>
                <option value="live">Live</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-foreground-muted mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="all">All Types</option>
                <option value="promotional">Promotional</option>
                <option value="base">Base/Permanent</option>
              </select>
            </div>
            <div className="flex items-end">
              <span className="text-sm text-foreground-muted">
                {filteredRules.length} of {card.rewards.length} rules
              </span>
            </div>
          </div>
        </div>

        {/* Rules Table */}
        <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-background border-b border-border text-xs font-medium text-foreground-muted uppercase tracking-wide">
            <div className="col-span-3">Description</div>
            <div className="col-span-1">Rate</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-1">Priority</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Validity</div>
            <div className="col-span-1">Flags</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Rule Rows */}
          <div className="divide-y divide-border">
            {filteredRules.map(({ rule, originalIndex }) => {
              const status = getRuleStatus(rule);
              return (
                <div
                  key={rule.id || originalIndex}
                  className="px-4 py-3 hover:bg-background transition-colors"
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm line-clamp-2">
                          {rule.description}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">
                          {formatRate(rule)} {rule.rewardUnit} • {rule.priority}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <StatusBadge status={status} />
                        {rule.isPromotional && <PromoBadge />}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/cards/${cardId}/rules/${originalIndex}`)}
                        className="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateRule(originalIndex)}
                        className="px-3 py-1.5 text-xs text-foreground-muted border border-border rounded hover:bg-background-secondary"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDeleteRule(originalIndex)}
                        className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Del
                      </button>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <p className="text-sm text-foreground line-clamp-2">{rule.description}</p>
                      <p className="text-xs text-foreground-muted font-mono">{rule.id}</p>
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm font-medium text-foreground">{formatRate(rule)}</span>
                    </div>
                    <div className="col-span-1">
                      <UnitBadge unit={rule.rewardUnit} />
                    </div>
                    <div className="col-span-1">
                      <PriorityBadge priority={rule.priority} />
                    </div>
                    <div className="col-span-1">
                      <StatusBadge status={status} />
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-foreground-muted">{formatValidity(rule)}</span>
                    </div>
                    <div className="col-span-1 flex gap-1">
                      {rule.isPromotional && <PromoBadge />}
                      {rule.isCumulative && <CumulativeBadge />}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <button
                        onClick={() => router.push(`/admin/cards/${cardId}/rules/${originalIndex}`)}
                        className="px-2 py-1 text-xs text-primary border border-primary rounded hover:bg-primary/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateRule(originalIndex)}
                        className="px-2 py-1 text-xs text-foreground-muted border border-border rounded hover:bg-background-secondary"
                        title="Duplicate"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDeleteRule(originalIndex)}
                        className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredRules.length === 0 && (
              <div className="px-4 py-12 text-center text-foreground-muted">
                {card.rewards.length === 0 ? (
                  <p>No reward rules yet. Click "Add New Rule" to create one.</p>
                ) : (
                  <p>No rules match the current filters.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: RuleStatus }) {
  const styles = {
    live: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function UnitBadge({ unit }: { unit: string }) {
  const styles: Record<string, string> = {
    cash: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    miles: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    points: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded ${styles[unit] || 'bg-gray-100 text-gray-600'}`}>
      {unit.charAt(0).toUpperCase() + unit.slice(1)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    base: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    bonus: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    premium: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded ${styles[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function PromoBadge() {
  return (
    <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded" title="Promotional">
      P
    </span>
  );
}

function CumulativeBadge() {
  return (
    <span className="px-1.5 py-0.5 text-xs bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 rounded" title="Cumulative">
      C
    </span>
  );
}
