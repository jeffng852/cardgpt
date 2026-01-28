/**
 * Approve Pending Item API
 *
 * POST /api/admin/pending/[id]/approve - Approve and publish a pending item
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import { getPendingItemById, deletePendingItem } from '@/lib/data/pendingRepository';
import { getCardById } from '@/lib/data/cardRepository';
import { createCard, updateCard, deactivateCard } from '@/lib/data/cardWriter';
import type { CreditCard, RewardRule } from '@/types/card';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/pending/[id]/approve
 * Approve and publish a pending item
 */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const item = getPendingItemById(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Pending item not found' },
        { status: 404 }
      );
    }

    let result: { success: boolean; message: string; data?: unknown };

    switch (item.type) {
      case 'card':
        result = await approveCardChange(item);
        break;
      case 'rule':
        result = await approveRuleChange(item);
        break;
      default:
        return NextResponse.json(
          { error: 'Bad Request', message: 'Unknown item type' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'Approval Failed', message: result.message },
        { status: 400 }
      );
    }

    // Remove from pending queue
    deletePendingItem(id);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Failed to approve pending item:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to approve pending item' },
      { status: 500 }
    );
  }
}

async function approveCardChange(item: {
  changeType: string;
  cardId?: string;
  cardData?: Partial<CreditCard>;
}): Promise<{ success: boolean; message: string; data?: unknown }> {
  switch (item.changeType) {
    case 'create': {
      if (!item.cardData) {
        return { success: false, message: 'No card data provided' };
      }

      const result = await createCard(item.cardData as CreditCard);

      if (!result.success) {
        return { success: false, message: result.validationErrors?.join(', ') || 'Failed to create card' };
      }

      return { success: true, message: 'Card created successfully', data: result.data };
    }

    case 'update': {
      if (!item.cardId || !item.cardData) {
        return { success: false, message: 'Card ID and data required for update' };
      }

      const result = await updateCard(item.cardId, item.cardData);

      if (!result.success) {
        return { success: false, message: result.validationErrors?.join(', ') || 'Failed to update card' };
      }

      return { success: true, message: 'Card updated successfully', data: result.data };
    }

    case 'delete': {
      if (!item.cardId) {
        return { success: false, message: 'Card ID required for deletion' };
      }

      const result = await deactivateCard(item.cardId);

      if (!result.success) {
        return { success: false, message: 'Failed to deactivate card' };
      }

      return { success: true, message: 'Card deactivated successfully' };
    }

    default:
      return { success: false, message: 'Unknown change type' };
  }
}

async function approveRuleChange(item: {
  changeType: string;
  cardId?: string;
  ruleIndex?: number;
  ruleData?: Partial<RewardRule>;
}): Promise<{ success: boolean; message: string; data?: unknown }> {
  if (!item.cardId) {
    return { success: false, message: 'Card ID required for rule changes' };
  }

  const card = getCardById(item.cardId);
  if (!card) {
    return { success: false, message: 'Card not found' };
  }

  switch (item.changeType) {
    case 'create': {
      if (!item.ruleData) {
        return { success: false, message: 'No rule data provided' };
      }

      const newRewards = [...card.rewards, item.ruleData as RewardRule];
      const result = await updateCard(item.cardId, { rewards: newRewards });

      if (!result.success) {
        return { success: false, message: 'Failed to add rule' };
      }

      return { success: true, message: 'Rule added successfully', data: item.ruleData };
    }

    case 'update': {
      if (item.ruleIndex === undefined || !item.ruleData) {
        return { success: false, message: 'Rule index and data required for update' };
      }

      const newRewards = card.rewards.map((r, i) =>
        i === item.ruleIndex ? { ...r, ...item.ruleData } : r
      );
      const result = await updateCard(item.cardId, { rewards: newRewards });

      if (!result.success) {
        return { success: false, message: 'Failed to update rule' };
      }

      return { success: true, message: 'Rule updated successfully', data: item.ruleData };
    }

    case 'delete': {
      if (item.ruleIndex === undefined) {
        return { success: false, message: 'Rule index required for deletion' };
      }

      const newRewards = card.rewards.filter((_, i) => i !== item.ruleIndex);
      const result = await updateCard(item.cardId, { rewards: newRewards });

      if (!result.success) {
        return { success: false, message: 'Failed to delete rule' };
      }

      return { success: true, message: 'Rule deleted successfully' };
    }

    default:
      return { success: false, message: 'Unknown change type' };
  }
}
