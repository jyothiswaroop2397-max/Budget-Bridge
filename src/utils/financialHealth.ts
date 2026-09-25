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
  | 'Concerning';

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

export interface FinancialHealthResult {
  score: number;
  label: 'Needs Attention' | 'Fair' | 'Good' | 'Excellent';
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
  metrics: {
    totalIncome: number;
    totalExpenses: number;
    monthlyExpenses: number;
    savingsBuffer: number;
    monthsBufferCovered: number;
    debtExposureRatio: number;
    recurringBillsRatio: number;
    savingsRate: number;
    totalOwedToYou: number;
    totalIOwe: number;
  };
}

export interface FinancialHealthInput {
  transactions: Transaction[];
  monthlyCap?: number;
  monthlyExpenditure?: number;
  peerBalances?: PeerBalance[];
  currency?: string;
  currentSavings?: number;
}

/**
 * Computes a comprehensive Financial Health Score (0-100)
 * based on emergency buffer, debt exposure, recurring commitments,
 * savings consistency, and peer lending/borrowing data.
 */
export function calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthResult {
  const {
    transactions = [],
    monthlyCap = 0,
    monthlyExpenditure = 0,
    peerBalances = [],
  } = input;

  // 1. Calculate Income & Expenses from Transactions
  let totalIncome = 0;
  let totalExpenses = 0;
  let recurringBills = 0;

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let recentDebitSum = 0;
  let recentCreditSum = 0;

  for (const tx of transactions) {
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

  // Monthly benchmark: use 30-day spend, monthly expenditure, or budget cap
  const benchmarkMonthlyExpense = Math.max(
    recentDebitSum,
    monthlyExpenditure,
    monthlyCap > 0 ? monthlyCap * 0.7 : 0,
    1000
  );

  const benchmarkMonthlyIncome = Math.max(
    recentCreditSum,
    totalIncome > 0 ? totalIncome : 0,
    monthlyCap > 0 ? monthlyCap * 1.2 : 0,
    benchmarkMonthlyExpense * 1.15
  );

  // Derive savings buffer: unspent income or provided savings
  const calculatedSavings = Math.max(0, totalIncome - totalExpenses);
  const currentSavings = input.currentSavings !== undefined
    ? input.currentSavings
    : (calculatedSavings > 0 ? calculatedSavings : Math.max(0, (monthlyCap - monthlyExpenditure) * 1.5));

  const monthsBufferCovered = benchmarkMonthlyExpense > 0
    ? Math.round((currentSavings / benchmarkMonthlyExpense) * 10) / 10
    : 0;

  // Peer debt balances
  let totalOwedToYou = 0;
  let totalIOwe = 0;
  let oldestLentAgeDays = 0;

  for (const peer of peerBalances) {
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

  // -------------------------------------------------------------
  // FACTOR 1: Emergency Buffer (20 pts)
  // Based on months of expenses covered by current savings
  // -------------------------------------------------------------
  let emergencyScore = 5;
  let emergencyStatus: HealthStatusLevel = 'Poor';
  let emergencyStatusType: 'success' | 'warning' | 'danger' | 'info' = 'danger';

  if (monthsBufferCovered >= 3) {
    emergencyScore = 20;
    emergencyStatus = 'Excellent';
    emergencyStatusType = 'success';
  } else if (monthsBufferCovered >= 1.5) {
    emergencyScore = 15;
    emergencyStatus = 'Good';
    emergencyStatusType = 'success';
  } else if (monthsBufferCovered >= 0.5) {
    emergencyScore = 10;
    emergencyStatus = 'Fair';
    emergencyStatusType = 'warning';
  } else {
    emergencyScore = 5;
    emergencyStatus = 'Poor';
    emergencyStatusType = 'danger';
  }

  // -------------------------------------------------------------
  // FACTOR 2: Debt Exposure (20 pts)
  // Based on debt-to-income ratio (money you owe vs benchmark income)
  // -------------------------------------------------------------
  const debtExposureRatio = benchmarkMonthlyIncome > 0
    ? totalIOwe / benchmarkMonthlyIncome
    : 0;

  let debtScore = 20;
  let debtStatus: HealthStatusLevel = 'Low';
  let debtStatusType: 'success' | 'warning' | 'danger' | 'info' = 'success';

  if (debtExposureRatio <= 0.10) {
    debtScore = 20;
    debtStatus = 'Low';
    debtStatusType = 'success';
  } else if (debtExposureRatio <= 0.30) {
    debtScore = 13;
    debtStatus = 'Moderate';
    debtStatusType = 'warning';
  } else {
    debtScore = 5;
    debtStatus = 'High';
    debtStatusType = 'danger';
  }

  // -------------------------------------------------------------
  // FACTOR 3: Recurring Commitments (15 pts)
  // Based on % of income tied to recurring bills
  // -------------------------------------------------------------
  const recurringBillsRatio = benchmarkMonthlyIncome > 0
    ? recurringBills / benchmarkMonthlyIncome
    : 0;

  let recurringScore = 15;
  let recurringStatus: HealthStatusLevel = 'Low';
  let recurringStatusType: 'success' | 'warning' | 'danger' | 'info' = 'success';

  if (recurringBillsRatio <= 0.20) {
    recurringScore = 15;
    recurringStatus = 'Low';
    recurringStatusType = 'success';
  } else if (recurringBillsRatio <= 0.40) {
    recurringScore = 10;
    recurringStatus = 'Moderate';
    recurringStatusType = 'warning';
  } else {
    recurringScore = 4;
    recurringStatus = 'High';
    recurringStatusType = 'danger';
  }

  // -------------------------------------------------------------
  // FACTOR 4: Savings Consistency / Rate (20 pts)
  // Based on how much and regularly savings are retained
  // -------------------------------------------------------------
  const savingsRate = benchmarkMonthlyIncome > 0
    ? Math.max(0, (benchmarkMonthlyIncome - benchmarkMonthlyExpense) / benchmarkMonthlyIncome)
    : 0.1;

  let savingsScore = 10;
  let savingsStatus: HealthStatusLevel = 'Fair';
  let savingsStatusType: 'success' | 'warning' | 'danger' | 'info' = 'warning';

  if (savingsRate >= 0.25) {
    savingsScore = 20;
    savingsStatus = 'Excellent';
    savingsStatusType = 'success';
  } else if (savingsRate >= 0.15) {
    savingsScore = 15;
    savingsStatus = 'Good';
    savingsStatusType = 'success';
  } else if (savingsRate >= 0.05) {
    savingsScore = 10;
    savingsStatus = 'Fair';
    savingsStatusType = 'warning';
  } else {
    savingsScore = 4;
    savingsStatus = 'Poor';
    savingsStatusType = 'danger';
  }

  // -------------------------------------------------------------
  // FACTOR 5: Money Owed to You (10 pts)
  // Only shown if lending data exists
  // -------------------------------------------------------------
  const hasLendingData = totalOwedToYou > 0;
  let owedToYouScore = 10;
  let owedToYouStatus: HealthStatusLevel = 'Healthy';
  let owedToYouStatusType: 'success' | 'warning' | 'danger' | 'info' = 'success';

  if (hasLendingData) {
    if (oldestLentAgeDays > 45 || totalOwedToYou > benchmarkMonthlyIncome * 0.5) {
      owedToYouScore = 4;
      owedToYouStatus = 'At Risk';
      owedToYouStatusType = 'danger';
    } else {
      owedToYouScore = 10;
      owedToYouStatus = 'Healthy';
      owedToYouStatusType = 'success';
    }
  }

  // -------------------------------------------------------------
  // FACTOR 6: Money You Owe (15 pts)
  // Only shown if borrowing data exists
  // -------------------------------------------------------------
  const hasBorrowingData = totalIOwe > 0;
  let youOweScore = 15;
  let youOweStatus: HealthStatusLevel = 'Manageable';
  let youOweStatusType: 'success' | 'warning' | 'danger' | 'info' = 'success';

  if (hasBorrowingData) {
    if (totalIOwe > benchmarkMonthlyExpense * 0.4) {
      youOweScore = 5;
      youOweStatus = 'Concerning';
      youOweStatusType = 'danger';
    } else {
      youOweScore = 15;
      youOweStatus = 'Manageable';
      youOweStatusType = 'success';
    }
  }

  // Sum total score (0 to 100)
  const rawScore =
    emergencyScore +
    debtScore +
    recurringScore +
    savingsScore +
    owedToYouScore +
    youOweScore;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Score label and theme colors
  let label: 'Needs Attention' | 'Fair' | 'Good' | 'Excellent' = 'Good';
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

  // Breakdown factor rows
  const factors: HealthFactor[] = [
    {
      id: 'emergency-buffer',
      name: 'Emergency buffer',
      score: emergencyScore,
      maxScore: 20,
      status: emergencyStatus,
      statusType: emergencyStatusType,
      description: `${monthsBufferCovered} mo. expenses covered`,
      visible: true,
    },
    {
      id: 'debt-exposure',
      name: 'Debt exposure',
      score: debtScore,
      maxScore: 20,
      status: debtStatus,
      statusType: debtStatusType,
      description: `${Math.round(debtExposureRatio * 100)}% of monthly baseline`,
      visible: true,
    },
    {
      id: 'recurring-commitments',
      name: 'Recurring commitments',
      score: recurringScore,
      maxScore: 15,
      status: recurringStatus,
      statusType: recurringStatusType,
      description: `${Math.round(recurringBillsRatio * 100)}% fixed payments`,
      visible: true,
    },
    {
      id: 'savings-consistency',
      name: 'Savings consistency',
      score: savingsScore,
      maxScore: 20,
      status: savingsStatus,
      statusType: savingsStatusType,
      description: `${Math.round(savingsRate * 100)}% estimated savings rate`,
      visible: true,
    },
    {
      id: 'money-owed-to-you',
      name: 'Money owed to you',
      score: owedToYouScore,
      maxScore: 10,
      status: owedToYouStatus,
      statusType: owedToYouStatusType,
      description: hasLendingData
        ? `₹${totalOwedToYou.toLocaleString()} pending`
        : 'No pending loans',
      visible: hasLendingData,
    },
    {
      id: 'money-you-owe',
      name: 'Money you owe',
      score: youOweScore,
      maxScore: 15,
      status: youOweStatus,
      statusType: youOweStatusType,
      description: hasBorrowingData
        ? `₹${totalIOwe.toLocaleString()} to repay`
        : 'Zero borrowings',
      visible: hasBorrowingData,
    },
  ];

  // Determine strongest and weakest factor
  const visibleFactors = factors.filter((f) => f.visible);
  const sortedFactors = [...visibleFactors].sort((a, b) => {
    const ratioA = a.score / a.maxScore;
    const ratioB = b.score / b.maxScore;
    return ratioB - ratioA;
  });

  const best = sortedFactors[0];
  const worst = sortedFactors[sortedFactors.length - 1];

  // Generate actionable explanation and recommendations
  const factorExplanations: Record<string, { good: string; bad: string; tip: string }> = {
    'emergency-buffer': {
      good: `Your emergency buffer covers ${monthsBufferCovered} months of expenses, protecting you against unexpected costs.`,
      bad: `Your emergency buffer covers only ${monthsBufferCovered} months of expenses, leaving you vulnerable to sudden shocks.`,
      tip: 'Automate a fixed transfer to your emergency savings at the beginning of each month until you hit a 3-month cushion.',
    },
    'debt-exposure': {
      good: 'Your debt exposure is negligible compared to your income, giving you high financial flexibility.',
      bad: `Your outstanding debt represents ${Math.round(debtExposureRatio * 100)}% of your benchmark income, tightening your cashflow.`,
      tip: 'Prioritize settling peer debts or highest-interest balances to quickly free up monthly disposable income.',
    },
    'recurring-commitments': {
      good: 'Fixed recurring commitments are low, giving you maximum agility to adjust monthly spending.',
      bad: 'A notable portion of your budget is tied up in recurring bills and fixed commitments.',
      tip: 'Audit regular subscriptions and recurring utilities to prune inactive plans or renegotiate rates.',
    },
    'savings-consistency': {
      good: `You consistently retain around ${Math.round(savingsRate * 100)}% of your cashflow after expenses.`,
      bad: 'Your net savings rate is slim after accounting for monthly spending.',
      tip: 'Review discretionary spending (dining, shopping) and set category spend limits to preserve at least 15% of your income.',
    },
    'money-owed-to-you': {
      good: 'Peer debts owed to you are healthy and active with low risk of default.',
      bad: 'Some money lent to peers is aging or represents a significant portion of your capital.',
      tip: 'Send friendly reminders or set up structured repayment schedules with friends who owe you money.',
    },
    'money-you-owe': {
      good: 'Your peer borrowings are easily manageable within your standard cashflow.',
      bad: 'Outstanding money you owe is elevated relative to your current spending limit.',
      tip: 'Set aside a small repayment tranche every week to clear peer debts without squeezing your daily expenses.',
    },
  };

  const strongestExp = factorExplanations[best.id] || {
    good: `${best.name} is performing well and boosting your overall financial health score.`,
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
      monthlyExpenses: benchmarkMonthlyExpense,
      savingsBuffer: currentSavings,
      monthsBufferCovered,
      debtExposureRatio,
      recurringBillsRatio,
      savingsRate,
      totalOwedToYou,
      totalIOwe,
    },
  };
}

/**
 * Sample mock data structure for testing or showcasing before real transactions exist.
 */
export function getSampleFinancialData(): FinancialHealthInput {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return {
    monthlyCap: 45000,
    monthlyExpenditure: 28500,
    currentSavings: 85000,
    currency: 'INR',
    transactions: [
      {
        id: 'mock-1',
        amount: 75000,
        type: 'CREDIT',
        merchant: 'Salary',
        category: 'Other',
        timestamp: now - 15 * dayMs,
        source: 'manual',
      },
      {
        id: 'mock-2',
        amount: 4500,
        type: 'DEBIT',
        merchant: 'Electricity & Wifi',
        category: 'Bills',
        timestamp: now - 10 * dayMs,
        source: 'manual',
      },
      {
        id: 'mock-3',
        amount: 3200,
        type: 'DEBIT',
        merchant: 'Supermarket Groceries',
        category: 'Food',
        timestamp: now - 5 * dayMs,
        source: 'manual',
      },
      {
        id: 'mock-4',
        amount: 1800,
        type: 'DEBIT',
        merchant: 'Fuel',
        category: 'Travel',
        timestamp: now - 2 * dayMs,
        source: 'manual',
      },
    ],
    peerBalances: [
      {
        id: 'mock-peer-1',
        name: 'Rahul',
        type: 'OWED_TO_YOU',
        amount: 2500,
        updatedAt: now - 12 * dayMs,
        items: [
          {
            id: 'mock-item-1',
            amount: 2500,
            description: 'Concert ticket',
            date: now - 12 * dayMs,
            direction: 'GAVE',
          },
        ],
      },
      {
        id: 'mock-peer-2',
        name: 'Priya',
        type: 'I_OWE',
        amount: 1200,
        updatedAt: now - 8 * dayMs,
        items: [
          {
            id: 'mock-item-2',
            amount: 1200,
            description: 'Dinner split',
            date: now - 8 * dayMs,
            direction: 'RECEIVED',
          },
        ],
      },
    ],
  };
}
