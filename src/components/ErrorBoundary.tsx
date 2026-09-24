import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { STORAGE_KEY } from '../hooks/usePersistedAppState.js';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {

    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught rendering error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleResetAndReload = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('moneytrace_theme');
      localStorage.removeItem('moneytrace_sms_permission');
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          id="error-boundary-screen"
          className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans select-none"
        >
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
            {/* ICON */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* TITLE & DESCRIPTION */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold font-display text-white tracking-tight">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Budget Bridge encountered an unexpected rendering error. Your financial data is securely saved.
              </p>
            </div>

            {/* ERROR SUMMARY */}
            {this.state.error && (
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-left">
                <p className="text-[11px] font-mono text-rose-300/90 break-words line-clamp-3">
                  {this.state.error.message || 'Unknown render exception'}
                </p>
              </div>
            )}

            {/* RECOVERY ACTION BUTTONS */}
            <div className="space-y-2.5 pt-2">
              <button
                id="error-boundary-reload-btn"
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Application
              </button>

              <button
                id="error-boundary-reset-btn"
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-700/60 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Data & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
