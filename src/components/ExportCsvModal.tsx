import React, { useState } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Users,
  Receipt,
  Filter,
} from 'lucide-react';
import { Transaction, PeerBalance, Category } from '../types.js';
import { exportDataToCsv, CsvExportOptions } from '../utils/exportToCsv.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../hooks/useToast.js';

interface ExportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  peerBalances: PeerBalance[];
  currency: string;
}

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  isOpen,
  onClose,
  transactions,
  peerBalances,
}) => {
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includePeerBalances, setIncludePeerBalances] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | 'current_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const categories: string[] = [
    'All',
    'Food',
    'Travel',
    'Bills',
    'Shopping',
    'Entertainment',
    'Health',
    'Social',
    'Other',
  ];

  // Calculate live preview counts
  let previewTxCount = transactions.length;
  if (includeTransactions) {
    if (selectedCategory !== 'All') {
      previewTxCount = transactions.filter((t) => t.category === selectedCategory).length;
    }
    if (dateRange === 'current_month') {
      const now = new Date();
      previewTxCount = transactions.filter((t) => {
        const d = new Date(t.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
    } else if (dateRange === 'custom' && (startDate || endDate)) {
      const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
      previewTxCount = transactions.filter((t) => t.timestamp >= startMs && t.timestamp <= endMs).length;
    }
  } else {
    previewTxCount = 0;
  }

  const previewPeersCount = includePeerBalances ? peerBalances.length : 0;

  const handleExport = () => {
    if (!includeTransactions && !includePeerBalances) {
      showToast('Please select at least Transactions or Peer Balances to export.', 'error');
      return;
    }

    setIsExporting(true);

    const options: CsvExportOptions = {
      includeTransactions,
      includePeerBalances,
      dateRange,
      startDate: dateRange === 'custom' ? startDate : undefined,
      endDate: dateRange === 'custom' ? endDate : undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
    };

    const result = exportDataToCsv(transactions, peerBalances, options);

    if (result.success) {
      showToast(result.message || 'CSV exported successfully!', 'success');
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } else {
      showToast(result.message || 'Export failed. Check selected filters.', 'error');
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-csv-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
        }}
        className="w-full max-w-md rounded-[28px] border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: `${theme.accentColor}20` }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="export-csv-modal-title"
                className={`text-sm sm:text-base font-bold font-display ${theme.isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Export CSV Records
              </h2>
              <p className={`text-[11px] ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Download personal transaction history & peer ledgers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar text-xs">
          {/* SECTIONS TO INCLUDE */}
          <div className="space-y-2">
            <label className={`font-bold block ${theme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Data Sections to Include
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Transactions Toggle */}
              <button
                type="button"
                id="toggle-export-transactions-btn"
                onClick={() => setIncludeTransactions((prev) => !prev)}
                style={{
                  backgroundColor: includeTransactions
                    ? `${theme.accentColor}15`
                    : theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.9)',
                  borderColor: includeTransactions
                    ? theme.accentColor
                    : theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  includeTransactions ? 'ring-1 ring-emerald-500/30' : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Receipt className={`w-4 h-4 ${includeTransactions ? theme.accentText : 'text-slate-400'}`} />
                  {includeTransactions && (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${theme.accentText}`} />
                  )}
                </div>
                <div>
                  <div className={`font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                    Transactions
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {previewTxCount} record{previewTxCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>

              {/* Peer Balances Toggle */}
              <button
                type="button"
                id="toggle-export-peers-btn"
                onClick={() => setIncludePeerBalances((prev) => !prev)}
                style={{
                  backgroundColor: includePeerBalances
                    ? `${theme.accentColor}15`
                    : theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.9)',
                  borderColor: includePeerBalances
                    ? theme.accentColor
                    : theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  includePeerBalances ? 'ring-1 ring-emerald-500/30' : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Users className={`w-4 h-4 ${includePeerBalances ? theme.accentText : 'text-slate-400'}`} />
                  {includePeerBalances && (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${theme.accentText}`} />
                  )}
                </div>
                <div>
                  <div className={`font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                    Peer Ledgers
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {previewPeersCount} friend{previewPeersCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* DATE RANGE FILTER */}
          {includeTransactions && (
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <label className={`font-bold flex items-center gap-1.5 ${theme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Transaction Timeframe</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'current_month', label: 'This Month' },
                  { id: 'custom', label: 'Custom' },
                ].map((range) => {
                  const isSel = dateRange === range.id;
                  return (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => setDateRange(range.id as any)}
                      style={{
                        backgroundColor: isSel
                          ? theme.accentColor
                          : theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.9)',
                        borderColor: isSel
                          ? 'transparent'
                          : theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold text-center border transition-all cursor-pointer ${
                        isSel ? 'text-slate-950 font-bold shadow-xs' : theme.isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Pickers */}
              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF' }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-[11px] font-medium ${
                        theme.isDark ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ backgroundColor: theme.isDark ? theme.bgCardInner : '#FFFFFF' }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-[11px] font-medium ${
                        theme.isDark ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY FILTER */}
          {includeTransactions && (
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <label className={`font-bold flex items-center gap-1.5 ${theme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Spending Category</span>
              </label>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {categories.map((cat) => {
                  const isSel = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        backgroundColor: isSel
                          ? theme.accentColor
                          : theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.9)',
                        borderColor: isSel
                          ? 'transparent'
                          : theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                        isSel ? 'text-slate-950 font-bold shadow-xs' : theme.isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* EXPORT SUMMARY BANNER */}
          <div
            style={{
              backgroundColor: theme.isDark ? `${theme.bgCardInner}a0` : 'rgba(248, 250, 252, 0.95)',
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
            }}
            className="p-3 rounded-2xl border flex items-center justify-between text-[11px]"
          >
            <span className="text-slate-400">Total Records to Export:</span>
            <span className={`font-bold font-display ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
              {previewTxCount + previewPeersCount} items (CSV with UTF-8 BOM)
            </span>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-full font-bold text-xs transition-colors cursor-pointer ${
              theme.isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>

          <button
            id="modal-confirm-export-csv-btn"
            type="button"
            disabled={isExporting || (previewTxCount + previewPeersCount === 0)}
            onClick={handleExport}
            style={{ backgroundColor: theme.accentColor }}
            className="px-5 py-2 rounded-full font-bold text-xs flex items-center gap-2 text-slate-950 shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isExporting ? 'Exporting...' : 'Download CSV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
