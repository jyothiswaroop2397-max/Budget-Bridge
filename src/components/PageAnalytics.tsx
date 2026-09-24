import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  CheckCircle2,
  Calendar,
  Tag,
  Trash2,
  Building2,
  Bot,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Coffee,
  ShoppingBag,
  Car,
  FileText,
  Film,
  HeartPulse,
  Users,
  MoreHorizontal,
  X,
  Edit3,
} from 'lucide-react';
import { Category, Transaction } from '../types.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';

interface PageAnalyticsProps {
  transactions: Transaction[];
  currency: string;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onNavigateToPage: (pageIndex: number) => void;
  onGoBack?: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

// Category icon helper matching screenshot icon style
const getCategoryIcon = (category: Category) => {
  switch (category) {
    case 'Food':
      return Coffee;
    case 'Shopping':
      return ShoppingBag;
    case 'Travel':
      return Car;
    case 'Bills':
      return FileText;
    case 'Entertainment':
      return Film;
    case 'Health':
      return HeartPulse;
    case 'Social':
      return Users;
    default:
      return Tag;
  }
};

export const PageAnalytics: React.FC<PageAnalyticsProps> = ({
  transactions,
  currency,
  onDeleteTransaction,
  onUpdateTransaction,
  onGoBack,
  selectedCategory: propCategory,
  onSelectCategory,
}) => {
  const { theme } = useTheme();
  const [activeCategoryPickerId, setActiveCategoryPickerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localCategory, setLocalCategory] = useState<string>(propCategory || 'All');
  const [monthFilter, setMonthFilter] = useState<'current' | 'previous' | 'all' | 'custom'>('current');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Keep in sync with propCategory when changed from external navigation
  useEffect(() => {
    if (propCategory) {
      setLocalCategory(propCategory);
    }
  }, [propCategory]);

  const activeCategory = propCategory !== undefined ? propCategory : localCategory;

  const handleCategorySelect = (cat: string) => {
    setLocalCategory(cat);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
  };

  const handleDateChange = (dateVal: string) => {
    if (dateVal) {
      setSelectedDate(dateVal);
      setMonthFilter('custom');
    } else {
      setSelectedDate('');
      setMonthFilter('current');
    }
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    setMonthFilter('current');
  };

  const categories: string[] = [
    'All',
    'Food',
    'Travel',
    'Bills',
    'Shopping',
    'Health',
    'Entertainment',
    'Social',
    'Other',
  ];

  // Filter logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((t) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMerchant = t.merchant.toLowerCase().includes(q);
        const matchesCategory = t.category.toLowerCase().includes(q);
        const matchesBank = (t.bankName || '').toLowerCase().includes(q);
        if (!matchesMerchant && !matchesCategory && !matchesBank) return false;
      }

      // 2. Category Filter
      if (activeCategory !== 'All' && t.category !== activeCategory) {
        return false;
      }

      // 3. Date / Month Filter
      if (monthFilter === 'custom' && selectedDate) {
        const txDateStr = new Date(t.timestamp).toISOString().split('T')[0];
        return txDateStr === selectedDate;
      }


