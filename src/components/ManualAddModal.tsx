import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Store,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  FileText,
  Users,
  Calendar,
} from 'lucide-react';
import { Category, TransactionType, PeerBalanceType, PeerBalance } from '../types.js';
import { CURRENCIES } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';

export type AddModalMode = 'DEBIT' | 'CREDIT' | 'OWED_TO_YOU' | 'I_OWE';

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  initialType?: TransactionType | PeerBalanceType | AddModalMode;
  initialCategory?: Category;
  existingPeers?: PeerBalance[];
  onAddTransaction: (data: {
    amount: number;
    type: TransactionType;
    merchant: string;
    category: Category;
    timestamp?: number;
  }) => void;
  onAddPeerBalance?: (data: {
    name: string;
    type: PeerBalanceType;
    amount: number;
    note?: string;
  }) => void;
}

const DEFAULT_FRIEND_SUGGESTIONS = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Aakash', 'Vikram'];

// Local date string in YYYY-MM-DD format based on user's local timezone
const getTodayLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayLocalDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFriendlyDateLabel = (dateStr: string) => {
  if (!dateStr) return '';
  const today = getTodayLocalDateStr();
  const yesterday = getYesterdayLocalDateStr();
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  isOpen,
  onClose,
  currency,
  initialType = 'DEBIT',
  initialCategory = 'Food',
  existingPeers = [],
  onAddTransaction,
  onAddPeerBalance,
}) => {
  const { theme } = useTheme();

  const [mode, setMode] = useState<AddModalMode>('DEBIT');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState<string>(getTodayLocalDateStr);
  
  // Expense fields
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<Category>(initialCategory);

  // Income fields
  const [source, setSource] = useState('');

  // Peer balance fields (Owe Me & I Owe)
  const [friendName, setFriendName] = useState('');
  const [peerNote, setPeerNote] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      if (initialType === 'OWED_TO_YOU' || initialType === 'I_OWE') {
        setMode(initialType);
      } else if (initialType === 'CREDIT') {
        setMode('CREDIT');
      } else {
        setMode('DEBIT');
      }
      setCategory(initialCategory);
      setAmount('');
      setDateStr(getTodayLocalDateStr()); // Always defaults to today's date
      setMerchant('');
      setSource('');
      setFriendName('');
      setPeerNote('');
      setError(null);
    }
  }, [isOpen, initialType, initialCategory]);

  if (!isOpen) return null;

  const curr = CURRENCIES[currency] || CURRENCIES.INR;

  // Extract unique friend names from existing peers + default suggestions
  const knownFriends = Array.from(
    new Set([
      ...existingPeers.map((p) => p.name.trim()).filter(Boolean),
      ...DEFAULT_FRIEND_SUGGESTIONS,
    ])
  ).slice(0, 6);

  const calculateTimestamp = (str: string): number => {
    if (!str) return Date.now();
    const now = new Date();
    const parts = str.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return Date.now();
    }
    const [y, m, d] = parts;
    const isToday =
      y === now.getFullYear() &&
      m === now.getMonth() + 1 &&
      d === now.getDate();

    if (isToday) {
      return now.getTime();
    }
    // Set to 12:00 PM (noon) to avoid timezone boundary shifts
    return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    const cleanAmount = Math.round(num * 100) / 100;
    const chosenTimestamp = calculateTimestamp(dateStr);

    // Handle Expense
    if (mode === 'DEBIT') {
      const cleanMerchant = merchant.trim();
      if (!cleanMerchant) {
        setError('Please enter a merchant or description.');
        return;
      }
      onAddTransaction({
        amount: cleanAmount,
        type: 'DEBIT',
        merchant: cleanMerchant,
        category,
        timestamp: chosenTimestamp,
      });
      onClose();
      return;
    }

    // Handle Income
    if (mode === 'CREDIT') {
      const cleanSource = source.trim();
      if (!cleanSource) {
        setError('Please enter an income source (e.g. Salary, Client payment, Freelance).');
        return;
      }
      onAddTransaction({
        amount: cleanAmount,
        type: 'CREDIT',
        merchant: cleanSource,
        category: 'Other',
        timestamp: chosenTimestamp,
      });
      onClose();
      return;
    }

    // Handle Owe Me & I Owe
    if (mode === 'OWED_TO_YOU' || mode === 'I_OWE') {
      const cleanFriend = friendName.trim();
      if (!cleanFriend) {
        setError('Please enter a friend or contact name.');
        return;
      }
      if (onAddPeerBalance) {
        onAddPeerBalance({
          name: cleanFriend,
          type: mode,
          amount: cleanAmount,
          note: peerNote.trim() || undefined,
        });
      }
      onClose();
      return;
    }
  };

  const categories: Category[] = [
    'Food',
    'Travel',
    'Bills',
    'Shopping',
    'Health',
    'Entertainment',
    'Social',
    'Other',
  ];

  const getHeaderInfo = () => {
    switch (mode) {
      case 'DEBIT':
        return {
          title: 'Add Expense',
          subtitle: 'Record an outgoing purchase or spend',
          icon: <Tag className="w-4 h-4" />,
        };
      case 'CREDIT':
        return {
          title: 'Add Income',
          subtitle: 'Record incoming funds or salary',
          icon: <ArrowDownLeft className="w-4 h-4 text-emerald-500" />,
        };
      case 'OWED_TO_YOU':
        return {
          title: 'Add to Owe Me',
          subtitle: 'Record money someone owes you',
          icon: <ArrowDownLeft className={`w-4 h-4 ${theme.accentText}`} />,
        };
      case 'I_OWE':
        return {
          title: 'Add to I Owe',
          subtitle: 'Record money you need to repay',
          icon: <ArrowUpRight className="w-4 h-4 text-rose-500" />,
        };
    }
  };

  const header = getHeaderInfo();

  return (
    <div
      id="manual-add-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="manual-add-modal-container"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="w-full max-w-md border rounded-[26px] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-2 border-b ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentText} flex items-center justify-center font-bold shadow-xs`}>
              {header.icon}
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                {header.title}
              </h2>
              <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {header.subtitle}
              </p>
            </div>
          </div>
          <button
            id="close-manual-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              theme.isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Tab Mode Selector: Expense | Income | Owe Me | I Owe */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(241, 245, 249, 0.9)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
          }}
          className="grid grid-cols-4 gap-1 p-1 rounded-2xl border shadow-xs text-center"
        >
          {/* 1. Expense Tab */}
          <button
            type="button"
            id="tab-mode-expense"
            onClick={() => {
              setMode('DEBIT');
              setError(null);
            }}
            className={`py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-xs truncate ${
              mode === 'DEBIT'
                ? 'bg-rose-500/20 text-rose-700 border border-rose-500/40 shadow-xs'
                : theme.isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expense
          </button>

          {/* 2. Income Tab */}
          <button
            type="button"
            id="tab-mode-income"
            onClick={() => {
              setMode('CREDIT');
              setError(null);
            }}
            className={`py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-xs truncate ${
              mode === 'CREDIT'
                ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/40 shadow-xs'
                : theme.isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Income
          </button>

          {/* 3. Owe Me Tab */}
          <button
            type="button"
            id="tab-mode-oweme"
            onClick={() => {
              setMode('OWED_TO_YOU');
              setError(null);
            }}
            className={`py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-xs truncate ${
              mode === 'OWED_TO_YOU'
                ? `${theme.accentBadgeBg} ${theme.accentBadgeText} border ${theme.accentBadgeBorder} shadow-xs`
                : theme.isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Owe Me
          </button>

          {/* 4. I Owe Tab */}
          <button
            type="button"
            id="tab-mode-iowe"
            onClick={() => {
              setMode('I_OWE');
              setError(null);
            }}
            className={`py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-xs truncate ${
              mode === 'I_OWE'
                ? 'bg-rose-500/20 text-rose-700 border border-rose-500/50 shadow-xs'
                : theme.isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            I Owe
          </button>
        </div>

        {error && (
          <div className="p-2.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-xl text-center font-semibold animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Universal Amount Field */}
          <div className="space-y-1">
            <label className={`block text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Amount
            </label>
            <div className="relative">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base ${theme.isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                {curr.symbol}
              </span>
              <input
                id="modal-amount-input"
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                }}
                className={`w-full pl-9 pr-4 py-2 border rounded-xl font-semibold focus:outline-none focus:border-amber-400 text-lg shadow-xs ${
                  theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* TAB 1: EXPENSE FIELDS */}
          {mode === 'DEBIT' && (
            <>
              {/* Merchant / Description */}
              <div className="space-y-1">
                <label className={`block text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Merchant / Item
                </label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Store className="w-4 h-4" />
                  </span>
                  <input
                    id="expense-merchant-input"
                    type="text"
                    required
                    placeholder="e.g. Swiggy, Uber, Groceries, Amazon"
                    value={merchant}
                    onChange={(e) => {
                      setMerchant(e.target.value);
                      setError(null);
                    }}
                    style={{
                      backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                    }}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-amber-400 text-sm shadow-xs ${
                      theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Expense Category Chips */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold flex items-center gap-1 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Tag className="w-3.5 h-3.5" />
                  Expense Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all shadow-xs ${
                          isSelected
                            ? `${theme.accentBadgeBg} ${theme.accentBadgeText} ${theme.accentBadgeBorder} ring-1`
                            : theme.isDark
                            ? 'border-slate-800 text-slate-400 hover:bg-slate-800'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: INCOME FIELDS */}
          {mode === 'CREDIT' && (
            <div className="space-y-1">
              <label className={`block text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Income Source
              </label>
              <div className="relative">
                <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500`}>
                  <ArrowDownLeft className="w-4 h-4" />
                </span>
                <input
                  id="income-source-input"
                  type="text"
                  required
                  placeholder="e.g. Salary, Client payment, Freelance, Dividend, Refund"
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setError(null);
                  }}
                  style={{
                    backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                  }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-amber-400 text-sm shadow-xs ${
                    theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* TAB 3 & 4: OWE ME & I OWE FIELDS */}
          {(mode === 'OWED_TO_YOU' || mode === 'I_OWE') && (
            <>
              {/* Friend / Contact Name */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {mode === 'OWED_TO_YOU' ? 'Who owes you?' : 'Who do you owe?'}
                </label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="peer-friend-input"
                    type="text"
                    required
                    placeholder="e.g. Rahul, Priya, Amit, Sneha"
                    value={friendName}
                    onChange={(e) => {
                      setFriendName(e.target.value);
                      setError(null);
                    }}
                    style={{
                      backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                    }}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-amber-400 text-sm shadow-xs ${
                      theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Quick Friend Selector Chips */}
                {knownFriends.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className={`text-[10px] ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>Quick pick:</span>
                    {knownFriends.map((fn) => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => {
                          setFriendName(fn);
                          setError(null);
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          friendName.toLowerCase() === fn.toLowerCase()
                            ? `${theme.accentBadgeBg} ${theme.accentBadgeText} ${theme.accentBadgeBorder} font-bold`
                            : theme.isDark
                            ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {fn}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Purpose / Reason / Note */}
              <div className="space-y-1">
                <label className={`block text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Reason / Purpose (Optional)
                </label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <FileText className="w-4 h-4" />
                  </span>
                  <input
                    id="peer-note-input"
                    type="text"
                    placeholder={
                      mode === 'OWED_TO_YOU'
                        ? 'e.g. Dinner bill split, Movie tickets, Cab ride'
                        : 'e.g. Borrowed cash, Room rent share, Lunch split'
                    }
                    value={peerNote}
                    onChange={(e) => setPeerNote(e.target.value)}
                    style={{
                      backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                    }}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-amber-400 text-sm shadow-xs ${
                      theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </>
          )}

          {/* Date Selector Field (At the last part, just above record expense / income) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="modal-date-input"
                className={`text-xs font-semibold flex items-center gap-1.5 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <Calendar className={`w-3.5 h-3.5 ${theme.accentText}`} />
                <span>Date</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText}`}
                >
                  {getFriendlyDateLabel(dateStr)}
                </span>
              </label>

              {/* Quick helper preset buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="date-preset-today"
                  onClick={() => setDateStr(getTodayLocalDateStr())}
                  className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer font-bold ${
                    dateStr === getTodayLocalDateStr()
                      ? `${theme.accentBadgeBg} ${theme.accentBadgeText} ${theme.accentBadgeBorder} ring-1 ring-emerald-500/30`
                      : theme.isDark
                      ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  id="date-preset-yesterday"
                  onClick={() => setDateStr(getYesterdayLocalDateStr())}
                  className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer font-bold ${
                    dateStr === getYesterdayLocalDateStr()
                      ? `${theme.accentBadgeBg} ${theme.accentBadgeText} ${theme.accentBadgeBorder} ring-1 ring-emerald-500/30`
                      : theme.isDark
                      ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>

            <div className="relative">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Calendar className="w-4 h-4" />
              </span>
              <input
                id="modal-date-input"
                type="date"
                required
                value={dateStr}
                onChange={(e) => {
                  setDateStr(e.target.value);
                  setError(null);
                }}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-xl font-medium focus:outline-none focus:border-amber-400 text-sm shadow-xs cursor-pointer ${
                  theme.isDark
                    ? 'border-slate-800 text-white scheme-dark'
                    : 'border-slate-200 text-slate-900 scheme-light'
                }`}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="submit-manual-modal-btn"
            className={`w-full py-2.5 ${theme.accentBtnBg} ${theme.accentBtnText} font-bold rounded-xl shadow-sm ${theme.accentShadow} hover:brightness-105 transition-all flex items-center justify-center gap-2 text-sm active:scale-95`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {mode === 'DEBIT' && 'Record Expense'}
            {mode === 'CREDIT' && 'Record Income'}
            {mode === 'OWED_TO_YOU' && 'Add to Owe Me'}
            {mode === 'I_OWE' && 'Add to I Owe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualAddModal;
