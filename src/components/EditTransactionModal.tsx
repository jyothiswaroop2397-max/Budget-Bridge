import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Tag,
  Coffee,
  ShoppingBag,
  Car,
  FileText,
  Film,
  HeartPulse,
  Users,
  Store,
  Trash2,
  CheckCircle2,
  Calendar,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Category, Transaction } from '../types.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  currency: string;
  onClose: () => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onDeleteTransaction?: (id: string) => void;
}

interface CategoryOption {
  id: Category;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'Food', label: 'Food & Dining', icon: Coffee, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100/90 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800' },
  { id: 'Travel', label: 'Travel & Commute', icon: Car, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100/90 dark:bg-cyan-950/60', border: 'border-cyan-300 dark:border-cyan-800' },
  { id: 'Bills', label: 'Bills & Utilities', icon: FileText, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100/90 dark:bg-yellow-950/60', border: 'border-yellow-300 dark:border-yellow-800' },
  { id: 'Shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100/90 dark:bg-pink-950/60', border: 'border-pink-300 dark:border-pink-800' },
  { id: 'Health', label: 'Health & Medical', icon: HeartPulse, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100/90 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800' },
  { id: 'Entertainment', label: 'Entertainment', icon: Film, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100/90 dark:bg-purple-950/60', border: 'border-purple-300 dark:border-purple-800' },
  { id: 'Social', label: 'Social & Life', icon: Users, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100/90 dark:bg-teal-950/60', border: 'border-teal-300 dark:border-teal-800' },
  { id: 'Other', label: 'Other / General', icon: Tag, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-700' },
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  currency,
  onClose,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const { theme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<Category>('Other');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const toLocalDateStr = (ts?: number) => {
    const d = ts ? new Date(ts) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (transaction) {
      setSelectedCategory(transaction.category || 'Other');
      setMerchant(transaction.merchant || '');
      setAmount(transaction.amount?.toString() || '');
      setDateStr(toLocalDateStr(transaction.timestamp));
      setSavedFeedback(false);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isDebit = transaction.type === 'DEBIT';

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(amount);
    const validAmount = isNaN(num) || num <= 0 ? transaction.amount : Math.round(num * 100) / 100;
    const cleanMerchant = merchant.trim() || transaction.merchant;

    let newTimestamp = transaction.timestamp;
    if (dateStr) {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const oldDate = new Date(transaction.timestamp);
        newTimestamp = new Date(
          parts[0],
          parts[1] - 1,
          parts[2],
          oldDate.getHours() || 12,
          oldDate.getMinutes() || 0,
          0,
          0
        ).getTime();
      }
    }

    onUpdateTransaction(transaction.id, {
      category: selectedCategory,
      merchant: cleanMerchant,
      amount: validAmount,
      timestamp: newTimestamp,
    });

    setSavedFeedback(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleQuickCategorySelect = (newCategory: Category) => {
    setSelectedCategory(newCategory);
    // Instant save when clicking a category directly
    onUpdateTransaction(transaction.id, {
      category: newCategory,
    });
    setSavedFeedback(true);
    setTimeout(() => {
      onClose();
    }, 280);
  };

  const handleDelete = () => {
    if (onDeleteTransaction) {
      onDeleteTransaction(transaction.id);
      onClose();
    }
  };

  return (
    <div
      id="edit-transaction-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="edit-transaction-modal-container"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="w-full max-w-md border rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentText} flex items-center justify-center font-bold shadow-xs`}>
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                Change Category
              </h2>
              <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Click a category below to reclassify this payment
              </p>
            </div>
          </div>
          <button
            id="close-edit-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              theme.isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
          }}
          className="p-3.5 rounded-2xl border space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                {transaction.merchant}
              </span>
              {transaction.isVerified && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentBadgeText} text-[9px] font-bold shrink-0`}
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>SMS Verified</span>
                </span>
              )}
            </div>
            <span
              className={`text-base sm:text-lg font-extrabold font-display ${
                isDebit ? (theme.isDark ? 'text-white' : 'text-slate-900') : 'text-emerald-600'
              }`}
            >
              {isDebit ? '-' : '+'}
              {formatCurrency(transaction.amount, currency)}
            </span>
          </div>

          <div className={`flex items-center justify-between text-xs pt-1 border-t ${theme.isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200/80 text-slate-500'}`}>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatDate(transaction.timestamp)}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-slate-400" />
              {transaction.bankName || (transaction.source === 'sms_auto' ? 'Bank SMS' : 'Manual entry')}
            </span>
          </div>
        </div>

        {/* Category Picker Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-bold uppercase tracking-wider ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Select New Category
            </label>
            <span className="text-[11px] text-amber-500 font-semibold">
              Current: {selectedCategory}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const IconComp = cat.icon;

              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`cat-picker-${cat.id.toLowerCase()}`}
                  onClick={() => handleQuickCategorySelect(cat.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-200 text-left active:scale-95 cursor-pointer shadow-xs ${
                    isSelected
                      ? `${cat.bg} ${cat.border} ring-2 ring-amber-400/80 font-bold scale-[1.02]`
                      : theme.isDark
                      ? 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/80 dark:bg-black/40 shadow-xs' : 'bg-slate-100 dark:bg-slate-700/60'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <span className="text-xs font-semibold truncate">
                      {cat.id}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Merchant & Amount Editor */}
        <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-1">
              <label className={`block text-[11px] font-semibold mb-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Merchant / Item
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Store className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  style={{
                    backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:border-amber-400 ${
                    theme.isDark ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Amount ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                }}
                className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400 ${
                  theme.isDark ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                }}
                className={`w-full px-2.5 py-1.5 border rounded-xl text-xs font-medium focus:outline-none focus:border-amber-400 cursor-pointer ${
                  theme.isDark ? 'border-slate-700 text-white scheme-dark' : 'border-slate-200 text-slate-900 scheme-light'
                }`}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {onDeleteTransaction && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  theme.isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>

              <button
                type="submit"
                id="save-edit-tx-btn"
                className={`px-4 py-2 ${theme.accentBtnBg} ${theme.accentBtnText} font-bold rounded-xl text-xs shadow-sm ${theme.accentShadow} hover:brightness-105 transition-all flex items-center gap-1.5 active:scale-95`}
              >
                {savedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;
