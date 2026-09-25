import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Tag,
  ArrowRight,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Receipt,
  Car,
  Utensils,
  Coffee,
  ShoppingBag,
  Film,
  Trash2,
  Bot,
  X,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  FileText,
  HeartPulse,
  Edit3,
  Calendar,
} from 'lucide-react';
import { Category, PeerBalance, PeerBalanceType, Transaction, TransactionType } from '../types.js';
import { formatCurrency, formatDate, CATEGORY_THEMES } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../hooks/useToast.js';
import { FinancialHealthCompactCard } from './FinancialHealthCard.js';
import {
  parseTransactionHeuristic,
  parsePeerBalanceHeuristic,
  classifyIntent,
  getRandomIntentReply,
  UserIntent,
} from '../utils/parser.js';

interface PageOverviewProps {
  monthlyCap: number;
  monthlyExpenditure: number;
  dailyLimit: number;
  spentToday: number;
  currency: string;
  categoryBreakdown: Record<Category, number>;
  transactions: Transaction[];
  peerBalances: PeerBalance[];
  totalOwedToYou: number;
  totalIOwe: number;
  savingsEntries?: import('../types/savings.js').SavingsEntry[];
  onOpenAddPeerModal: (defaultType: PeerBalanceType) => void;
  onSettlePeerBalance: (id: string) => void;
  onOpenSettleModal?: (peer: PeerBalance) => void;
  onSelectPeer?: (peer: PeerBalance) => void;
  onAddItemToPeer?: (peerId: string, item: { description: string; amount: number }) => void;
  onRemoveItemFromPeer?: (peerId: string, itemId: string) => void;
  onNavigateToPage: (pageIndex: number) => void;
  onSelectCategory?: (category: string) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onAddTransaction?: (tx: {
    amount: number;
    type: TransactionType;
    merchant: string;
    category: Category;
  }) => void;
  onAddPeerBalance?: (peer: {
    name: string;
    type: PeerBalanceType;
    amount: number;
    note?: string;
    direction?: 'GAVE' | 'RECEIVED';
    dateStr?: string;
    directPeer?: PeerBalance;
  }) => void;
  selectedDate?: Date;
  onResetToCurrentMonth?: () => void;
  onOpenCalendar?: () => void;
}

