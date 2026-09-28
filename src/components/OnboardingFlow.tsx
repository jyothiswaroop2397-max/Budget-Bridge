import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Bot,
  Users,
  Smartphone,
  PieChart,
  HeartPulse,
  Download,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Calendar,
  Layers,
} from 'lucide-react';
import { BudgetBridgeAppIcon } from './BudgetBridgeAppIcon.js';
import { getDefaultAvatar } from '../utils/avatar.js';

export interface GuidePageItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badge: string;
  badgeBg: string;
  title: string;
  description: string;
  mockComponent: React.ComponentType;
}

// --------------------------------------------------------------------------
// MOCK UI ILLUSTRATIONS FOR EACH FEATURE
// --------------------------------------------------------------------------

const MockExpensesIllustration: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-emerald-500/20 shadow-inner select-none font-sans text-xs">
    {/* Mini Balance Banner */}
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
      <div>
        <div className="text-[10px] text-slate-400 font-medium">Net Balance (Income - Spent)</div>
        <div className="text-sm font-bold text-emerald-400 font-display">₹42,350.00</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] text-slate-400">Monthly Cap</div>
        <div className="text-xs font-semibold text-slate-200">₹30,000</div>
      </div>
    </div>

    {/* Mini Transaction List */}
    <div className="space-y-1.5 my-auto">
      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
            +
          </div>
          <div>
            <div className="text-[11px] font-bold text-white leading-tight">Monthly Salary</div>
            <div className="text-[9px] text-slate-400">Income • Verified Bank</div>
          </div>
        </div>
        <span className="text-emerald-400 font-bold text-xs">+₹65,000</span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">
            -
          </div>
          <div>
            <div className="text-[11px] font-bold text-white leading-tight">Groceries & Supermarket</div>
            <div className="text-[9px] text-slate-400">Food • Daily Limit Active</div>
          </div>
        </div>
        <span className="text-rose-400 font-bold text-xs">-₹1,850</span>
      </div>
    </div>

    {/* Daily Limit Bar */}
    <div className="space-y-1 pt-1 border-t border-slate-800">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">Today's Cap: ₹1,850 / ₹2,500</span>
        <span className="text-emerald-400 font-bold">₹650 Left</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '74%' }} />
      </div>
    </div>
  </div>
);

const MockAiAssistantIllustration: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-sky-500/20 shadow-inner select-none font-sans text-xs">
    {/* Chat Bubble: User */}
    <div className="flex justify-end items-end gap-1.5">
      <div className="max-w-[80%] bg-sky-600 text-white rounded-2xl rounded-br-xs px-3 py-1.5 text-[11px] shadow-sm">
        "Spent 250 on lunch with team"
      </div>
      <div className="w-5 h-5 rounded-full bg-slate-700 text-[9px] flex items-center justify-center text-slate-300 font-bold">
        U
      </div>
    </div>

    {/* Chat Bubble: Assistant Proposal */}
    <div className="flex justify-start items-start gap-1.5 my-auto">
      <div className="w-6 h-6 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="max-w-[88%] bg-slate-800/90 border border-sky-500/30 rounded-2xl rounded-tl-xs p-2.5 space-y-2 text-[11px] shadow-md">
        <p className="text-slate-200 leading-snug">
          Logged <strong className="text-white">₹250</strong> under <span className="text-amber-400 font-semibold">Food</span>.
        </p>
        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-[10px]">
          <span className="text-slate-300">Daily balance left:</span>
          <span className="text-emerald-400 font-bold">₹1,250</span>
        </div>
      </div>
    </div>

    {/* Input Pill Mock */}
    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[10px]">
      <MessageSquare className="w-3.5 h-3.5 text-sky-400 ml-1" />
      <span className="truncate">"What's my spending this week?"</span>
      <span className="ml-auto w-4 h-4 rounded-full bg-sky-500 text-slate-950 font-bold flex items-center justify-center text-[9px]">
        ↑
      </span>
    </div>
  </div>
);

