import { Transaction, PeerBalance } from '../types.js';

export interface CsvExportOptions {
  includeTransactions?: boolean;
  includePeerBalances?: boolean;
  dateRange?: 'all' | 'current_month' | 'custom';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  category?: string;
  customFilename?: string;
}

/**
 * Escapes a cell value for standard CSV format (RFC 4180):
 * - If string contains comma, double-quote, or newline, wraps in double-quotes.
 * - Any double quotes inside the string are escaped by doubling them ("").
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an epoch millisecond timestamp into a human-readable Date (YYYY-MM-DD)
 */
function formatDate(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-CA'); // Standard YYYY-MM-DD
}

/**
 * Formats an epoch millisecond timestamp into a human-readable Time (HH:MM:SS AM/PM)
 */
function formatTime(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

/**
 * Converts source enum into a clear, user-friendly label
 */
function formatSource(source: string): string {
  switch (source) {
    case 'sms_auto':
      return 'Automatic SMS';
    case 'ai_chat':
      return 'AI Copilot';
    case 'quick_nl':
      return 'Quick Natural Language';
    case 'manual':
      return 'Manual Entry';
    default:
      return source || 'Manual';
  }
}

/**
 * Converts transaction type into a clear label
 */
function formatTransactionType(type: string): string {
  return type === 'CREDIT' ? 'Income' : 'Expense';
}

/**
 * Converts peer balance type into a human-friendly label
 */
function formatPeerType(type: string): string {
  return type === 'OWED_TO_YOU' ? 'Owed to You' : 'You Owe';
}

/**
 * Generates the full CSV text string from transactions and peer balances with optional filters.
 * Uses a UTF-8 Byte Order Mark (BOM: \uFEFF) so Excel, Google Sheets, Apple Numbers, and LibreOffice
 * automatically detect UTF-8 encoding and display special characters cleanly.
 */
export function generateCsvContent(
  transactions: Transaction[],
  peerBalances: PeerBalance[],
  options: CsvExportOptions = {}
): string {
  const {
    includeTransactions = true,
    includePeerBalances = true,
    dateRange = 'all',
    startDate,
    endDate,
    category,
  } = options;

  const lines: string[] = [];

  // Metadata Header Block for personal record keeping
  const exportedAt = new Date();
  lines.push('=== BUDGET BRIDGE PERSONAL FINANCIAL EXPORT ===');
  lines.push(`Exported On,${escapeCsvCell(exportedAt.toISOString())}`);
  lines.push(`Exported Local Time,${escapeCsvCell(exportedAt.toLocaleString())}`);
  lines.push('');

  // ==========================================
  // SECTION 1: TRANSACTIONS
  // ==========================================
  if (includeTransactions) {
    let filteredTx = [...transactions];

    // Filter by category if specified
    if (category && category !== 'All') {
      filteredTx = filteredTx.filter((t) => t.category === category);
    }

    // Filter by date range if specified
    if (dateRange === 'current_month') {
      const now = new Date();
      filteredTx = filteredTx.filter((t) => {
        const d = new Date(t.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (dateRange === 'custom' && (startDate || endDate)) {
      const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
      filteredTx = filteredTx.filter((t) => t.timestamp >= startMs && t.timestamp <= endMs);
    }

    // Sort chronologically (newest first)
    filteredTx.sort((a, b) => b.timestamp - a.timestamp);

    lines.push('=== TRANSACTIONS HISTORY ===');
    lines.push(
      [
        'Date',
        'Time',
        'Merchant / Payee',
        'Category',
        'Type',
        'Amount',
        'Source',
        'Bank Name',
        'Account Last 4',
        'UPI Ref',
        'Verified',
      ]
        .map(escapeCsvCell)
        .join(',')
    );

    if (filteredTx.length === 0) {
      lines.push('No transactions matching the criteria');
    } else {
      for (const tx of filteredTx) {
        lines.push(
          [
            formatDate(tx.timestamp),
            formatTime(tx.timestamp),
            tx.merchant || '',
            tx.category || 'Other',
            formatTransactionType(tx.type),
            tx.amount.toFixed(2),
            formatSource(tx.source),
            tx.bankName || 'N/A',
            tx.accountLast4 || 'N/A',
            tx.upiRef || 'N/A',
            tx.isVerified ? 'Yes' : 'No',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }

    lines.push('');
    lines.push('');
  }

  // ==========================================
  // SECTION 2: PEER BALANCES & LEDGER SUMMARIES
  // ==========================================
  if (includePeerBalances) {
    lines.push('=== PEER BALANCES & LEDGER SUMMARIES ===');
    lines.push(
      [
        'Peer / Friend Name',
        'Net Status',
        'Outstanding Balance',
        'Total Given',
        'Total Received Back',
        'General Note',
        'Last Activity Date',
        'Last Activity Time',
        'Itemized Ledger History',
      ]
        .map(escapeCsvCell)
        .join(',')
    );

    if (peerBalances.length === 0) {
      lines.push('No peer balance ledgers recorded');
    } else {
      // Sort peer balances alphabetically
      const sortedPeers = [...peerBalances].sort((a, b) => a.name.localeCompare(b.name));

      for (const peer of sortedPeers) {
        // Detailed itemized ledger entries
        const itemSummary = Array.isArray(peer.items) && peer.items.length > 0
          ? peer.items
              .map((item) => {
                const dir = item.direction || (item.amount >= 0 ? 'GAVE' : 'RECEIVED');
                const date = item.date ? formatDate(item.date) : item.dateStr || '';
                const desc = item.description ? ` (${item.description})` : '';
                return `${dir} ${Math.abs(item.amount)}${desc}${date ? ` on ${date}` : ''}`;
              })
              .join('; ')
          : 'None';

        lines.push(
          [
            peer.name,
            formatPeerType(peer.type),
            peer.amount.toFixed(2),
            (peer.totalGiven ?? (peer.type === 'OWED_TO_YOU' ? peer.amount : 0)).toFixed(2),
            (peer.totalReceived ?? (peer.type === 'I_OWE' ? peer.amount : 0)).toFixed(2),
            peer.note || '',
            formatDate(peer.updatedAt),
            formatTime(peer.updatedAt),
            itemSummary,
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }
  }

  // Prepend UTF-8 BOM (\uFEFF) and join lines with standard Windows CRLF for universal spreadsheet compatibility
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Client-side file download helper.
 * Triggers a native browser download dialog using a Blob and temporary <a> tag without any server round-trip.
 * Returns true if download was triggered, or false if there was no data to export.
 */
export function exportDataToCsv(
  transactions: Transaction[],
  peerBalances: PeerBalance[],
  options: CsvExportOptions = {}
): { success: boolean; message?: string; filename?: string } {
  const incTx = options.includeTransactions !== false;
  const incPeers = options.includePeerBalances !== false;

  const totalRecords =
    (incTx ? (transactions?.length || 0) : 0) +
    (incPeers ? (peerBalances?.length || 0) : 0);

  if (totalRecords === 0) {
    return {
      success: false,
      message: 'No data matching selected options to export. Add some records or adjust filters first.',
    };
  }

  try {
    const csvString = generateCsvContent(transactions || [], peerBalances || [], options);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const defaultFilename = `budget-bridge-export-${yyyy}-${mm}-${dd}.csv`;
    const filename = (options.customFilename || defaultFilename).trim().replace(/\.csv$/i, '') + '.csv';

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const countTx = incTx ? transactions.length : 0;
    const countPeers = incPeers ? peerBalances.length : 0;
    const parts = [];
    if (incTx) parts.push(`${countTx} transaction(s)`);
    if (incPeers) parts.push(`${countPeers} peer ledger(s)`);

    return {
      success: true,
      message: `Exported ${parts.join(' and ')} to ${filename}`,
      filename,
    };
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return {
      success: false,
      message: 'Failed to generate CSV export. Please try again.',
    };
  }
}
