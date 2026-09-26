import { Category, PeerBalance, Transaction } from '../types.js';

export type HealthStatusLevel =
  | 'Poor'
  | 'Fair'
  | 'Good'
  | 'Excellent'
  | 'Low'
  | 'Moderate'
  | 'High'
  | 'Healthy'
  | 'At Risk'
  | 'Manageable'
  | 'Concerning'
  | 'Critical'
  | 'No Data'
  | 'Not Set'
  | 'Awaiting Data';

export interface HealthFactor {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: HealthStatusLevel;
  statusType: 'success' | 'warning' | 'danger' | 'info';
  description: string;
  visible: boolean;
}

export type FinancialHealthLabel = 'Unrated' | 'Needs Attention' | 'Fair' | 'Good' | 'Excellent';

export interface FinancialHealthResult {
  score: number | null;
  hasData: boolean;
  label: FinancialHealthLabel;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  factors: HealthFactor[];
  strongestFactor: {
    name: string;
    explanation: string;
  };
  weakestFactor: {
    name: string;
    explanation: string;
  };
  actionableSuggestion: string;
  emptyStateMessage?: string;
  metrics: {
    totalIncome: number;
    totalExpenses: number;
    monthlyExpenses: number;
    monthlyCap: number;
    dailyLimit: number;
    spentToday: number;
    savingsBuffer: number;
    monthsBufferCovered: number;
    debtExposureRatio: number;
    recurringBillsRatio: number;
    savingsRate: number;
    totalOwedToYou: number;
    totalIOwe: number;
    netPeerBalance: number;
  };
}

export interface FinancialHealthInput {
  transactions: Transaction[];
  monthlyCap?: number;
  monthlyExpenditure?: number;
  dailyLimit?: number;
  spentToday?: number;
  peerBalances?: PeerBalance[];
  currency?: string;
  currentSavings?: number;
}

/**
 * Computes a comprehensive Financial Health Score (0-100) derived
 * ENTIRELY from real budget data:
 *
 * 1. Monthly Budget Adherence (25 pts): monthly expenditure vs monthly budget cap
 * 2. Daily Limit Discipline (15 pts): today's spend vs configured daily limit
 * 3. Cashflow & Savings Rate (25 pts): ratio of real income vs real expenses
 * 4. Debt & Peer Balances (15 pts): money owed to others vs receivables & net debt
 * 5. Emergency Savings Buffer (20 pts): liquid savings vs monthly benchmark expenditure
 *
 * ZERO-TRANSACTION RULE:
 * If an account has 0 recorded transactions, it is NOT scored as "Low" or "Poor".
 * Financial health requires actual financial velocity (income & expenses) to measure.
 * Without transactions, the state is strictly `Unrated` (neutral slate, score null,
 * with clear guidance on logging the first transaction).
 */
