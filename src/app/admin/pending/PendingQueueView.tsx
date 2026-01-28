'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import type { PendingItem, PendingItemType, PendingSource } from '@/lib/data/pendingRepository';

interface PendingStats {
  total: number;
  cards: number;
  rules: number;
  manual: number;
  aiExtracted: number;
}

export default function PendingQueueView() {
  const router = useRouter();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [stats, setStats] = useState<PendingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState<PendingItemType | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<PendingSource | 'all'>('all');

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingItems();
  }, [typeFilter, sourceFilter]);

  const fetchPendingItems = async () => {
    try {
      const params = new URLSearchParams({ stats: 'true' });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);

      const response = await fetch(`/api/admin/pending?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch pending items');
      }

      const data = await response.json();
      setItems(data.items);
      setStats(data.stats);
    } catch (err) {
      setError('Failed to load pending items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this item and publish to production?')) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/pending/${id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.message || 'Failed to approve item');
        return;
      }

      // Refresh the list
      fetchPendingItems();
    } catch {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this item? This will permanently delete the pending changes.')) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/pending/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Failed to reject item');
        return;
      }

      // Refresh the list
      fetchPendingItems();
    } catch {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (items.length === 0) return;
    if (!confirm(`Approve all ${items.length} pending items?`)) return;

    setProcessingId('all');
    try {
      for (const item of items) {
        await fetch(`/api/admin/pending/${item.id}/approve`, { method: 'POST' });
      }
      fetchPendingItems();
    } catch {
      alert('Some items failed to approve');
      fetchPendingItems();
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground-muted">Loading pending items...</p>
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
                onClick={() => router.push('/admin')}
                className="text-foreground-muted hover:text-foreground"
              >
                ← Back
              </button>
              <Logo size={32} />
              <div>
                <h1 className="text-lg font-bold text-foreground">Pending Review</h1>
                <p className="text-sm text-foreground-muted">
                  {stats?.total || 0} items awaiting approval
                </p>
              </div>
            </div>
            {items.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={processingId === 'all'}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processingId === 'all' ? 'Processing...' : 'Approve All'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Cards" value={stats.cards} />
            <StatCard label="Rules" value={stats.rules} />
            <StatCard label="Manual" value={stats.manual} />
            <StatCard label="AI Extracted" value={stats.aiExtracted} />
          </div>
        )}

        {/* Filters */}
        <div className="bg-background-secondary rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-foreground-muted mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="all">All Types</option>
                <option value="card">Cards</option>
                <option value="rule">Rules</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-foreground-muted mb-1">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="ai-extracted">AI Extracted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pending Items List */}
        <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Pending Changes</h2>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-background border-b border-border text-xs font-medium text-foreground-muted uppercase tracking-wide">
            <div className="col-span-1">Type</div>
            <div className="col-span-3">Item</div>
            <div className="col-span-2">Change</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {items.map((item) => (
              <PendingItemRow
                key={item.id}
                item={item}
                isProcessing={processingId === item.id}
                onApprove={() => handleApprove(item.id)}
                onReject={() => handleReject(item.id)}
                onReview={() => router.push(`/admin/pending/${item.id}`)}
              />
            ))}
            {items.length === 0 && (
              <div className="px-6 py-12 text-center text-foreground-muted">
                <p className="text-lg mb-2">No pending items</p>
                <p className="text-sm">All changes have been reviewed and published.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PendingItemRow({
  item,
  isProcessing,
  onApprove,
  onReject,
  onReview,
}: {
  item: PendingItem;
  isProcessing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReview: () => void;
}) {
  const getItemName = () => {
    if (item.type === 'card' && item.cardData) {
      return item.cardData.name || item.cardId || 'Unnamed Card';
    }
    if (item.type === 'rule' && item.ruleData) {
      return item.ruleData.description || 'Unnamed Rule';
    }
    return item.cardId || 'Unknown';
  };

  const getChangeTypeBadge = () => {
    const styles: Record<string, string> = {
      create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded ${styles[item.changeType]}`}>
        {item.changeType.charAt(0).toUpperCase() + item.changeType.slice(1)}
      </span>
    );
  };

  const getSourceBadge = () => {
    const isAI = item.source === 'ai-extracted';
    return (
      <span
        className={`px-2 py-0.5 text-xs rounded ${
          isAI
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {isAI ? 'AI' : 'Manual'}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="px-4 py-3 hover:bg-background transition-colors">
      {/* Mobile Layout */}
      <div className="md:hidden space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon type={item.type} />
              <span className="font-medium text-foreground">{getItemName()}</span>
            </div>
            <div className="flex gap-2">
              {getChangeTypeBadge()}
              {getSourceBadge()}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReview}
            className="flex-1 px-3 py-1.5 text-xs text-primary border border-primary rounded hover:bg-primary/10"
          >
            Review
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? '...' : 'Approve'}
          </button>
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-12 gap-2 items-center">
        <div className="col-span-1">
          <TypeIcon type={item.type} />
        </div>
        <div className="col-span-3">
          <p className="font-medium text-foreground text-sm truncate">{getItemName()}</p>
          {item.cardId && item.type === 'rule' && (
            <p className="text-xs text-foreground-muted">Card: {item.cardId}</p>
          )}
        </div>
        <div className="col-span-2">{getChangeTypeBadge()}</div>
        <div className="col-span-2">{getSourceBadge()}</div>
        <div className="col-span-2 text-sm text-foreground-muted">
          {formatDate(item.createdAt)}
        </div>
        <div className="col-span-2 flex justify-end gap-1">
          <button
            onClick={onReview}
            className="px-2 py-1 text-xs text-primary border border-primary rounded hover:bg-primary/10"
          >
            Review
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? '...' : 'OK'}
          </button>
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: PendingItemType }) {
  if (type === 'card') {
    return (
      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-bold">
        C
      </span>
    );
  }
  return (
    <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs font-bold">
      R
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background-secondary rounded-lg border border-border p-3">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
