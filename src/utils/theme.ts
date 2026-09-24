export type ThemeId = 'pastel' | 'pastelSage' | 'pastelRose' | 'pastelLavender' | 'goldDark';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  label: string;
  icon: string;
  bgRoot: string;
  bgGradient: string;
  bgRootClass: string;
  bgCard: string;
  bgCardInner: string;
  bgCardHover: string;
  borderSubtle: string;
  borderAccent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentColor: string;
  accentText: string;
  accentTextGlow: string;
  accentGradient: string;
  accentBtnBg: string;
  accentBtnText: string;
  accentBadgeBg: string;
  accentBadgeText: string;
  accentBadgeBorder: string;
  accentShadow: string;
  progressGradient: string;
  progressShadow: string;
  isDark: boolean;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  pastel: {
    id: 'pastel',
    name: 'Pastel Gold & Sage Green (Flagship)',
    label: 'Pastel Gold',
    icon: '✨',
    bgRoot: '#FEF3C7',
    bgGradient: 'bg-gradient-to-b from-[#FEF08A] via-[#FFFBEB] to-[#DCFCE7]',
    bgRootClass: 'bg-gradient-to-b from-[#FEF08A] via-[#FFFBEB] to-[#DCFCE7]',
    bgCard: 'rgba(255, 255, 255, 0.88)',
    bgCardInner: 'rgba(248, 250, 252, 0.92)',
    bgCardHover: 'rgba(255, 255, 255, 0.98)',
    borderSubtle: 'rgba(255, 255, 255, 0.9)',
    borderAccent: 'rgba(251, 191, 36, 0.4)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accentColor: '#D97706',
    accentText: 'text-amber-700',
    accentTextGlow: 'drop-shadow-[0_0_8px_rgba(217,119,6,0.25)]',
    accentGradient: 'from-amber-300 via-yellow-200 to-emerald-300',
    accentBtnBg: 'bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300',
    accentBtnText: 'text-slate-900',
    accentBadgeBg: 'bg-amber-100/90',
    accentBadgeText: 'text-amber-800',
    accentBadgeBorder: 'border-amber-300/80',
    accentShadow: 'shadow-[0_4px_16px_rgba(245,158,11,0.25)]',
    progressGradient: 'from-amber-400 via-yellow-300 to-emerald-400',
    progressShadow: 'shadow-[0_2px_10px_rgba(245,158,11,0.3)]',
    isDark: false,
  },
  pastelSage: {
    id: 'pastelSage',
    name: 'Pastel Sage & Mint Light',
    label: 'Sage Mint',
    icon: '🌿',
    bgRoot: '#DCFCE7',
    bgGradient: 'bg-gradient-to-b from-[#DCFCE7] via-[#F0FDF4] to-[#BBF7D0]',
    bgRootClass: 'bg-gradient-to-b from-[#DCFCE7] via-[#F0FDF4] to-[#BBF7D0]',
    bgCard: 'rgba(255, 255, 255, 0.88)',
    bgCardInner: 'rgba(240, 253, 244, 0.9)',
    bgCardHover: 'rgba(255, 255, 255, 0.98)',
    borderSubtle: 'rgba(255, 255, 255, 0.9)',
    borderAccent: 'rgba(52, 211, 153, 0.4)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accentColor: '#059669',
    accentText: 'text-emerald-700',
    accentTextGlow: 'drop-shadow-[0_0_8px_rgba(5,150,105,0.25)]',
    accentGradient: 'from-emerald-300 via-teal-200 to-cyan-300',
    accentBtnBg: 'bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300',
    accentBtnText: 'text-slate-900',
    accentBadgeBg: 'bg-emerald-100/90',
    accentBadgeText: 'text-emerald-800',
    accentBadgeBorder: 'border-emerald-300/80',
    accentShadow: 'shadow-[0_4px_16px_rgba(5,150,105,0.25)]',
    progressGradient: 'from-emerald-400 via-teal-300 to-cyan-400',
    progressShadow: 'shadow-[0_2px_10px_rgba(5,150,105,0.3)]',
    isDark: false,
  },
  pastelRose: {
    id: 'pastelRose',
    name: 'Pastel Rose & Blush Light',
    label: 'Pastel Rose',
    icon: '🌸',
    bgRoot: '#FCE7F3',
    bgGradient: 'bg-gradient-to-b from-[#FDE68A] via-[#FDF2F8] to-[#FBCFE8]',
    bgRootClass: 'bg-gradient-to-b from-[#FDE68A] via-[#FDF2F8] to-[#FBCFE8]',
    bgCard: 'rgba(255, 255, 255, 0.88)',
    bgCardInner: 'rgba(253, 242, 248, 0.9)',
    bgCardHover: 'rgba(255, 255, 255, 0.98)',
    borderSubtle: 'rgba(255, 255, 255, 0.9)',
    borderAccent: 'rgba(244, 114, 182, 0.4)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accentColor: '#E11D48',
    accentText: 'text-rose-700',
    accentTextGlow: 'drop-shadow-[0_0_8px_rgba(225,29,72,0.25)]',
    accentGradient: 'from-pink-300 via-rose-200 to-amber-200',
    accentBtnBg: 'bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200',
    accentBtnText: 'text-slate-900',
    accentBadgeBg: 'bg-pink-100/90',
    accentBadgeText: 'text-pink-800',
    accentBadgeBorder: 'border-pink-300/80',
    accentShadow: 'shadow-[0_4px_16px_rgba(225,29,72,0.25)]',
    progressGradient: 'from-pink-400 via-rose-300 to-amber-300',
    progressShadow: 'shadow-[0_2px_10px_rgba(225,29,72,0.3)]',
    isDark: false,
  },
  pastelLavender: {
    id: 'pastelLavender',
    name: 'Pastel Lavender & Blue Light',
    label: 'Lavender',
    icon: '🔮',
    bgRoot: '#EDE9FE',
    bgGradient: 'bg-gradient-to-b from-[#FEF08A] via-[#F5F3FF] to-[#DDD6FE]',
    bgRootClass: 'bg-gradient-to-b from-[#FEF08A] via-[#F5F3FF] to-[#DDD6FE]',
    bgCard: 'rgba(255, 255, 255, 0.88)',
    bgCardInner: 'rgba(245, 243, 255, 0.9)',
    bgCardHover: 'rgba(255, 255, 255, 0.98)',
    borderSubtle: 'rgba(255, 255, 255, 0.9)',
    borderAccent: 'rgba(192, 132, 252, 0.4)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accentColor: '#7C3AED',
    accentText: 'text-violet-700',
    accentTextGlow: 'drop-shadow-[0_0_8px_rgba(124,58,237,0.25)]',
    accentGradient: 'from-violet-300 via-purple-200 to-sky-300',
    accentBtnBg: 'bg-gradient-to-r from-violet-300 via-purple-200 to-sky-300',
    accentBtnText: 'text-slate-900',
    accentBadgeBg: 'bg-violet-100/90',
    accentBadgeText: 'text-violet-800',
    accentBadgeBorder: 'border-violet-300/80',
    accentShadow: 'shadow-[0_4px_16px_rgba(124,58,237,0.25)]',
    progressGradient: 'from-violet-400 via-purple-300 to-sky-400',
    progressShadow: 'shadow-[0_2px_10px_rgba(124,58,237,0.3)]',
    isDark: false,
  },
  goldDark: {
    id: 'goldDark',
    name: 'Obsidian Gold Dark Mode',
    label: 'Dark Gold',
    icon: '🌙',
    bgRoot: '#080B11',
    bgGradient: 'bg-[#080B11]',
    bgRootClass: 'bg-[#080B11]',
    bgCard: '#121722',
    bgCardInner: '#0A0E17',
    bgCardHover: '#182030',
    borderSubtle: 'border-slate-800/80',
    borderAccent: 'border-amber-500/30',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    accentColor: '#F59E0B',
    accentText: 'text-amber-400',
    accentTextGlow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    accentGradient: 'from-amber-400 via-yellow-300 to-amber-500',
    accentBtnBg: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500',
    accentBtnText: 'text-slate-950',
    accentBadgeBg: 'bg-amber-500/15',
    accentBadgeText: 'text-amber-300',
    accentBadgeBorder: 'border-amber-500/30',
    accentShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    progressGradient: 'from-amber-400 via-yellow-300 to-amber-500',
    progressShadow: 'shadow-[0_0_14px_rgba(245,158,11,0.5)]',
    isDark: true,
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'pastel';

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const explicitlyChosen = localStorage.getItem('budget_bridge_theme_explicitly_chosen');
    const saved = localStorage.getItem('budget_bridge_active_theme') as ThemeId;
    if (explicitlyChosen === 'true' && saved && THEMES[saved]) return saved;
  } catch {}
  return DEFAULT_THEME_ID;
}

export function saveStoredTheme(id: ThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('budget_bridge_active_theme', id);
    localStorage.setItem('moneytrace_active_theme', id);
    localStorage.setItem('budget_bridge_theme_explicitly_chosen', 'true');
  } catch {}
}