export function calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthResult {
  const {
    transactions = [],
    monthlyCap = 0,
    monthlyExpenditure = 0,
    dailyLimit = 0,
    spentToday = 0,
    peerBalances = [],
  } = input;

  // 1. Calculate Real Income, Expenses, and Recurring Bills
  let totalIncome = 0;
  let totalExpenses = 0;
  let recurringBills = 0;

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let recentDebitSum = 0;
  let recentCreditSum = 0;

  for (const tx of transactions) {
    if (!tx || typeof tx.amount !== 'number' || tx.amount <= 0) continue;
    const isRecent = now - tx.timestamp <= thirtyDaysMs;

    if (tx.type === 'CREDIT') {
      totalIncome += tx.amount;
      if (isRecent) recentCreditSum += tx.amount;
    } else {
      totalExpenses += tx.amount;
      if (isRecent) recentDebitSum += tx.amount;
      if (tx.category === 'Bills') {
        recurringBills += tx.amount;
      }
    }
  }

  // 2. Real Peer Balances (Receivables & Liabilities)
  let totalOwedToYou = 0;
  let totalIOwe = 0;
  let oldestLentAgeDays = 0;

  for (const peer of peerBalances) {
    if (!peer || typeof peer.amount !== 'number') continue;
    if (peer.type === 'OWED_TO_YOU') {
      totalOwedToYou += peer.amount;
      if (peer.items && peer.items.length > 0) {
        for (const item of peer.items) {
          const itemAge = Math.floor((now - (item.date || peer.updatedAt || now)) / (24 * 60 * 60 * 1000));
          if (itemAge > oldestLentAgeDays) oldestLentAgeDays = itemAge;
        }
      }
    } else {
      totalIOwe += peer.amount;
    }
  }
  const netPeerBalance = totalOwedToYou - totalIOwe;

  // 3. Real Savings Buffer
  const currentSavings = input.currentSavings !== undefined
    ? input.currentSavings
    : Math.max(0, totalIncome - totalExpenses);

  // 4. Fundamental check: Without transactions, financial health CANNOT be evaluated
  const hasTransactions = transactions.length > 0;

  // -------------------------------------------------------------
  // UNRATED / ZERO-TRANSACTIONS STATE
  // When no transactions are noted, we DO NOT penalize the user or show "Low"!
  // It is labeled "Unrated" with clean neutral informational factors.
  // -------------------------------------------------------------
  if (!hasTransactions) {
    return {
      score: null,
      hasData: false,
      label: 'Unrated',
      color: '#64748B', // Neutral Slate-500
      textColor: 'text-slate-600 dark:text-slate-300',
      bgColor: 'bg-slate-100 dark:bg-slate-800/80',
      borderColor: 'border-slate-300 dark:border-slate-700',
      factors: [
        {
          id: 'monthly-budget',
          name: 'Monthly budget adherence',
          score: 0,
          maxScore: 25,
          status: monthlyCap > 0 ? 'Awaiting Data' : 'Not Set',
          statusType: 'info',
          description: monthlyCap > 0 ? `Cap set to ₹${monthlyCap.toLocaleString()} · Log expenses to track` : 'Configure your monthly cap in settings',
          visible: true,
        },
        {
          id: 'daily-discipline',
          name: 'Daily spending discipline',
          score: 0,
          maxScore: 15,
          status: dailyLimit > 0 ? 'Awaiting Data' : 'Not Set',
          statusType: 'info',
          description: dailyLimit > 0 ? `Limit set to ₹${dailyLimit.toLocaleString()} · Log expenses to track` : 'Configure your daily limit in settings',
          visible: true,
        },
        {
          id: 'cashflow-ratio',
          name: 'Cashflow & savings rate',
          score: 0,
          maxScore: 25,
          status: 'Awaiting Data',
          statusType: 'info',
          description: 'Log your income & expense transactions to measure savings rate',
          visible: true,
        },
        {
          id: 'debt-exposure',
          name: 'Debt & peer liabilities',
          score: 0,
          maxScore: 15,
          status: totalIOwe > 0 ? 'Manageable' : 'Healthy',
          statusType: totalIOwe > 0 ? 'warning' : 'info',
          description: totalIOwe > 0 ? `₹${totalIOwe.toLocaleString()} peer debt recorded` : 'No outstanding liabilities logged',
          visible: true,
        },
        {
          id: 'emergency-buffer',
          name: 'Emergency savings buffer',
          score: 0,
          maxScore: 20,
          status: currentSavings > 0 ? 'Awaiting Data' : 'Awaiting Data',
          statusType: 'info',
          description: currentSavings > 0 ? `₹${currentSavings.toLocaleString()} savings logged · Log expenses to calculate coverage` : 'Record savings in the Savings tab to track buffer',
          visible: true,
        },
      ],
      strongestFactor: {
        name: 'Awaiting First Transaction',
        explanation: 'Financial health is evaluated from your live spending, savings rate, and budget discipline once you log transactions.',
      },
      weakestFactor: {
        name: 'No Transactions Noted',
        explanation: 'Your score is unrated because no financial activity has been recorded yet.',
      },
      actionableSuggestion: 'Log your first expense or income transaction to unlock your live Financial Health score.',
      emptyStateMessage: 'No transactions noted yet. As you log your daily spending and income, Budget Bridge will evaluate your spending discipline, savings rate, and financial health.',
      metrics: {
        totalIncome: 0,
        totalExpenses: 0,
        monthlyExpenses: 0,
        monthlyCap,
        dailyLimit,
        spentToday: 0,
        savingsBuffer: currentSavings,
        monthsBufferCovered: 0,
        debtExposureRatio: 0,
        recurringBillsRatio: 0,
        savingsRate: 0,
        totalOwedToYou,
        totalIOwe,
        netPeerBalance,
      },
    };
  }

  // -------------------------------------------------------------
  // REAL FACTOR 1: Monthly Budget Adherence (25 pts)
  // Compares real monthly expenditure against configured monthly cap
  // -------------------------------------------------------------
  let budgetScore = 15;
  let budgetStatus: HealthStatusLevel = 'Good';
  let budgetStatusType: 'success' | 'warning' | 'danger' | 'info' = 'success';
  let budgetDesc = '';

  if (monthlyCap > 0) {
    const spendRatio = monthlyExpenditure / monthlyCap;
    if (spendRatio <= 0.70) {
      budgetScore = 25;
      budgetStatus = 'Excellent';
      budgetStatusType = 'success';
      budgetDesc = `${Math.round(spendRatio * 100)}% of monthly budget used`;
    } else if (spendRatio <= 0.90) {
      budgetScore = 20;
      budgetStatus = 'Good';
      budgetStatusType = 'success';
      budgetDesc = `${Math.round(spendRatio * 100)}% of monthly budget used`;
    } else if (spendRatio <= 1.00) {
      budgetScore = 14;
      budgetStatus = 'Fair';
      budgetStatusType = 'warning';
      budgetDesc = `${Math.round(spendRatio * 100)}% of budget reached (tight)`;
    } else if (spendRatio <= 1.15) {
      budgetScore = 6;
      budgetStatus = 'Concerning';
      budgetStatusType = 'danger';
      budgetDesc = `Over monthly budget by ${Math.round((spendRatio - 1) * 100)}%`;
    } else {
      budgetScore = 0;
      budgetStatus = 'Critical';
      budgetStatusType = 'danger';
      budgetDesc = `Over monthly budget by ${Math.round((spendRatio - 1) * 100)}%`;
    }
  } else {
    // No monthly cap configured
    if (totalIncome > 0 && totalExpenses > 0) {
      const incRatio = totalExpenses / totalIncome;
      if (incRatio <= 0.70) {
        budgetScore = 18;
        budgetStatus = 'Good';
        budgetStatusType = 'success';
        budgetDesc = 'Spending within income (no cap set)';
      } else if (incRatio <= 1.00) {
        budgetScore = 12;
        budgetStatus = 'Fair';
        budgetStatusType = 'warning';
        budgetDesc = 'Spending near 100% of income (no cap set)';
      } else {
        budgetScore = 4;
        budgetStatus = 'Concerning';
        budgetStatusType = 'danger';
        budgetDesc = 'Spending exceeds income (no cap set)';
      }
    } else if (totalExpenses > 0) {
      budgetScore = 12;
      budgetStatus = 'Fair';
      budgetStatusType = 'warning';
      budgetDesc = 'No monthly budget cap set in Settings';
    } else {
      budgetScore = 15;
      budgetStatus = 'Good';
      budgetStatusType = 'success';
      budgetDesc = 'Zero expenses logged';
    }
  }

  // -------------------------------------------------------------
  // REAL FACTOR 2: Daily Budget Discipline (15 pts)
  // Evaluates today's spending against configured daily limit
  // -------------------------------------------------------------
  let dailyScore = 10;
  let dailyStatus: HealthStatusLevel = 'Good';
  let dailyStatusType: 'success' | 'warning' | 'danger' | 'info' = 'success';
  let dailyDesc = '';

  if (dailyLimit > 0) {
    const dailyRatio = spentToday / dailyLimit;
    if (dailyRatio <= 0.80) {
      dailyScore = 15;
      dailyStatus = 'Excellent';
      dailyStatusType = 'success';
      dailyDesc = `${Math.round(dailyRatio * 100)}% of daily limit spent today`;
    } else if (dailyRatio <= 1.00) {
      dailyScore = 12;
      dailyStatus = 'Good';
      dailyStatusType = 'success';
      dailyDesc = `${Math.round(dailyRatio * 100)}% of daily limit spent today`;
    } else if (dailyRatio <= 1.25) {
      dailyScore = 6;
      dailyStatus = 'Moderate';
      dailyStatusType = 'warning';
      dailyDesc = `Over daily limit by ${Math.round((dailyRatio - 1) * 100)}%`;
    } else {
      dailyScore = 2;
      dailyStatus = 'High';
      dailyStatusType = 'danger';
      dailyDesc = `Over daily limit by ${Math.round((dailyRatio - 1) * 100)}%`;
    }
  } else {
    // No daily limit set: check implied daily pace against monthly cap
    if (monthlyCap > 0) {
      const benchmarkDailyPace = monthlyCap / 30;
      const impliedRatio = spentToday / (benchmarkDailyPace || 1);
      if (impliedRatio <= 1.0) {
        dailyScore = 12;
        dailyStatus = 'Good';
        dailyStatusType = 'success';
        dailyDesc = 'Within estimated daily pace';
      } else {
        dailyScore = 6;
        dailyStatus = 'Moderate';
        dailyStatusType = 'warning';
        dailyDesc = 'Above estimated daily pace';
      }
    } else {
      dailyScore = 10;
      dailyStatus = 'Fair';
      dailyStatusType = 'info';
      dailyDesc = 'No daily limit configured';
    }
  }

  // -------------------------------------------------------------
  // REAL FACTOR 3: Cashflow & Savings Rate (25 pts)
  // Based on real income vs real expenses from transactions
  // -------------------------------------------------------------
  let cashflowScore = 15;
  let cashflowStatus: HealthStatusLevel = 'Fair';
  let cashflowStatusType: 'success' | 'warning' | 'danger' | 'info' = 'warning';
  let cashflowDesc = '';
  let savingsRate = 0;

  if (totalIncome > 0) {
    const netCashflow = totalIncome - totalExpenses;
    savingsRate = netCashflow / totalIncome;

    if (savingsRate >= 0.30) {
      cashflowScore = 25;
      cashflowStatus = 'Excellent';
      cashflowStatusType = 'success';
      cashflowDesc = `${Math.round(savingsRate * 100)}% net savings retained`;
    } else if (savingsRate >= 0.15) {
      cashflowScore = 20;
      cashflowStatus = 'Good';
      cashflowStatusType = 'success';
      cashflowDesc = `${Math.round(savingsRate * 100)}% net savings retained`;
    } else if (savingsRate >= 0.05) {
      cashflowScore = 14;
      cashflowStatus = 'Fair';
      cashflowStatusType = 'warning';
      cashflowDesc = `${Math.round(savingsRate * 100)}% savings rate (tight cushion)`;
    } else if (savingsRate >= 0.00) {
      cashflowScore = 8;
      cashflowStatus = 'Low';
      cashflowStatusType = 'warning';
      cashflowDesc = `${Math.round(savingsRate * 100)}% living paycheck-to-paycheck`;
    } else {
      cashflowScore = 2;
      cashflowStatus = 'Poor';
      cashflowStatusType = 'danger';
      cashflowDesc = `Deficit: spending exceeds income by ${Math.abs(Math.round(savingsRate * 100))}%`;
    }
  } else {
    // Transactions exist, but user hasn't logged an income transaction yet
    if (monthlyCap > 0 && monthlyExpenditure <= monthlyCap) {
      cashflowScore = 16;
      cashflowStatus = 'Fair';
      cashflowStatusType = 'info';
      cashflowDesc = 'Tracking within cap · Log income to calculate savings rate';
    } else if (totalExpenses > 0) {
      cashflowScore = 12;
      cashflowStatus = 'Fair';
      cashflowStatusType = 'info';
      cashflowDesc = 'Log your income to calculate net savings rate';
    } else {
      cashflowScore = 15;
      cashflowStatus = 'Fair';
      cashflowStatusType = 'info';
      cashflowDesc = 'Awaiting income transactions';
    }
  }

  // -------------------------------------------------------------
  // REAL FACTOR 4: Debt Exposure & Peer Balances (15 pts)
  // Evaluates money you owe others vs money owed to you
  // -------------------------------------------------------------
  let debtScore = 15;
  let debtStatus: HealthStatusLevel = 'Healthy';
  let debtStatusType: 'success' | 'warning' | 'danger' | 'info' = 'success';
  let debtDesc = '';
  let debtExposureRatio = 0;

  const debtBenchmark = Math.max(totalIncome, monthlyCap, monthlyExpenditure, 5000);
  debtExposureRatio = totalIOwe / debtBenchmark;

  if (totalIOwe === 0 && totalOwedToYou === 0) {
    debtScore = 15;
    debtStatus = 'Healthy';
    debtStatusType = 'success';
    debtDesc = 'Zero peer debt or liabilities';
  } else if (totalIOwe === 0 && totalOwedToYou > 0) {
    debtScore = 15;
    debtStatus = 'Healthy';
    debtStatusType = 'success';
    debtDesc = `₹${totalOwedToYou.toLocaleString()} owed to you · Zero debts`;
  } else {
    // User owes money
    if (netPeerBalance >= 0) {
      debtScore = 12;
      debtStatus = 'Manageable';
      debtStatusType = 'success';
      debtDesc = `Net positive debt balance (+₹${netPeerBalance.toLocaleString()})`;
    } else if (debtExposureRatio <= 0.15) {
      debtScore = 11;
      debtStatus = 'Manageable';
      debtStatusType = 'warning';
      debtDesc = `₹${totalIOwe.toLocaleString()} owed (${Math.round(debtExposureRatio * 100)}% of monthly capacity)`;
    } else if (debtExposureRatio <= 0.35) {
      debtScore = 6;
      debtStatus = 'Concerning';
      debtStatusType = 'danger';
      debtDesc = `₹${totalIOwe.toLocaleString()} owed (${Math.round(debtExposureRatio * 100)}% of monthly capacity)`;
    } else {
      debtScore = 2;
      debtStatus = 'At Risk';
      debtStatusType = 'danger';
      debtDesc = `High debt: ₹${totalIOwe.toLocaleString()} outstanding`;
    }
  }

  // -------------------------------------------------------------
  // REAL FACTOR 5: Emergency Savings Buffer (20 pts)
  // Evaluates real liquid savings against real monthly baseline expense
  // -------------------------------------------------------------
  let emergencyScore = 10;
  let emergencyStatus: HealthStatusLevel = 'Fair';
  let emergencyStatusType: 'success' | 'warning' | 'danger' | 'info' = 'warning';
  let emergencyDesc = '';

  const effectiveMonthlyExpense = Math.max(
    monthlyExpenditure,
    monthlyCap > 0 ? monthlyCap : 0,
    totalExpenses > 0 ? totalExpenses : 0
  );

  const monthsBufferCovered = effectiveMonthlyExpense > 0
    ? Math.round((currentSavings / effectiveMonthlyExpense) * 10) / 10
    : (currentSavings > 0 ? 1 : 0);

  if (currentSavings === 0) {
    emergencyScore = 6;
    emergencyStatus = 'Fair';
    emergencyStatusType = 'warning';
    emergencyDesc = '0 liquid savings logged in Savings tab';
  } else if (monthsBufferCovered >= 3.0) {
    emergencyScore = 20;
    emergencyStatus = 'Excellent';
    emergencyStatusType = 'success';
    emergencyDesc = `${monthsBufferCovered} mo. expenses covered`;
  } else if (monthsBufferCovered >= 1.5) {
    emergencyScore = 15;
    emergencyStatus = 'Good';
    emergencyStatusType = 'success';
    emergencyDesc = `${monthsBufferCovered} mo. expenses covered`;
  } else if (monthsBufferCovered >= 0.5) {
    emergencyScore = 10;
    emergencyStatus = 'Fair';
    emergencyStatusType = 'warning';
    emergencyDesc = `${monthsBufferCovered} mo. expenses covered`;
  } else {
    emergencyScore = 6;
    emergencyStatus = 'Fair';
    emergencyStatusType = 'warning';
    emergencyDesc = `${monthsBufferCovered} mo. expenses covered (< 15 days)`;
  }

  // Recurring bills ratio metric
  const recurringBillsRatio = totalIncome > 0
    ? recurringBills / totalIncome
    : (effectiveMonthlyExpense > 0 ? recurringBills / effectiveMonthlyExpense : 0);

  // Total sum of all 5 factors (0 - 100)
  const rawScore = budgetScore + dailyScore + cashflowScore + debtScore + emergencyScore;
  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Score label and theme colors based on real calculated score
  let label: FinancialHealthLabel = 'Good';
  let color = '#10B981'; // Emerald
  let textColor = 'text-emerald-700 dark:text-emerald-400';
  let bgColor = 'bg-emerald-500/10';
  let borderColor = 'border-emerald-500/30';

  if (finalScore >= 80) {
    label = 'Excellent';
    color = '#10B981';
    textColor = 'text-emerald-600 dark:text-emerald-400';
    bgColor = 'bg-emerald-500/15';
    borderColor = 'border-emerald-500/40';
  } else if (finalScore >= 65) {
    label = 'Good';
    color = '#0D9488';
    textColor = 'text-teal-600 dark:text-teal-400';
    bgColor = 'bg-teal-500/15';
    borderColor = 'border-teal-500/40';
  } else if (finalScore >= 50) {
    label = 'Fair';
    color = '#F59E0B';
    textColor = 'text-amber-600 dark:text-amber-400';
    bgColor = 'bg-amber-500/15';
    borderColor = 'border-amber-500/40';
  } else {
    label = 'Needs Attention';
    color = '#EF4444';
    textColor = 'text-rose-600 dark:text-rose-400';
    bgColor = 'bg-rose-500/15';
    borderColor = 'border-rose-500/40';
  }

  // 5 Real Factor Rows
  const factors: HealthFactor[] = [
    {
      id: 'monthly-budget',
      name: 'Monthly budget adherence',
      score: budgetScore,
      maxScore: 25,
      status: budgetStatus,
      statusType: budgetStatusType,
      description: budgetDesc,
      visible: true,
    },
    {
      id: 'daily-discipline',
      name: 'Daily spending discipline',
      score: dailyScore,
      maxScore: 15,
      status: dailyStatus,
      statusType: dailyStatusType,
      description: dailyDesc,
      visible: true,
    },
    {
      id: 'cashflow-ratio',
      name: 'Cashflow & savings rate',
      score: cashflowScore,
      maxScore: 25,
      status: cashflowStatus,
      statusType: cashflowStatusType,
      description: cashflowDesc,
      visible: true,
    },
    {
      id: 'debt-exposure',
      name: 'Debt & peer liabilities',
      score: debtScore,
      maxScore: 15,
      status: debtStatus,
      statusType: debtStatusType,
      description: debtDesc,
      visible: true,
    },
    {
      id: 'emergency-buffer',
      name: 'Emergency savings buffer',
      score: emergencyScore,
      maxScore: 20,
      status: emergencyStatus,
      statusType: emergencyStatusType,
      description: emergencyDesc,
      visible: true,
    },
  ];

  // Determine Strongest and Weakest Factor
  const visibleFactors = factors.filter((f) => f.visible);
  const sortedFactors = [...visibleFactors].sort((a, b) => {
    const ratioA = a.score / a.maxScore;
    const ratioB = b.score / b.maxScore;
    return ratioB - ratioA;
  });

  const best = sortedFactors[0];
  const worst = sortedFactors[sortedFactors.length - 1];

  // Dynamic explanations based on real user numbers
  const factorExplanations: Record<string, { good: string; bad: string; tip: string }> = {
    'monthly-budget': {
      good: monthlyCap > 0
        ? `Your spending is strictly within your monthly cap of ₹${monthlyCap.toLocaleString()}, giving you healthy fiscal discipline.`
        : 'Your spending is disciplined relative to your logged income.',
      bad: monthlyCap > 0
        ? `Monthly spending has exceeded or is nearing your ₹${monthlyCap.toLocaleString()} budget cap.`
        : 'You do not have a monthly budget cap configured in Settings.',
      tip: monthlyCap > 0
        ? 'Trim discretionary purchases for the rest of the month to stay within your budget cap.'
        : 'Set a monthly budget cap in Settings to prevent unintentional overspending.',
    },
    'daily-discipline': {
      good: dailyLimit > 0
        ? `Today's spend is well within your daily limit of ₹${dailyLimit.toLocaleString()}.`
        : 'Your daily spending velocity is consistent and controlled.',
      bad: dailyLimit > 0
        ? `Today's spend has crossed your daily limit of ₹${dailyLimit.toLocaleString()}.`
        : 'No daily limit set; daily spikes could impact your monthly targets.',
      tip: 'Configure a daily limit in Settings to pace your daily spending smoothly.',
    },
    'cashflow-ratio': {
      good: totalIncome > 0
        ? `You retain approximately ${Math.round(savingsRate * 100)}% of your income after covering all expenses.`
        : 'Your expenditure is controlled.',
      bad: totalIncome > 0
        ? `Your net savings rate is tight (${Math.round(savingsRate * 100)}%) or in deficit relative to expenses.`
        : 'Log your salary or income transactions to calculate your exact savings rate.',
      tip: totalIncome > 0
        ? 'Aim to save at least 20% of your net monthly income by automating transfers on payday.'
        : 'Log your monthly income transactions so the app can measure your real savings rate.',
    },
    'debt-exposure': {
      good: totalIOwe === 0
        ? 'You have zero peer debt or outstanding borrowings, keeping your liabilities clean.'
        : 'Your peer debt is small and easily covered by receivables or cashflow.',
      bad: `You have ₹${totalIOwe.toLocaleString()} in peer debt to repay, which tightens your disposable cash.`,
      tip: 'Prioritize clearing outstanding peer debts to remove liabilities and improve your score.',
    },
    'emergency-buffer': {
      good: `Your savings buffer covers ${monthsBufferCovered} months of expenses, safeguarding you against emergencies.`,
      bad: currentSavings === 0
        ? 'You have 0 emergency savings recorded in the Savings tab.'
        : `Your emergency buffer covers only ${monthsBufferCovered} months of expenses (< 3 months benchmark).`,
      tip: 'Log or transfer funds into your emergency savings until you accumulate at least 3 months of expenses.',
    },
  };

  const strongestExp = factorExplanations[best.id] || {
    good: `${best.name} is performing well and boosting your overall score.`,
    bad: '',
    tip: '',
  };

  const weakestExp = factorExplanations[worst.id] || {
    good: '',
    bad: `${worst.name} is the primary factor limiting your financial health score right now.`,
    tip: 'Focus on balancing income versus discretionary expenses.',
  };

  return {
    score: finalScore,
    hasData: true,
    label,
    color,
    textColor,
    bgColor,
    borderColor,
    factors,
    strongestFactor: {
      name: best.name,
      explanation: strongestExp.good,
    },
    weakestFactor: {
      name: worst.name,
      explanation: weakestExp.bad,
    },
    actionableSuggestion: weakestExp.tip,
    metrics: {
      totalIncome,
      totalExpenses,
      monthlyExpenses: effectiveMonthlyExpense,
      monthlyCap,
      dailyLimit,
      spentToday,
      savingsBuffer: currentSavings,
      monthsBufferCovered,
      debtExposureRatio,
      recurringBillsRatio,
      savingsRate,
      totalOwedToYou,
      totalIOwe,
      netPeerBalance,
    },
  };
}
