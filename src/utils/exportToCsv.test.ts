import { describe, it, expect } from 'vitest';
import { generateCsvContent } from './exportToCsv.js';
import { Transaction, PeerBalance } from '../types.js';

describe('exportToCsv utility', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx_1',
      amount: 450,
      category: 'Food',
      merchant: 'Swiggy "Super" Delivery',
      timestamp: 1711500000000,
      type: 'DEBIT',
      source: 'sms_auto',
      bankName: 'HDFC',
      accountLast4: '1234',
      upiRef: 'UPI-987654',
      isVerified: true,
    },
    {
      id: 'tx_2',
      amount: 1200,
      category: 'Shopping',
      merchant: 'Amazon, India',
      timestamp: 1711510000000,
      type: 'DEBIT',
      source: 'manual',
      isVerified: false,
    },
  ];

  const mockPeers: PeerBalance[] = [
    {
      id: 'p_1',
      name: 'Rahul Sharma',
      type: 'OWED_TO_YOU',
      amount: 1500,
      updatedAt: 1711505000000,
      note: 'Dinner, drinks & cab',
      items: [
        {
          id: 'item_1',
          amount: 1500,
          description: 'Dinner split',
          date: 1711500000000,
          direction: 'GAVE',
        },
      ],
    },
  ];

  it('generates CSV with UTF-8 BOM, transactions, and peer balances', () => {
    const csv = generateCsvContent(mockTransactions, mockPeers);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('=== TRANSACTIONS HISTORY ===');
    expect(csv).toContain('=== PEER BALANCES & LEDGER SUMMARIES ===');
    expect(csv).toContain('Swiggy ""Super"" Delivery'); // Escaped quotes
    expect(csv).toContain('"Amazon, India"'); // Escaped commas
    expect(csv).toContain('Rahul Sharma');
    expect(csv).toContain('Owed to You');
    expect(csv).toContain('Dinner split');
  });

  it('respects includeTransactions: false option', () => {
    const csv = generateCsvContent(mockTransactions, mockPeers, {
      includeTransactions: false,
      includePeerBalances: true,
    });
    expect(csv).not.toContain('=== TRANSACTIONS HISTORY ===');
    expect(csv).toContain('=== PEER BALANCES & LEDGER SUMMARIES ===');
    expect(csv).toContain('Rahul Sharma');
  });

  it('respects includePeerBalances: false option', () => {
    const csv = generateCsvContent(mockTransactions, mockPeers, {
      includeTransactions: true,
      includePeerBalances: false,
    });
    expect(csv).toContain('=== TRANSACTIONS HISTORY ===');
    expect(csv).not.toContain('=== PEER BALANCES & LEDGER SUMMARIES ===');
    expect(csv).not.toContain('Rahul Sharma');
  });

  it('filters transactions by category', () => {
    const csv = generateCsvContent(mockTransactions, mockPeers, {
      includeTransactions: true,
      includePeerBalances: false,
      category: 'Food',
    });
    expect(csv).toContain('Swiggy');
    expect(csv).not.toContain('Amazon, India');
  });
});
