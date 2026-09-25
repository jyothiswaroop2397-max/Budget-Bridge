import React from 'react';
import { Home, BarChart2, Plus, Sparkles, PiggyBank } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface BottomNavBarProps {
  currentPage: number;
  onNavigateToPage: (pageIndex: number) => void;
  onOpenAdd?: () => void;
  isAiChatOpen?: boolean;
  onToggleAiChat?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentPage,
  onNavigateToPage,
  onOpenAdd,
  isAiChatOpen = false,
  onToggleAiChat,
}) => {
  const { theme } = useTheme();

  return (
    <>
      {/* Hidden SVG Filter Definition for True Optical Liquid Glass Refraction */}
      <svg className="absolute w-0 h-0 pointer-events-none opacity-0 overflow-hidden" aria-hidden="true">
        <defs>
          <filter id="liquid-glass-refraction" x="-20%" y="-20%" width="140%" height="140%">
            {/* Generates smooth fluid distortion waves */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.035"
              numOctaves="2"
              result="noise"
            />
            {/* Warps and refracts the background pixels beneath the glass pill */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="9"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feBlend mode="normal" in="SourceGraphic" in2="displaced" />
          </filter>
        </defs>
      </svg>

      <nav
        id="fixed-bottom-nav-bar"
        className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 p-1.5 sm:p-2 rounded-full select-none w-[90vw] max-w-[390px] sm:max-w-[430px] group isolate"
        aria-label="Floating Page Navigation"
      >
        {/* LAYER 1: Liquid Refractive Glass Background & Displacement Filter */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300 -z-10 overflow-hidden"
          style={{
            // 1. Smoked liquid glass base tint (a small bit darker, keeping low opacity see-through quality)
            backgroundColor: theme.isDark
              ? 'rgba(15, 23, 42, 0.45)'
              : 'rgba(15, 23, 42, 0.14)',
            // 2. Optical refraction filter & tuned backdrop blur
            backdropFilter: 'blur(16px) saturate(180%) contrast(110%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%) contrast(110%)',
            filter: 'url(#liquid-glass-refraction)',
            // 3. Multi-layer depth shadows & glass thickness caustics
            boxShadow: theme.isDark
              ? '0 24px 48px -12px rgba(0, 0, 0, 0.85), 0 8px 24px -6px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 6px rgba(0, 0, 0, 0.4)'
              : '0 20px 45px -10px rgba(15, 23, 42, 0.28), 0 8px 20px -6px rgba(15, 23, 42, 0.16), inset 0 1px 2px 0 rgba(255, 255, 255, 0.75), inset 0 -2px 5px rgba(0, 0, 0, 0.12)',
          }}
        />

        {/* LAYER 2: Specular Rim Lighting & Edge Highlight (Top-left light bounce, subtle bottom thickness) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none -z-10"
          style={{
            background: theme.isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.12) 40%, rgba(255, 255, 255, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.25) 45%, rgba(255, 255, 255, 0.05) 100%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1.25px',
          }}
        />

        {/* INNER CONTENT WRAPPER: Guaranteed high-contrast touch targets & crisp icons with balanced distribution */}
        <div className="relative flex items-center justify-between w-full px-2 sm:px-3">
          {/* 1. Tab 0: Dashboard (Home) */}
          <button
            id="bottom-nav-dashboard-btn"
            onClick={() => onNavigateToPage(0)}
            title="Page 1: Dashboard"
            aria-label="Dashboard"
            className={`relative transition-all duration-200 flex items-center justify-center cursor-pointer ${
              currentPage === 0 && !isAiChatOpen
                ? 'w-11 h-11 rounded-full bg-slate-900 text-white shadow-md shadow-slate-900/30 font-bold'
                : theme.isDark
                ? 'w-11 h-11 rounded-full text-slate-100 hover:text-white hover:bg-white/10 active:scale-95'
                : 'w-11 h-11 rounded-full text-slate-800 hover:text-slate-950 hover:bg-black/5 active:scale-95'
            }`}
          >
            <Home className={`w-5 h-5 ${currentPage === 0 && !isAiChatOpen ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          </button>

          {/* 2. Tab 1: Analytics (List / Charts) */}
          <button
            id="bottom-nav-analytics-btn"
            onClick={() => onNavigateToPage(1)}
            title="Page 2: Analytics & Transactions"
            aria-label="Analytics"
            className={`relative transition-all duration-200 flex items-center justify-center cursor-pointer ${
              currentPage === 1 && !isAiChatOpen
                ? 'w-11 h-11 rounded-full bg-slate-900 text-white shadow-md shadow-slate-900/30 font-bold'
                : theme.isDark
                ? 'w-11 h-11 rounded-full text-slate-100 hover:text-white hover:bg-white/10 active:scale-95'
                : 'w-11 h-11 rounded-full text-slate-800 hover:text-slate-950 hover:bg-black/5 active:scale-95'
            }`}
          >
            <BarChart2 className={`w-5 h-5 ${currentPage === 1 && !isAiChatOpen ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          </button>

          {/* 3. Tab 3: Savings & Assets */}
          <button
            id="bottom-nav-savings-btn"
            onClick={() => onNavigateToPage(3)}
            title="Page 4: Savings & Assets"
            aria-label="Savings"
            className={`relative transition-all duration-200 flex items-center justify-center cursor-pointer ${
              currentPage === 3 && !isAiChatOpen
                ? 'w-11 h-11 rounded-full bg-slate-900 text-white shadow-md shadow-slate-900/30 font-bold'
                : theme.isDark
                ? 'w-11 h-11 rounded-full text-slate-100 hover:text-white hover:bg-white/10 active:scale-95'
                : 'w-11 h-11 rounded-full text-slate-800 hover:text-slate-950 hover:bg-black/5 active:scale-95'
            }`}
          >
            <PiggyBank className={`w-5 h-5 ${currentPage === 3 && !isAiChatOpen ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          </button>

          {/* 4. Center Action Button: Dynamic Theme Gradient pill button */}
          {onOpenAdd && (
            <button
              id="bottom-nav-center-add-btn"
              onClick={onOpenAdd}
              title="Add New Expense"
              aria-label="Add Expense"
              className={`w-12 h-12 rounded-full ${theme.accentBtnBg} ${theme.accentBtnText} flex items-center justify-center font-black shadow-lg ${theme.accentShadow} hover:scale-105 active:scale-95 transition-all mx-0.5 group border border-white/80 cursor-pointer`}
            >
              <Plus className="w-6 h-6 stroke-[3] transition-transform group-hover:rotate-90 duration-300" />
            </button>
          )}

          {/* 5. AI Chat Copilot (Sparkles motif matching brand) */}
          {onToggleAiChat && (
            <button
              id="bottom-nav-ai-chat-btn"
              onClick={onToggleAiChat}
              title="Budget Bridge Text Copilot"
              aria-label="AI Copilot"
              className={`relative transition-all duration-200 flex items-center justify-center cursor-pointer ${
                isAiChatOpen
                  ? 'w-11 h-11 rounded-full bg-slate-900 text-white shadow-md shadow-slate-900/30 font-bold ring-2 ring-emerald-400/50'
                  : theme.isDark
                  ? 'w-11 h-11 rounded-full text-slate-100 hover:text-emerald-300 hover:bg-white/10 active:scale-95'
                  : 'w-11 h-11 rounded-full text-slate-800 hover:text-emerald-600 hover:bg-black/5 active:scale-95'
              }`}
            >
              {/* Subtle neon emerald/cyan indicator dot */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
              <Sparkles className={`w-5 h-5 ${isAiChatOpen ? 'stroke-[2.5] text-emerald-300' : 'stroke-[2]'}`} />
            </button>
          )}
        </div>
      </nav>
    </>
  );
};



