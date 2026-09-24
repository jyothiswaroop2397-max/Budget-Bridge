import React from 'react';
import {
  Bell,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Camera,
  Calendar,
  Settings,
} from 'lucide-react';
import { BudgetBridgeAppIcon } from './BudgetBridgeAppIcon.js';
import { useTheme } from '../context/ThemeContext.js';
import { UserProfile } from '../types.js';
import { getDefaultAvatar, sanitizeAvatarUrl } from '../utils/avatar.js';

interface NavigationHeaderProps {
  currentPage: number;
  onNavigateToPage: (pageIndex: number) => void;
  onGoBack?: () => void;
  silentVerificationActive: boolean;
  currency?: string;
  userProfile?: UserProfile;
  onOpenProfileModal?: () => void;
  selectedDate?: Date;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onOpenCalendar?: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentPage,
  onNavigateToPage,
  onGoBack,
  silentVerificationActive,
  userProfile = { name: 'Guest', avatarUrl: getDefaultAvatar('Guest') },
  onOpenProfileModal,
  selectedDate,
  onPreviousMonth,
  onNextMonth,
  onOpenCalendar,
}) => {
  const { theme } = useTheme();

  const targetDate = selectedDate || new Date();

  // Current month string formatted like screenshot ("September 2026")
  const currentMonthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(targetDate);

  const shortMonthName = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(targetDate);

  return (
    <header
      id="main-navigation-header"
      style={{
        backgroundColor: theme.isDark ? `${theme.bgRoot}f0` : 'rgba(255,255,255,0.85)',
        borderColor: theme.isDark ? theme.borderSubtle : 'rgba(255,255,255,0.8)',
      }}
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b px-2.5 sm:px-6 py-2 sm:py-2.5 w-full max-w-full overflow-hidden box-border shadow-xs"
    >
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: App Logo & Brand Name - Click leads to Home / Main Page */}
        <button
          id="app-header-brand-btn"
          type="button"
          onClick={() => onNavigateToPage(0)}
          className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 text-left bg-transparent border-0 p-0 cursor-pointer group transition-all hover:opacity-90 active:scale-[0.98]"
          title="Budget Bridge - Click to go to Home Page"
          aria-label="Budget Bridge - Go to Home Page"
        >
          {/* App Logo */}
          <div
            id="app-header-logo"
            className="transition-transform group-hover:scale-105 active:scale-95 shrink-0"
          >
            <BudgetBridgeAppIcon
              size="sm"
              variant="hybrid"
              className="shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/40"
            />
          </div>

          <div className="flex flex-col justify-center shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span
                className={`font-display font-extrabold text-sm sm:text-base tracking-tight whitespace-nowrap transition-colors ${
                  theme.isDark
                    ? 'text-white group-hover:text-emerald-300'
                    : 'text-slate-900 group-hover:text-emerald-700'
                }`}
              >
                Budget <span className={theme.accentText}>Bridge</span>
              </span>
              <span
                className={`hidden min-[540px]:inline-flex items-center px-1.5 py-0.5 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} text-[9px] font-bold ${theme.accentBadgeText}`}
              >
                PRO
              </span>
            </div>
            <p
              className={`text-[10px] whitespace-nowrap hidden min-[600px]:block transition-colors ${
                theme.isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700'
              }`}
            >
              {userProfile.name || 'Guest'}
            </p>
          </div>
        </button>

        {/* Center: Month Display (Responsive: Short month on small mobile, Full month on >= sm) */}
        <div
          id="header-month-selector-pill"
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255,255,255,0.92)',
            borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226,232,240,0.9)',
          }}
          className="flex items-center gap-0.5 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border shadow-sm shrink-0 transition-all hover:border-emerald-400/60"
        >
          <button
            id="nav-prev-month-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviousMonth?.();
            }}
            className={`p-0.5 sm:p-1 rounded-full transition-all active:scale-90 cursor-pointer ${
              theme.isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Previous month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            id="nav-open-calendar-btn"
            type="button"
            onClick={onOpenCalendar}
            className={`flex items-center gap-1 text-xs sm:text-sm font-display font-bold tracking-tight whitespace-nowrap cursor-pointer transition-colors ${
              theme.isDark ? 'text-white hover:text-emerald-400' : 'text-slate-800 hover:text-emerald-600'
            }`}
            title="Open Calendar to select month or check history"
          >
            <Calendar className={`w-3.5 h-3.5 ${theme.accentText} hidden min-[480px]:inline-block`} />
            <span className="inline sm:hidden">{shortMonthName}</span>
            <span className="hidden sm:inline">{currentMonthName}</span>
          </button>

          <button
            id="nav-next-month-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNextMonth?.();
            }}
            className={`p-0.5 sm:p-1 rounded-full transition-all active:scale-90 cursor-pointer ${
              theme.isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Next month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Silent SMS Indicator, Notification Bell & Quick Add */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 relative">
          {silentVerificationActive && (
            <div
              id="silent-verifier-status-pill"
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full ${theme.accentBadgeBg} border ${theme.accentBadgeBorder} ${theme.accentText} text-[11px] font-medium`}
              title="Silent background SMS processor actively monitoring bank payments"
            >
              <span className="relative flex h-2 w-2">
                <span
                  style={{ backgroundColor: theme.accentColor }}
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                ></span>
                <span
                  style={{ backgroundColor: theme.accentColor }}
                  className="relative inline-flex rounded-full h-2 w-2"
                ></span>
              </span>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap font-semibold">Live SMS</span>
            </div>
          )}

          {/* Notification Bell matching screenshot */}
          <div className="relative">
            <button
              id="notification-bell-btn"
              style={{
                backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255,255,255,0.9)',
                borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(226,232,240,0.9)',
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 ${
                theme.isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span
              style={{ backgroundColor: theme.accentColor }}
              className="absolute top-0 right-0 w-2 h-2 rounded-full ring-2 ring-white"
            />
          </div>

          {/* Settings Button beside Notification Bell */}
          <button
            id="nav-header-settings-btn"
            type="button"
            onClick={() => onNavigateToPage(2)}
            style={{
              backgroundColor: currentPage === 2
                ? (theme.isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                : (theme.isDark ? theme.bgCard : 'rgba(255,255,255,0.9)'),
              borderColor: currentPage === 2
                ? theme.accentColor
                : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(226,232,240,0.9)'),
            }}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 ${
              currentPage === 2
                ? `${theme.accentText} ring-1.5 ring-emerald-500/50 font-bold`
                : theme.isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Settings & Budget Configuration"
            aria-label="Settings"
          >
            <Settings className={`w-4 h-4 ${currentPage === 2 ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          </button>

          {/* User Profile Avatar button */}
          {onOpenProfileModal && (
            <button
              id="nav-header-avatar-btn"
              type="button"
              onClick={onOpenProfileModal}
              title={`Profile: ${userProfile.name || 'Guest'} - Click to edit`}
              aria-label="User Profile"
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-1.5 ring-emerald-500/40 hover:ring-emerald-400 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 border border-slate-700/50 bg-slate-800"
            >
              <img
                src={sanitizeAvatarUrl(userProfile.avatarUrl, userProfile.name)}
                alt={userProfile.name || 'Guest'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = getDefaultAvatar(userProfile.name || 'Guest');
                }}
              />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};



