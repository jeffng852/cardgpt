'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import type { CreditCard } from '@/types/card';

interface Stats {
  totalCards: number;
  activeCards: number;
  inactiveCards: number;
  issuers: string[];
  issuerCount: number;
  rewardTypes: string[];
  totalRewardRules: number;
  promotionalRules: number;
  lastUpdated: string;
  version: string;
  pendingItems: number;
  pendingCards: number;
  pendingRules: number;
}

type SortField = 'name' | 'issuer' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [issuerFilter, setIssuerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, cardsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/cards'),
      ]);

      if (!statsRes.ok || !cardsRes.ok) {
        if (statsRes.status === 401 || cardsRes.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const statsData = await statsRes.json();
      const cardsData = await cardsRes.json();

      setStats(statsData);
      setCards(cardsData.cards);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (card) =>
          card.name.toLowerCase().includes(query) ||
          card.issuer.toLowerCase().includes(query) ||
          card.id.toLowerCase().includes(query)
      );
    }

    // Issuer filter
    if (issuerFilter !== 'all') {
      result = result.filter((card) => card.issuer === issuerFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((card) =>
        statusFilter === 'active' ? card.isActive : !card.isActive
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'issuer':
          comparison = a.issuer.localeCompare(b.issuer);
          break;
        case 'lastUpdated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [cards, searchQuery, issuerFilter, statusFilter, sortField, sortDirection]);

  const uniqueIssuers = useMemo(() => {
    return Array.from(new Set(cards.map((c) => c.issuer))).sort();
  }, [cards]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <div>
                <h1 className="text-lg font-bold text-foreground">CardGPT Admin</h1>
                <p className="text-xs text-foreground-muted">Card Data Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats && stats.pendingItems > 0 && (
                <button
                  onClick={() => router.push('/admin/pending')}
                  className="px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors flex items-center gap-2"
                >
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-yellow-500 text-white rounded-full">
                    {stats.pendingItems}
                  </span>
                  Pending Review
                </button>
              )}
              <button
                onClick={() => router.push('/admin/cards/new')}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                + Add Card
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground border border-border rounded-lg hover:bg-background-secondary transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Cards" value={stats.totalCards} />
            <StatCard label="Active Cards" value={stats.activeCards} accent="green" />
            <StatCard label="Issuers" value={stats.issuerCount} />
            <StatCard label="Reward Rules" value={stats.totalRewardRules} />
            <StatCard label="Promotional Rules" value={stats.promotionalRules} accent="yellow" />
            <StatCard label="Inactive Cards" value={stats.inactiveCards} accent="red" />
            <StatCard
              label="Pending Review"
              value={stats.pendingItems}
              accent={stats.pendingItems > 0 ? 'yellow' : undefined}
              onClick={() => router.push('/admin/pending')}
            />
            <StatCard label="Version" value={stats.version} small />
          </div>
        )}

        {/* Filters */}
        <div className="bg-background-secondary rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Issuer Filter */}
            <select
              value={issuerFilter}
              onChange={(e) => setIssuerFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Issuers</option>
              {uniqueIssuers.map((issuer) => (
                <option key={issuer} value={issuer}>
                  {issuer}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Cards List */}
        <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Credit Cards</h2>
            <span className="text-sm text-foreground-muted">
              {filteredCards.length} of {cards.length} cards
            </span>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-background border-b border-border text-xs font-medium text-foreground-muted uppercase tracking-wide">
            <button
              onClick={() => handleSort('name')}
              className="col-span-4 text-left hover:text-foreground flex items-center gap-1"
            >
              Card Name
              {sortField === 'name' && (
                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button
              onClick={() => handleSort('issuer')}
              className="col-span-2 text-left hover:text-foreground flex items-center gap-1"
            >
              Issuer
              {sortField === 'issuer' && (
                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <div className="col-span-2 text-left">Rewards</div>
            <div className="col-span-2 text-left">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Card Rows */}
          <div className="divide-y divide-border">
            {filteredCards.map((card) => (
              <CardRow key={card.id} card={card} onRefresh={fetchData} />
            ))}
            {filteredCards.length === 0 && (
              <div className="px-6 py-12 text-center text-foreground-muted">
                No cards found matching your criteria
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CardRow({ card, onRefresh }: { card: CreditCard; onRefresh: () => void }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to deactivate "${card.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/cards/${card.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onRefresh();
      } else {
        alert('Failed to deactivate card');
      }
    } catch {
      alert('Network error');
    } finally {
      setIsDeleting(false);
    }
  };

  const rewardSummary = useMemo(() => {
    const units = new Set(card.rewards.map((r) => r.rewardUnit));
    return Array.from(units).join(', ');
  }, [card.rewards]);

  const hasPromo = card.rewards.some((r) => r.isPromotional);

  return (
    <div className="px-6 py-4 hover:bg-background transition-colors">
      {/* Mobile Layout */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">{card.name}</h3>
          <div className="flex items-center gap-2">
            {!card.isActive && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded">
                Inactive
              </span>
            )}
            {hasPromo && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                Promo
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-foreground-muted">
          {card.issuer} &middot; {card.rewards.length} rules ({rewardSummary})
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => router.push(`/admin/cards/${card.id}`)}
            className="flex-1 px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
        <div className="col-span-4">
          <h3 className="font-medium text-foreground">{card.name}</h3>
          <p className="text-xs text-foreground-muted mt-0.5">{card.id}</p>
        </div>
        <div className="col-span-2 text-sm text-foreground">{card.issuer}</div>
        <div className="col-span-2">
          <span className="text-sm text-foreground">
            {card.rewards.length} rules
          </span>
          <span className="text-xs text-foreground-muted ml-1">({rewardSummary})</span>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          {card.isActive ? (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded">
              Active
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded">
              Inactive
            </span>
          )}
          {hasPromo && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
              Promo
            </span>
          )}
        </div>
        <div className="col-span-2 flex justify-end gap-2">
          <button
            onClick={() => router.push(`/admin/cards/${card.id}`)}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  small,
  onClick,
}: {
  label: string;
  value: string | number;
  accent?: 'green' | 'yellow' | 'red';
  small?: boolean;
  onClick?: () => void;
}) {
  const accentColors = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  const baseClasses = "bg-background-secondary rounded-lg border border-border p-4";
  const clickableClasses = onClick ? "cursor-pointer hover:border-primary hover:bg-background transition-colors" : "";

  return (
    <div className={`${baseClasses} ${clickableClasses}`} onClick={onClick}>
      <p className="text-xs text-foreground-muted uppercase tracking-wide">{label}</p>
      <p
        className={`${small ? 'text-lg' : 'text-2xl'} font-bold mt-1 ${
          accent ? accentColors[accent] : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
