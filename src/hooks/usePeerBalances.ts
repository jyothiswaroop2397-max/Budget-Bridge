import { Dispatch, SetStateAction } from 'react';
import { AppState, PeerBalance, PeerBalanceType, PeerExpenseItem } from '../types.js';
import { useToast } from './useToast.js';
import { calculatePeerLedgerTotals, getTodayIsoDate } from '../utils/peerLedger.js';

export interface AddPeerBalanceInput {
  name: string;
  type: PeerBalanceType;
  amount: number;
  note?: string;
  direction?: 'GAVE' | 'RECEIVED';
  dateStr?: string;
  directPeer?: PeerBalance;
}

export function usePeerBalances(setState: Dispatch<SetStateAction<AppState>>) {
  const { showToast } = useToast();

  // Add or update running peer ledger balance handler
  const handleAddPeerBalance = (data: AddPeerBalanceInput) => {
    if (data.directPeer) {
      const p = data.directPeer;
      setState((prev) => {
        const normName = p.name.trim().toLowerCase();
        const existingIdx = prev.peerBalances.findIndex((x) => x.name.trim().toLowerCase() === normName);
        if (existingIdx >= 0) {
          const updated = [...prev.peerBalances];
          updated[existingIdx] = p;
          return { ...prev, peerBalances: updated };
        }
        return { ...prev, peerBalances: [p, ...prev.peerBalances] };
      });
      return;
    }

    if (!data || !data.name?.trim() || isNaN(data.amount) || data.amount <= 0) {
      console.warn('[App State] Refused to add peer balance with invalid data:', data);
      showToast('Please provide a valid person name and positive amount.', 'error');
      return;
    }

    const normName = data.name.trim().toLowerCase();
    const amt = Math.abs(data.amount);
    const direction: 'GAVE' | 'RECEIVED' = data.direction || (data.type === 'OWED_TO_YOU' ? 'GAVE' : 'RECEIVED');
    const dateStr = data.dateStr || getTodayIsoDate();

    const newItem: PeerExpenseItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: data.note?.trim() || (direction === 'GAVE' ? 'Money given' : 'Money received'),
      amount: amt,
      date: Date.now(),
      dateStr,
      direction,
    };

    setState((prev) => {
      const existingIdx = prev.peerBalances.findIndex((p) => p.name.trim().toLowerCase() === normName);

      if (existingIdx >= 0) {
        const target = prev.peerBalances[existingIdx];
        const currentItems = target.items && target.items.length > 0
          ? target.items
          : [
              {
                id: `item-${target.id}-init`,
                description: target.note || (target.type === 'OWED_TO_YOU' ? 'Initial given' : 'Initial received'),
                amount: target.amount,
                date: target.updatedAt || Date.now(),
                dateStr: getTodayIsoDate(),
                direction: target.type === 'OWED_TO_YOU' ? ('GAVE' as const) : ('RECEIVED' as const),
              },
            ];

        const newItems = [...currentItems, newItem];
        const totals = calculatePeerLedgerTotals({ items: newItems });
        const newType: PeerBalanceType = totals.pending >= 0 ? 'OWED_TO_YOU' : 'I_OWE';

        const updatedPeer: PeerBalance = {
          ...target,
          name: data.name.trim(),
          type: newType,
          amount: Math.abs(totals.pending),
          totalGiven: totals.totalGiven,
          totalReceived: totals.totalReceived,
          updatedAt: Date.now(),
          items: newItems,
        };

        const updatedList = [...prev.peerBalances];
        updatedList[existingIdx] = updatedPeer;
        return { ...prev, peerBalances: updatedList };
      } else {
        const isGave = direction === 'GAVE';
        const totalGiven = isGave ? amt : 0;
        const totalReceived = isGave ? 0 : amt;
        const pending = totalGiven - totalReceived;

        const newPeer: PeerBalance = {
          id: `peer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: data.name.trim(),
          type: pending >= 0 ? 'OWED_TO_YOU' : 'I_OWE',
          amount: Math.abs(pending),
          totalGiven,
          totalReceived,
          note: data.note?.trim() || (direction === 'GAVE' ? 'Money given' : 'Money received'),
          updatedAt: Date.now(),
          items: [newItem],
        };

        return {
          ...prev,
          peerBalances: [newPeer, ...prev.peerBalances],
        };
      }
    });

    showToast(
      direction === 'GAVE'
        ? `Logged: You gave ₹${amt} to ${data.name.trim()}.`
        : `Logged: Received ₹${amt} from ${data.name.trim()}.`,
      'success'
    );
  };

  // Add individual reason/expense to a peer
  const handleAddItemToPeer = (peerId: string, item: { description: string; amount: number }) => {
    if (!item.description.trim() || isNaN(item.amount) || item.amount <= 0) {
      showToast('Please provide a valid description and amount for the item.', 'error');
      return;
    }

    setState((prev) => {
      const updated = prev.peerBalances.map((p) => {
        if (p.id !== peerId) return p;
        const currentItems = p.items && p.items.length > 0
          ? p.items
          : [
              {
                id: `item-${p.id}-init`,
                description: p.note || 'General expense',
                amount: p.amount,
                date: p.updatedAt,
              },
            ];
        const newItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          description: item.description.trim(),
          amount: Math.abs(item.amount),
          date: Date.now(),
        };
        const newItems = [newItem, ...currentItems];
        const newTotal = newItems.reduce((sum, it) => sum + it.amount, 0);
        return {
          ...p,
          amount: Math.round(newTotal * 100) / 100,
          items: newItems,
          updatedAt: Date.now(),
        };
      });
      return { ...prev, peerBalances: updated };
    });

    showToast(`Added ${item.description.trim()} to breakdown.`, 'success');
  };

  // Remove individual reason/expense from a peer
  const handleRemoveItemFromPeer = (peerId: string, itemId: string) => {
    setState((prev) => {
      const target = prev.peerBalances.find((p) => p.id === peerId);
      if (!target) return prev;
      const currentItems = target.items && target.items.length > 0
        ? target.items
        : [
            {
              id: `item-${target.id}-init`,
              description: target.note || 'General expense',
              amount: target.amount,
              date: target.updatedAt,
            },
          ];
      const remaining = currentItems.filter((it) => it.id !== itemId);
      if (remaining.length === 0) {
        return {
          ...prev,
          peerBalances: prev.peerBalances.filter((p) => p.id !== peerId),
        };
      }
      const newTotal = remaining.reduce((sum, it) => sum + it.amount, 0);
      const updated = prev.peerBalances.map((p) => {
        if (p.id !== peerId) return p;
        return {
          ...p,
          amount: Math.round(newTotal * 100) / 100,
          items: remaining,
          updatedAt: Date.now(),
        };
      });
      return { ...prev, peerBalances: updated };
    });

    showToast('Removed item from balance breakdown.', 'info');
  };

  // Settle peer balance handler (Full or Partial)
  const handleConfirmSettle = (peerId: string, settleAmount: number) => {
    setState((prev) => {
      const target = prev.peerBalances.find((p) => p.id === peerId);
      if (!target) return prev;

      if (settleAmount >= target.amount) {
        // Full settlement: remove peer balance entry completely
        return {
          ...prev,
          peerBalances: prev.peerBalances.filter((p) => p.id !== peerId),
        };
      }

      // Partial settlement: deduct amount and adjust items
      const newAmount = Math.max(0, target.amount - settleAmount);
      let remainingDeduction = settleAmount;
      const currentItems = target.items || [];
      const updatedItems = [];

      for (const it of currentItems) {
        if (remainingDeduction <= 0) {
          updatedItems.push(it);
        } else if (it.amount <= remainingDeduction) {
          remainingDeduction -= it.amount;
        } else {
          updatedItems.push({
            ...it,
            amount: Math.round((it.amount - remainingDeduction) * 100) / 100,
          });
          remainingDeduction = 0;
        }
      }

      if (updatedItems.length === 0 && newAmount > 0) {
        updatedItems.push({
          id: `item-${target.id}-part`,
          description: target.note || 'Remaining balance',
          amount: newAmount,
          date: Date.now(),
        });
      }

      const updated = prev.peerBalances.map((p) => {
        if (p.id !== peerId) return p;
        return {
          ...p,
          amount: Math.round(newAmount * 100) / 100,
          items: updatedItems,
          updatedAt: Date.now(),
        };
      });

      return { ...prev, peerBalances: updated };
    });

    showToast('Balance settlement recorded.', 'success');
  };

  // Immediate full settle peer balance handler (fallback)
  const handleSettlePeerBalance = (id: string) => {
    setState((prev) => ({
      ...prev,
      peerBalances: prev.peerBalances.filter((p) => p.id !== id),
    }));
    showToast('Settled balance completely.', 'success');
  };

  return {
    handleAddPeerBalance,
    handleAddItemToPeer,
    handleRemoveItemFromPeer,
    handleConfirmSettle,
    handleSettlePeerBalance,
  };
}

