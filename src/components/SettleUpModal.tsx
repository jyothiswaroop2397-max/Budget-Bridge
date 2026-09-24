import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  Coins,
  Check,
} from 'lucide-react';
import { PeerBalance } from '../types.js';
import { formatCurrency } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  peer: PeerBalance | null;
  currency: string;
  onConfirmSettle: (peerId: string, amount: number) => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  peer,
  currency,
  onConfirmSettle,
}) => {
  const { theme } = useTheme();
  const [settleMode, setSettleMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state whenever a new peer is opened
  useEffect(() => {
    if (isOpen && peer) {
      setSettleMode('FULL');
      setPartialAmount('');
      setError(null);
      setIsSuccess(false);
    }
  }, [isOpen, peer]);

  if (!isOpen || !peer) return null;

  const isOwedToYou = peer.type === 'OWED_TO_YOU';
  const outstandingAmount = peer.amount;

  const handleFullSettle = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onConfirmSettle(peer.id, outstandingAmount);
      onClose();
    }, 450);
  };

  const handlePartialSettle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(partialAmount);

    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a partial amount greater than 0.');
      return;
    }

    if (parsed > outstandingAmount) {
      setError(
        `Partial amount cannot exceed the outstanding balance of ${formatCurrency(
          outstandingAmount,
          currency
        )}.`
      );
      return;
    }

    setError(null);
    setIsSuccess(true);
    setTimeout(() => {
      onConfirmSettle(peer.id, Math.round(parsed * 100) / 100);
      onClose();
    }, 450);
  };

  const parsedPartial = parseFloat(partialAmount);
  const validPartial = !isNaN(parsedPartial) && parsedPartial > 0 && parsedPartial <= outstandingAmount;
  const remainingAfterPartial = validPartial ? Math.max(0, outstandingAmount - parsedPartial) : outstandingAmount;

  return (
    <div
      id="settle-up-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="settle-up-modal-card"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="w-full max-w-sm sm:max-w-md border rounded-t-[28px] sm:rounded-[24px] p-4 sm:p-5 shadow-2xl space-y-3 relative overflow-hidden transition-all max-h-[85vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MOBILE DRAG PILL */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden -mt-1 mb-1.5" />

        {/* SUCCESS OVERLAY STATE */}
        {isSuccess && (
          <div
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-150 ${
              theme.isDark ? 'bg-slate-900/95' : 'bg-white/95'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 animate-bounce ${
                isOwedToYou ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}
            >
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className={`text-base font-bold font-display ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              Settlement Recorded!
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Updated balance for {peer.name} in real-time.
            </p>
          </div>
        )}

        {/* HEADER: Title & Close Button */}
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isOwedToYou
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className={`text-sm sm:text-base font-bold font-display leading-tight ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                Settle Up
              </h2>
            </div>
          </div>

          <button
            id="close-settle-up-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              theme.isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FRIEND HERO BALANCE CARD */}
        <div
          style={{
            backgroundColor: isOwedToYou
              ? theme.isDark ? 'rgba(6, 78, 59, 0.25)' : 'rgba(236, 253, 245, 0.95)'
              : theme.isDark ? 'rgba(136, 19, 55, 0.25)' : 'rgba(255, 241, 242, 0.95)',
            borderColor: isOwedToYou
              ? theme.isDark ? 'rgba(5, 150, 105, 0.35)' : 'rgba(167, 243, 208, 0.8)'
              : theme.isDark ? 'rgba(225, 29, 72, 0.35)' : 'rgba(254, 205, 211, 0.8)',
          }}
          className="p-3 rounded-xl border flex items-center justify-between gap-2.5 shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                isOwedToYou
                  ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-200/80 text-rose-900 border border-rose-300'
              }`}
            >
              {peer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className={`text-sm font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  {peer.name}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border flex items-center gap-0.5 ${
                    isOwedToYou
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {isOwedToYou ? <ArrowDownLeft className="w-2 h-2" /> : <ArrowUpRight className="w-2 h-2" />}
                  <span>{isOwedToYou ? 'Owes you' : 'You owe'}</span>
                </span>
              </div>
              <p className={`text-[11px] truncate ${isOwedToYou ? 'text-emerald-700/90 dark:text-emerald-300/90' : 'text-rose-700/90 dark:text-rose-300/90'}`}>
                {isOwedToYou
                  ? `${peer.name} owes you ${formatCurrency(outstandingAmount, currency)}`
                  : `You owe ${peer.name} ${formatCurrency(outstandingAmount, currency)}`}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className={`text-lg sm:text-xl font-extrabold font-display block ${
              isOwedToYou ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(outstandingAmount, currency)}
            </span>
          </div>
        </div>

        {/* SETTLEMENT OPTIONS PROMPT */}
        <div className="space-y-2.5">
          <label className={`block text-[11px] font-bold uppercase tracking-wider ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            How much are you settling?
          </label>

          {/* Mode Selector Tabs */}
          <div
            style={{
              backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(241, 245, 249, 0.9)',
            }}
            className="p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-800"
          >
            <button
              type="button"
              id="settle-mode-full-tab"
              onClick={() => {
                setSettleMode('FULL');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                settleMode === 'FULL'
                  ? isOwedToYou
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-rose-600 text-white shadow-xs'
                  : theme.isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Settle Fully</span>
            </button>

            <button
              type="button"
              id="settle-mode-partial-tab"
              onClick={() => {
                setSettleMode('PARTIAL');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                settleMode === 'PARTIAL'
                  ? isOwedToYou
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-rose-600 text-white shadow-xs'
                  : theme.isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-3 h-3" />
              <span>Settle Partially</span>
            </button>
          </div>

          {/* OPTION A: FULL SETTLEMENT VIEW */}
          {settleMode === 'FULL' && (
            <div className="space-y-2 pt-0.5 animate-in fade-in duration-150">
              <div
                style={{
                  backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.9)',
                }}
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between"
              >
                <span className={theme.isDark ? 'text-slate-400' : 'text-slate-600'}>
                  Settling Total:
                </span>
                <span className="font-bold font-display">
                  {formatCurrency(outstandingAmount, currency)}
                </span>
              </div>

              <button
                type="button"
                id="confirm-full-settle-btn"
                onClick={handleFullSettle}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-white ${
                  isOwedToYou
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Confirm Settle Fully ({formatCurrency(outstandingAmount, currency)})</span>
              </button>
            </div>
          )}

          {/* OPTION B: PARTIAL SETTLEMENT VIEW */}
          {settleMode === 'PARTIAL' && (
            <form onSubmit={handlePartialSettle} className="space-y-2 pt-0.5 animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    {currency === 'INR' ? '₹' : currency}
                  </span>
                  <input
                    id="partial-settle-amount-input"
                    type="number"
                    step="any"
                    min="1"
                    max={outstandingAmount}
                    placeholder={`Enter amount (e.g. ${Math.min(100, outstandingAmount)})`}
                    value={partialAmount}
                    onChange={(e) => {
                      setPartialAmount(e.target.value);
                      setError(null);
                    }}
                    autoFocus
                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 shadow-xs ${
                      theme.isDark
                        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500/40 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-emerald-500/30 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* QUICK FRACTION CHIPS */}
              <div className="flex items-center gap-1.5">
                {[0.25, 0.5, 0.75].map((fraction) => {
                  const val = Math.round(outstandingAmount * fraction);
                  if (val <= 0 || val >= outstandingAmount) return null;
                  return (
                    <button
                      key={fraction}
                      type="button"
                      onClick={() => {
                        setPartialAmount(val.toString());
                        setError(null);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                        theme.isDark
                          ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                          : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {fraction * 100}% ({formatCurrency(val, currency)})
                    </button>
                  );
                })}
              </div>

              {/* ERROR MESSAGE IF INVALID */}
              {error && (
                <div
                  id="partial-settle-error-msg"
                  className="p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* REMAINING PREVIEW */}
              <div
                style={{
                  backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.9)',
                }}
                className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] flex items-center justify-between"
              >
                <span className={theme.isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Remaining balance:
                </span>
                <span
                  className={`font-bold font-display ${
                    isOwedToYou ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(remainingAfterPartial, currency)}
                </span>
              </div>

              {/* CONFIRM BUTTON */}
              <button
                type="submit"
                id="confirm-partial-settle-btn"
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-white ${
                  isOwedToYou
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  Confirm Partial Settle
                  {validPartial ? ` (${formatCurrency(parsedPartial, currency)})` : ''}
                </span>
              </button>
            </form>
          )}
        </div>

        {/* CANCEL BUTTON */}
        <div className="pt-0.5">
          <button
            type="button"
            id="cancel-settle-up-btn"
            onClick={onClose}
            className={`w-full py-2 rounded-xl text-xs font-bold border transition-colors ${
              theme.isDark
                ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
