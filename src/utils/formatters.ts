import { Category, CurrencyConfig } from '../types.js';

export const CURRENCIES: Record<string, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
};

export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  const rounded = Math.round(amount * 100) / 100;
  const curr = CURRENCIES[currencyCode] || CURRENCIES.INR;

  try {
    const formattedNum = rounded.toLocaleString(currencyCode === 'INR' ? 'en-IN' : 'en-US', {
      maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
      minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    });
    return `${curr.symbol}${formattedNum}`;
  } catch {
    return `${curr.symbol}${rounded}`;
  }
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface CategoryTheme {
  bg: string;
  fg: string;
  border: string;
  badgeBg: string;
  badgeFg: string;
}

export const CATEGORY_THEMES: Record<Category, CategoryTheme> = {
  Food: {
    bg: '#FEF3C7',
    fg: '#D97706',
    border: 'rgba(245, 158, 11, 0.35)',
    badgeBg: '#FEF3C7',
    badgeFg: '#B45309',
  },
  Travel: {
    bg: '#E0F2FE',
    fg: '#0284C7',
    border: 'rgba(56, 189, 248, 0.4)',
    badgeBg: '#BAE6FD',
    badgeFg: '#0369A1',
  },
  Bills: {
    bg: '#FEF9C3',
    fg: '#CA8A04',
    border: 'rgba(234, 179, 8, 0.35)',
    badgeBg: '#FEF08A',
    badgeFg: '#854D0E',
  },
  Shopping: {
    bg: '#FDF2F8',
    fg: '#DB2777',
    border: 'rgba(244, 114, 182, 0.4)',
    badgeBg: '#FBCFE8',
    badgeFg: '#9D174D',
  },
  Entertainment: {
    bg: '#F5F3FF',
    fg: '#7C3AED',
    border: 'rgba(192, 132, 252, 0.4)',
    badgeBg: '#DDD6FE',
    badgeFg: '#5B21B6',
  },
  Health: {
    bg: '#ECFDF5',
    fg: '#059669',
    border: 'rgba(52, 211, 153, 0.4)',
    badgeBg: '#A7F3D0',
    badgeFg: '#065F46',
  },
  Social: {
    bg: '#F0FDF4',
    fg: '#16A34A',
    border: 'rgba(34, 197, 94, 0.4)',
    badgeBg: '#DCFCE7',
    badgeFg: '#15803D',
  },
  Other: {
    bg: '#F1F5F9',
    fg: '#64748B',
    border: 'rgba(148, 163, 184, 0.35)',
    badgeBg: '#E2E8F0',
    badgeFg: '#334155',
  },
};
