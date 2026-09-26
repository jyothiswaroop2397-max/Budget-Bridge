import { BudgetContext } from '../types.js';
import { calculateFinancialHealth, FinancialHealthResult } from './financialHealth.js';

export interface LocalFinancialAnswer {
  isQuery: boolean;
  reply: string;
  queryType?: string;
  calculatedAmount?: number | null;
  category?: string;
}

/**
 * Robust Local Financial Query Analyzer
 * Answers questions about spending, weekly/daily/monthly averages, caps, categories, and peer debts.
 */
export function analyzeFinancialQueryLocal(
  input: string,
  context: BudgetContext
): LocalFinancialAnswer {
  const rawQ = (input || '').trim();
  const q = rawQ.toLowerCase();
  const currency = context.currency || 'INR';

  // Normalize common typos: 'expediture' -> 'expenditure', 'averge' -> 'average'
  const normalized = q
    .replace(/\bexpediture\b/g, 'expenditure')
    .replace(/\baverge\b/g, 'average')
    .replace(/\bavrg\b/g, 'average');

  // If input starts with clear transaction action verbs and has a number, do not treat as question
  const isDirectLogCommand =
    /^(spent|spend|paid|pay|bought|buy|ordered|added)\s+(?:[₹$€£]|rs\.?|inr)?\s*\d+/i.test(normalized) &&
    !normalized.includes('?') &&
    !normalized.startsWith('how') &&
    !normalized.startsWith('what');

  if (isDirectLogCommand) {
    return {
      isQuery: false,
      reply: '',
    };
  }

  const monthlyAmt = Number(context.monthlyExpenditure) || 0;
  const monthlyCap = typeof context.monthlyCap === 'number' ? context.monthlyCap : (Number(context.monthlyCap) || 0);
  const spentToday = Number(context.spentToday) || 0;
  const dailyLimit = typeof context.dailyLimit === 'number' ? context.dailyLimit : (Number(context.dailyLimit) || 0);

  // ═════════════════════════════════════════════════════════════════════
  // 0. FINANCIAL HEALTH / FINANCIAL SCORE QUERIES
  // ═════════════════════════════════════════════════════════════════════
  const isFinancialHealthQuery =
    normalized.includes('financial health') ||
    normalized.includes('financial score') ||
    normalized.includes('health score') ||
    normalized.includes('my score') ||
    normalized.includes('financial rating') ||
    normalized.includes('financial vitals') ||
    normalized.includes('financial condition') ||
    normalized.includes('score breakdown') ||
    normalized.includes('health breakdown') ||
    normalized.includes('emergency buffer') ||
    ((normalized.includes('score') || normalized.includes('health') || normalized.includes('rating')) &&
      (normalized.includes('why') ||
        normalized.includes('how') ||
        normalized.includes('improve') ||
        normalized.includes('what') ||
        normalized.includes('low') ||
        normalized.includes('affect') ||
        normalized.includes('hurt') ||
        normalized.includes('boost') ||
        normalized.includes('raise') ||
        normalized.includes('breakdown')));

  if (isFinancialHealthQuery) {
    // Obtain health breakdown from context or compute dynamically
    const health: FinancialHealthResult =
      (context.financialHealth as FinancialHealthResult) ||
      calculateFinancialHealth({
        transactions: (context.recentTransactions as any) || [],
        currency,
        monthlyCap,
        monthlyExpenditure: monthlyAmt,
        dailyLimit,
        spentToday,
        peerBalances: context.peerBalances || [],
        currentSavings: 0,
      });

    // 0A. Empty / Unrated State
    if (!health.hasData || health.score === null) {
      return {
        isQuery: true,
        queryType: 'FINANCIAL_HEALTH_UNRATED',
        calculatedAmount: null,
        reply:
          `Your Financial Health is currently **Unrated** because no transaction activity has been recorded yet. ` +
          `Once you begin recording transactions, your score evaluates 5 core dimensions:\n` +
          `• Monthly Budget Adherence (25 pts)\n` +
          `• Daily Limit Discipline (15 pts)\n` +
          `• Cashflow & Savings Rate (25 pts)\n` +
          `• Debt & Peer Balances (15 pts)\n` +
          `• Emergency Savings Buffer (20 pts)\n\n` +
          `💡 *Try logging an expense like "Spent 250 on lunch" to activate your live score!*`,
      };
    }

    const isWhyLowQuery =
      normalized.includes('why') ||
      normalized.includes('low') ||
      normalized.includes('hurt') ||
      normalized.includes('affect') ||
      normalized.includes('pulling') ||
      normalized.includes('down') ||
      normalized.includes('bad') ||
      normalized.includes('drop');

    const isImproveQuery =
      normalized.includes('improve') ||
      normalized.includes('boost') ||
      normalized.includes('raise') ||
      normalized.includes('better') ||
      normalized.includes('increase') ||
      normalized.includes('grow') ||
      normalized.includes('tip') ||
      normalized.includes('advice');

    // 0B. "Why is my financial health low?" / "What's hurting my score?"
    if (isWhyLowQuery) {
      // Find factors that scored less than full marks
      const underperformingFactors = health.factors
        .filter((f) => f.visible && f.score < f.maxScore)
        .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);

      const weakList = underperformingFactors.length > 0
        ? underperformingFactors
            .map(
              (f) =>
                `• **${f.name}** (${f.score}/${f.maxScore} pts, status: *${f.status}*): ${f.description}`
            )
            .join('\n')
        : `• All factors are currently meeting benchmark thresholds!`;

      return {
        isQuery: true,
        queryType: 'FINANCIAL_HEALTH_DIAGNOSIS',
        calculatedAmount: health.score,
        reply:
          `Your Financial Health Score is currently **${health.score}/100 (${health.label})**.\n\n` +
          `📉 **What is affecting your score**:\n${weakList}\n\n` +
          `💪 **Top Strength**: ${health.strongestFactor.name} (${health.strongestFactor.explanation})\n` +
          `💡 **Action Step**: ${health.actionableSuggestion}`,
      };
    }

    // 0C. "How do I improve my financial score?" / Actionable Advice
    if (isImproveQuery) {
      const topActionSteps: string[] = [];

      for (const f of health.factors) {
        if (f.id === 'daily-discipline' && spentToday > dailyLimit && dailyLimit > 0) {
          topActionSteps.push(`• **Pace Today's Spending**: You've spent ${currency} ${spentToday.toLocaleString()} today against your ${currency} ${dailyLimit.toLocaleString()} limit.`);
        } else if (f.id === 'monthly-budget' && monthlyAmt > monthlyCap && monthlyCap > 0) {
          topActionSteps.push(`• **Cool Down Monthly Run-Rate**: You're at ${currency} ${monthlyAmt.toLocaleString()} of your ${currency} ${monthlyCap.toLocaleString()} monthly cap.`);
        } else if (f.id === 'debt-exposure' && (context.totalIOwe || 0) > (context.totalOwedToYou || 0)) {
          topActionSteps.push(`• **Settle Outstanding Debts**: You currently owe ${currency} ${(context.totalIOwe || 0).toLocaleString()} to friends; settling lowers debt exposure.`);
        } else if (f.id === 'emergency-buffer' && (health.metrics?.monthsBufferCovered ?? 0) < 3) {
          topActionSteps.push(`• **Build Savings Runway**: Strive for 3+ months of expenses in liquid savings (currently at ${health.metrics?.monthsBufferCovered ?? 0} months).`);
        } else if (f.id === 'cashflow-ratio' && (health.metrics?.savingsRate ?? 0) < 0.2) {
          topActionSteps.push(`• **Boost Retained Savings**: Aim to save at least 20% of monthly incoming cashflow.`);
        }
      }

      if (topActionSteps.length === 0) {
        topActionSteps.push(`• Continue keeping daily expenditures below ${currency} ${dailyLimit.toLocaleString()}`);
        topActionSteps.push(`• Maintain your current monthly cap of ${currency} ${monthlyCap.toLocaleString()}`);
      }

      return {
        isQuery: true,
        queryType: 'FINANCIAL_HEALTH_IMPROVEMENT',
        calculatedAmount: health.score,
        reply:
          `To improve your **Financial Score (currently ${health.score}/100 · ${health.label})**, focus on these high-impact priorities:\n\n` +
          topActionSteps.join('\n') +
          `\n\n💡 **Top Recommendation**: ${health.actionableSuggestion}\n` +
          `💪 **Current Pillar of Strength**: ${health.strongestFactor.name} (${health.strongestFactor.explanation})`,
      };
    }

    // 0D. General Financial Health Overview / Breakdown
    const factorList = health.factors
      .filter((f) => f.visible)
      .map((f) => `• **${f.name}**: ${f.score}/${f.maxScore} pts (*${f.status}*) — ${f.description}`)
      .join('\n');

    return {
      isQuery: true,
      queryType: 'FINANCIAL_HEALTH_OVERVIEW',
      calculatedAmount: health.score,
      reply:
        `Your Financial Health Score is **${health.score}/100 (${health.label})**.\n\n` +
        `📊 **Factor Breakdown (100 pts total)**:\n${factorList}\n\n` +
        `💪 **Top Strength**: ${health.strongestFactor.name} (${health.strongestFactor.explanation})\n` +
        `💡 **Key Advice**: ${health.actionableSuggestion}`,
    };
  }
  const isWeeklyQuery =
    normalized.includes('weekly') ||
    normalized.includes('per week') ||
    normalized.includes('a week') ||
    normalized.includes('this week') ||
    (normalized.includes('week') && (normalized.includes('spend') || normalized.includes('expenditure') || normalized.includes('avg') || normalized.includes('average')));

  if (isWeeklyQuery) {
    const avgWeeklySpend = Math.round(monthlyAmt / 4.33);
    const weeklyCap = Math.round(monthlyCap / 4.33);

    // Calculate actual spending in the last 7 days from recent transactions
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const pastWeekTransactions = (context.recentTransactions || []).filter((t) => {
      const txTime = (t as any).timestamp || (t.date ? new Date(t.date).getTime() : 0);
      return txTime >= sevenDaysAgo;
    });
    const pastWeekSpend = pastWeekTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    let weeklyText = `Your estimated **average weekly expenditure is ${currency} ${avgWeeklySpend.toLocaleString()}** (based on your current monthly total of ${currency} ${monthlyAmt.toLocaleString()}).`;
    
    if (pastWeekSpend > 0) {
      weeklyText += ` In the last 7 days, you've recorded ${currency} ${pastWeekSpend.toLocaleString()} in spending.`;
    }
    weeklyText += ` Your recommended weekly budget cap is **${currency} ${weeklyCap.toLocaleString()}** (from your monthly limit of ${currency} ${monthlyCap.toLocaleString()}).`;

    return {
      isQuery: true,
      queryType: 'WEEKLY_EXPENDITURE',
      calculatedAmount: avgWeeklySpend,
      reply: weeklyText,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 2. DAILY / AVERAGE DAILY EXPENDITURE QUERIES
  // ═════════════════════════════════════════════════════════════════════
  const isDailyAverageQuery =
    normalized.includes('avg daily') ||
    normalized.includes('average daily') ||
    normalized.includes('daily average') ||
    normalized.includes('per day') ||
    normalized.includes('a day') ||
    (normalized.includes('daily') && (normalized.includes('expenditure') || normalized.includes('spend') || normalized.includes('average')));

  if (isDailyAverageQuery) {
    const avgDailySpend = Math.round(monthlyAmt / 30);
    return {
      isQuery: true,
      queryType: 'DAILY_AVERAGE_EXPENDITURE',
      calculatedAmount: avgDailySpend,
      reply: `Your **average daily expenditure is ${currency} ${avgDailySpend.toLocaleString()}** based on your monthly spending. Your daily limit target is **${currency} ${dailyLimit.toLocaleString()}**, and today you have spent **${currency} ${spentToday.toLocaleString()}**.`,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 3. TODAY'S SPEND / DAILY BUDGET STATUS
  // ═════════════════════════════════════════════════════════════════════
  if (
    normalized.includes('today') ||
    normalized.includes('over budget') ||
    normalized.includes('left today') ||
    normalized.includes('remaining today') ||
    normalized.includes('daily limit') ||
    normalized.includes('budget status')
  ) {
    const remaining = dailyLimit - spentToday;
    if (remaining < 0) {
      return {
        isQuery: true,
        queryType: 'DAILY_BUDGET',
        calculatedAmount: Math.abs(remaining),
        reply: `You are currently **over your daily budget by ${currency} ${Math.abs(remaining).toLocaleString()}**. You've spent ${currency} ${spentToday.toLocaleString()} today against your daily limit of ${currency} ${dailyLimit.toLocaleString()}.`,
      };
    } else {
      return {
        isQuery: true,
        queryType: 'DAILY_BUDGET',
        calculatedAmount: remaining,
        reply: `You are on track today! You've spent **${currency} ${spentToday.toLocaleString()}** today, with **${currency} ${remaining.toLocaleString()} remaining** from your daily limit of ${currency} ${dailyLimit.toLocaleString()}.`,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // 4. MONTHLY EXPENDITURE & MONTHLY BUDGET QUERIES
  // ═════════════════════════════════════════════════════════════════════
  if (
    normalized.includes('monthly') ||
    normalized.includes('this month') ||
    normalized.includes('expenditure') ||
    normalized.includes('total spend') ||
    normalized.includes('month spend') ||
    normalized.includes('total expenses') ||
    normalized.includes('how much have i spent') ||
    normalized.includes('how much did i spend')
  ) {
    const percentage = monthlyCap > 0 ? Math.round((monthlyAmt / monthlyCap) * 100) : 0;
    const remaining = Math.max(0, monthlyCap - monthlyAmt);

    return {
      isQuery: true,
      queryType: 'MONTHLY_EXPENDITURE',
      calculatedAmount: monthlyAmt,
      reply: `Your total personal expenditure for this month is **${currency} ${monthlyAmt.toLocaleString()}**. You have used **${percentage}%** of your monthly cap (${currency} ${monthlyCap.toLocaleString()}), leaving **${currency} ${remaining.toLocaleString()}** available.`,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 5. CATEGORY SPENDING QUERIES
  // ═════════════════════════════════════════════════════════════════════
  const categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Social', 'Other'];
  for (const cat of categories) {
    if (normalized.includes(cat.toLowerCase())) {
      const catSpend = Number(context.categoryBreakdown?.[cat]) || 0;
      const catPercentage = monthlyAmt > 0 ? Math.round((catSpend / monthlyAmt) * 100) : 0;
      return {
        isQuery: true,
        queryType: 'CATEGORY_SPEND',
        category: cat,
        calculatedAmount: catSpend,
        reply: `You have spent **${currency} ${catSpend.toLocaleString()} on ${cat}** this month (${catPercentage}% of your total monthly spend).`,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // 6. TOP / HIGHEST EXPENSE QUERIES
  // ═════════════════════════════════════════════════════════════════════
  if (
    normalized.includes('highest') ||
    normalized.includes('biggest') ||
    normalized.includes('most spent') ||
    normalized.includes('top category') ||
    normalized.includes('where did i spend')
  ) {
    const breakdown = context.categoryBreakdown || {};
    let topCat = 'Food';
    let topCatAmt = 0;
    for (const [cat, amt] of Object.entries(breakdown)) {
      if (Number(amt) > topCatAmt) {
        topCatAmt = Number(amt);
        topCat = cat;
      }
    }

    const highestTx = (context.recentTransactions || []).reduce<any>((max, tx) => {
      return (Number(tx.amount) || 0) > (Number(max?.amount) || 0) ? tx : max;
    }, null);

    let topText = `Your highest spending category this month is **${topCat}** at **${currency} ${topCatAmt.toLocaleString()}**.`;
    if (highestTx && highestTx.amount > 0) {
      topText += ` Your largest single expense was **${highestTx.merchant}** for **${currency} ${highestTx.amount.toLocaleString()}** (${highestTx.category}).`;
    }
    return {
      isQuery: true,
      queryType: 'TOP_EXPENSE',
      reply: topText,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 7. MONTHLY CAP / LIMIT QUERIES
  // ═════════════════════════════════════════════════════════════════════
  if (normalized.includes('cap') || normalized.includes('limit for month') || normalized.includes('budget limit')) {
    return {
      isQuery: true,
      queryType: 'MONTHLY_CAP',
      calculatedAmount: monthlyCap,
      reply: `Your monthly expenditure cap is set to **${currency} ${monthlyCap.toLocaleString()}**. You've used ${currency} ${monthlyAmt.toLocaleString()}, with **${currency} ${Math.max(0, monthlyCap - monthlyAmt).toLocaleString()}** remaining.`,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 8. PEER BALANCE QUERIES: "I OWE", "OWED TO ME", "NET BALANCE"
  // ═════════════════════════════════════════════════════════════════════
  if (
    normalized.includes('i owe') ||
    normalized.includes('my debt') ||
    normalized.includes('who do i owe') ||
    normalized.includes('what do i owe')
  ) {
    const totalIOwe = context.totalIOwe ?? 0;
    const friends = (context.peerBalances || []).filter((p) => p.type === 'I_OWE' && p.amount > 0);
    if (friends.length === 0 || totalIOwe <= 0) {
      return {
        isQuery: true,
        queryType: 'I_OWE_STATUS',
        calculatedAmount: 0,
        reply: `You do not owe anyone money right now! You are completely settled up 🎉`,
      };
    }
    const details = friends.map((f) => `${f.name}: ${currency} ${f.amount.toLocaleString()}`).join(', ');
    return {
      isQuery: true,
      queryType: 'I_OWE_STATUS',
      calculatedAmount: totalIOwe,
      reply: `You currently owe a total of **${currency} ${totalIOwe.toLocaleString()}** to ${friends.length} friend${friends.length > 1 ? 's' : ''} (${details}).`,
    };
  }

  if (
    normalized.includes('owed to me') ||
    normalized.includes('owed to you') ||
    normalized.includes('who owes me') ||
    normalized.includes('owes me') ||
    normalized.includes('receivable') ||
    normalized.includes('friends owe')
  ) {
    const totalOwedToYou = context.totalOwedToYou ?? 0;
    const friends = (context.peerBalances || []).filter((p) => p.type === 'OWED_TO_YOU' && p.amount > 0);
    if (friends.length === 0 || totalOwedToYou <= 0) {
      return {
        isQuery: true,
        queryType: 'OWED_TO_YOU_STATUS',
        calculatedAmount: 0,
        reply: `No one owes you money right now. All peer balances are fully settled!`,
      };
    }
    const details = friends.map((f) => `${f.name}: ${currency} ${f.amount.toLocaleString()}`).join(', ');
    return {
      isQuery: true,
      queryType: 'OWED_TO_YOU_STATUS',
      calculatedAmount: totalOwedToYou,
      reply: `Friends currently owe you a total of **${currency} ${totalOwedToYou.toLocaleString()}** (${details}).`,
    };
  }

  if (
    normalized.includes('net balance') ||
    normalized.includes('peer balance') ||
    normalized.includes('split status') ||
    normalized.includes('split') ||
    normalized.includes('friends')
  ) {
    const owed = context.totalOwedToYou ?? 0;
    const owe = context.totalIOwe ?? 0;
    const net = owed - owe;
    const sign = net >= 0 ? '+' : '-';
    return {
      isQuery: true,
      queryType: 'PEER_NET_BALANCE',
      calculatedAmount: net,
      reply: `Your peer net balance is **${sign}${currency} ${Math.abs(net).toLocaleString()}** (${currency} ${owed.toLocaleString()} owed to you, and ${currency} ${owe.toLocaleString()} you owe).`,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 9. RECENT TRANSACTIONS / HISTORY
  // ═════════════════════════════════════════════════════════════════════
  if (
    normalized.includes('recent') ||
    normalized.includes('history') ||
    normalized.includes('last transactions') ||
    normalized.includes('latest expense')
  ) {
    const txs = (context.recentTransactions || []).filter((t) => t.amount > 0);
    if (txs.length === 0) {
      return {
        isQuery: true,
        queryType: 'RECENT_TRANSACTIONS',
        reply: `You have no recorded transactions yet this month.`,
      };
    }
    const list = txs
      .slice(0, 4)
      .map((t) => `${t.merchant}: ${currency} ${t.amount.toLocaleString()} (${t.category})`)
      .join(', ');
    return {
      isQuery: true,
      queryType: 'RECENT_TRANSACTIONS',
      reply: `Your recent transactions include: ${list}.`,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 10. GENERAL FINANCIAL OVERVIEW / SUMMARY FALLBACK
  // ═════════════════════════════════════════════════════════════════════
  if (
    normalized.includes('summary') ||
    normalized.includes('overview') ||
    normalized.includes('financial') ||
    normalized.includes('status') ||
    normalized.includes('budget')
  ) {
    return {
      isQuery: true,
      queryType: 'GENERAL_OVERVIEW',
      calculatedAmount: monthlyAmt,
      reply: `📊 **Financial Summary**:\n• Monthly Spend: ${currency} ${monthlyAmt.toLocaleString()} / ${currency} ${monthlyCap.toLocaleString()} cap\n• Spent Today: ${currency} ${spentToday.toLocaleString()} (Limit: ${currency} ${dailyLimit.toLocaleString()})\n• Peer Balance: ${currency} ${(context.totalOwedToYou || 0).toLocaleString()} owed to you, ${currency} ${(context.totalIOwe || 0).toLocaleString()} you owe.`,
    };
  }

  return {
    isQuery: false,
    reply: '',
  };
}