const MockPeerBalancesIllustration: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-teal-500/20 shadow-inner select-none font-sans text-xs">
    {/* Summary Tally Bar */}
    <div className="grid grid-cols-2 gap-2">
      <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-left">
        <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">Owed to You</span>
        <span className="text-sm font-bold text-white font-display">₹3,400</span>
      </div>
      <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-left">
        <span className="text-[9px] uppercase tracking-wider text-rose-400 font-bold block">You Owe</span>
        <span className="text-sm font-bold text-white font-display">₹650</span>
      </div>
    </div>

    {/* Peer Cards */}
    <div className="space-y-1.5 my-auto">
      <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0">
            R
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-white truncate">Rahul Sharma</div>
            <div className="text-[9px] text-slate-400 truncate">Dinner split • ₹1,200 + Cab ₹300</div>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-400 shrink-0">+₹1,500</span>
      </div>

      <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
            P
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-white truncate">Priya Patel</div>
            <div className="text-[9px] text-slate-400 truncate">Weekend trip groceries</div>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-400 shrink-0">+₹1,900</span>
      </div>
    </div>

    {/* Quick Action Hint */}
    <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-[10px]">
      <span className="text-teal-300 font-medium">1-Click Settle Up with UPI</span>
      <span className="text-emerald-400 font-bold">Itemized notes ✓</span>
    </div>
  </div>
);

const MockSmsDetectionIllustration: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-indigo-500/20 shadow-inner select-none font-sans text-xs">
    {/* Android Notification Style Mock */}
    <div className="p-2 rounded-xl bg-slate-800/90 border border-indigo-500/30 space-y-1 shadow-sm">
      <div className="flex items-center justify-between text-[9px] text-slate-400">
        <div className="flex items-center gap-1 text-indigo-400 font-bold">
          <Smartphone className="w-3 h-3" />
          <span>HDFC BANK SMS</span>
        </div>
        <span>Just now</span>
      </div>
      <p className="text-[10px] text-slate-200 font-mono leading-tight">
        "Rs 450.00 debited from A/C **1234 to ZOMATO on 28-SEP via UPI Ref 429182..."
      </p>
    </div>

    {/* Detection Engine Processing Banner */}
    <div className="my-auto p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Auto-Logged & Verified</span>
        </div>
        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
          FOOD
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-white pt-0.5">
        <span>Zomato</span>
        <span className="text-rose-400 font-bold">-₹450.00</span>
      </div>
    </div>

    {/* Privacy & Spam Guarantee */}
    <div className="flex items-center justify-between text-[10px] px-1 text-slate-400">
      <span className="flex items-center gap-1 text-emerald-400">
        <Check className="w-3 h-3 stroke-[3]" /> Bank SMS Only
      </span>
      <span className="text-slate-500">OTPs & Spam 100% Discarded</span>
    </div>
  </div>
);

