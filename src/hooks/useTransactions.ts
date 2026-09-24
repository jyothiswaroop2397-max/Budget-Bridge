import { Dispatch, SetStateAction } from 'react';
import { AppState, Category, Transaction, TransactionType } from '../types.js';
import { useToast } from './useToast.js';

export interface AddTransactionInput {
  amount: number;
  type: TransactionType;
  merchant: string;
  category: Category;
  bankName?: string;
  isVerified?: boolean;
  source?: 'sms_auto' | 'ai_chat' | 'manual' | 'quick_nl';
  accountLast4?: string | null;
  upiRef?: string | null;
  rawSms?: string;
  timestamp?: number;
}

export function useTransactions(setState: Dispatch<SetStateAction<AppState>>) {
  const { showToast } = useToast();

  // Add Transaction handler (used by AI Assistant, Manual Add, and Silent SMS Verifier)
  const handleAddTransaction = (data: AddTransactionInput) => {
    if (!data || isNaN(data.amount) || data.amount <= 0) {
      console.warn('[App State] Refused to add transaction with non-positive amount:', data);
      showToast('Transaction amount must be greater than zero.', 'error');
      return;
    }

    const isAutoSource = data.source === 'sms_auto' || data.source === 'ai_chat';
    const cleanUpiRef = data.upiRef?.trim();
    const candidateAmount = Math.abs(data.amount);
    const candidateMerchant = data.merchant?.trim() || 'Expense';
    const candidateType = data.type;
    const candidateTimestamp = data.timestamp || Date.now();

    setState((prev) => {
      // Automatic duplicate detection for sms_auto and ai_chat sources
      if (isAutoSource) {
        const isDuplicate = prev.transactions.some((existing) => {
          if (cleanUpiRef) {
            return Boolean(existing.upiRef && existing.upiRef.trim().toLowerCase() === cleanUpiRef.toLowerCase());
          }
          const sameAmount = Math.abs(existing.amount) === candidateAmount;
          const sameType = existing.type === candidateType;
          const sameMerchant = (existing.merchant || '').trim().toLowerCase() === candidateMerchant.toLowerCase();
          const timeDiff = Math.abs((existing.timestamp || 0) - candidateTimestamp);
          return sameAmount && sameType && sameMerchant && timeDiff <= 5000;
        });

        if (isDuplicate) {
          if (cleanUpiRef) {
            console.log(`[App State] Duplicate transaction detected, skipping (matching upiRef: ${cleanUpiRef})`);
          } else {
            console.log(
              `[App State] Duplicate transaction detected, skipping (matching amount: ${candidateAmount}, merchant: "${candidateMerchant}", type: ${candidateType}, timestamp: ${candidateTimestamp})`
            );
          }
          return prev;
        }
      }

      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        amount: candidateAmount,
        type: candidateType,
        merchant: candidateMerchant,
        category: data.category || 'Other',
        timestamp: candidateTimestamp,
        source: data.source || 'manual',
        bankName: data.bankName,
        isVerified: data.isVerified ?? false,
        accountLast4: data.accountLast4,
        upiRef: data.upiRef,
        rawSms: data.rawSms,
      };

      console.log('[App State] Final entry object pushed to state:', newTx);
      console.log(`[App State] Category "${newTx.category}" assigned with amount ${newTx.amount}`);

      const updated = [newTx, ...prev.transactions].sort((a, b) => b.timestamp - a.timestamp);
      return {
        ...prev,
        transactions: updated,
      };
    });

    if (data.source === 'manual') {
      showToast(`Added ${candidateMerchant} (${data.category || 'Other'})`, 'success');
    }
  };

  // Update transaction handler (e.g. change category, merchant name, or amount)
  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    setState((prev) => {
      const updated = prev.transactions
        .map((t) => (t.id === id ? { ...t, ...updates } : t))
        .sort((a, b) => b.timestamp - a.timestamp);
      return {
        ...prev,
        transactions: updated,
      };
    });
    showToast('Transaction updated.', 'success');
  };

  // Delete transaction handler
  const handleDeleteTransaction = (id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
    showToast('Transaction deleted.', 'info');
  };

  return {
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
  };
}

