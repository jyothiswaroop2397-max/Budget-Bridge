import React, { useState } from 'react';
import { X, Plus, Users, ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';
import { PeerBalanceType } from '../types.js';
import { CURRENCIES } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';

interface AddPeerBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  initialType?: PeerBalanceType;
  onAddPeerBalance: (data: {
    name: string;
    type: PeerBalanceType;
    amount: number;
    note?: string;
  }) => void;
}

const QUICK_FRIENDS = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram'];

export const AddPeerBalanceModal: React.FC<AddPeerBalanceModalProps> = ({
  isOpen,
  onClose,
  currency,
  initialType = 'OWED_TO_YOU',
  onAddPeerBalance,
}) => {
  const { theme } = useTheme();

  const [type, setType] = useState<PeerBalanceType>(initialType);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync type if initialType changes when opened
  React.useEffect(() => {
    if (initialType) {
      setType(initialType);
    }
  }, [initialType, isOpen]);

  if (!isOpen) return null;

  const curr = CURRENCIES[currency] || CURRENCIES.INR;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a friend or contact name.');
      return;
    }

    onAddPeerBalance({
      name: name.trim(),
      type,
      amount: Math.round(num * 100) / 100,
      note: note.trim() || undefined,
    });

    onClose();
  };

  return (
    <div
      id="add-peer-balance-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.9)',
        }}
        className="w-full max-w-md border rounded-[24px] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-2 border-b ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentText} flex items-center justify-center shadow-xs`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>Log Peer Balance</h2>
              <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Track money owed to you or money you owe</p>
            </div>
          </div>
          <button
            id="close-add-peer-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              theme.isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Direction Toggle */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>Balance Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="select-owed-to-you-btn"
                onClick={() => setType('OWED_TO_YOU')}
                className={`py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 border transition-all shadow-xs ${
                  type === 'OWED_TO_YOU'
                    ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText} shadow-md`
                    : theme.isDark ? 'bg-[#090D16] border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className={`w-4 h-4 ${theme.accentText}`} />
                <span>Owe Me</span>
              </button>
              <button
                type="button"
                id="select-i-owe-btn"
                onClick={() => setType('I_OWE')}
                className={`py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 border transition-all shadow-xs ${
                  type === 'I_OWE'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-700 shadow-md'
                    : theme.isDark ? 'bg-[#090D16] border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
                <span>I Owe</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>Amount ({curr.symbol})</label>
            <div className="relative">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold ${theme.isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                {curr.symbol}
              </span>
              <input
                id="peer-amount-input"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF' }}
                className={`w-full pl-9 pr-4 py-2 border rounded-full text-base font-semibold focus:outline-none focus:border-amber-400 shadow-xs ${
                  theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
                autoFocus
              />
            </div>
          </div>

          {/* Friend / Contact Name */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>Friend / Contact Name</label>
            <input
              id="peer-name-input"
              type="text"
              placeholder="e.g. Rahul, Priya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF' }}
              className={`w-full px-4 py-2 border rounded-full text-sm focus:outline-none focus:border-amber-400 shadow-xs ${
                theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
            {/* Quick Friend Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_FRIENDS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setName(f)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-all shadow-xs ${
                    name === f
                      ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText} font-bold`
                      : theme.isDark
                      ? 'border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Note / Description */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>Note / Reason (Optional)</label>
            <input
              id="peer-note-input"
              type="text"
              placeholder="e.g. Lunch split, Movie tickets"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF' }}
              className={`w-full px-4 py-2 border rounded-full text-sm focus:outline-none focus:border-amber-400 shadow-xs ${
                theme.isDark ? 'border-slate-800 text-white placeholder-slate-500' : 'border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Action buttons */}
          <div className={`flex items-center justify-end gap-2 pt-3 border-t ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              id="cancel-add-peer-btn"
              onClick={onClose}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                theme.isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-peer-balance-btn"
              className={`flex items-center gap-2 px-5 py-2 rounded-full ${theme.accentBtnBg} ${theme.accentBtnText} text-xs font-bold transition-all shadow-sm ${theme.accentShadow} active:scale-95`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Balance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPeerBalanceModal;