      const txDate = new Date(t.timestamp);
      if (monthFilter === 'current') {
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      } else if (monthFilter === 'previous') {
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          txDate.getMonth() === prevMonthDate.getMonth() &&
          txDate.getFullYear() === prevMonthDate.getFullYear()
        );
      }

      return true;
    });
  }, [transactions, searchQuery, activeCategory, monthFilter, selectedDate]);

  // Aggregate stats
  const totalSpend = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'DEBIT')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'CREDIT')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  return (
    <section
      id="page-2-analytics"
      className="w-full max-w-4xl mx-auto flex flex-col px-1 sm:px-4 py-1 select-none space-y-3.5 sm:space-y-4"
    >
      <div className="space-y-3 sm:space-y-3.5 flex flex-col">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onGoBack && (
            <button
              id="analytics-page-back-arrow-btn"
              type="button"
              onClick={onGoBack}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs group shrink-0 ${
                theme.isDark
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-white border-slate-700/80 hover:border-emerald-500/50'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-emerald-500/50 shadow-sm'
              }`}
              title="Go back to previous page"
              aria-label="Previous page"
            >
              <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] transition-transform group-hover:-translate-x-0.5 ${theme.accentText}`} />
            </button>
          )}
          <div>
            <h1 className={`text-lg sm:text-xl font-bold font-display tracking-tight ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              Analytics & Transactions
            </h1>
            <p className={`text-[11px] sm:text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Auto-verified bank debits, UPI transfers & expenditures
            </p>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="space-y-2 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                id="transaction-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant, category, bank..."
                style={{
                  backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.9)',
                }}
                className={`w-full pl-8 pr-3 py-1.5 sm:py-2 border rounded-full text-xs sm:text-sm focus:outline-none transition-colors shadow-xs ${
                  theme.isDark
                    ? 'border-slate-800 text-white placeholder-slate-500 focus:border-amber-400'
                    : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400'
                }`}
              />
            </div>

            {/* Month & Date Filter Selector */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
              <div
                style={{
                  backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.9)',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
                }}
                className="flex items-center border rounded-full p-1 text-xs shrink-0 shadow-xs"
              >
                <button
                  id="filter-month-current-btn"
                  onClick={() => {
                    setSelectedDate('');
                    setMonthFilter('current');
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                    monthFilter === 'current'
                      ? `${theme.accentBtnBg} ${theme.accentBtnText} font-bold shadow-xs`
                      : theme.isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Month
                </button>
                <button
                  id="filter-month-prev-btn"
                  onClick={() => {
                    setSelectedDate('');
                    setMonthFilter('previous');
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                    monthFilter === 'previous'
                      ? `${theme.accentBtnBg} ${theme.accentBtnText} font-bold shadow-xs`
                      : theme.isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Last Month
                </button>
                <button
                  id="filter-month-all-btn"
                  onClick={() => {
                    setSelectedDate('');
                    setMonthFilter('all');
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                    monthFilter === 'all'
                      ? `${theme.accentBtnBg} ${theme.accentBtnText} font-bold shadow-xs`
                      : theme.isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Calendar Date Picker Button */}
              <div className="relative flex items-center shrink-0">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="sr-only"
                  aria-label="Filter transactions by date"
                />
                <button
                  id="filter-calendar-date-btn"
                  type="button"
                  onClick={() => {
                    try {
                      if (dateInputRef.current?.showPicker) {
                        dateInputRef.current.showPicker();
                      } else {
                        dateInputRef.current?.click();
                        dateInputRef.current?.focus();
                      }
                    } catch {
                      dateInputRef.current?.click();
                      dateInputRef.current?.focus();
                    }
                  }}
                  style={{
                    backgroundColor: monthFilter === 'custom'
                      ? undefined
                      : theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.9)',
                    borderColor: monthFilter === 'custom'
                      ? undefined
                      : theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
                  }}
                  className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border flex items-center gap-1.5 text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap ${
                    monthFilter === 'custom' && selectedDate
                      ? `${theme.accentBtnBg} ${theme.accentBtnText} font-bold shadow-xs border-transparent`
                      : theme.isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title={selectedDate ? `Filtered to: ${selectedDate} (Click to change)` : 'Check transactions by date'}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] sm:text-xs whitespace-nowrap">
                    {selectedDate
                      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(selectedDate + 'T00:00:00'))
                      : 'Date'}
                  </span>
                  {selectedDate && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDateFilter();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          clearDateFilter();
                        }
                      }}
                      className="p-0.5 rounded-full hover:bg-black/10 transition-colors ml-0.5"
                      title="Clear date filter"
                      aria-label="Clear date filter"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Pills: single unified styling */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  style={!isSelected ? { backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)' } : undefined}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shadow-xs ${
                    isSelected
                      ? `${theme.accentBtnBg} ${theme.accentBtnText} font-bold shadow-xs ${theme.accentShadow}`
                      : theme.isDark
                      ? 'text-slate-400 border border-slate-800/80 hover:text-slate-200'
                      : 'text-slate-700 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* SUMMARY STATS STRIP */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="flex items-center justify-between px-3.5 py-2 rounded-[24px] border text-xs shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <span className={`text-[11px] ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Showing <strong className={theme.isDark ? 'text-white' : 'text-slate-900'}>{filteredTransactions.length}</strong> transactions
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className={theme.isDark ? 'text-slate-400' : 'text-slate-600'}>
              Total Spend: <strong className={`font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(totalSpend, currency)}</strong>
            </span>
            {totalIncome > 0 && (
              <span className={theme.isDark ? 'text-slate-400' : 'text-slate-600'}>
                Credits: <strong className="text-emerald-600 font-bold">+{formatCurrency(totalIncome, currency)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* TRANSACTION LIST */}
        <div
          id="transactions-history-scroll-list"
          className="space-y-2"
        >
          {filteredTransactions.length === 0 ? (
            <div
              style={{
                backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
              }}
              className="h-44 flex flex-col items-center justify-center text-center p-6 rounded-[24px] border shadow-xs"
            >
              <Calendar className={`w-8 h-8 mb-2 ${theme.isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              <p className={`text-sm font-bold ${theme.isDark ? 'text-white' : 'text-slate-800'}`}>No transactions found</p>
              <p className={`text-xs mt-0.5 ${theme.isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Try adjusting your search filter or add an expense.
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isDebit = tx.type === 'DEBIT';
              const IconComponent = getCategoryIcon(tx.category);
              const isPickerOpen = activeCategoryPickerId === tx.id;

              const AVAILABLE_CATEGORIES: Category[] = [
                'Food',
                'Travel',
                'Bills',
                'Shopping',
                'Health',
                'Entertainment',
                'Social',
                'Other',
              ];

              return (
                <div key={tx.id} className="space-y-1.5">
                  <div
                    id={`transaction-item-${tx.id}`}
                    onClick={() => setActiveCategoryPickerId((prev) => (prev === tx.id ? null : tx.id))}
                    style={{
                      backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.88)',
                      borderColor: isPickerOpen
                        ? theme.isDark
                          ? 'rgba(245, 158, 11, 0.4)'
                          : 'rgba(245, 158, 11, 0.6)'
                        : theme.isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.9)',
                    }}
                    className={`group p-3 sm:p-3.5 rounded-[24px] border flex items-center justify-between gap-3 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-md hover:scale-[1.006] active:scale-[0.995] cursor-pointer ${
                      isPickerOpen ? 'ring-1 ring-amber-400/40 shadow-sm' : ''
                    }`}
                    title="Click to change category"
                  >
                    {/* Left: Category Icon & Metadata */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{
                          backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
                          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-xs group-hover:scale-105 transition-transform"
                      >
                        <IconComponent className={`w-5 h-5 ${theme.accentText}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs sm:text-sm font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                            {tx.merchant}
                          </span>

                          {tx.isVerified && (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentBadgeText} text-[9px] font-semibold shrink-0`}
                              title="Silent SMS bank-verified payment"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>

                        <div className={`flex items-center gap-1.5 text-[10px] mt-0.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className="truncate">{formatDate(tx.timestamp)}</span>
                          <span>•</span>
                          {/* Interactive Category Badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCategoryPickerId((prev) => (prev === tx.id ? null : tx.id));
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentBadgeText} shrink-0 whitespace-nowrap hover:brightness-110 active:scale-95 transition-all shadow-2xs`}
                            title="Click to change category"
                          >
                            <span>{tx.category}</span>
                            <Edit3 className="w-2 h-2 opacity-70" />
                          </button>
                          {tx.bankName && (
                            <>
                              <span>•</span>
                              <span className="hidden sm:inline truncate">
                                {tx.bankName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-xs sm:text-sm font-extrabold font-display tracking-tight ${
                            isDebit ? (theme.isDark ? 'text-white' : 'text-slate-900') : 'text-emerald-600'
                          }`}
                        >
                          {isDebit ? '-' : '+'}
                          {formatCurrency(tx.amount, currency)}
                        </div>
                        <span className={`text-[9px] uppercase tracking-wider font-semibold block ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isDebit ? 'Debit' : 'Credit'}
                        </span>
                      </div>

                      <button
                        type="button"
                        id={`edit-tx-${tx.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategoryPickerId((prev) => (prev === tx.id ? null : tx.id));
                        }}
                        className={`p-2 rounded-xl transition-all border shrink-0 ${
                          isPickerOpen
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                            : theme.isDark
                            ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-800 border-slate-800'
                            : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50 border-slate-200/80 hover:border-amber-200'
                        }`}
                        title="Change category"
                        aria-label={`Change category for ${tx.merchant}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        id={`delete-tx-${tx.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTransaction(tx.id);
                        }}
                        className={`p-2 rounded-xl transition-all border shrink-0 ${
                          theme.isDark
                            ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border-slate-800 hover:border-rose-800/60'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200/80 hover:border-rose-200'
                        }`}
                        title="Delete transaction"
                        aria-label={`Delete transaction for ${tx.merchant}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* INLINE CATEGORY SELECTOR BOX */}
                  {isPickerOpen && (
                    <div
                      id={`category-inline-picker-${tx.id}`}
                      style={{
                        backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.95)',
                      }}
                      className="p-3 rounded-[20px] border shadow-md space-y-2.5 animate-in fade-in zoom-in-98 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Tag className={`w-3.5 h-3.5 ${theme.accentText}`} />
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            Select Category for {tx.merchant}:
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveCategoryPickerId(null)}
                          className={`p-1 rounded-full transition-colors ${
                            theme.isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                          aria-label="Close category selector"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Compact 8-Category Grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {AVAILABLE_CATEGORIES.map((cat) => {
                          const isCurrent = tx.category === cat;
                          const CatIcon = getCategoryIcon(cat);

                          return (
                            <button
                              key={cat}
                              type="button"
                              id={`select-cat-${tx.id}-${cat.toLowerCase()}`}
                              onClick={() => {
                                onUpdateTransaction?.(tx.id, { category: cat });
                                setActiveCategoryPickerId(null);
                              }}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs ${
                                isCurrent
                                  ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText} ring-2 ring-amber-400/80 font-bold scale-[1.02]`
                                  : theme.isDark
                                  ? 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                              title={`Assign ${cat}`}
                            >
                              <CatIcon className={`w-4 h-4 ${isCurrent ? theme.accentBadgeText : theme.accentText}`} />
                              <span className="text-[10px] font-semibold truncate w-full text-center">
                                {cat}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default PageAnalytics;
