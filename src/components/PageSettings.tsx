import React, { useState } from 'react';
import {
  Save,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Palette,
  Check,
  Sparkles,
  User,
  Camera,
  Link,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency, CURRENCIES } from '../utils/formatters.js';
import { BudgetBridgeAppIcon } from './BudgetBridgeAppIcon.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../hooks/useToast.js';
import { UserProfile } from '../types.js';
import { getDefaultAvatar, sanitizeAvatarUrl } from '../utils/avatar.js';

interface PageSettingsProps {
  monthlyCap: number;
  dailyLimit: number;
  currency: string;
  smsPermissionGranted: boolean;
  userProfile?: UserProfile;
  onUpdateUserProfile?: (profile: UserProfile) => void;
  onOpenProfileModal?: () => void;
  onUpdateBudget: (caps: { monthlyCap: number; dailyLimit: number }) => void;
  onUpdateCurrency: (currency: string) => void;
  onToggleSmsPermission: (granted: boolean) => void;
  onSimulateIncomingSms: (smsText: string, sender: string) => Promise<any>;
  onResetData: () => void;
  onNavigateToPage: (pageIndex: number) => void;
  onGoBack?: () => void;
}

export const PageSettings: React.FC<PageSettingsProps> = ({
  monthlyCap,
  dailyLimit,
  currency,
  smsPermissionGranted,
  userProfile = { name: 'Guest', avatarUrl: getDefaultAvatar('Guest') },
  onUpdateUserProfile,
  onOpenProfileModal,
  onUpdateBudget,
  onUpdateCurrency,
  onToggleSmsPermission,
  onSimulateIncomingSms,
  onResetData,
  onGoBack,
}) => {
  const { theme, themeId, setThemeId, availableThemes } = useTheme();
  const { showToast } = useToast();
  const [tempMonthlyCap, setTempMonthlyCap] = useState(monthlyCap.toString());
  const [tempDailyLimit, setTempDailyLimit] = useState(dailyLimit.toString());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // SMS Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLog, setSimLog] = useState<{
    status: 'payment' | 'discarded';
    message: string;
    details?: any;
  } | null>(null);

  const curr = CURRENCIES[currency] || CURRENCIES.INR;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(tempMonthlyCap);
    const d = parseFloat(tempDailyLimit);
    if (!isNaN(m) && m >= 0 && !isNaN(d) && d >= 0) {
      onUpdateBudget({ monthlyCap: m, dailyLimit: d });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      showToast('Please enter non-negative numbers for monthly cap and daily limit.', 'error');
    }
  };

  const handleRunPreset = async (presetText: string, senderName: string) => {
    setIsSimulating(true);
    setSimLog(null);
    try {
      const res = await onSimulateIncomingSms(presetText, senderName);
      if (res && res.is_payment) {
        const msg = `Silently verified: ${formatCurrency(res.amount, currency)} at ${res.merchant} (${res.category}).`;
        setSimLog({
          status: 'payment',
          message: `${msg} Updated Page 1 & 2!`,
          details: res,
        });
        showToast(msg, 'success');
      } else {
        const isLocalFilter = res?.engine === 'local_privacy_filter';
        const msg = isLocalFilter
          ? `Sensitive OTP/Login Code intercepted locally on-device. Zero network transmission & safely discarded.`
          : `Non-payment SMS detected (Non-financial). Message was safely discarded with no changes.`;
        setSimLog({
          status: 'discarded',
          message: msg,
          details: res,
        });
        showToast(isLocalFilter ? 'Sensitive OTP/PIN discarded locally.' : 'Non-financial SMS discarded.', 'info');
      }
    } catch (err: any) {
      console.warn('SMS simulation error:', err);
      const errMsg = `Error simulating SMS: ${err?.message || 'Verification failed'}`;
      setSimLog({
        status: 'discarded',
        message: errMsg,
      });
      showToast(errMsg, 'error');
    } finally {
      setIsSimulating(false);
    }
  };


  return (
    <section
      id="page-3-settings"
      className="w-full max-w-4xl mx-auto flex flex-col px-1 sm:px-4 py-1 select-none space-y-3.5 sm:space-y-4"
    >
      <div className="space-y-3 sm:space-y-3.5 flex flex-col">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onGoBack && (
            <button
              id="settings-page-back-arrow-btn"
              type="button"
              onClick={onGoBack}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs group shrink-0 ${
                theme.isDark
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-white border-slate-700/80 hover:border-emerald-500/50'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-emerald-500/50 shadow-sm'
              }`}
              title="Go back to previous page"
              aria-label="Previous page"
            >
              <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] transition-transform group-hover:-translate-x-0.5 ${theme.accentText}`} />
            </button>
          )}
          <div>
            <h1 className={`text-lg sm:text-xl font-bold font-display tracking-tight ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              Budget Settings & Permissions
            </h1>
            <p className={`text-[11px] sm:text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Configure profile, spending limits, background Android SMS verification, and currency
            </p>
          </div>
        </div>

        {/* 1. USER PROFILE & AVATAR SETTINGS */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[24px] border p-3.5 sm:p-4 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              <User className={`w-4 h-4 ${theme.accentText}`} />
              User Profile & Avatar
            </h2>
            <button
              onClick={onOpenProfileModal}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${theme.accentBadgeBg} ${theme.accentBadgeText} border ${theme.accentBadgeBorder} hover:brightness-105 transition-all flex items-center gap-1 shadow-xs`}
            >
              <Camera className="w-3 h-3" />
              Change Photo
            </button>
          </div>

          <div
            style={{
              backgroundColor: theme.isDark ? '#080C16' : 'rgba(248, 250, 252, 0.95)',
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
            }}
            className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-[20px] border shadow-xs"
          >
            {/* Circular Border Avatar */}
            <div
              id="settings-avatar-preview"
              onClick={onOpenProfileModal}
              style={{ borderColor: theme.accentColor }}
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-amber-400/50 bg-slate-800 shrink-0 shadow-md cursor-pointer transition-all hover:scale-105"
              title="Click to edit avatar"
            >
              <img
                src={sanitizeAvatarUrl(userProfile.avatarUrl, userProfile.name)}
                alt={userProfile.name || 'User Profile Avatar'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = getDefaultAvatar(userProfile.name);
                }}
              />
              <div
                style={{
                  background: `linear-gradient(to top right, ${theme.accentColor}33, transparent)`,
                }}
                className="absolute inset-0 pointer-events-none"
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className={`text-xs sm:text-sm font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  {userProfile.name || 'Guest'}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${
                  theme.isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  Active Profile
                </span>
              </div>
              <p className={`text-[11px] truncate max-w-full ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {userProfile.avatarUrl && !userProfile.avatarUrl.startsWith('data:image/svg+xml') ? 'Custom Photo Uploaded' : 'Default Guest Avatar'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenProfileModal}
                className={`px-3.5 py-2 rounded-full ${theme.accentBtnBg} ${theme.accentBtnText} text-xs font-bold transition-all shadow-xs ${theme.accentShadow} hover:brightness-105 flex items-center gap-1.5`}
              >
                <Camera className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* 2. BUDGET LIMIT CONTROLS */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[24px] border p-3.5 sm:p-4 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              <span
                style={{ backgroundColor: theme.accentColor }}
                className="w-2 h-2 rounded-full shadow-xs"
              />
              Spending Caps
            </h2>
            {saveSuccess && (
              <span className={`text-xs ${theme.accentText} flex items-center gap-1 font-semibold`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Updated!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBudget} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-medium mb-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Monthly Expenditure Cap
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {curr.symbol}
                </span>
                <input
                  id="settings-monthly-cap-input"
                  type="number"
                  required
                  value={tempMonthlyCap}
                  onChange={(e) => setTempMonthlyCap(e.target.value)}
                  style={{
                    backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
                  }}
                  className={`w-full pl-8 pr-3 py-2 border rounded-full font-semibold text-xs sm:text-sm focus:outline-none transition-colors shadow-xs ${
                    theme.isDark
                      ? 'border-slate-800 text-white focus:border-amber-400'
                      : 'border-slate-200 text-slate-900 focus:border-amber-400'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-medium mb-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Daily Spend Limit
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {curr.symbol}
                </span>
                <input
                  id="settings-daily-limit-input"
                  type="number"
                  required
                  value={tempDailyLimit}
                  onChange={(e) => setTempDailyLimit(e.target.value)}
                  style={{
                    backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
                  }}
                  className={`w-full pl-8 pr-3 py-2 border rounded-full font-semibold text-xs sm:text-sm focus:outline-none transition-colors shadow-xs ${
                    theme.isDark
                      ? 'border-slate-800 text-white focus:border-amber-400'
                      : 'border-slate-200 text-slate-900 focus:border-amber-400'
                  }`}
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                id="save-budget-settings-btn"
                className={`px-4 py-2.5 ${theme.accentBtnBg} hover:brightness-105 ${theme.accentBtnText} font-bold text-xs sm:text-sm rounded-full flex items-center gap-1.5 shadow-sm ${theme.accentShadow} transition-all active:scale-95 shrink-0 whitespace-nowrap`}
              >
                <Save className="w-4 h-4" />
                <span className="whitespace-nowrap font-bold">Save Limits</span>
              </button>
            </div>
          </form>
        </div>

        {/* 3. BANK SMS PERMISSIONS & SILENT BACKGROUND ENGINE */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[24px] border p-3.5 sm:p-4 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <h2 className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                <ShieldCheck className={`w-4 h-4 shrink-0 ${theme.accentText}`} />
                <span>Native Android SMS Receiver & Background Verifier</span>
              </h2>
              <p className={`text-[11px] mt-0.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                OTP and sensitive codes are filtered on-device and never transmitted, even to our AI parser.
              </p>
            </div>

            {/* Permission Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="toggle-sms-permission-btn"
                onClick={() => onToggleSmsPermission(!smsPermissionGranted)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all shadow-xs shrink-0 whitespace-nowrap ${
                  smsPermissionGranted
                    ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText}`
                    : 'bg-rose-100 border-rose-300 text-rose-700'
                }`}
              >
                {smsPermissionGranted ? '● Permissions Granted' : '○ Permissions Denied'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div
              style={{
                backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
              }}
              className="p-2.5 rounded-[20px] border flex items-center justify-between shadow-xs"
            >
              <span className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>RECEIVE_SMS Permission</span>
              <span className={`${theme.accentText} font-semibold flex items-center gap-1`}>
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
            <div
              style={{
                backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
              }}
              className="p-2.5 rounded-[20px] border flex items-center justify-between shadow-xs"
            >
              <span className={theme.isDark ? 'text-slate-300' : 'text-slate-700'}>READ_SMS Permission</span>
              <span className={`${theme.accentText} font-semibold flex items-center gap-1`}>
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
          </div>

          {/* SILENT SIMULATION TESTER */}
          <div
            style={{
              backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
            }}
            className="p-3.5 rounded-[20px] border space-y-2.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Smartphone className={`w-3.5 h-3.5 ${theme.accentText}`} />
                Silent SMS Simulator (Test in Real-Time)
              </span>
              <span className={`text-[10px] ${theme.accentText} font-semibold`}>Gemini AI Parser</span>
            </div>

            <p className={`text-[11px] ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Click a preset to simulate an incoming bank SMS. Valid debits silently update Page 1 & 2 without showing raw SMS popups:
            </p>

            {/* Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                id="test-sms-canara-btn"
                onClick={() =>
                  handleRunPreset(
                    'Rs 340.00 debited from Canara Bank A/c ...4310 on 28-Aug-2026 to Swiggy UPI. Bal: Rs 14,200.00.',
                    'CANBNK'
                  )
                }
                disabled={isSimulating}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
                }}
                className="p-2.5 rounded-[16px] hover:brightness-105 text-left border transition-colors text-xs space-y-0.5 shadow-xs"
              >
                <div className={`font-semibold flex items-center justify-between ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>Canara Bank UPI (Debit)</span>
                  <span className={`${theme.accentText} font-bold`}>₹340</span>
                </div>
                <div className={`text-[10px] truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Swiggy Food Payment</div>
              </button>

              <button
                id="test-sms-hdfc-btn"
                onClick={() =>
                  handleRunPreset(
                    'Alert: Rs 1,499.00 spent on HDFC Bank Card ending 4082 at Reliance Digital on 28-Aug-2026.',
                    'HDFCBK'
                  )
                }
                disabled={isSimulating}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
                }}
                className="p-2.5 rounded-[16px] hover:brightness-105 text-left border transition-colors text-xs space-y-0.5 shadow-xs"
              >
                <div className={`font-semibold flex items-center justify-between ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>HDFC Card Debit</span>
                  <span className={`${theme.accentText} font-bold`}>₹1,499</span>
                </div>
                <div className={`text-[10px] truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Reliance Digital Shopping</div>
              </button>

              <button
                id="test-sms-sbi-btn"
                onClick={() =>
                  handleRunPreset(
                    'Dear SBI User, A/C 9812 debited by Rs 220.00 on 28Aug26 transfer to Uber Ref 908172.',
                    'SBINB'
                  )
                }
                disabled={isSimulating}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
                }}
                className="p-2.5 rounded-[16px] hover:brightness-105 text-left border transition-colors text-xs space-y-0.5 shadow-xs"
              >
                <div className={`font-semibold flex items-center justify-between ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>SBI UPI Debit</span>
                  <span className={`${theme.accentText} font-bold`}>₹220</span>
                </div>
                <div className={`text-[10px] truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Uber Travel Ride</div>
              </button>

              <button
                id="test-sms-otp-btn"
                onClick={() =>
                  handleRunPreset(
                    'Your Canara Bank OTP is 492019 for login authentication. Valid for 5 mins. Do NOT share.',
                    'CANBNK'
                  )
                }
                disabled={isSimulating}
                style={{
                  backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
                }}
                className="p-2.5 rounded-[16px] hover:brightness-105 text-left border transition-colors text-xs space-y-0.5 shadow-xs"
              >
                <div className={`font-semibold flex items-center justify-between ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>Bank Login OTP / PIN</span>
                  <span className="text-emerald-500 font-bold flex items-center gap-0.5 text-[10px]">
                    <ShieldCheck className="w-3 h-3" />
                    Filtered Locally
                  </span>
                </div>
                <div className={`text-[10px] truncate ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Zero Network Transmission</div>
              </button>
            </div>

            {/* Real-time simulation feedback banner */}
            {simLog && (
              <div
                id="silent-simulation-feedback-log"
                className={`p-3 rounded-full text-xs border flex items-center gap-2 shadow-xs ${
                  simLog.status === 'payment'
                    ? `${theme.accentBadgeBg} ${theme.accentBadgeBorder} ${theme.accentBadgeText}`
                    : theme.isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {simLog.status === 'payment' ? (
                  <CheckCircle2 className={`w-4 h-4 ${theme.accentText} shrink-0`} />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="truncate">
                  <span className="font-bold mr-1">
                    {simLog.status === 'payment' ? 'Payment Verified Silently:' : 'Non-Payment Discarded:'}
                  </span>
                  <span>{simLog.message}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. THEME & VISUAL IDENTITY */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[24px] border p-3.5 sm:p-4 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              <Palette className={`w-4 h-4 ${theme.accentText}`} />
              Theme & Aesthetic
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.accentBadgeBg} ${theme.accentBadgeText} border ${theme.accentBadgeBorder}`}>
              {theme.label} Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableThemes.map((t) => {
              const isSelected = themeId === t.id;
              return (
                <button
                  key={t.id}
                  id={`theme-select-btn-${t.id}`}
                  onClick={() => setThemeId(t.id)}
                  style={{
                    backgroundColor: t.bgCard,
                    borderColor: isSelected ? t.accentColor : (theme.isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.9)'),
                    boxShadow: isSelected ? `0 0 0 2px ${t.accentColor}55, 0 4px 12px ${t.accentColor}25` : undefined,
                  }}
                  className={`p-2.5 rounded-[20px] border text-left flex items-center justify-between transition-all shadow-xs ${
                    isSelected ? 'shadow-sm' : 'hover:border-slate-400 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{t.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${t.isDark ? 'text-white' : 'text-slate-950'}`}>
                        {t.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          style={{ backgroundColor: t.bgRoot }}
                          className="w-3 h-3 rounded-full border border-slate-300 shrink-0 shadow-xs"
                          title="Background"
                        />
                        <span
                          style={{ backgroundColor: t.accentColor }}
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          title="Accent"
                        />
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      style={{ backgroundColor: t.accentColor }}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-slate-950 font-bold shrink-0 ml-1 shadow-xs"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. APP ICON & VISUAL IDENTITY */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[24px] border p-3.5 sm:p-4 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Budget Bridge App Icon
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
              Active Visual Identity
            </span>
          </div>

          <div
            style={{
              backgroundColor: theme.isDark ? '#080C16' : 'rgba(248, 250, 252, 0.95)',
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
            }}
            className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-[20px] border shadow-xs"
          >
            {/* Visual Icon Live Component */}
            <div className="shrink-0 flex items-center justify-center p-1">
              <BudgetBridgeAppIcon
                size="xl"
                variant="hybrid"
              />
            </div>

            {/* Description matching exact prompt specifications */}
            <div className="space-y-1.5 text-left min-w-0">
              <div className={`text-xs font-bold flex items-center gap-2 ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>Bridge Arch & Golden Rupee Coin</span>
                <span className={`text-[10px] font-normal ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  (Teal to Emerald Gradient)
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <strong className="text-emerald-600 font-semibold">Visual:</strong> Diagonal gradient from teal (<code className="text-teal-600 font-mono text-[10px]">#0F766E</code>) to emerald green (<code className="text-emerald-600 font-mono text-[10px]">#10B981</code>), featuring a simplified bridge arch shape in lighter green, and a gold (<code className="text-amber-500 font-mono text-[10px]">#FBBF24</code>) circular coin sitting on top of the arch with a rupee (₹) symbol in dark navy (<code className="text-slate-400 font-mono text-[10px]">#0F172A</code>).
              </p>
              <p className={`text-[11px] leading-relaxed ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <strong className="text-emerald-500 font-semibold">Tagline:</strong> Connect Today. A Brighter Tomorrow.
              </p>
            </div>
          </div>
        </div>

        {/* 6. PREFERENCES */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          }}
          className="rounded-[24px] border p-3.5 sm:p-4 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <h2 className={`text-xs sm:text-sm font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>Preferences</h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className={`text-xs font-medium ${theme.isDark ? 'text-slate-300' : 'text-slate-800'}`}>Display Currency</div>
              <div className={`text-[11px] ${theme.isDark ? 'text-slate-500' : 'text-slate-500'}`}>Format all spending counters and limits</div>
            </div>

            <select
              id="currency-selector"
              value={currency}
              onChange={(e) => onUpdateCurrency(e.target.value)}
              style={{
                backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
              }}
              className={`border rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors shadow-xs ${
                theme.isDark
                  ? 'border-slate-800 text-white focus:border-amber-400'
                  : 'border-slate-200 text-slate-900 focus:border-amber-400'
              }`}
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol} {c.code})
                </option>
              ))}
            </select>
          </div>

          <div className={`pt-2 border-t flex items-center justify-between ${theme.isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <span className={`text-[11px] ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>Sample Data</span>
            <button
              id="reset-sample-data-btn"
              onClick={onResetData}
              style={{
                backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF',
              }}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs ${
                theme.isDark
                  ? 'hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                  : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Sample Data</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PageSettings;
