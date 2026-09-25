import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import {
  FinancialHealthResult,
  HealthStatusLevel,
  calculateFinancialHealth,
  FinancialHealthInput,
} from '../utils/financialHealth.js';
import { useTheme } from '../context/ThemeContext.js';

interface FinancialHealthCardProps {
  data?: FinancialHealthInput;
  result?: FinancialHealthResult;
  className?: string;
}

// Color and badge style mapping for factor status levels
const getStatusBadgeStyle = (status: HealthStatusLevel, isDark: boolean) => {
  switch (status) {
    case 'Excellent':
    case 'Healthy':
    case 'Low': // For debt & recurring, Low is great!
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
    case 'Poor':
    case 'High':
    case 'At Risk':
    case 'Concerning':
    default:
      return {
        bg: isDark ? 'bg-rose-500/15' : 'bg-rose-50',
        text: isDark ? 'text-rose-400' : 'text-rose-700',
        border: isDark ? 'border-rose-500/30' : 'border-rose-200',
      };
  }
};

/**
 * FULL VERSION: Designed for the Analytics Page
 * Features circular gauge visual, score breakdown rows, and expandable "Why this score?" section.
 */
export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  data,
  result: propResult,
  className = '',
}) => {
  const { theme } = useTheme();
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  const health = propResult || (data ? calculateFinancialHealth(data) : null);
  if (!health) return null;

  // Circular gauge calculations
  const radius = 48;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (health.score / 100) * circumference;

  return (
    <div
      id="financial-health-score-card"
      style={{
        backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
        borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
      }}
      className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all duration-300 ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: health.bgColor }}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${health.borderColor}`}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: health.color }} />
          </div>
          <div>
            <h3 className={`text-base font-bold font-display tracking-tight ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              Financial Health Score
            </h3>
            <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Holistic rating based on spending, savings & debt
            </p>
          </div>
        </div>

        <span
          style={{
            backgroundColor: health.bgColor,
            borderColor: health.borderColor,
            color: health.color,
          }}
          className="px-3 py-1 text-xs font-bold rounded-full border shadow-xs"
        >
          {health.label}
        </span>
      </div>

      {/* Main Score Visual: Circular Gauge Ring + Quick Overview */}
      <div
        style={{
          backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.75)',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(226, 232, 240, 0.8)',
        }}
        className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 mb-5"
      >
        {/* SVG Circular Progress Ring */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
            {/* Background track circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className={`${theme.isDark ? 'stroke-slate-800' : 'stroke-slate-200'}`}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated progress ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={health.color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Center Score Numbers */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
            <span
              className="text-3xl font-extrabold font-display tracking-tight leading-none"
              style={{ color: health.color }}
            >
              {health.score}
            </span>
            <span className={`text-[11px] font-semibold mt-0.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              out of 100
            </span>
          </div>
        </div>

        {/* Narrative Summary Column */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
            <span className={`text-lg font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Your score is {health.label}
            </span>
          </div>
          <p className={`text-xs sm:text-[13px] leading-relaxed mb-3 ${theme.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {health.strongestFactor.explanation}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: health.color }} />
              <span className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>
                {health.metrics.monthsBufferCovered} mo. buffer
              </span>
            </div>
            <span aria-hidden="true" className="opacity-40">·</span>
            <div className="flex items-center gap-1.5">
              <span className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>
                {Math.round(health.metrics.savingsRate * 100)}% savings rate
              </span>
            </div>
            {health.metrics.totalIOwe > 0 && (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>
                  ₹{health.metrics.totalIOwe.toLocaleString()} debt
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Factor Breakdown Rows */}
      <div className="space-y-2.5 mb-4">
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Score Breakdown & Factors
        </h4>

        {health.factors
          .filter((f) => f.visible)
          .map((factor) => {
            const badgeStyle = getStatusBadgeStyle(factor.status, theme.isDark);
            return (
              <div
                key={factor.id}
                style={{
                  backgroundColor: theme.isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.65)',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.7)',
                }}
                className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs sm:text-sm font-semibold truncate ${theme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {factor.name}
                    </span>
                  </div>
                  <span className={`text-[11px] block mt-0.5 truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {factor.description}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-2xs ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                  >
                    {factor.status}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Expandable "Why this score?" Section */}
      <div
        style={{
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
        }}
        className="border-t pt-3.5"
      >
        <button
          type="button"
          onClick={() => setIsWhyExpanded((prev) => !prev)}
          className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${
            theme.isDark ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
          }`}
          aria-expanded={isWhyExpanded}
        >
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Why this score?</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>{isWhyExpanded ? 'Collapse' : 'Tap to expand'}</span>
            {isWhyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isWhyExpanded && (
          <div className="mt-3 space-y-3 pt-2 text-xs leading-relaxed animate-fade-in">
            {/* Strongest Factor */}
            <div
              className={`p-3.5 rounded-2xl border ${
                theme.isDark
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs mb-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span>Strongest Factor: {health.strongestFactor.name}</span>
              </div>
              <p className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>
                {health.strongestFactor.explanation}
              </p>
            </div>

            {/* Weakest Factor */}
            <div
              className={`p-3.5 rounded-2xl border ${
                theme.isDark
                  ? 'bg-rose-950/20 border-rose-500/20 text-rose-200'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs mb-1 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>Weakest Factor: {health.weakestFactor.name}</span>
              </div>
              <p className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>
                {health.weakestFactor.explanation}
              </p>
            </div>

            {/* Actionable Suggestion */}
            <div
              className={`p-3.5 rounded-2xl border ${
                theme.isDark
                  ? 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs mb-1 text-amber-600 dark:text-amber-400">
                <Lightbulb className="w-4 h-4" />
                <span>Suggested Action</span>
              </div>
              <p className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>
                {health.actionableSuggestion}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface FinancialHealthCompactCardProps {
  data?: FinancialHealthInput;
  result?: FinancialHealthResult;
  onClick?: () => void;
  className?: string;
}

/**
 * COMPACT VERSION: Designed for the Transactions / Overview Page
 * Shows the score, mini circular ring, one-line status label, and tap-to-navigate action.
 */
export const FinancialHealthCompactCard: React.FC<FinancialHealthCompactCardProps> = ({
  data,
  result: propResult,
  onClick,
  className = '',
}) => {
  const { theme } = useTheme();
  const health = propResult || (data ? calculateFinancialHealth(data) : null);
  if (!health) return null;

  const miniRadius = 18;
  const miniStroke = 4;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniOffset = miniCircumference - (health.score / 100) * miniCircumference;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
        borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
      }}
      className={`w-full rounded-2xl border p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-emerald-500 ${className}`}
      aria-label={`Financial Health Score: ${health.score} out of 100, status ${health.label}. Tap to view full analysis.`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Mini Circular Gauge */}
        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r={miniRadius}
              className={`${theme.isDark ? 'stroke-slate-800' : 'stroke-slate-200'}`}
              strokeWidth={miniStroke}
              fill="transparent"
            />
            <circle
              cx="22"
              cy="22"
              r={miniRadius}
              stroke={health.color}
              strokeWidth={miniStroke}
              strokeDasharray={miniCircumference}
              strokeDashoffset={miniOffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-extrabold font-display leading-none"
            style={{ color: health.color }}
          >
            {health.score}
          </span>
        </div>

        {/* Labels */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-xs sm:text-sm font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              Financial Health: {health.label}
            </h4>
          </div>
          <p className={`text-[11px] truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {health.strongestFactor.name} is strong · Tap for breakdown
          </p>
        </div>
      </div>

      {/* Right chevron pill */}
      <div
        style={{
          backgroundColor: health.bgColor,
          color: health.color,
          borderColor: health.borderColor,
        }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 shadow-2xs"
      >
        <span>{health.score}/100</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