export const PageOverview: React.FC<PageOverviewProps> = ({
  monthlyCap,
  monthlyExpenditure,
  dailyLimit,
  spentToday,
  currency,
  categoryBreakdown,
  transactions,
  peerBalances,
  totalOwedToYou,
  totalIOwe,
  savingsEntries = [],
  onOpenAddPeerModal,
  onSettlePeerBalance,
  onOpenSettleModal,
  onAddItemToPeer,
  onRemoveItemFromPeer,
  onNavigateToPage,
  onSelectCategory,
  onUpdateTransaction,
  onAddTransaction,
  onAddPeerBalance,
  selectedDate,
  onResetToCurrentMonth,
  onOpenCalendar,
}) => {
  const { theme } = useTheme();
  const { showToast } = useToast();

  // Active category picker for recent payments
  const [activeRecentTxPickerId, setActiveRecentTxPickerId] = useState<string | null>(null);

  // Quick natural language input & Assistant chat state
  const [quickInput, setQuickInput] = useState('');
  const [isProcessingNl, setIsProcessingNl] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [assistantChatReply, setAssistantChatReply] = useState<{
    intent: Exclude<UserIntent, 'TRANSACTION'>;
    text: string;
    query: string;
  } | null>(null);

  // Expanded peer states for inline breakdown inside the cards
  const [expandedPeerId, setExpandedPeerId] = useState<string | null>(null);
  const [newReasonDesc, setNewReasonDesc] = useState('');
  const [newReasonAmount, setNewReasonAmount] = useState('');

  const togglePeerExpand = (peerId: string) => {
    if (expandedPeerId === peerId) {
      setExpandedPeerId(null);
    } else {
      setExpandedPeerId(peerId);
      setNewReasonDesc('');
      setNewReasonAmount('');
    }
  };

  const getReasonIcon = (desc: string) => {
    const lower = desc.toLowerCase();
    if (lower.includes('cab') || lower.includes('uber') || lower.includes('auto') || lower.includes('ride') || lower.includes('travel')) {
      return <Car className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    }
    if (lower.includes('pani puri') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('food') || lower.includes('swiggy') || lower.includes('zomato')) {
      return <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    }
    if (lower.includes('chai') || lower.includes('coffee') || lower.includes('snack') || lower.includes('tea')) {
      return <Coffee className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
    }
    if (lower.includes('movie') || lower.includes('cinema') || lower.includes('popcorn') || lower.includes('ticket')) {
      return <Film className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    }
    if (lower.includes('shopping') || lower.includes('cloth') || lower.includes('market')) {
      return <ShoppingBag className="w-3.5 h-3.5 text-pink-600 shrink-0" />;
    }
    return <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
  };

  const handleAddInlineReason = (e: React.FormEvent, peerId: string) => {
    e.preventDefault();
    const amt = parseFloat(newReasonAmount);
    if (!newReasonDesc.trim() || isNaN(amt) || amt <= 0) return;
    onAddItemToPeer?.(peerId, {
      description: newReasonDesc.trim(),
      amount: Math.round(amt * 100) / 100,
    });
    setNewReasonDesc('');
    setNewReasonAmount('');
  };

  // Target date & month calculation
  const targetDate = selectedDate || new Date();
  const realNow = useMemo(() => new Date(), []);
  
  const currentMonthStart = new Date(realNow.getFullYear(), realNow.getMonth(), 1).getTime();
  const targetMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getTime();

  const isCurrentMonth = targetMonthStart === currentMonthStart;
  const isPastMonth = targetMonthStart < currentMonthStart;
  const isFutureMonth = targetMonthStart > currentMonthStart;

  const formattedMonthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(targetDate);

  // Month-filtered transactions for this specific month
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.timestamp);
      return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
    });
  }, [transactions, targetDate]);

  // Monthly calculations
  const monthlyRemaining = Math.max(0, monthlyCap - monthlyExpenditure);
  const isMonthlyOver = monthlyExpenditure > monthlyCap;
  const monthlyPercent = monthlyCap > 0 ? Math.min(100, Math.round((monthlyExpenditure / monthlyCap) * 100)) : 0;

  // Daily & historical burn calculations
  const dailyRemaining = dailyLimit - spentToday;
  const dailyPercent = dailyLimit > 0 ? Math.min(100, Math.round((spentToday / dailyLimit) * 100)) : 0;
  const isDailyOver = spentToday > dailyLimit;

  const daysInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const averageDailySpendInTargetMonth =
    daysInTargetMonth > 0 ? Math.round((monthlyExpenditure / daysInTargetMonth) * 100) / 100 : 0;

  // Split peer balances into "Owe Me" (OWED_TO_YOU) and "I Owe" (I_OWE)
  const owedToYouList = peerBalances.filter((p) => p.type === 'OWED_TO_YOU');
  const iOweList = peerBalances.filter((p) => p.type === 'I_OWE');
  const netPeerBalance = totalOwedToYou - totalIOwe;

  // Automatically sort categories from highest spend to lowest spend
  const sortedCategories = useMemo<Category[]>(() => {
    const baseCats: Category[] = [
      'Food',
      'Travel',
      'Bills',
      'Shopping',
      'Health',
      'Entertainment',
      'Social',
      'Other',
    ];
    return [...baseCats].sort((a, b) => {
      const spendA = categoryBreakdown[a] || 0;
      const spendB = categoryBreakdown[b] || 0;
      if (spendB !== spendA) {
        return spendB - spendA; // Descending order: highest to lowest
      }
      return baseCats.indexOf(a) - baseCats.indexOf(b);
    });
  }, [categoryBreakdown]);

  const totalCategorySpend =
    (Object.values(categoryBreakdown) as number[]).reduce(
      (acc: number, v: number) => acc + (v || 0),
      0
    ) || 1;

  // Quick natural language & intent-driven submission handler
  const handleQuickNlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickInput.trim();
    if (!query || isProcessingNl) return;

    // STEP 1: Intent Classification (Checked FIRST to separate conversation from transactions)
    const intent = classifyIntent(query);

    // STEP 2: Handle conversational intents locally with fixed reply banks (Zero API latency)
    if (intent !== 'TRANSACTION') {
      const replyText = getRandomIntentReply(intent);
      setAssistantChatReply({
        intent,
        text: replyText,
        query,
      });
      setQuickFeedback(null);
      setQuickInput('');
      return;
    }

    // STEP 3: Handle TRANSACTION intent — clear previous chat bubble and parse transaction
    setAssistantChatReply(null);
    setIsProcessingNl(true);
    setQuickFeedback(null);

    try {
      // 1. Peer balance check ("X owes me Y" statements)
      const parsedPeer = parsePeerBalanceHeuristic(query);
      if (parsedPeer && onAddPeerBalance) {
        onAddPeerBalance({
          name: parsedPeer.name,
          type: parsedPeer.type,
          amount: parsedPeer.amount,
          note: parsedPeer.note,
        });
        setQuickFeedback(
          parsedPeer.type === 'OWED_TO_YOU'
            ? `✓ Logged: ${parsedPeer.name} owes you ${formatCurrency(parsedPeer.amount, currency)}`
            : `✓ Logged: You owe ${parsedPeer.name} ${formatCurrency(parsedPeer.amount, currency)}`
        );
        setQuickInput('');
        return;
      }

      // 2. Call Gemini AI-backed endpoint FIRST to accurately parse amount, merchant, and category
      let serverSuccess = false;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: query,
            budgetContext: {
              monthlyCap,
              monthlyExpenditure,
              dailyLimit,
              spentToday,
              currency,
              totalOwedToYou,
              totalIOwe,
              peerBalances,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();

          // Handle structured proposal or transaction parsing from Gemini
          if (data.proposal && data.proposal.type === 'TRANSACTION' && data.proposal.data?.amount > 0 && onAddTransaction) {
            const txData = data.proposal.data;
            onAddTransaction({
              amount: txData.amount,
              type: txData.type || 'DEBIT',
              merchant: txData.merchant || 'Expense',
              category: txData.category || 'Other',
            });
            const msg = `✓ Logged ${formatCurrency(txData.amount, currency)} for ${txData.merchant} (${txData.category || 'Other'})`;
            setQuickFeedback(msg);
            showToast(msg, 'success');
            setQuickInput('');
            serverSuccess = true;
            return;
          } else if (data.mode === 'TRANSACTION_PARSING' && data.transaction && data.transaction.amount > 0 && onAddTransaction) {
            onAddTransaction({
              amount: data.transaction.amount,
              type: data.transaction.type || 'DEBIT',
              merchant: data.transaction.merchant || 'Expense',
              category: data.transaction.category || 'Other',
            });
            const msg = `✓ Logged ${formatCurrency(data.transaction.amount, currency)} for ${data.transaction.merchant} (${data.transaction.category || 'Other'})`;
            setQuickFeedback(msg);
            showToast(msg, 'success');
            setQuickInput('');
            serverSuccess = true;
            return;
          } else if (data.peerLedger?.peer && onAddPeerBalance) {
            onAddPeerBalance({
              directPeer: data.peerLedger.peer,
              name: data.peerLedger.peer.name,
              type: data.peerLedger.peer.type,
              amount: data.peerLedger.peer.amount,
            });
            const msg = data.reply || `✓ Updated ledger for ${data.peerLedger.peer.name}`;
            setQuickFeedback(msg);
            showToast(msg, 'success');
            setQuickInput('');
            serverSuccess = true;
            return;
          } else if (data.proposal && data.proposal.type === 'PEER_DEBT' && data.proposal.data && onAddPeerBalance) {
            const peerData = data.proposal.data;
            onAddPeerBalance({
              name: peerData.name,
              type: peerData.type,
              amount: peerData.amount,
              note: peerData.note,
            });
            const msg = peerData.type === 'OWED_TO_YOU'
              ? `✓ Logged: ${peerData.name} owes you ${formatCurrency(peerData.amount, currency)}`
              : `✓ Logged: You owe ${peerData.name} ${formatCurrency(peerData.amount, currency)}`;
            setQuickFeedback(msg);
            showToast(msg, 'success');
            setQuickInput('');
            serverSuccess = true;
            return;
          } else if (data.mode === 'PEER_BALANCE' && data.peerBalance && onAddPeerBalance) {
            onAddPeerBalance({
              name: data.peerBalance.name,
              type: data.peerBalance.type,
              amount: data.peerBalance.amount,
              note: data.peerBalance.note,
            });
            const msg = data.peerBalance.type === 'OWED_TO_YOU'
              ? `✓ Logged: ${data.peerBalance.name} owes you ${formatCurrency(data.peerBalance.amount, currency)}`
              : `✓ Logged: You owe ${data.peerBalance.name} ${formatCurrency(data.peerBalance.amount, currency)}`;
            setQuickFeedback(msg);
            showToast(msg, 'success');
            setQuickInput('');
            serverSuccess = true;
            return;
          } else if (data.reply && data.intentCategory === 'GENERAL_CHAT') {
            setQuickFeedback(data.reply);
            setQuickInput('');
            serverSuccess = true;
            return;
          }
        } else {
          console.warn('AI agent returned status:', res.status);
          showToast('AI assistant server unavailable. Using offline parser.', 'info');
        }
      } catch (networkErr) {
        console.warn('AI server request failed or timed out, using offline keyword fallback:', networkErr);
        showToast('AI server request timed out. Using offline parser.', 'info');
      }

      // 3. OFFLINE / NETWORK FALLBACK: Only if AI server failed, timed out, or was unreachable
      if (!serverSuccess) {
        const parsedTx = parseTransactionHeuristic(query);
        if (parsedTx && parsedTx.amount > 0 && onAddTransaction) {
          onAddTransaction({
            amount: parsedTx.amount,
            type: parsedTx.type,
            merchant: parsedTx.merchant,
            category: parsedTx.category,
          });
          const msg = `✓ Logged ${formatCurrency(parsedTx.amount, currency)} for ${parsedTx.merchant} (${parsedTx.category})`;
          setQuickFeedback(msg);
          showToast(msg, 'success');
          setQuickInput('');
        } else {
          setQuickFeedback('Could not detect expense amount.');
          showToast('Could not detect an expense amount in your input.', 'error');
        }
      }
    } catch (err) {
      console.warn('Quick NL parsing exception:', err);
      // General error boundary fallback
      const parsedTx = parseTransactionHeuristic(query);
      if (parsedTx && parsedTx.amount > 0 && onAddTransaction) {
        onAddTransaction({
          amount: parsedTx.amount,
          type: parsedTx.type,
          merchant: parsedTx.merchant,
          category: parsedTx.category,
        });
        const msg = `✓ Logged ${formatCurrency(parsedTx.amount, currency)} for ${parsedTx.merchant} (${parsedTx.category})`;
        setQuickFeedback(msg);
        showToast(msg, 'success');
        setQuickInput('');
      } else {
        setQuickFeedback('Could not detect expense amount.');
        showToast('Could not detect an expense amount in your input.', 'error');
      }
    } finally {
      setIsProcessingNl(false);
      setTimeout(() => setQuickFeedback(null), 4000);
    }
  };

  // Handler to open specific category in Analytics & Transactions
  const handleCategoryClick = (cat: Category) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
    onNavigateToPage(1);
  };

  return (
    <section
      id="page-1-dashboard"
      className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-between gap-3 sm:gap-4.5 px-1 sm:px-4 py-1 select-none min-h-0"
    >
      {/* Notice Bar when browsing previous or upcoming months */}
      {!isCurrentMonth && (
        <div
          id={isFutureMonth ? 'future-month-notice-banner' : 'past-month-archive-banner'}
          style={{
            backgroundColor: isFutureMonth
              ? (theme.isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(240, 249, 255, 0.9)')
              : (theme.isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(254, 243, 199, 0.85)'),
            borderColor: isFutureMonth
              ? (theme.isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(125, 211, 252, 0.85)')
              : (theme.isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(251, 191, 36, 0.6)'),
          }}
          className="p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-2 shadow-xs backdrop-blur-md animate-in fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                isFutureMonth
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {isFutureMonth ? 'Viewing Upcoming Month: ' : 'Browsing Historical Values: '}
                <span className={isFutureMonth ? 'text-sky-700 dark:text-sky-300 font-extrabold' : 'text-amber-700 dark:text-amber-300 font-extrabold'}>
                  {formattedMonthName}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                {isFutureMonth ? (
                  <>
                    Future planning period • Planned budget: <strong className="text-slate-900 dark:text-white font-display">{formatCurrency(monthlyCap, currency)}</strong>
                    {monthTransactions.length > 0 && ` • ${monthTransactions.length} recorded`}
                  </>
                ) : (
                  <>
                    Total expenditure: <strong className="text-slate-900 dark:text-white font-display">{formatCurrency(monthlyExpenditure, currency)}</strong>
                    {' '}• {monthTransactions.length} transaction{monthTransactions.length !== 1 ? 's' : ''} recorded
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenCalendar && (
              <button
                id="banner-calendar-open-btn"
                type="button"
                onClick={onOpenCalendar}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                Calendar
              </button>
            )}
            {onResetToCurrentMonth && (
              <button
                id="banner-reset-current-btn"
                type="button"
                onClick={onResetToCurrentMonth}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${theme.accentBtnBg} text-white shadow-xs hover:opacity-90 transition-all cursor-pointer`}
              >
                Return to Today
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. HERO SPEND CONTROLS CARD: Frosted white glassmorphic card, 24px radius */}
      <div
        id="combined-spend-card"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(255, 255, 255, 0.9)',
        }}
        className="rounded-[24px] border p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl shrink-0 relative overflow-hidden"
      >
        {/* Ambient subtle glow */}
        <div
          style={{ backgroundColor: `${theme.accentColor}12` }}
          className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 space-y-3 sm:space-y-3.5">
          {/* Top row: Left = Daily / Archive header; Right = Monthly expenditure */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl ${
                  isCurrentMonth
                    ? `${theme.accentBadgeBg} ${theme.accentText} border ${theme.accentBadgeBorder}`
                    : isFutureMonth
                    ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                } flex items-center justify-center shrink-0 shadow-xs`}
              >
                {isCurrentMonth ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider truncate ${theme.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {isCurrentMonth
                      ? 'Daily Expenditure'
                      : isFutureMonth
                      ? `${formattedMonthName} Budget Plan`
                      : `${formattedMonthName} Values`}
                  </span>
                  {isCurrentMonth ? (
                    <span className={`text-[10px] ${theme.accentText} hidden sm:flex items-center gap-1 font-semibold`}>
                      <span
                        style={{ backgroundColor: theme.accentColor }}
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                      />
                      Live SMS Sync
                    </span>
                  ) : isFutureMonth ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-700/60 text-sky-800 dark:text-sky-300 font-bold">
                      Upcoming Month
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-bold">
                      Historical Month
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly expenditure in small right corner */}
            <div id="monthly-spend-corner" className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5">
                <TrendingUp className={`w-3.5 h-3.5 ${theme.accentText} shrink-0`} />
                <span className={`text-[11px] uppercase tracking-wider font-semibold ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isCurrentMonth ? 'Monthly' : formattedMonthName}
                </span>
                <span
                  id="total-monthly-spend-counter"
                  className={`font-bold text-sm sm:text-base font-display ml-0.5 ${theme.isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  {formatCurrency(monthlyExpenditure, currency)}
                </span>
              </div>
              <div className={`text-[11px] flex items-center justify-end gap-1.5 pt-0.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Cap {formatCurrency(monthlyCap, currency)}</span>
                <span className="opacity-60">•</span>
                <span className={isMonthlyOver ? 'text-rose-600 font-semibold' : `${theme.accentText} font-semibold`}>
                  {isMonthlyOver
                    ? `+${formatCurrency(monthlyExpenditure - monthlyCap, currency)} over`
                    : `${formatCurrency(monthlyRemaining, currency)} left`}
                </span>
              </div>
            </div>
          </div>

          {/* Big Numbers Row and Status Pill */}
          <div className="flex items-baseline justify-between gap-2 flex-wrap pt-0.5">
            <div className="flex items-baseline gap-2.5">
              <span
                id="spent-today-counter"
                className={`text-3xl sm:text-4xl font-extrabold font-display tracking-tight ${theme.isDark ? 'text-white' : 'text-slate-900'}`}
              >
                {formatCurrency(isCurrentMonth ? spentToday : monthlyExpenditure, currency)}
              </span>
              <span className={`text-xs sm:text-sm font-medium ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isCurrentMonth
                  ? `/ ${formatCurrency(dailyLimit, currency)} daily budget`
                  : `/ ${formatCurrency(monthlyCap, currency)} monthly cap`}
              </span>
            </div>

            <div
              id="daily-remaining-pill"
              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-xs ${
                isCurrentMonth
                  ? isDailyOver
                    ? 'bg-rose-100/90 border-rose-300 text-rose-700'
                    : `${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentBadgeText}`
                  : isFutureMonth
                  ? 'bg-sky-100/90 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300'
                  : isMonthlyOver
                  ? 'bg-rose-100/90 border-rose-300 text-rose-700'
                  : `${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentBadgeText}`
              }`}
            >
              {isCurrentMonth
                ? isDailyOver
                  ? `${formatCurrency(Math.abs(dailyRemaining), currency)} over`
                  : `${formatCurrency(dailyRemaining, currency)} left today`
                : isFutureMonth
                ? `${formatCurrency(monthlyRemaining, currency)} available`
                : `Avg ${formatCurrency(averageDailySpendInTargetMonth, currency)}/day`}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div
              style={{ backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(226, 232, 240, 0.7)' }}
              className="w-full h-2.5 sm:h-3 rounded-full overflow-hidden border border-slate-200/40 shadow-inner"
            >
              <div
                id="daily-limit-progress-bar"
                className={`h-full rounded-full transition-all duration-500 ${
                  (!isCurrentMonth ? isMonthlyOver : isDailyOver)
                    ? 'bg-rose-500'
                    : (!isCurrentMonth ? monthlyPercent : dailyPercent) > 80
                    ? 'bg-amber-400'
                    : `bg-gradient-to-r ${theme.progressGradient} ${theme.progressShadow}`
                }`}
                style={{ width: `${Math.min(100, !isCurrentMonth ? monthlyPercent : dailyPercent)}%` }}
              />
            </div>

            <div className={`flex items-center justify-between text-[11px] sm:text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>
                {isCurrentMonth ? (
                  <>
                    Daily Limit: <strong className={theme.isDark ? 'text-slate-200' : 'text-slate-800'}>{formatCurrency(dailyLimit, currency)}</strong>
                  </>
                ) : isFutureMonth ? (
                  <>
                    Planned Cap: <strong className={theme.isDark ? 'text-slate-200' : 'text-slate-800'}>{formatCurrency(monthlyCap, currency)}</strong>
                  </>
                ) : (
                  <>
                    Total Budget: <strong className={theme.isDark ? 'text-slate-200' : 'text-slate-800'}>{formatCurrency(monthlyCap, currency)}</strong>
                  </>
                )}
              </span>
              <span className={`font-semibold ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {isCurrentMonth
                  ? `${dailyPercent}% spent today`
                  : isFutureMonth
                  ? `${monthlyPercent}% committed`
                  : `${monthlyPercent}% of budget spent`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL HEALTH SCORE COMPACT WIDGET (Navigates to Full Card on Analytics) */}
      <FinancialHealthCompactCard
        data={{
          transactions,
          currency,
          monthlyCap,
          monthlyExpenditure,
          peerBalances,
          currentSavings: savingsEntries.reduce((sum, s) => sum + s.amount, 0),
        }}
        onClick={() => onNavigateToPage(1)}
      />

      {/* 2. PEER BALANCES SECTION: "Owe Me" & "I Owe" (Always beside each other in 2 columns) */}
      <div
        id="peer-balances-overview-section"
        className="grid grid-cols-2 gap-2 sm:gap-4 shrink-0 items-stretch"
      >
        {/* CARD A: "Owe Me" (Pending Assets / Friends owe me) */}
        <div
          id="card-owed-to-you"
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? `${theme.accentColor}40` : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[20px] sm:rounded-[24px] border p-2.5 sm:p-5 flex flex-col justify-between space-y-2 sm:space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl relative overflow-hidden h-full min-w-0"
        >
          {/* Header row with + Add button */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
                <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-[11px] sm:text-sm font-bold uppercase tracking-wider truncate ${theme.isDark ? 'text-white' : 'text-slate-800'}`}>
                  Owe Me
                </h3>
              </div>
            </div>

            <button
              id="add-owed-to-you-btn"
              onClick={() => onOpenAddPeerModal('OWED_TO_YOU')}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 text-[10px] sm:text-[11px] font-bold flex items-center gap-0.5 sm:gap-1 transition-all shadow-xs active:scale-95 shrink-0"
              title="Add money someone owes you"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>

          {/* Big Amount Counter */}
          <div className="flex items-baseline justify-between pt-0.5 min-w-0">
            <div className="min-w-0 flex-1">
              <div
                id="total-owed-to-you-counter"
                className="text-base sm:text-2xl md:text-3xl font-extrabold font-display text-emerald-700 tracking-tight truncate"
              >
                +{formatCurrency(totalOwedToYou, currency)}
              </div>
              <span className={`text-[10px] sm:text-xs truncate block font-medium ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {owedToYouList.length} friend{owedToYouList.length !== 1 ? 's' : ''} owe you
              </span>
            </div>

            <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-800 shrink-0 shadow-xs">
              Pending Assets
            </span>
          </div>

          {/* Items List (Rounded Capsules with Inline Expanding Breakdown) */}
          <div className="space-y-1.5 sm:space-y-2 pt-0.5 flex-1 max-h-[240px] sm:max-h-[280px] overflow-y-auto no-scrollbar flex flex-col justify-start">
            {owedToYouList.length === 0 ? (
              <div
                style={{ backgroundColor: theme.isDark ? `${theme.bgCardInner}a0` : 'rgba(248, 250, 252, 0.7)' }}
                className="flex-1 flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/60 text-center text-[11px] sm:text-xs text-slate-400"
              >
                No pending receivables.
              </div>
            ) : (
              owedToYouList.map((item) => {
                const isExpanded = expandedPeerId === item.id;
                const itemsList = item.items && item.items.length > 0 ? item.items : [
                  { id: `item-${item.id}-0`, description: item.note || 'Expense split', amount: item.amount }
                ];

                return (
                  <div
                    key={item.id}
                    id={`peer-item-${item.id}`}
                    style={{
                      backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                      borderColor: isExpanded
                        ? 'rgba(16, 185, 129, 0.6)'
                        : theme.isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(167, 243, 208, 0.9)',
                    }}
                    className={`rounded-xl sm:rounded-2xl border ${
                      isExpanded ? 'shadow-md ring-1 ring-emerald-300/60 dark:ring-emerald-500/30' : 'shadow-xs'
                    } overflow-hidden transition-all`}
                  >
                    {/* Primary Friend Row */}
                    <div
                      onClick={() => togglePeerExpand(item.id)}
                      className={`p-2 sm:px-3 sm:py-2 flex flex-col min-[520px]:flex-row min-[520px]:items-center justify-between gap-1 min-[520px]:gap-1.5 transition-all cursor-pointer select-none ${
                        isExpanded
                          ? theme.isDark ? 'bg-emerald-950/40' : 'bg-emerald-50/80'
                          : theme.isDark ? 'hover:bg-slate-800/70' : 'hover:bg-emerald-50/50'
                      }`}
                      title="Click to toggle reasons & breakdown"
                    >
                      {/* Name & Avatar + Amount (on mobile) */}
                      <div className="min-w-0 flex-1 flex items-center justify-between min-[520px]:justify-start gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 shadow-2xs">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`text-[11px] sm:text-sm font-bold truncate block ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</span>
                        </div>
                        <span className="min-[520px]:hidden text-[11px] font-bold font-display text-emerald-700 dark:text-emerald-400 shrink-0">
                          +{formatCurrency(item.amount, currency)}
                        </span>
                      </div>

                      {/* Desktop Amount + Settle and Chevron */}
                      <div className="flex items-center justify-between min-[520px]:justify-end gap-1 sm:gap-1.5 shrink-0 pt-1 min-[520px]:pt-0 border-t min-[520px]:border-t-0 border-emerald-100/60 dark:border-slate-800">
                        <span className="hidden min-[520px]:inline text-xs sm:text-sm font-bold font-display text-emerald-700 dark:text-emerald-400">
                          +{formatCurrency(item.amount, currency)}
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          <div className="text-slate-400 p-0.5">
                            {isExpanded ? <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                          </div>
                          <button
                            id={`settle-peer-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenSettleModal) {
                                onOpenSettleModal(item);
                              } else {
                                onSettlePeerBalance(item.id);
                              }
                            }}
                            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/90 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 transition-colors shadow-xs text-[10px] sm:text-[11px] font-bold"
                            title={`Settle ${item.name}'s balance`}
                            aria-label="Settle balance"
                          >
                            Settle
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline Reasons Breakdown (when clicked) */}
                    {isExpanded && (
                      <div className={`p-2 sm:px-3 sm:py-2.5 border-t border-emerald-100 dark:border-slate-800 ${
                        theme.isDark ? 'bg-slate-900/40' : 'bg-emerald-50/40'
                      } space-y-1.5 animate-in fade-in duration-150`}>
                        <div className="text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Breakdown:</span>
                          <span>{itemsList.length} item{itemsList.length !== 1 ? 's' : ''}</span>
                        </div>

                        {itemsList.map((reason, rIdx) => (
                          <div
                            key={reason.id || rIdx}
                            className={`flex items-center justify-between text-xs py-1 px-1.5 sm:py-1.5 sm:px-2 rounded-lg sm:rounded-xl ${
                              theme.isDark ? 'bg-slate-800/90 border-slate-700/60' : 'bg-white border-emerald-200/80 shadow-2xs'
                            } border gap-1`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              {getReasonIcon(reason.description)}
                              <span className={`truncate font-medium text-[10px] sm:text-[11px] ${theme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {reason.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-bold font-display text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(reason.amount, currency)}
                              </span>
                              {onRemoveItemFromPeer && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveItemFromPeer(item.id, reason.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors"
                                  title="Remove this reason"
                                >
                                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Inline Add Reason for this contact */}
                        {onAddItemToPeer && (
                          <form
                            onSubmit={(e) => handleAddInlineReason(e, item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-1 pt-1"
                          >
                            <input
                              type="text"
                              placeholder="Reason"
                              value={newReasonDesc}
                              onChange={(e) => setNewReasonDesc(e.target.value)}
                              className={`flex-1 min-w-0 px-2 py-1 text-[10px] sm:text-[11px] rounded-lg sm:rounded-xl border ${
                                theme.isDark
                                  ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:border-emerald-400'
                                  : 'border-emerald-200 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300'
                              } focus:outline-none`}
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="Amt"
                                value={newReasonAmount}
                                onChange={(e) => setNewReasonAmount(e.target.value)}
                                className={`w-14 sm:w-16 px-1.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg sm:rounded-xl border ${
                                  theme.isDark
                                    ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:border-emerald-400'
                                    : 'border-emerald-200 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300'
                                } focus:outline-none`}
                              />
                              <button
                                type="submit"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold flex items-center gap-0.5 shrink-0 shadow-xs active:scale-95 transition-transform"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                                <span>Add</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CARD B: "I Owe" (Pending Liabilities / I owe friends) */}
        <div
          id="card-i-owe"
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[20px] sm:rounded-[24px] border p-2.5 sm:p-5 flex flex-col justify-between space-y-2 sm:space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl relative overflow-hidden h-full min-w-0"
        >
          {/* Header row with + Add button */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-pink-100 border border-pink-300 flex items-center justify-center text-pink-700 shrink-0 shadow-xs">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-[11px] sm:text-sm font-bold uppercase tracking-wider truncate ${theme.isDark ? 'text-white' : 'text-slate-800'}`}>
                  I Owe
                </h3>
              </div>
            </div>

            <button
              id="add-i-owe-btn"
              onClick={() => onOpenAddPeerModal('I_OWE')}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-pink-100 hover:bg-pink-200 border border-pink-300 text-pink-800 text-[10px] sm:text-[11px] font-bold flex items-center gap-0.5 sm:gap-1 transition-all shadow-xs active:scale-95 shrink-0"
              title="Add money you owe someone"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>

          {/* Big Amount Counter */}
          <div className="flex items-baseline justify-between pt-0.5 min-w-0">
            <div className="min-w-0 flex-1">
              <div
                id="total-i-owe-counter"
                className="text-base sm:text-2xl md:text-3xl font-extrabold font-display text-rose-600 tracking-tight truncate"
              >
                -{formatCurrency(totalIOwe, currency)}
              </div>
              <span className={`text-[10px] sm:text-xs truncate block font-medium ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                You owe {iOweList.length} friend{iOweList.length !== 1 ? 's' : ''}
              </span>
            </div>

            <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full bg-pink-100 border border-pink-300 text-[10px] font-bold text-pink-800 shrink-0 shadow-xs">
              Pending Liabilities
            </span>
          </div>

          {/* Items List (Rounded Capsules with Inline Expanding Breakdown) */}
          <div className="space-y-1.5 sm:space-y-2 pt-0.5 flex-1 max-h-[240px] sm:max-h-[280px] overflow-y-auto no-scrollbar flex flex-col justify-start">
            {iOweList.length === 0 ? (
              <div
                style={{ backgroundColor: theme.isDark ? `${theme.bgCardInner}a0` : 'rgba(248, 250, 252, 0.7)' }}
                className="flex-1 flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/60 text-center text-[11px] sm:text-xs text-slate-400"
              >
                No debts pending.
              </div>
            ) : (
              iOweList.map((item) => {
                const isExpanded = expandedPeerId === item.id;
                const itemsList = item.items && item.items.length > 0 ? item.items : [
                  { id: `item-${item.id}-0`, description: item.note || 'Expense share', amount: item.amount }
                ];

                return (
                  <div
                    key={item.id}
                    id={`peer-item-${item.id}`}
                    style={{
                      backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
                      borderColor: isExpanded
                        ? 'rgba(244, 63, 94, 0.6)'
                        : theme.isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(254, 205, 211, 0.9)',
                    }}
                    className={`rounded-xl sm:rounded-2xl border ${
                      isExpanded ? 'shadow-md ring-1 ring-rose-300/60 dark:ring-rose-500/30' : 'shadow-xs'
                    } overflow-hidden transition-all`}
                  >
                    {/* Primary Friend Row */}
                    <div
                      onClick={() => togglePeerExpand(item.id)}
                      className={`p-2 sm:px-3 sm:py-2 flex flex-col min-[520px]:flex-row min-[520px]:items-center justify-between gap-1 min-[520px]:gap-1.5 transition-all cursor-pointer select-none ${
                        isExpanded
                          ? theme.isDark ? 'bg-rose-950/40' : 'bg-pink-50/80'
                          : theme.isDark ? 'hover:bg-slate-800/70' : 'hover:bg-pink-50/50'
                      }`}
                      title="Click to toggle reasons & breakdown"
                    >
                      {/* Name & Avatar + Amount (on mobile) */}
                      <div className="min-w-0 flex-1 flex items-center justify-between min-[520px]:justify-start gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-800 dark:text-pink-300 border border-pink-300/80 flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 shadow-2xs">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`text-[11px] sm:text-sm font-bold truncate block ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</span>
                        </div>
                        <span className="min-[520px]:hidden text-[11px] font-bold font-display text-rose-600 dark:text-rose-400 shrink-0">
                          -{formatCurrency(item.amount, currency)}
                        </span>
                      </div>

                      {/* Desktop Amount + Settle and Chevron */}
                      <div className="flex items-center justify-between min-[520px]:justify-end gap-1 sm:gap-1.5 shrink-0 pt-1 min-[520px]:pt-0 border-t min-[520px]:border-t-0 border-pink-100/60 dark:border-slate-800">
                        <span className="hidden min-[520px]:inline text-xs sm:text-sm font-bold font-display text-rose-600 dark:text-rose-400">
                          -{formatCurrency(item.amount, currency)}
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          <div className="text-slate-400 p-0.5">
                            {isExpanded ? <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 dark:text-rose-400" /> : <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                          </div>
                          <button
                            id={`settle-peer-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenSettleModal) {
                                onOpenSettleModal(item);
                              } else {
                                onSettlePeerBalance(item.id);
                              }
                            }}
                            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 dark:bg-pink-950/70 dark:hover:bg-pink-900/90 dark:text-pink-300 border border-pink-300 dark:border-pink-700/60 transition-colors shadow-xs text-[10px] sm:text-[11px] font-bold"
                            title={`Settle debt to ${item.name}`}
                            aria-label="Settle debt"
                          >
                            Settle
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline Reasons Breakdown (when clicked) */}
                    {isExpanded && (
                      <div className={`p-2 sm:px-3 sm:py-2.5 border-t border-pink-100 dark:border-slate-800 ${
                        theme.isDark ? 'bg-slate-900/40' : 'bg-pink-50/40'
                      } space-y-1.5 animate-in fade-in duration-150`}>
                        <div className="text-[9px] sm:text-[10px] font-bold text-pink-800 dark:text-pink-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Breakdown:</span>
                          <span>{itemsList.length} item{itemsList.length !== 1 ? 's' : ''}</span>
                        </div>

                        {itemsList.map((reason, rIdx) => (
                          <div
                            key={reason.id || rIdx}
                            className={`flex items-center justify-between text-xs py-1 px-1.5 sm:py-1.5 sm:px-2 rounded-lg sm:rounded-xl ${
                              theme.isDark ? 'bg-slate-800/90 border-slate-700/60' : 'bg-white border-pink-200/80 shadow-2xs'
                            } border gap-1`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              {getReasonIcon(reason.description)}
                              <span className={`truncate font-medium text-[10px] sm:text-[11px] ${theme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {reason.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-bold font-display text-[10px] sm:text-[11px] text-rose-600 dark:text-rose-400">
                                {formatCurrency(reason.amount, currency)}
                              </span>
                              {onRemoveItemFromPeer && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveItemFromPeer(item.id, reason.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors"
                                  title="Remove this reason"
                                >
                                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Inline Add Reason for this contact */}
                        {onAddItemToPeer && (
                          <form
                            onSubmit={(e) => handleAddInlineReason(e, item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-1 pt-1"
                          >
                            <input
                              type="text"
                              placeholder="Reason"
                              value={newReasonDesc}
                              onChange={(e) => setNewReasonDesc(e.target.value)}
                              className={`flex-1 min-w-0 px-2 py-1 text-[10px] sm:text-[11px] rounded-lg sm:rounded-xl border ${
                                theme.isDark
                                  ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:border-pink-400'
                                  : 'border-pink-200 bg-white text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-300'
                              } focus:outline-none`}
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="Amt"
                                value={newReasonAmount}
                                onChange={(e) => setNewReasonAmount(e.target.value)}
                                className={`w-14 sm:w-16 px-1.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg sm:rounded-xl border ${
                                  theme.isDark
                                    ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:border-pink-400'
                                    : 'border-pink-200 bg-white text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-300'
                                } focus:outline-none`}
                              />
                              <button
                                type="submit"
                                className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold flex items-center gap-0.5 shrink-0 shadow-xs active:scale-95 transition-transform"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                                <span>Add</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. RECENT PAYMENTS STRIP (Click to Change Category or Edit) */}
      <div
        id="dashboard-recent-payments"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(255, 255, 255, 0.9)',
        }}
        className="rounded-[24px] border p-3.5 sm:p-4.5 space-y-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl shrink-0"
      >
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold uppercase tracking-wider text-xs ${theme.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            <Receipt className={`w-4 h-4 ${theme.accentText}`} />
            <span>{isCurrentMonth ? 'Recent Payments' : `${formattedMonthName} Payments`}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${theme.accentBadgeBg} ${theme.accentBadgeBorder} border ${theme.accentBadgeText}`}>
              {monthTransactions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToPage(1)}
            className={`${theme.accentText} hover:opacity-80 font-bold flex items-center gap-1 text-xs transition-colors cursor-pointer`}
          >
            <span>View All ({transactions.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {monthTransactions.length === 0 ? (
            <div
              style={{ backgroundColor: theme.isDark ? `${theme.bgCardInner}a0` : 'rgba(248, 250, 252, 0.8)' }}
              className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-2"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFutureMonth
                  ? <>No transactions scheduled or recorded yet for <strong>{formattedMonthName}</strong>.</>
                  : <>No transactions recorded for <strong>{formattedMonthName}</strong>.</>}
              </p>
              {onResetToCurrentMonth && (
                <button
                  type="button"
                  onClick={onResetToCurrentMonth}
                  className={`text-xs font-bold ${theme.accentText} hover:underline inline-flex items-center gap-1 cursor-pointer`}
                >
                  Jump back to current month
                </button>
              )}
            </div>
          ) : (
            (isCurrentMonth ? monthTransactions.slice(0, 3) : monthTransactions.slice(0, 5)).map((tx) => {
              const isDebit = tx.type === 'DEBIT';
              const isPickerOpen = activeRecentTxPickerId === tx.id;

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

              const IconComponent = getCategoryIcon(tx.category);

              return (
                <div key={tx.id} className="space-y-1.5">
                  <div
                    id={`recent-tx-${tx.id}`}
                    onClick={() => setActiveRecentTxPickerId((prev) => (prev === tx.id ? null : tx.id))}
                    style={{
                      backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
                      borderColor: isPickerOpen
                        ? theme.accentColor
                        : theme.isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(226, 232, 240, 0.9)',
                    }}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 hover:scale-[1.008] active:scale-[0.995] transition-all cursor-pointer shadow-2xs group ${
                      isPickerOpen ? 'ring-1 ring-emerald-400/50' : ''
                    }`}
                    title="Click to change category"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                          theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${theme.accentText}`} />
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                          {tx.merchant}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{formatDate(tx.timestamp)}</span>
                          <span>•</span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentBadgeText}`}
                          >
                            <span>{tx.category}</span>
                            <Edit3 className="w-2 h-2 opacity-70" />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-xs font-extrabold font-display ${
                          isDebit ? (theme.isDark ? 'text-white' : 'text-slate-900') : 'text-emerald-600'
                        }`}
                      >
                        {isDebit ? '-' : '+'}
                        {formatCurrency(tx.amount, currency)}
                      </span>
                      <span
                        className={`text-[10px] font-bold transition-colors ${
                          isPickerOpen ? theme.accentText : `text-slate-400 group-hover:${theme.accentText}`
                        }`}
                      >
                        Change
                      </span>
                    </div>
                  </div>

                  {/* INLINE CATEGORY SELECTOR BOX */}
                  {isPickerOpen && (
                    <div
                      id={`recent-tx-category-picker-${tx.id}`}
                      style={{
                        backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.95)',
                      }}
                      className="p-2.5 sm:p-3 rounded-[20px] border shadow-md space-y-2 animate-in fade-in zoom-in-98 duration-150"
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
                          onClick={() => setActiveRecentTxPickerId(null)}
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
                              id={`recent-select-cat-${tx.id}-${cat.toLowerCase()}`}
                              onClick={() => {
                                onUpdateTransaction?.(tx.id, { category: cat });
                                setActiveRecentTxPickerId(null);
                              }}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs ${
                                isCurrent
                                  ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText} ring-2 ring-emerald-500/80 font-bold scale-[1.02]`
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

      {/* 4. CATEGORY DISTRIBUTION BAR: Pastel Pill Badges & Frosted Surface */}
      <div
        id="dashboard-bottom-bar"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(255, 255, 255, 0.9)',
        }}
        className="rounded-[24px] border p-3.5 sm:p-4.5 space-y-2.5 sm:space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl shrink-0"
      >
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold uppercase tracking-wider text-xs ${theme.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            <Tag className={`w-4 h-4 ${theme.accentText}`} />
            <span>Category Spend Distribution</span>
          </div>
          <button
            onClick={() => {
              if (onSelectCategory) {
                onSelectCategory('All');
              }
              onNavigateToPage(1);
            }}
            className={`${theme.accentText} hover:opacity-80 font-bold flex items-center gap-1 text-xs transition-colors`}
          >
            <span>View Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stacked Exact Proportional Bar (High to Low ordered, Clickable to open Category in Analytics) */}
        <div
          style={{ backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(226, 232, 240, 0.6)' }}
          className="w-full h-2.5 sm:h-3 rounded-full overflow-hidden flex border border-slate-200/40 shadow-inner"
        >
          {totalCategorySpend > 0 ? (
            sortedCategories.map((cat) => {
              const amount = categoryBreakdown[cat] || 0;
              if (amount <= 0) return null;
              const ratioPct = (amount / totalCategorySpend) * 100;
              const catTheme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.Other;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  style={{
                    flexGrow: amount,
                    flexBasis: 0,
                    backgroundColor: catTheme.fg,
                  }}
                  className="h-full min-w-0 transition-all duration-300 hover:opacity-80 relative group cursor-pointer focus:outline-none"
                  title={`View ${cat} in Analytics: ${formatCurrency(amount, currency)} (${ratioPct.toFixed(1)}%)`}
                />
              );
            })
          ) : (
            <div
              style={{
                width: '100%',
                backgroundColor: theme.isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.5)',
              }}
              className="h-full"
              title="No expenses logged yet"
            />
          )}
        </div>

        {/* Category chips row: Soft Pastel Pill Badges (Clickable to open Category in Analytics) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-0.5">
          {sortedCategories.map((cat) => {
            const amount = categoryBreakdown[cat] || 0;
            const catTheme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.Other;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  backgroundColor: catTheme.badgeBg,
                  borderColor: catTheme.border,
                }}
                className="px-2.5 py-1.5 rounded-full border flex items-center justify-between text-[10px] sm:text-xs shadow-xs transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer text-left focus:outline-none min-w-0"
                title={`Open ${cat} in Analytics & Transactions`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: catTheme.fg }}
                  />
                  <span style={{ color: catTheme.badgeFg }} className="font-semibold truncate">{cat}</span>
                </div>
                <span className="font-bold text-slate-900 ml-1.5 shrink-0 whitespace-nowrap">
                  {formatCurrency(amount, currency)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. QUICK NATURAL LANGUAGE INPUT BAR */}
      <div
        id="quick-nl-input-card"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(255, 255, 255, 0.9)',
        }}
        className="rounded-[24px] border p-2.5 sm:p-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl shrink-0"
      >
        <form onSubmit={handleQuickNlSubmit} className="flex items-center gap-2">
          <div
            className={`p-1.5 sm:p-2 rounded-full ${theme.accentBadgeBg} ${theme.accentText} border ${theme.accentBadgeBorder} shrink-0`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>

          <input
            id="quick-nl-input"
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            disabled={isProcessingNl}
            placeholder="e.g. Spent 200 on lunch"
            style={{
              backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(255, 255, 255, 0.95)',
            }}
            className={`flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border text-xs sm:text-sm focus:outline-none transition-colors shadow-xs placeholder:truncate ${
              theme.isDark
                ? 'border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
                : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
            }`}
          />

          <button
            type="submit"
            id="quick-nl-submit-btn"
            disabled={!quickInput.trim() || isProcessingNl}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full ${theme.accentBtnBg} hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed ${theme.accentBtnText} font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-all shadow-xs ${theme.accentShadow} active:scale-95 shrink-0 whitespace-nowrap`}
          >
            {isProcessingNl ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="whitespace-nowrap">Add</span>
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Assistant Chat Reply Bubble (Distinct visual style for non-transaction conversational intents) */}
        {assistantChatReply && (
          <div
            id="assistant-chat-bubble"
            style={{
              backgroundColor: theme.isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(248, 250, 252, 0.95)',
              borderColor: theme.isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.9)',
            }}
            className="mt-2.5 p-3 rounded-2xl border shadow-sm backdrop-blur-md animate-fade-in text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <div className={`p-1 rounded-full ${theme.accentBadgeBg} ${theme.accentText}`}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className={theme.isDark ? 'text-white' : 'text-slate-900'}>
                  Budget Bridge Assistant
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    assistantChatReply.intent === 'GREETING'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : assistantChatReply.intent === 'APP_INFO'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                >
                  {assistantChatReply.intent === 'GREETING' && '👋 Greeting'}
                  {assistantChatReply.intent === 'APP_INFO' && 'ℹ️ App Guide'}
                  {assistantChatReply.intent === 'OUT_OF_SCOPE' && '💬 Notice'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAssistantChatReply(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors"
                title="Dismiss reply"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p
              className={`leading-relaxed text-[11px] sm:text-xs ${
                theme.isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {assistantChatReply.text}
            </p>

            {/* Interactive suggestion chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-medium">Try:</span>
              {[
                'Spent 200 on lunch',
                'Rahul owes me 500',
                'What can you do',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setQuickInput(chip);
                    setAssistantChatReply(null);
                  }}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                    theme.isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-400 hover:text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-900'
                  }`}
                >
                  "{chip}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction confirmation feedback pill */}
        {quickFeedback && (
          <div
            className={`mt-2 px-3.5 py-1.5 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentBadgeText} text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs`}
          >
            <CheckCircle2 className={`w-4 h-4 ${theme.accentText} shrink-0`} />
            <span className="truncate">{quickFeedback}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default PageOverview;
