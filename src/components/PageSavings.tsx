import React, { useState, useMemo } from 'react';
import {
  PiggyBank,
  Plus,
  TrendingUp,
  Landmark,
  Wallet,
  Building2,
  Banknote,
  Coins,
  MoreHorizontal,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  PieChart as PieChartIcon,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  SavingsEntry,
  SavingsPlatformType,
  SAVINGS_PLATFORMS,
} from '../types/savings.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../hooks/useToast.js';

interface PageSavingsProps {
  savingsEntries: SavingsEntry[];
  currency: string;
  onAddSavingsEntry: (entry: Omit<SavingsEntry, 'id' | 'createdAt'>) => void;
  onUpdateSavingsEntry: (id: string, updates: Partial<SavingsEntry>) => void;
  onDeleteSavingsEntry: (id: string) => void;
  onGoBack?: () => void;
  onNavigateToPage?: (pageIndex: number) => void;
}

export const PageSavings: React.FC<PageSavingsProps> = ({
  savingsEntries,
  currency,
  onAddSavingsEntry,
  onUpdateSavingsEntry,
  onDeleteSavingsEntry,
  onGoBack,
  onNavigateToPage,
}) => {
  const { theme } = useTheme();
  const { showToast } = useToast();

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Form inputs
  const [amount, setAmount] = useState('');
  const [platformType, setPlatformType] = useState<SavingsPlatformType>('BANK');
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // History filtering
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper for rendering icons dynamically
  const renderPlatformIcon = (type: SavingsPlatformType, className = 'w-4 h-4') => {
    switch (type) {
      case 'CASH':
        return <Banknote className={className} />;
      case 'BANK':
        return <Building2 className={className} />;
      case 'DIGITAL_WALLET':
        return <Wallet className={className} />;
      case 'FIXED_DEPOSIT':
        return <Landmark className={className} />;
      case 'INVESTMENT':
        return <TrendingUp className={className} />;
      case 'GOLD_ASSETS':
        return <Coins className={className} />;
      case 'OTHER':
      default:
        return <MoreHorizontal className={className} />;
    }
  };

  // 1. Calculations: Total Savings & Breakdown by Platform
  const { totalSavings, platformBreakdown } = useMemo(() => {
    let total = 0;
    const map: Record<SavingsPlatformType, { amount: number; count: number }> = {
      CASH: { amount: 0, count: 0 },
      BANK: { amount: 0, count: 0 },
      DIGITAL_WALLET: { amount: 0, count: 0 },
      FIXED_DEPOSIT: { amount: 0, count: 0 },
      INVESTMENT: { amount: 0, count: 0 },
      GOLD_ASSETS: { amount: 0, count: 0 },
      OTHER: { amount: 0, count: 0 },
    };

    for (const entry of savingsEntries) {
      total += entry.amount;
      if (map[entry.type]) {
        map[entry.type].amount += entry.amount;
        map[entry.type].count += 1;
      } else {
        map.OTHER.amount += entry.amount;
        map.OTHER.count += 1;
      }
    }

    const breakdownList = (Object.keys(SAVINGS_PLATFORMS) as SavingsPlatformType[])
      .map((type) => {
        const amt = map[type].amount;
        const count = map[type].count;
        const percent = total > 0 ? (amt / total) * 100 : 0;
        return {
          type,
          meta: SAVINGS_PLATFORMS[type],
          amount: amt,
          count,
          percent,
        };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { totalSavings: total, platformBreakdown: breakdownList };
  }, [savingsEntries]);

  // 2. Filtered History List (most recent first)
  const filteredEntries = useMemo(() => {
    return [...savingsEntries]
      .sort((a, b) => (b.date || b.createdAt) - (a.date || a.createdAt))
      .filter((entry) => {
        if (selectedTypeFilter !== 'ALL' && entry.type !== selectedTypeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNote = (entry.note || '').toLowerCase().includes(q);
          const matchCustom = (entry.customTypeLabel || '').toLowerCase().includes(q);
          const meta = SAVINGS_PLATFORMS[entry.type];
          const matchLabel = meta ? meta.label.toLowerCase().includes(q) : false;
          if (!matchNote && !matchCustom && !matchLabel) return false;
        }
        return true;
      });
  }, [savingsEntries, selectedTypeFilter, searchQuery]);

  // Open modal for new entry
  const handleOpenAdd = () => {
    setEditingEntryId(null);
    setAmount('');
    setPlatformType('BANK');
    setCustomTypeLabel('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setIsFormOpen(true);
  };

  // Open modal to edit existing entry
  const handleOpenEdit = (entry: SavingsEntry) => {
    setEditingEntryId(entry.id);
    setAmount(entry.amount.toString());
    setPlatformType(entry.type);
    setCustomTypeLabel(entry.customTypeLabel || '');
    setEntryDate(
      entry.dateStr ||
        (entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    );
    setNote(entry.note || '');
    setIsFormOpen(true);
  };

  // Form Submit (Add or Edit)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid savings amount greater than 0.', 'error');
      return;
    }

    const [year, month, day] = entryDate.split('-').map(Number);
    const dateTimestamp = new Date(year, month - 1, day, 12, 0, 0).getTime();

    if (editingEntryId) {
      onUpdateSavingsEntry(editingEntryId, {
        amount: parsedAmount,
        type: platformType,
        customTypeLabel: platformType === 'OTHER' ? customTypeLabel.trim() : undefined,
        date: dateTimestamp,
        dateStr: entryDate,
        note: note.trim() || undefined,
      });
      showToast(`Updated savings: ${formatCurrency(parsedAmount, currency)}`, 'success');
    } else {
      onAddSavingsEntry({
        amount: parsedAmount,
        type: platformType,
        customTypeLabel: platformType === 'OTHER' ? customTypeLabel.trim() : undefined,
        date: dateTimestamp,
        dateStr: entryDate,
        note: note.trim() || undefined,
      });
      showToast(`Added ${formatCurrency(parsedAmount, currency)} to ${SAVINGS_PLATFORMS[platformType].shortLabel}`, 'success');
    }

    setIsFormOpen(false);
  };

  const handleDelete = (id: string, entryAmount: number) => {
    if (window.confirm(`Delete this savings entry of ${formatCurrency(entryAmount, currency)}?`)) {
      onDeleteSavingsEntry(id);
      showToast('Savings entry removed.', 'info');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-28 space-y-5 animate-fade-in">
      {/* 1. TOP HEADER & PROMINENT ADD ACTION */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
                theme.isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-xl sm:text-2xl font-black font-display tracking-tight truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              Savings & Assets
            </h1>
            <p className={`text-xs truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Track liquid cash, bank balances, FDs & investments
            </p>
          </div>
        </div>

        {/* Prominent "Add Savings" Action Button */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className={`px-3.5 py-2 rounded-2xl ${theme.accentBtnBg} ${theme.accentBtnText} font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md ${theme.accentShadow} hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Savings</span>
        </button>
      </div>

      {/* 2. SAVINGS OVERVIEW CARD: TOTAL + VISUAL PROGRESS STRIP */}
      <div
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="rounded-3xl border p-5 sm:p-6 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Accumulated Savings
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl sm:text-4xl font-extrabold font-display tracking-tight ${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {formatCurrency(totalSavings, currency)}
              </span>
              <span className={`text-xs font-medium ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                across {platformBreakdown.length} platform{platformBreakdown.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Quick Info Chip */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              style={{
                backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              }}
              className="px-3 py-1.5 rounded-2xl border text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{savingsEntries.length} Total Entries</span>
            </span>
          </div>
        </div>

        {/* Multi-segment stacked progress bar */}
        {totalSavings > 0 ? (
          <div className="space-y-2">
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner">
              {platformBreakdown.map((item) => (
                <div
                  key={item.type}
                  style={{
                    width: `${item.percent}%`,
                    backgroundColor: item.meta.color,
                  }}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  title={`${item.meta.shortLabel}: ${formatCurrency(item.amount, currency)} (${item.percent.toFixed(1)}%)`}
                />
              ))}
            </div>

            {/* Platform legend chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {platformBreakdown.map((item) => (
                <div
                  key={item.type}
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
                  }}
                  className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-medium"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.meta.color }}
                  />
                  <span className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>
                    {item.meta.shortLabel}
                  </span>
                  <span className={`font-bold font-display ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400">
            No savings recorded yet. Tap "Add Savings" to start tracking your emergency fund, bank accounts, and investments!
          </div>
        )}
      </div>

      {/* 3. PLATFORM BREAKDOWN CARDS (2 or 3 Column Grid) */}
      {platformBreakdown.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Platform Breakdown
            </h3>
            <span className={`text-[11px] ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Amounts & Allocations
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {platformBreakdown.map((item) => (
              <div
                key={item.type}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                  borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
                }}
                className="rounded-2xl border p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between transition-transform hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div
                    style={{ backgroundColor: item.meta.bgColor, color: item.meta.color }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-current/20 shrink-0"
                  >
                    {renderPlatformIcon(item.type, 'w-4 h-4')}
                  </div>
                  <span
                    style={{
                      backgroundColor: item.meta.bgColor,
                      color: item.meta.color,
                      borderColor: item.meta.borderColor,
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  >
                    {item.percent.toFixed(1)}%
                  </span>
                </div>

                <div>
                  <h4 className={`text-xs font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.meta.label}
                  </h4>
                  <div className="text-sm sm:text-base font-extrabold font-display tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(item.amount, currency)}
                  </div>
                  <span className={`text-[10px] block mt-0.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.count} deposit{item.count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SAVINGS HISTORY SECTION (Search, Filter Chips, and Entry Cards) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Savings History ({filteredEntries.length})
            </h3>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search note or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-1.5 text-xs rounded-xl border ${
                theme.isDark
                  ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-400 focus:border-emerald-400'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
              } focus:outline-none transition-all`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips by Platform Type */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedTypeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-emerald-600'
                : theme.isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Types
          </button>
          {(Object.keys(SAVINGS_PLATFORMS) as SavingsPlatformType[]).map((type) => {
            const meta = SAVINGS_PLATFORMS[type];
            const isSelected = selectedTypeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? `${meta.bgColor} ${meta.textColor} ${meta.borderColor} shadow-xs font-extrabold`
                    : theme.isDark
                    ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* History Entry Cards */}
        {filteredEntries.length === 0 ? (
          <div
            style={{
              backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
              borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
            }}
            className="rounded-2xl border p-8 text-center"
          >
            <PiggyBank className="w-8 h-8 mx-auto mb-2 text-slate-400 stroke-1" />
            <p className={`text-sm font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              No savings entries found.
            </p>
            <p className={`text-xs mt-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedTypeFilter !== 'ALL' || searchQuery
                ? 'Try clearing your search or filter.'
                : 'Click "+ Add Savings" above to log your first savings deposit.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const meta = SAVINGS_PLATFORMS[entry.type] || SAVINGS_PLATFORMS.OTHER;
              const displayLabel = entry.customTypeLabel || meta.label;

              return (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                    borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
                  }}
                  className="rounded-2xl border p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3 group transition-colors hover:border-emerald-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{ backgroundColor: meta.bgColor, color: meta.color }}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center border border-current/20 shrink-0"
                    >
                      {renderPlatformIcon(entry.type, 'w-5 h-5')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                          {displayLabel}
                        </span>
                        <span
                          style={{
                            backgroundColor: meta.bgColor,
                            color: meta.color,
                            borderColor: meta.borderColor,
                          }}
                          className="px-2 py-0.2 rounded-md text-[10px] font-bold border shrink-0 hidden sm:inline"
                        >
                          {meta.shortLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{entry.date ? formatDate(entry.date) : (entry.dateStr || 'Recent')}</span>
                        </span>
                        {entry.note && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className={`truncate ${theme.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {entry.note}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount + Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-extrabold font-display text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(entry.amount, currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(entry)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          theme.isDark
                            ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                        title="Edit entry"
                        aria-label="Edit savings entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id, entry.amount)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          theme.isDark
                            ? 'border-slate-700 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400'
                            : 'border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                        }`}
                        title="Delete entry"
                        aria-label="Delete savings entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT SAVINGS MODAL DIALOG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            style={{
              backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
              borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
            }}
            className="w-full max-w-md rounded-3xl border p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <h3 className={`text-base font-bold font-display ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingEntryId ? 'Edit Savings Entry' : 'Log New Savings'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4 pt-4">
              {/* Amount */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Amount ({currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold font-display text-emerald-600 dark:text-emerald-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="e.g. 10000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-8 pr-3 py-2.5 text-base font-bold rounded-2xl border ${
                      theme.isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-400'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    } focus:outline-none transition-colors`}
                  />
                </div>
              </div>

              {/* Platform / Type Selectable Chips */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Savings Platform / Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SAVINGS_PLATFORMS) as SavingsPlatformType[]).map((type) => {
                    const meta = SAVINGS_PLATFORMS[type];
                    const isSelected = platformType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPlatformType(type)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? `${meta.bgColor} ${meta.textColor} ${meta.borderColor} font-bold ring-2 ring-emerald-400/50 shadow-xs`
                            : theme.isDark
                            ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          style={{ backgroundColor: meta.bgColor, color: meta.color }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-current/20"
                        >
                          {renderPlatformIcon(type, 'w-3.5 h-3.5')}
                        </div>
                        <span className="text-xs truncate">{meta.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom type label if "OTHER" selected */}
              {platformType === 'OTHER' && (
                <div className="animate-fade-in">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Custom Platform Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PPF, Chit Fund, Crypto, Real Estate"
                    value={customTypeLabel}
                    onChange={(e) => setCustomTypeLabel(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-2xl border ${
                      theme.isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-400'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    } focus:outline-none transition-colors`}
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Date of Entry
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-2xl border ${
                      theme.isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                    } focus:outline-none transition-colors`}
                  />
                </div>
              </div>

              {/* Optional Note / Description */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Optional Note / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali bonus, SBI salary account balance, Zerodha SIP"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-2xl border ${
                    theme.isDark
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } focus:outline-none transition-colors`}
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-colors cursor-pointer ${
                    theme.isDark
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-2xl ${theme.accentBtnBg} ${theme.accentBtnText} font-bold text-xs shadow-md ${theme.accentShadow} hover:scale-105 active:scale-95 transition-all cursor-pointer`}
                >
                  {editingEntryId ? 'Save Changes' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
