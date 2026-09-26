import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ArrowLeft,
  Activity,
  Wallet,
  Calendar,
  PiggyBank,
  Users,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  calculateFinancialHealth,
  FinancialHealthResult,
  HealthStatusLevel,
} from '../utils/financialHealth.js';
import { Transaction, PeerBalance } from '../types.js';
import { formatCurrency } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';

interface PageFinancialScoreProps {
  transactions: Transaction[];
  currency: string;
  monthlyCap?: number;
  monthlyExpenditure?: number;
  dailyLimit?: number;
  spentToday?: number;
  peerBalances?: PeerBalance[];
  savingsEntries?: import('../types/savings.js').SavingsEntry[];
  onNavigateToPage?: (pageIndex: number) => void;
  onGoBack?: () => void;
}

const getStatusBadgeStyle = (status: HealthStatusLevel, isDark: boolean) => {
  switch (status) {
    case 'Excellent':
    case 'Healthy':
    case 'Low':
      return {
        bg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-50',
        text: isDark ? 'text-emerald-400' : 'text-emerald-700',
        border: isDark ? 'border-emerald-500/30' : 'border-emerald-200',
      };
    case 'Good':
    case 'Manageable':
      return {
        bg: isDark ? 'bg-teal-500/15' : 'bg-teal-50',
        text: isDark ? 'text-teal-400' : 'text-teal-700',
        border: isDark ? 'border-teal-500/30' : 'border-teal-200',
      };
    case 'Fair':
    case 'Moderate':
      return {
        bg: isDark ? 'bg-amber-500/15' : 'bg-amber-50',
        text: isDark ? 'text-amber-400' : 'text-amber-700',
        border: isDark ? 'border-amber-500/30' : 'border-amber-200',
      };
    case 'No Data':
    case 'Not Set':
    case 'Awaiting Data':
      return {
        bg: isDark ? 'bg-slate-800' : 'bg-slate-100',
        text: isDark ? 'text-slate-400' : 'text-slate-600',
        border: isDark ? 'border-slate-700' : 'border-slate-200',
      };
    case 'Poor':
    case 'High':
    case 'At Risk':
    case 'Concerning':
    case 'Critical':
    default:
      return {
        bg: isDark ? 'bg-rose-500/15' : 'bg-rose-50',
        text: isDark ? 'text-rose-400' : 'text-rose-700',
        border: isDark ? 'border-rose-500/30' : 'border-rose-200',
      };
  }
};

