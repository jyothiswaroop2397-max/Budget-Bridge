import React, { useState, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  Check,
  TrendingDown,
  Tag,
} from 'lucide-react';
import { Transaction } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import { formatCurrency } from '../utils/formatters.js';

interface CalendarMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  transactions?: Transaction[];
  currency?: string;
  monthlyCap?: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarMonthModal: React.FC<CalendarMonthModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  transactions = [],
  currency = 'INR',
  monthlyCap = 0,
}) => {
  const { theme } = useTheme();

  // Internal browsing year and month so user can preview before confirming or pick immediately
  const [viewYear, setViewYear] = useState<number>(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(selectedDate.getMonth());
  const [activeTab, setActiveTab] = useState<'calendar' | 'months'>('calendar');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Sync internal view with selectedDate when opened
  React.useEffect(() => {
    if (isOpen) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
      setSelectedDay(null);
    }
  }, [isOpen, selectedDate]);

  const realNow = useMemo(() => new Date(), []);
  const isCurrentRealMonth =
    viewYear === realNow.getFullYear() && viewMonth === realNow.getMonth();

  // Calculate monthly stats for the currently browsed month
  const currentViewMonthStats = useMemo(() => {
    let totalSpend = 0;
    let count = 0;
    const catSpend: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === 'DEBIT') {
        const d = new Date(tx.timestamp);
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
          totalSpend += tx.amount;
          count += 1;
          const c = tx.category || 'Other';
          catSpend[c] = (catSpend[c] || 0) + tx.amount;
        }
      }
    });

    let topCategory = 'None';
    let topCatAmount = 0;
    Object.entries(catSpend).forEach(([cat, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCategory = cat;
      }
    });

    return { totalSpend, count, topCategory };
  }, [transactions, viewYear, viewMonth]);

  // Aggregate spends per day for the calendar grid
  const daySpends = useMemo(() => {
    const map: Record<number, { amount: number; count: number; items: Transaction[] }> = {};
    transactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) {
          map[day] = { amount: 0, count: 0, items: [] };
        }
        if (tx.type === 'DEBIT') {
          map[day].amount += tx.amount;
        }
        map[day].count += 1;
        map[day].items.push(tx);
      }
    });
    return map;
  }, [transactions, viewYear, viewMonth]);

  // Aggregate spends per month for the year view
  const monthSpends = useMemo(() => {
    const map: Record<number, { amount: number; count: number }> = {};
    for (let m = 0; m < 12; m++) {
      map[m] = { amount: 0, count: 0 };
    }
    transactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      if (d.getFullYear() === viewYear && tx.type === 'DEBIT') {
        const m = d.getMonth();
        map[m].amount += tx.amount;
        map[m].count += 1;
      }
    });
    return map;
  }, [transactions, viewYear]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({
        day: d,
        isCurrentMonth: false,
        date: new Date(viewYear, viewMonth - 1, d),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(viewYear, viewMonth, i),
      });
    }

    // Next month padding to fill complete weeks
    const remaining = 42 - days.length; // 6 rows of 7
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          day: i,
          isCurrentMonth: false,
          date: new Date(viewYear, viewMonth + 1, i),
        });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const handleApplyMonth = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    onSelectDate(newDate);
    onClose();
  };

  const handleJumpToCurrent = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(now);
    onClose();
  };

  return (
    <div
      id="calendar-month-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="calendar-month-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.95)',
        }}
        className="relative w-full max-w-lg rounded-[28px] border shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Top Bar: Title, Tab Switcher & Close */}
        <div className="flex items-center justify-between border-b pb-3.5 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-2xl ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} flex items-center justify-center ${theme.accentText} shadow-xs`}
            >
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2
                className={`text-base font-bold font-display ${
                  theme.isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Calendar & Month Navigator
              </h2>
              <p className="text-[11px] text-slate-400">
                Browse spending history or select upcoming months
              </p>
            </div>
          </div>

          <button
            id="close-calendar-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              theme.isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
            }`}
            aria-label="Close Calendar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month / Year Navigator Row */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.8)',
            borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.8)',
          }}
          className="flex items-center justify-between p-2 rounded-2xl border gap-2"
        >
          <div className="flex items-center gap-1">
            <button
              id="calendar-prev-month-btn"
              onClick={handlePrevMonth}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                theme.isDark
                  ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs'
              }`}
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="calendar-next-month-btn"
              onClick={handleNextMonth}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                theme.isDark
                  ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs'
              }`}
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month & Year Title Display with direct Year Selector */}
          <div className="flex items-center gap-2">
            <button
              id="toggle-month-year-view-btn"
              onClick={() => setActiveTab(activeTab === 'calendar' ? 'months' : 'calendar')}
              className={`px-3 py-1.5 rounded-xl font-bold font-display text-sm sm:text-base transition-all border ${
                activeTab === 'months'
                  ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText}`
                  : theme.isDark
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-white border-slate-700/60'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-xs'
              }`}
              title="Click to toggle year/month picker"
            >
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            </button>
          </div>

          {/* Jump to Current / Today shortcut */}
          <button
            id="calendar-jump-today-btn"
            onClick={handleJumpToCurrent}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isCurrentRealMonth
                ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText} font-bold`
                : theme.isDark
                ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/50'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {isCurrentRealMonth ? 'Current' : 'Today'}
          </button>
        </div>

        {/* Monthly Summary Statistics Banner */}
        <div
          style={{
            backgroundColor: theme.isDark ? `${theme.bgCardInner}90` : 'rgba(241, 245, 249, 0.7)',
            borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
          }}
          className="grid grid-cols-3 gap-2 p-3 rounded-2xl border text-center"
        >
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Spend</div>
            <div
              id="calendar-month-total-spend"
              className={`text-sm sm:text-base font-extrabold font-display pt-0.5 ${
                currentViewMonthStats.totalSpend > monthlyCap
                  ? 'text-rose-500'
                  : theme.isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              {formatCurrency(currentViewMonthStats.totalSpend, currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Transactions</div>
            <div
              className={`text-sm sm:text-base font-extrabold font-display pt-0.5 ${
                theme.isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {currentViewMonthStats.count} logged
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Top Category</div>
            <div
              className={`text-xs sm:text-sm font-bold truncate pt-0.5 ${theme.accentText}`}
            >
              {currentViewMonthStats.topCategory}
            </div>
          </div>
        </div>

        {/* VIEW 1: 12-Month Year Picker Grid */}
        {activeTab === 'months' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Month in {viewYear}
              </span>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setViewYear((y) => y - 1)}
                  className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  {viewYear - 1}
                </button>
                <span className="font-bold text-slate-700 dark:text-slate-200">{viewYear}</span>
                <button
                  onClick={() => setViewYear((y) => y + 1)}
                  className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  {viewYear + 1}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SHORT_MONTH_NAMES.map((mName, idx) => {
                const isSelected =
                  selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === idx;
                const isBrowsed = viewMonth === idx;
                const stats = monthSpends[idx] || { amount: 0, count: 0 };
                const now = new Date();
                const isCurrent = now.getFullYear() === viewYear && now.getMonth() === idx;
                const isFuture =
                  viewYear > now.getFullYear() || (viewYear === now.getFullYear() && idx > now.getMonth());

                return (
                  <button
                    key={mName}
                    id={`month-pick-${viewYear}-${idx}`}
                    onClick={() => {
                      setViewMonth(idx);
                      handleApplyMonth(viewYear, idx);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between h-20 ${
                      isSelected
                        ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ring-2 ring-emerald-500/80 shadow-md`
                        : isBrowsed
                        ? 'border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                        : theme.isDark
                        ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">{mName}</span>
                      {isSelected && <Check className={`w-3.5 h-3.5 ${theme.accentText}`} />}
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold font-display">
                        {stats.amount > 0 ? formatCurrency(stats.amount, currency) : '—'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {stats.count > 0
                          ? `${stats.count} txns`
                          : isFuture
                          ? 'Upcoming'
                          : isCurrent
                          ? '0 txns'
                          : 'No spend'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: Calendar Days Grid */}
        {activeTab === 'calendar' && (
          <div className="space-y-2 animate-in fade-in duration-150">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w, idx) => (
                <div
                  key={w}
                  className={`text-[11px] font-bold py-1 ${
                    idx === 0 || idx === 6
                      ? 'text-slate-400'
                      : theme.isDark
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                const dayKey = cell.day;
                const spendInfo = cell.isCurrentMonth ? daySpends[dayKey] : null;
                const hasSpend = !!spendInfo && spendInfo.amount > 0;
                const isPickedDay =
                  cell.isCurrentMonth && selectedDay === dayKey;
                const isSelectedDateCell =
                  cell.isCurrentMonth &&
                  selectedDate.getFullYear() === viewYear &&
                  selectedDate.getMonth() === viewMonth &&
                  selectedDate.getDate() === cell.day;

                return (
                  <button
                    key={`${cell.day}-${idx}`}
                    onClick={() => {
                      if (!cell.isCurrentMonth) {
                        setViewMonth(cell.date.getMonth());
                        setViewYear(cell.date.getFullYear());
                      }
                      setSelectedDay(cell.day);
                    }}
                    className={`min-h-[46px] sm:min-h-[52px] p-1 rounded-xl border flex flex-col justify-between items-center transition-all relative ${
                      !cell.isCurrentMonth
                        ? 'opacity-30 border-transparent bg-transparent text-slate-400'
                        : isPickedDay
                        ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ring-2 ring-emerald-500 shadow-xs`
                        : isSelectedDateCell
                        ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : theme.isDark
                        ? 'bg-slate-800/40 hover:bg-slate-800/90 border-slate-700/40 text-slate-200'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        isPickedDay ? `${theme.accentBadgeText} font-bold` : ''
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Spend Indicator Badge or Dot */}
                    {hasSpend ? (
                      <div className="w-full flex flex-col items-center">
                        <span className="hidden sm:inline text-[9px] font-bold text-rose-500 truncate max-w-full px-0.5">
                          {formatCurrency(spendInfo.amount, currency)}
                        </span>
                        <span className="inline sm:hidden w-1.5 h-1.5 rounded-full bg-rose-500 my-0.5" />
                      </div>
                    ) : (
                      <span className="h-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Day Details Strip (if user clicked a day with transactions) */}
        {selectedDay && daySpends[selectedDay] && (
          <div
            style={{
              backgroundColor: theme.isDark ? theme.bgCardInner : '#F8FAFC',
              borderColor: theme.isDark ? theme.borderSubtle : '#E2E8F0',
            }}
            className="p-3 rounded-2xl border space-y-2 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={theme.isDark ? 'text-slate-200' : 'text-slate-800'}>
                {MONTH_NAMES[viewMonth]} {selectedDay}, {viewYear} Activity:
              </span>
              <span className="text-rose-500 font-display font-extrabold">
                {formatCurrency(daySpends[selectedDay].amount, currency)} total
              </span>
            </div>

            <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
              {daySpends[selectedDay].items.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/40 dark:border-slate-700/40 last:border-b-0"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="font-semibold truncate">{tx.merchant}</span>
                    <span className="text-[10px] text-slate-400">({tx.category})</span>
                  </div>
                  <span className="font-bold font-display text-rose-600 dark:text-rose-400 shrink-0">
                    -{formatCurrency(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Action Button: "View [Month Year] in Dashboard" */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleApplyMonth(viewYear, viewMonth)}
            className={`flex-1 py-3 px-4 rounded-2xl ${theme.accentBtnBg} text-white font-bold font-display text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all`}
          >
            <span>View {MONTH_NAMES[viewMonth]} {viewYear} in Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
