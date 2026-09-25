import React from 'react';
import {
  Banknote,
  Building2,
  Wallet,
  Landmark,
  TrendingUp,
  Coins,
  MoreHorizontal,
} from 'lucide-react';

export type SavingsPlatformType =
  | 'CASH'
  | 'BANK'
  | 'DIGITAL_WALLET'
  | 'FIXED_DEPOSIT'
  | 'INVESTMENT'
  | 'GOLD_ASSETS'
  | 'OTHER';

export interface SavingsEntry {
  id: string;
  amount: number;
  type: SavingsPlatformType;
  customTypeLabel?: string;
  date: number; // timestamp ms
  dateStr?: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export interface SavingsPlatformMeta {
  type: SavingsPlatformType;
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  iconName: string;
}

export const SAVINGS_PLATFORMS: Record<SavingsPlatformType, SavingsPlatformMeta> = {
  CASH: {
    type: 'CASH',
    label: 'Cash',
    shortLabel: 'Cash',
    color: '#10B981', // emerald-500
    textColor: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    iconName: 'Banknote',
  },
  BANK: {
    type: 'BANK',
    label: 'Bank Account',
    shortLabel: 'Bank',
    color: '#3B82F6', // blue-500
    textColor: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-500/15',
    borderColor: 'border-blue-500/30',
    iconName: 'Building2',
  },
  DIGITAL_WALLET: {
    type: 'DIGITAL_WALLET',
    label: 'Digital Wallet (UPI / Paytm / GPay)',
    shortLabel: 'Wallet',
    color: '#8B5CF6', // purple-500
    textColor: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-500/15',
    borderColor: 'border-purple-500/30',
    iconName: 'Wallet',
  },
  FIXED_DEPOSIT: {
    type: 'FIXED_DEPOSIT',
    label: 'Fixed Deposit (FD / RD)',
    shortLabel: 'FD/RD',
    color: '#06B6D4', // cyan-500
    textColor: 'text-cyan-700 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/30',
    iconName: 'Landmark',
  },
  INVESTMENT: {
    type: 'INVESTMENT',
    label: 'Mutual Fund / Stocks / SIP',
    shortLabel: 'Investments',
    color: '#F59E0B', // amber-500
    textColor: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    iconName: 'TrendingUp',
  },
  GOLD_ASSETS: {
    type: 'GOLD_ASSETS',
    label: 'Gold / Physical Assets',
    shortLabel: 'Gold / Assets',
    color: '#EAB308', // yellow-500
    textColor: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-500/15',
    borderColor: 'border-yellow-500/30',
    iconName: 'Coins',
  },
  OTHER: {
    type: 'OTHER',
    label: 'Other Savings',
    shortLabel: 'Other',
    color: '#64748B', // slate-500
    textColor: 'text-slate-700 dark:text-slate-400',
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
    iconName: 'MoreHorizontal',
  },
};

export const INITIAL_DEMO_SAVINGS_ENTRIES: SavingsEntry[] = [
  {
    id: 'sav-demo-1',
    amount: 45000,
    type: 'BANK',
    date: Date.now() - 2 * 24 * 60 * 60 * 1000,
    dateStr: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    note: 'HDFC Savings Account balance',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'sav-demo-2',
    amount: 25000,
    type: 'INVESTMENT',
    date: Date.now() - 5 * 24 * 60 * 60 * 1000,
    dateStr: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    note: 'Nifty 50 Index Mutual Fund SIP',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'sav-demo-3',
    amount: 15000,
    type: 'FIXED_DEPOSIT',
    date: Date.now() - 12 * 24 * 60 * 60 * 1000,
    dateStr: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    note: '1-Year Emergency Fixed Deposit',
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'sav-demo-4',
    amount: 8000,
    type: 'CASH',
    date: Date.now() - 1 * 24 * 60 * 60 * 1000,
    dateStr: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    note: 'Physical cash in emergency envelope',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'sav-demo-5',
    amount: 4500,
    type: 'DIGITAL_WALLET',
    date: Date.now() - 3 * 24 * 60 * 60 * 1000,
    dateStr: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    note: 'Paytm & GPay wallet reserve',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];