export const PageFinancialScore: React.FC<PageFinancialScoreProps> = ({
  transactions,
  currency,
  monthlyCap = 0,
  monthlyExpenditure = 0,
  dailyLimit = 0,
  spentToday = 0,
  peerBalances = [],
  savingsEntries = [],
  onGoBack,
}) => {
  const { theme } = useTheme();
  const [isMethodologyExpanded, setIsMethodologyExpanded] = useState(false);

  // Compute live financial health using actual budget data
  const currentSavings = savingsEntries.reduce((sum, s) => sum + s.amount, 0);

  const health: FinancialHealthResult = calculateFinancialHealth({
    transactions,
    currency,
    monthlyCap,
    monthlyExpenditure,
    dailyLimit,
    spentToday,
    peerBalances,
    currentSavings,
  });

  // Circular gauge calculations
  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    health.hasData && typeof health.score === 'number'
      ? circumference - (health.score / 100) * circumference
      : circumference;

  // Icon mapping for factors
  const getFactorIcon = (id: string) => {
    switch (id) {
      case 'monthly-budget':
        return <Wallet className="w-4 h-4" />;
      case 'daily-discipline':
        return <Calendar className="w-4 h-4" />;
      case 'cashflow-ratio':
        return <TrendingUp className="w-4 h-4" />;
      case 'debt-exposure':
        return <Users className="w-4 h-4" />;
      case 'emergency-buffer':
        return <PiggyBank className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div
      id="page-financial-score-container"
      className="flex flex-col gap-4 sm:gap-5 flex-1 min-h-0 overflow-y-auto no-scrollbar pb-32"
    >
      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between gap-3 shrink-0 pt-1">
        <div className="flex items-center gap-2.5">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className={`p-2 rounded-xl border transition-colors cursor-pointer active:scale-95 ${
                theme.isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Go back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg sm:text-xl font-bold font-display tracking-tight ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                Financial Score
              </h1>
              <span
                style={{
                  backgroundColor: health.bgColor,
                  color: health.color,
                  borderColor: health.borderColor,
                }}
                className="px-2.5 py-0.5 text-[11px] font-bold rounded-full border shadow-2xs"
              >
                {health.label}
              </span>
            </div>
            <p className={`text-[11px] sm:text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Real-time evaluation across budget, velocity, savings & debt
            </p>
          </div>
        </div>

        {/* Live dynamic indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${
            theme.isDark
              ? 'bg-slate-800/80 border-slate-700/80 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              style={{ backgroundColor: health.color }}
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            />
            <span
              style={{ backgroundColor: health.color }}
              className="relative inline-flex rounded-full h-2 w-2"
            />
          </span>
          <span className="hidden sm:inline">Live Assessment</span>
          <span className="sm:hidden">Live</span>
        </div>
      </div>

      {/* 2. HERO SCORE CARD */}
      <div
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="rounded-3xl border p-5 sm:p-7 shadow-sm transition-all"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Circular Gauge */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
              {/* Background Track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className={`${theme.isDark ? 'stroke-slate-800' : 'stroke-slate-100'}`}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Dynamic Value Ring */}
              {health.hasData && typeof health.score === 'number' ? (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke={health.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              ) : (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#64748B"
                  strokeWidth={strokeWidth}
                  strokeDasharray="6 6"
                  strokeDashoffset="0"
                  fill="transparent"
                  className="opacity-40"
                />
              )}
            </svg>

            {/* Score Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none px-2">
              {health.hasData && typeof health.score === 'number' ? (
                <>
                  <span
                    className="text-4xl font-extrabold font-display tracking-tight leading-none"
                    style={{ color: health.color }}
                  >
                    {health.score}
                  </span>
                  <span className={`text-xs font-semibold mt-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    out of 100
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base sm:text-lg font-extrabold font-display tracking-tight leading-tight text-slate-500 dark:text-slate-400 uppercase">
                    Unrated
                  </span>
                  <span className={`text-[10px] font-medium mt-0.5 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No Data Yet
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Narrative Summary Column */}
          <div className="flex-1 text-center sm:text-left space-y-2.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className={`text-xl font-bold font-display ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                {health.hasData ? `Condition: ${health.label}` : 'Score Unrated (No Activity)'}
              </span>
              <span
                style={{
                  backgroundColor: health.bgColor,
                  color: health.color,
                  borderColor: health.borderColor,
                }}
                className="px-2.5 py-0.5 text-xs font-bold rounded-full border"
              >
                {health.hasData && typeof health.score === 'number' ? `${health.score} pts` : 'Awaiting Data'}
              </span>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed ${theme.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {health.hasData
                ? health.strongestFactor.explanation
                : health.emptyStateMessage || 'Log expenses or income transactions to evaluate your live financial score.'}
            </p>

            {/* Quick Metrics Pills */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  theme.isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold">{health.metrics.monthsBufferCovered} mo. buffer</span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  theme.isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                <span className="font-semibold">{Math.round(health.metrics.savingsRate * 100)}% savings rate</span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  theme.isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold">
                  {health.metrics.totalIOwe > 0
                    ? `₹${health.metrics.totalIOwe.toLocaleString()} peer debt`
                    : '₹0 peer debt'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 5 CORE FACTORS BREAKDOWN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Evaluation Factors ({health.factors.filter((f) => f.visible).length})
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            {health.hasData && typeof health.score === 'number' ? `${health.score}/100 total pts` : '100 max pts'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
          {health.factors
            .filter((f) => f.visible)
            .map((factor) => {
              const badgeStyle = getStatusBadgeStyle(factor.status, theme.isDark);
              const progressPct = (factor.score / factor.maxScore) * 100;

              return (
                <div
                  key={factor.id}
                  style={{
                    backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                    borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
                  }}
                  className="rounded-2xl border p-4 shadow-xs space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)',
                        }}
                        className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-300"
                      >
                        {getFactorIcon(factor.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-xs sm:text-sm font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                            {factor.name}
                          </h3>
                        </div>
                        <p className={`text-[11px] truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {factor.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-2xs ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                      >
                        {factor.status}
                      </span>
                      {health.hasData && (
                        <span className="text-xs font-mono font-bold text-slate-400 min-w-[42px] text-right">
                          {factor.score}/{factor.maxScore}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for each factor */}
                  {health.hasData && (
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor:
                            progressPct >= 80
                              ? '#10B981'
                              : progressPct >= 60
                              ? '#0D9488'
                              : progressPct >= 40
                              ? '#F59E0B'
                              : '#EF4444',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. STRATEGIC INSIGHTS & ACTION PLAN */}
      {health.hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Strongest Dimension */}
          <div
            className={`p-4 rounded-2xl border ${
              theme.isDark
                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs mb-1.5 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span>Top Strength: {health.strongestFactor.name}</span>
            </div>
            <p className={`text-xs leading-relaxed ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {health.strongestFactor.explanation}
            </p>
          </div>

          {/* Area for Improvement */}
          <div
            className={`p-4 rounded-2xl border ${
              theme.isDark
                ? 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs mb-1.5 text-amber-600 dark:text-amber-400">
              <Lightbulb className="w-4 h-4" />
              <span>Opportunity for Growth</span>
            </div>
            <p className={`text-xs leading-relaxed ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {health.actionableSuggestion}
            </p>
          </div>
        </div>
      )}

      {/* 5. METHODOLOGY TRANSPARENCY ACCORDION */}
      <div
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="rounded-2xl border p-4 shadow-xs"
      >
        <button
          type="button"
          onClick={() => setIsMethodologyExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
          aria-expanded={isMethodologyExpanded}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs sm:text-sm font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              How Budget Bridge Calculates Your Score
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>{isMethodologyExpanded ? 'Hide' : 'Explain'}</span>
            {isMethodologyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isMethodologyExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs leading-relaxed space-y-2 text-slate-600 dark:text-slate-400">
            <p>
              Your Financial Score is a deterministic 100-point index calculated from your live entries.
              It eliminates placeholder guesswork by evaluating 5 quantitative pillars:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[11px] pt-1">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Monthly Budget Adherence (25 pts):</strong> Compares actual monthly spend against your configured monthly cap.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Daily Spending Discipline (15 pts):</strong> Paces today's spending velocity against your configured daily limit.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Cashflow & Savings Rate (25 pts):</strong> Evaluates the ratio of credited income retained versus debited expenditures.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Debt & Peer Balances (15 pts):</strong> Measures money you owe friends against amounts owed to you.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Emergency Savings Buffer (20 pts):</strong> Assesses how many months of baseline expenses your liquid savings can cover (3+ months = full score).
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