const MockAnalyticsIllustration: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-amber-500/20 shadow-inner select-none font-sans text-xs">
    {/* Category Breakdown Bars */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-300 font-semibold flex items-center gap-1">
          <PieChart className="w-3 h-3 text-amber-400" /> Category Breakdown
        </span>
        <span className="text-slate-400">This Month</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[9px] text-slate-300">
          <span>Food & Dining (45%)</span>
          <span className="font-bold text-white">₹8,450</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full" style={{ width: '45%' }} />
        </div>

        <div className="flex justify-between text-[9px] text-slate-300">
          <span>Travel & Cab (30%)</span>
          <span className="font-bold text-white">₹5,200</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-sky-400 rounded-full" style={{ width: '30%' }} />
        </div>
      </div>
    </div>

    {/* Mini Calendar View Grid */}
    <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1.5 my-auto">
      <div className="flex items-center justify-between text-[9px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-200 font-bold">
          <Calendar className="w-3 h-3 text-emerald-400" /> Daily Calendar View
        </span>
        <span className="text-emerald-400 font-bold">Sep 2026</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-slate-500 font-bold">
            {d}
          </span>
        ))}
        {[22, 23, 24, 25, 26, 27, 28].map((day, idx) => (
          <div
            key={idx}
            className={`py-0.5 rounded text-[8px] font-bold ${
              idx === 6
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : idx % 2 === 0
                ? 'bg-slate-700/70 text-slate-200'
                : 'text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>

    <div className="text-[10px] text-center text-slate-400">
      Track daily trends, monthly archives & seasonal habits
    </div>
  </div>
);

const MockHealthScoreIllustration: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-rose-500/20 shadow-inner select-none font-sans text-xs">
    {/* Score Circular Gauge Representation */}
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
      <div className="flex items-center gap-2.5">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-black text-emerald-400 font-display">84</span>
          <span className="text-[7px] text-slate-400 uppercase font-bold">/100</span>
        </div>
        <div>
          <div className="text-[11px] font-bold text-white">Financial Health: Great</div>
          <div className="text-[9px] text-emerald-400 font-semibold">Top 15% Savings Rate</div>
        </div>
      </div>
      <HeartPulse className="w-5 h-5 text-rose-400" />
    </div>

    {/* Factor Sliders */}
    <div className="space-y-1.5 my-auto">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-300">Budget Discipline</span>
        <span className="text-emerald-400 font-bold">95/100</span>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400" style={{ width: '95%' }} />
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-300">Debt & Peer Settlement</span>
        <span className="text-teal-400 font-bold">85/100</span>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-teal-400" style={{ width: '85%' }} />
      </div>
    </div>

    {/* Actionable Tip */}
    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-[10px] text-emerald-300">
      <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
      <span className="leading-tight">Maintain your 4-month emergency buffer to boost score to 90+.</span>
    </div>
  </div>
);

const MockExportCsvIllustration: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-emerald-500/20 shadow-inner select-none font-sans text-xs">
    {/* CSV File Header Mock */}
    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
          <Download className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-white truncate">budget-bridge-export.csv</div>
          <div className="text-[9px] text-slate-400">Excel UTF-8 BOM • Universal Format</div>
        </div>
      </div>
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
        Ready
      </span>
    </div>

    {/* Mock Spreadsheet Grid */}
    <div className="my-auto rounded-xl border border-slate-700/60 overflow-hidden font-mono text-[9px]">
      <div className="grid grid-cols-4 bg-slate-800 text-slate-400 p-1 font-bold border-b border-slate-700">
        <span>Date</span>
        <span>Payee</span>
        <span>Category</span>
        <span className="text-right">Amount</span>
      </div>
      <div className="grid grid-cols-4 bg-slate-900/80 p-1 text-slate-300 border-b border-slate-800">
        <span>28-Sep</span>
        <span className="truncate">Swiggy</span>
        <span>Food</span>
        <span className="text-right text-rose-400">-₹420</span>
      </div>
      <div className="grid grid-cols-4 bg-slate-900/80 p-1 text-slate-300">
        <span>27-Sep</span>
        <span className="truncate">Rahul S.</span>
        <span>Peer</span>
        <span className="text-right text-emerald-400">+₹1,200</span>
      </div>
    </div>

    {/* Feature bullets */}
    <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-[10px] text-slate-300">
      <span>Transactions + Peer Ledgers</span>
      <span className="text-emerald-400 font-bold">1-Click from Settings</span>
    </div>
  </div>
);

// --------------------------------------------------------------------------
// MASTER FEATURE GUIDE DATA ARRAY (Easily editable at the top)
// --------------------------------------------------------------------------

export const GUIDE_PAGES: GuidePageItem[] = [
  {
    id: 'expenses_income',
    icon: TrendingUp,
    iconColor: 'text-emerald-400',
    badge: 'Core Ledger',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    title: 'Track Expenses & Income',
    description:
      'Log money manually across spending categories, set daily & monthly budget caps, and instantly monitor your net available balance.',
    mockComponent: MockExpensesIllustration,
  },
  {
    id: 'ai_copilot',
    icon: Bot,
    iconColor: 'text-sky-400',
    badge: 'AI Copilot',
    badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
    title: 'AI Chat Assistant',
    description:
      'Type naturally like "Spent 250 on lunch" or ask "What is my balance?". The smart assistant logs transactions and answers questions about your data.',
    mockComponent: MockAiAssistantIllustration,
  },
  {
    id: 'peer_balances',
    icon: Users,
    iconColor: 'text-teal-400',
    badge: 'Social Splits',
    badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
    title: 'Peer Balances & Ledgers',
    description:
      'Keep crystal-clear track of who owes you and who you owe, with itemized shared dinner or trip notes and one-tap UPI settlements.',
    mockComponent: MockPeerBalancesIllustration,
  },
  {
    id: 'sms_detection',
    icon: Smartphone,
    iconColor: 'text-indigo-400',
    badge: 'Android Native',
    badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
    title: 'Auto SMS Detection',
    description:
      'Bank and UPI transaction SMS messages are detected automatically and added as transactions, with OTPs and promo spam safely filtered out.',
    mockComponent: MockSmsDetectionIllustration,
  },
  {
    id: 'analytics_calendar',
    icon: PieChart,
    iconColor: 'text-amber-400',
    badge: 'Insights',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    title: 'Analytics & Calendar',
    description:
      'Explore spending breakdowns by category, monthly trends, and an interactive calendar view to review daily spending histories.',
    mockComponent: MockAnalyticsIllustration,
  },
  {
    id: 'financial_health',
    icon: HeartPulse,
    iconColor: 'text-rose-400',
    badge: 'Financial Wellness',
    badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
    title: 'Financial Health Score',
    description:
      'A dedicated dashboard calculates your overall financial health score, explains the key factors behind it, and gives personalized tips to improve.',
    mockComponent: MockHealthScoreIllustration,
  },
  {
    id: 'export_data',
    icon: Download,
    iconColor: 'text-emerald-400',
    badge: 'Personal Records',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    title: 'Export Your Data',
    description:
      'Download your full transaction history and peer balances as a standardized CSV file from Settings for personal record-keeping in Excel.',
    mockComponent: MockExportCsvIllustration,
  },
];

// --------------------------------------------------------------------------
// PROPS INTERFACE
// --------------------------------------------------------------------------

interface OnboardingFlowProps {
  onComplete: () => void;
  onOpenLogin?: () => void;
  /**
   * If true, opened as "How it works / Feature Guide" from Settings.
   * Last button will say "Done" and close directly without triggering setup steps.
   */
  mode?: 'first_launch' | 'guide';
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onOpenLogin,
  mode = 'first_launch',
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSettingUpProfile, setIsSettingUpProfile] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>('Guest');

  // Swipe gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 45; // in px

  const totalPages = GUIDE_PAGES.length;
  const isFirstPage = currentIndex === 0;
  const isLastPage = currentIndex === totalPages - 1;

  const currentPage = GUIDE_PAGES[currentIndex];
  const IconComponent = currentPage.icon;
  const MockComponent = currentPage.mockComponent;

  // Touch Swipe Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && !isLastPage) {
      setCurrentIndex((prev) => prev + 1);
    } else if (isRightSwipe && !isFirstPage) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation for desktop accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingUpProfile) return;
      if (e.key === 'ArrowRight' && !isLastPage) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && !isFirstPage) {
        setCurrentIndex((prev) => prev - 1);
      } else if (e.key === 'Escape' && mode === 'guide') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLastPage, isFirstPage, isSettingUpProfile, mode, onComplete]);

  const handleNext = () => {
    if (!isLastPage) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinalAction();
    }
  };

  const handlePrev = () => {
    if (!isFirstPage) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinalAction = () => {
    if (mode === 'guide') {
      onComplete();
    } else {
      // First-launch mode: transition to brief name setup
      setIsSettingUpProfile(true);
    }
  };

  const handleSaveProfileAndFinish = () => {
    try {
      const existing = localStorage.getItem('budget_bridge_state');
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.userProfile = {
          name: profileName.trim() || 'Guest',
          avatarUrl: getDefaultAvatar(profileName.trim() || 'Guest'),
        };
        localStorage.setItem('budget_bridge_state', JSON.stringify(parsed));
      }
    } catch (e) {
      // Ignore
    }
    onComplete();
  };

  // =========================================================================
  // OPTIONAL NAME & AVATAR ONBOARDING STEP (First Launch Only)
  // =========================================================================
  if (isSettingUpProfile && mode === 'first_launch') {
    return (
      <div
        id="onboarding-profile-setup-container"
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-[#0F172A] text-white select-none overflow-y-auto p-5 sm:p-8 animate-in fade-in duration-300"
      >
        <div className="w-full max-w-sm my-auto space-y-6 text-center">
          <div className="relative inline-block mx-auto mb-2">
            <div className="absolute -inset-3 bg-emerald-500/25 rounded-3xl blur-xl pointer-events-none" />
            <BudgetBridgeAppIcon size="xl" className="ring-2 ring-emerald-400/50 shadow-2xl relative" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Welcome to <span className="text-[#10B981]">Budget Bridge</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              What should we call you in your financial dashboard?
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3 text-left shadow-lg">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Your Name or Nickname
            </label>
            <input
              id="onboarding-name-input"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Swaroop, Alex, Sarah"
              maxLength={28}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-sm font-semibold text-white outline-none transition-colors"
              autoFocus
            />
            <p className="text-[10px] text-slate-400">
              You can change this or upload a custom photo anytime in Settings.
            </p>
          </div>

          <button
            id="onboarding-profile-finish-btn"
            type="button"
            onClick={handleSaveProfileAndFinish}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/30 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Enter Budget Bridge</span>
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          </button>

          {onOpenLogin && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  handleSaveProfileAndFinish();
                  onOpenLogin();
                }}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors font-semibold cursor-pointer underline underline-offset-4"
              >
                Already have an account? Sign In here →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // SWIPEABLE FEATURE GUIDE VIEW
  // =========================================================================
  return (
    <div
      id="budget-bridge-onboarding-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-[#0F172A] text-white select-none overflow-hidden"
    >
      {/* 1. TOP HEADER: Progress Tag & Skip / Close Button */}
      <header className="w-full max-w-md px-5 pt-5 sm:pt-7 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center">
            <BudgetBridgeAppIcon size="xs" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block font-display leading-tight">
              Budget Bridge
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 font-mono">
              Feature {currentIndex + 1} of {totalPages}
            </span>
          </div>
        </div>

        {/* Top Action Button: Skip (if first-launch) or Close X (if guide mode) */}
        {mode === 'guide' ? (
          <button
            id="guide-close-btn"
            type="button"
            onClick={onComplete}
            aria-label="Close guide"
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          !isLastPage && (
            <button
              id="onboarding-skip-btn"
              type="button"
              onClick={handleFinalAction}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer"
            >
              Skip
            </button>
          )
        )}
      </header>

      {/* 2. MAIN SWIPEABLE BODY: Illustration + Title + Description */}
      <main className="w-full max-w-md px-5 sm:px-6 flex-1 flex flex-col items-center justify-center min-h-0 py-2">
        <div
          key={currentPage.id}
          className="w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-right-3 duration-300 fill-mode-both"
        >
          {/* ILLUSTRATIVE CARD STAGE */}
          <div
            id="feature-guide-stage-card"
            className="w-full aspect-[16/10] max-h-[240px] sm:max-h-[260px] rounded-3xl overflow-hidden relative shadow-2xl shadow-emerald-950/40 border border-white/10 mb-4 sm:mb-6 p-2 bg-[#070D18]"
          >
            <MockComponent />
          </div>

          {/* BADGE PILL */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-wider uppercase mb-2 ${currentPage.badgeBg}`}
          >
            <IconComponent className="w-3.5 h-3.5" />
            <span>{currentPage.badge}</span>
          </div>

          {/* PAGE TITLE */}
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight mb-2">
            {currentPage.title}
          </h2>

          {/* 1-2 SENTENCE DESCRIPTION */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs sm:max-w-sm mx-auto px-1">
            {currentPage.description}
          </p>
        </div>
      </main>

      {/* 3. BOTTOM FOOTER: Dot Indicators & Next / Back / Get Started */}
      <footer className="w-full max-w-md px-5 pb-6 sm:pb-8 pt-2 flex flex-col items-center gap-4 z-20 shrink-0">
        {/* DOT PROGRESS INDICATORS (Horizontal Swipe Navigation) */}
        <div
          id="feature-guide-pagination-dots"
          className="flex items-center justify-center gap-2"
          aria-label={`Slide ${currentIndex + 1} of ${totalPages}`}
        >
          {GUIDE_PAGES.map((page, idx) => {
            const isActive = currentIndex === idx;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to ${page.title}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? 'w-7 sm:w-8 h-2 bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                    : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            );
          })}
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="w-full flex items-center gap-2.5 min-h-[48px]">
          {/* Back Button (visible when not on first page) */}
          {!isFirstPage && (
            <button
              id="guide-back-btn"
              type="button"
              onClick={handlePrev}
              className="py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 font-bold text-xs tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title="Previous feature"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">Back</span>
            </button>
          )}

          {/* Primary Action Button (Next or Get Started / Done) */}
          {!isLastPage ? (
            <button
              id="guide-next-btn"
              type="button"
              onClick={handleNext}
              className="flex-1 py-3 px-5 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <button
              id="guide-finish-btn"
              type="button"
              onClick={handleFinalAction}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/30 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{mode === 'guide' ? 'Done' : 'Get Started'}</span>
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default OnboardingFlow;
