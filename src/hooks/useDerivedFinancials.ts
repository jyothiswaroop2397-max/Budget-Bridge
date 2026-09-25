import { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import { AppState, BudgetContext, Category } from '../types.js';
import { getTodayDateString } from '../utils/formatters.js';

export function useDerivedFinancials(
  state: AppState,
  setState: Dispatch<SetStateAction<AppState>>,
  selectedDate: Date = new Date()
) {
  // Daily budget rollover check
  useEffect(() => {
    const today = getTodayDateString();
    if (state.lastActiveDate !== today) {
      setState((prev) => ({
        ...prev,
        lastActiveDate: today,
        spentToday: 0,
      }));
    }
  }, [state.lastActiveDate, setState]);

  // Recalculate derived spending figures based on selected month & year
  const { monthlyExpenditure, spentTodayCalculated, categoryBreakdown, isCurrentMonth } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toDateString();

    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    const isCurrent = targetMonth === currentMonth && targetYear === currentYear;

    let monthSum = 0;
    let todaySum = 0;
    const breakdown: Record<Category, number> = {
      Food: 0,
      Travel: 0,
      Bills: 0,
      Shopping: 0,
      Health: 0,
      Entertainment: 0,
      Social: 0,
      Other: 0,
    };

    for (const tx of state.transactions) {
      if (tx.type === 'DEBIT') {
        const txDate = new Date(tx.timestamp);
        // Selected month & year filter
        if (txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear) {
          monthSum += tx.amount;
          const assignedCat = tx.category || 'Other';
          breakdown[assignedCat] = (breakdown[assignedCat] || 0) + tx.amount;
        }
        // Today's spend (only for current month)
        if (isCurrent && txDate.toDateString() === todayStr) {
          todaySum += tx.amount;
        }
      }
    }

    return {
      monthlyExpenditure: Math.round(monthSum * 100) / 100,
      spentTodayCalculated: Math.round(todaySum * 100) / 100,
      categoryBreakdown: breakdown,
      isCurrentMonth: isCurrent,
    };
  }, [state.transactions, selectedDate]);

  // Peer balance totals: "Owed to You" (I Owe You) and "I Owe"
  const { totalOwedToYou, totalIOwe } = useMemo(() => {
    let owed = 0;
    let owe = 0;
    for (const p of state.peerBalances) {
      if (p.type === 'OWED_TO_YOU') {
        owed += p.amount;
      } else {
        owe += p.amount;
      }
    }
    return {
      totalOwedToYou: Math.round(owed * 100) / 100,
      totalIOwe: Math.round(owe * 100) / 100,
    };
  }, [state.peerBalances]);

  // Context for AI assistant queries
  const budgetContext: BudgetContext = useMemo(() => {
    return {
      monthlyCap: state.monthlyCap,
      monthlyExpenditure,
      dailyLimit: state.dailyLimit,
      spentToday: spentTodayCalculated,
      currency: state.currency,
      userName: state.userProfile?.name || 'Guest',
      userProfile: state.userProfile,
      categoryBreakdown,
      transactionsCount: state.transactions.length,
      totalOwedToYou,
      totalIOwe,
      peerBalances: state.peerBalances.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        amount: p.amount,
        note: p.note,
        totalGiven: p.totalGiven,
        totalReceived: p.totalReceived,
        updatedAt: p.updatedAt,
        items: p.items || [],
      })),
      recentTransactions: state.transactions.slice(0, 8).map((t) => ({
        merchant: t.merchant,
        amount: t.amount,
        category: t.category,
        type: t.type,
        date: new Date(t.timestamp).toLocaleDateString(),
      })),
    };
  }, [
    state.monthlyCap,
    monthlyExpenditure,
    state.dailyLimit,
    spentTodayCalculated,
    state.currency,
    categoryBreakdown,
    state.transactions,
    totalOwedToYou,
    totalIOwe,
    state.peerBalances,
    state.userProfile,
  ]);

  return {
    monthlyExpenditure,
    spentTodayCalculated,
    categoryBreakdown,
    totalOwedToYou,
    totalIOwe,
    budgetContext,
    isCurrentMonth,
  };
}
