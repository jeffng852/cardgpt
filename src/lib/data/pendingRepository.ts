/**
 * Pending Items Repository
 * Manages pending changes awaiting approval
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import type { CreditCard, RewardRule } from '@/types/card';

export type PendingItemType = 'card' | 'rule';
export type PendingChangeType = 'create' | 'update' | 'delete';
export type PendingSource = 'manual' | 'ai-extracted';

export interface PendingItem {
  id: string;
  type: PendingItemType;
  changeType: PendingChangeType;
  source: PendingSource;
  createdAt: string;

  // For card changes
  cardId?: string;
  cardData?: Partial<CreditCard>;

  // For rule changes
  ruleIndex?: number;
  ruleData?: Partial<RewardRule>;

  // For edits - the original data for comparison
  originalData?: Partial<CreditCard> | Partial<RewardRule>;

  // Metadata
  notes?: string;
  sourceUrl?: string;
}

interface PendingStore {
  items: PendingItem[];
  lastUpdated: string;
}

const PENDING_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'pending.json');

function ensurePendingFile(): void {
  if (!existsSync(PENDING_FILE_PATH)) {
    const initialStore: PendingStore = {
      items: [],
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(PENDING_FILE_PATH, JSON.stringify(initialStore, null, 2), 'utf-8');
  }
}

function readPendingStore(): PendingStore {
  ensurePendingFile();
  const content = readFileSync(PENDING_FILE_PATH, 'utf-8');
  return JSON.parse(content);
}

function writePendingStore(store: PendingStore): void {
  store.lastUpdated = new Date().toISOString();
  writeFileSync(PENDING_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

// Generate unique ID for pending items
function generatePendingId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get all pending items
 */
export function getAllPendingItems(): PendingItem[] {
  const store = readPendingStore();
  return store.items.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get pending items filtered by type
 */
export function getPendingItemsByType(type: PendingItemType): PendingItem[] {
  return getAllPendingItems().filter(item => item.type === type);
}

/**
 * Get pending items filtered by source
 */
export function getPendingItemsBySource(source: PendingSource): PendingItem[] {
  return getAllPendingItems().filter(item => item.source === source);
}

/**
 * Get a single pending item by ID
 */
export function getPendingItemById(id: string): PendingItem | null {
  const store = readPendingStore();
  return store.items.find(item => item.id === id) || null;
}

/**
 * Get pending items for a specific card
 */
export function getPendingItemsForCard(cardId: string): PendingItem[] {
  return getAllPendingItems().filter(item => item.cardId === cardId);
}

/**
 * Create a new pending item
 */
export function createPendingItem(
  item: Omit<PendingItem, 'id' | 'createdAt'>
): PendingItem {
  const store = readPendingStore();

  const newItem: PendingItem = {
    ...item,
    id: generatePendingId(),
    createdAt: new Date().toISOString(),
  };

  store.items.push(newItem);
  writePendingStore(store);

  return newItem;
}

/**
 * Update a pending item
 */
export function updatePendingItem(
  id: string,
  updates: Partial<Omit<PendingItem, 'id' | 'createdAt'>>
): PendingItem | null {
  const store = readPendingStore();
  const index = store.items.findIndex(item => item.id === id);

  if (index === -1) {
    return null;
  }

  store.items[index] = { ...store.items[index], ...updates };
  writePendingStore(store);

  return store.items[index];
}

/**
 * Delete a pending item (reject)
 */
export function deletePendingItem(id: string): boolean {
  const store = readPendingStore();
  const initialLength = store.items.length;

  store.items = store.items.filter(item => item.id !== id);

  if (store.items.length < initialLength) {
    writePendingStore(store);
    return true;
  }

  return false;
}

/**
 * Get pending queue statistics
 */
export function getPendingStats(): {
  total: number;
  cards: number;
  rules: number;
  manual: number;
  aiExtracted: number;
} {
  const items = getAllPendingItems();

  return {
    total: items.length,
    cards: items.filter(i => i.type === 'card').length,
    rules: items.filter(i => i.type === 'rule').length,
    manual: items.filter(i => i.source === 'manual').length,
    aiExtracted: items.filter(i => i.source === 'ai-extracted').length,
  };
}

/**
 * Clear all pending items (for testing/reset)
 */
export function clearAllPendingItems(): void {
  const store: PendingStore = {
    items: [],
    lastUpdated: new Date().toISOString(),
  };
  writePendingStore(store);
}
