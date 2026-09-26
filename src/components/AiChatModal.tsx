import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  Sparkles,
  Check,
  Receipt,
  Users,
} from 'lucide-react';
import { BudgetBridgeAppIcon } from './BudgetBridgeAppIcon.js';
import {
  AgentChatMessage,
  BudgetContext,
  Category,
  ChatProposal,
  PeerBalance,
  PeerBalanceType,
  TransactionType,
  UserProfile,
} from '../types.js';
import { formatCurrency } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../hooks/useToast.js';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetContext: BudgetContext;
  userName?: string;
  userProfile?: UserProfile;
  onAddTransaction: (tx: {
    amount: number;
    type: TransactionType;
    merchant: string;
    category: Category;
  }) => void;
  onAddPeerBalance?: (peer: {
    name: string;
    type: PeerBalanceType;
    amount: number;
    note?: string;
    direction?: 'GAVE' | 'RECEIVED';
    dateStr?: string;
    directPeer?: PeerBalance;
  }) => void;
}

// Formats assistant replies to mention "Hi <displayName>, <remaining message>"
// (Preserves exact ledger profile formats and clarifying questions without greeting prefix)
export function formatAssistantReply(reply: string, displayName: string): string {
  const trimmed = (reply || '').trim();
  if (!trimmed) return `Hi ${(displayName || 'Guest').trim()}, how can I help you today?`;

  // NEVER add greeting prefix to exact ledger profile format or ledger prompts
  if (
    (trimmed.includes('You gave: ₹') && trimmed.includes('Received back: ₹') && trimmed.includes('Pending: ')) ||
    trimmed.startsWith('No transactions found for ') ||
    trimmed.startsWith('Who was this with?') ||
    trimmed.startsWith('Did you give ₹')
  ) {
    return trimmed;
  }

  const name = (displayName || 'Guest').trim();
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingWithTargetName = new RegExp(`^(?:hi\\s+there|hello\\s+there|hey\\s+there|hi|hello|hey)\\s+${escapedName}\\b[,!.:]?\\s*`, 'i');

  if (existingWithTargetName.test(trimmed)) {
    const rest = trimmed.replace(existingWithTargetName, '').trim();
    if (!rest) return `Hi ${name}!`;
    const cleanRest = rest.charAt(0).toUpperCase() + rest.slice(1);
    return `Hi ${name}, ${cleanRest}`;
  }

  // Strip generic greeting pattern
  const otherGreetingPattern = /^(?:hi\\s+there|hello\\s+there|hey\\s+there|hi|hello|hey|greetings)(?:\\s+[a-zA-Z0-9_]+)?\\s*[,!.:]?\\s*/i;
  let remaining = trimmed;
  if (otherGreetingPattern.test(trimmed)) {
    remaining = trimmed.replace(otherGreetingPattern, '').trim();
  }

  if (!remaining) {
    return `Hi ${name}!`;
  }

  const cleanRemaining = remaining.charAt(0).toUpperCase() + remaining.slice(1);
  return `Hi ${name}, ${cleanRemaining}`;
}

export const AiChatModal: React.FC<AiChatModalProps> = ({
  isOpen,
  onClose,
  budgetContext,
  userName,
  userProfile,
  onAddTransaction,
  onAddPeerBalance,
}) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const displayName = (
    userName ||
    userProfile?.name ||
    budgetContext?.userName ||
    budgetContext?.userProfile?.name ||
    'Guest'
  ).trim();

  // Local running peer ledger state for real-time conversation continuity
  const [sessionPeers, setSessionPeers] = useState<PeerBalance[]>(() => budgetContext?.peerBalances || []);

  useEffect(() => {
    if (budgetContext?.peerBalances) {
      setSessionPeers(budgetContext.peerBalances);
    }
  }, [budgetContext?.peerBalances]);

  const [messages, setMessages] = useState<AgentChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: formatAssistantReply(
        "I am your personal finance assistant 👋 I track money lent and borrowed with friends, maintain running ledgers, and manage your daily budget.\n\nTry typing 'I gave Rahul 2000', 'Rahul paid me back 1000', or 'show Rahul' to view his ledger.",
        displayName
      ),
      timestamp: Date.now(),
    },
  ]);

  // Keep initial welcome message synced with current display name if untouched
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-msg') {
        return [
          {
            ...prev[0],
            text: formatAssistantReply(
              "I am your personal finance assistant 👋 I track money lent and borrowed with friends, maintain running ledgers, and manage your daily budget.\n\nTry typing 'I gave Rahul 2000', 'Rahul paid me back 1000', or 'show Rahul' to view his ledger.",
              displayName
            ),
          },
        ];
      }
      return prev;
    });
  }, [displayName]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat feed
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    'I gave Rahul 2000',
    'Rahul paid me back 1000',
    'show Rahul',
    'I lent Priya 500 for lunch',
    'show Priya',
    'Spent 200 on lunch',
    'What is my total monthly expenditure?',
  ];

  // Helper to confirm a pending proposal
  const handleConfirmProposal = (msgId: string, proposal: ChatProposal) => {
    if (proposal.status !== 'PENDING') return;

    if (proposal.type === 'TRANSACTION') {
      onAddTransaction(proposal.data);
      showToast(`Logged transaction: ${proposal.summaryText}`, 'success');
    } else if (proposal.type === 'PEER_DEBT' && onAddPeerBalance) {
      onAddPeerBalance(proposal.data);
      showToast(`Recorded balance: ${proposal.summaryText}`, 'success');
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.proposal
          ? {
              ...m,
              proposal: {
                ...m.proposal,
                status: 'CONFIRMED' as const,
              },
            }
          : m
      )
    );
  };


  // Helper to cancel a pending proposal
  const handleCancelProposal = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.proposal
          ? {
              ...m,
              proposal: {
                ...m.proposal,
                status: 'CANCELLED' as const,
              },
            }
          : m
      )
    );
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    setInputText('');
    const userMsgId = `user-${Date.now()}`;
    const userMsg: AgentChatMessage = {
      id: userMsgId,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    // Check for conversational confirmation of latest pending proposal
    const lower = textToSend.toLowerCase();
    const isExplicitYes = /^(yes|y|confirm|ok|okay|yep|sure|do it|save|log it)$/i.test(lower);
    const isExplicitNo = /^(no|n|cancel|stop|nevermind|don't|dont|skip)$/i.test(lower);

    const latestPendingMsg = [...messages].reverse().find((m) => m.proposal && m.proposal.status === 'PENDING');

    if (latestPendingMsg && latestPendingMsg.proposal && (isExplicitYes || isExplicitNo)) {
      setMessages((prev) => [...prev, userMsg]);
      if (isExplicitYes) {
        handleConfirmProposal(latestPendingMsg.id, latestPendingMsg.proposal);
        const ackMsg: AgentChatMessage = {
          id: `assistant-ack-${Date.now()}`,
          role: 'assistant',
          text: formatAssistantReply(`Confirmed and logged ${latestPendingMsg.proposal.summaryText}!`, displayName),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, ackMsg]);
      } else {
        handleCancelProposal(latestPendingMsg.id);
        const ackMsg: AgentChatMessage = {
          id: `assistant-ack-${Date.now()}`,
          role: 'assistant',
          text: formatAssistantReply('Cancelled — nothing was logged.', displayName),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, ackMsg]);
      }
      return;
    }

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          budgetContext: {
            ...budgetContext,
            peerBalances: sessionPeers,
            financialHealth: budgetContext?.financialHealth,
          },
          userName: displayName,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawReplyText = data.reply || 'Processed your request.';
      const replyText = formatAssistantReply(rawReplyText, displayName);

      // If a peer balance was logged or updated in running ledger
      if (data.peerLedger?.peer) {
        const updatedPeer: PeerBalance = data.peerLedger.peer;
        setSessionPeers((prev) => {
          const normName = updatedPeer.name.trim().toLowerCase();
          const idx = prev.findIndex((p) => p.name.trim().toLowerCase() === normName);
          if (idx >= 0) {
            const nextList = [...prev];
            nextList[idx] = updatedPeer;
            return nextList;
          }
          return [updatedPeer, ...prev];
        });

        if (onAddPeerBalance) {
          onAddPeerBalance({
            directPeer: updatedPeer,
            name: updatedPeer.name,
            type: updatedPeer.type,
            amount: updatedPeer.amount,
          });
        }
      }

      const assistantMsg: AgentChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: Date.now(),
        mode: data.mode,
        intentCategory: data.intentCategory,
        proposal: data.proposal,
        peerLedger: data.peerLedger,
        queryDetails: data.queryDetails,
        engine: data.engine,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.warn('Backend assistant request failed:', err);
      showToast('Unable to reach AI assistant server. Switched to offline mode.', 'error');
      const errMsg: AgentChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        text: formatAssistantReply("I couldn't reach the AI server right now. Try typing an expense directly like 'Spent 150 on coffee'.", displayName),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      id="ai-chat-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="ai-chat-modal-card"
        style={{
          backgroundColor: theme.isDark ? theme.bgCard : 'rgba(255, 255, 255, 0.98)',
          borderColor: theme.isDark ? theme.borderSubtle : 'rgba(226, 232, 240, 0.95)',
        }}
        className="w-full max-w-lg h-[560px] max-h-[88vh] border rounded-[28px] shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl animate-scale-up"
      >
        {/* Header with Budget Bridge branding & Close Button */}
        <div
          id="chat-modal-header"
          style={{
            backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
          }}
          className="p-4 border-b flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <BudgetBridgeAppIcon size="sm" title="Budget Bridge" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#1E293B] rounded-full shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm sm:text-base font-bold font-display tracking-tight ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                  Budget Bridge
                </h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold ${theme.accentBadgeBg} ${theme.accentBadgeText} rounded-full border ${theme.accentBadgeBorder} flex items-center gap-1`}>
                  <Sparkles className="w-2.5 h-2.5" />
                  Two-Layer Verified
                </span>
              </div>
              <p className={`text-[11px] ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Chat, Ask budgets & Confirm before logging
              </p>
            </div>
          </div>

          <button
            id="close-ai-chat-modal-btn"
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              theme.isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Close AI Assistant"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Quick Prompt Carousel Chips */}
        <div
          style={{
            backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.8)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)',
          }}
          className="p-2.5 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
        >
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              style={{
                backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] border whitespace-nowrap transition-colors flex items-center gap-1 shadow-xs cursor-pointer ${
                theme.isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Message History Feed */}
        <div
          id="chat-modal-messages-feed"
          style={{
            backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
          }}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0 text-xs"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                    isUser
                      ? `${theme.accentBtnBg} ${theme.accentBtnText} font-bold shadow-xs`
                      : theme.isDark
                      ? `bg-[#0D1117] border border-slate-800 ${theme.accentText}`
                      : `bg-slate-100 border border-slate-200 ${theme.accentText}`
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                    isUser
                      ? `${theme.accentBtnBg} ${theme.accentBtnText} font-semibold rounded-tr-none shadow-xs ${theme.accentShadow}`
                      : theme.isDark
                      ? 'bg-[#0D1117] border border-slate-800 text-slate-200 rounded-tl-none shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-xs sm:text-[13px]">{msg.text}</p>

                  {/* ═══════════════════════════════════════════════════════
                      LAYER 2 CONFIRMATION CARD (Pending / Confirmed / Cancelled)
                      ═══════════════════════════════════════════════════════ */}
                  {msg.proposal && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/40">
                      {msg.proposal.status === 'PENDING' && (
                        <div
                          className={`p-3 rounded-xl border ${
                            theme.isDark
                              ? 'bg-slate-900/90 border-amber-500/30 text-slate-200'
                              : 'bg-amber-50/80 border-amber-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              {msg.proposal.type === 'TRANSACTION' ? (
                                <Receipt className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                              )}
                              <span className="font-bold text-xs">
                                {msg.proposal.type === 'TRANSACTION'
                                  ? 'Proposed Transaction'
                                  : 'Proposed Peer Balance'}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              Confirmation Required
                            </span>
                          </div>

                          {/* Proposal Details Pill */}
                          <div
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] mb-3 flex items-center justify-between ${
                              theme.isDark ? 'bg-slate-800/80' : 'bg-white/80 border border-slate-200'
                            }`}
                          >
                            {msg.proposal.type === 'TRANSACTION' ? (
                              <>
                                <span className="font-semibold">{msg.proposal.data.merchant}</span>
                                <span className="text-slate-400">({msg.proposal.data.category})</span>
                                <span className="font-bold text-emerald-500">
                                  {formatCurrency(msg.proposal.data.amount, budgetContext.currency)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">{msg.proposal.data.name}</span>
                                <span className="text-slate-400">
                                  {msg.proposal.data.type === 'OWED_TO_YOU' ? 'owes you' : 'you owe'}
                                </span>
                                <span className="font-bold text-emerald-500">
                                  {formatCurrency(msg.proposal.data.amount, budgetContext.currency)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              id={`confirm-proposal-btn-${msg.id}`}
                              onClick={() => handleConfirmProposal(msg.id, msg.proposal!)}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${theme.accentBtnBg} ${theme.accentBtnText} hover:brightness-105`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Confirm & Log</span>
                            </button>

                            <button
                              id={`cancel-proposal-btn-${msg.id}`}
                              onClick={() => handleCancelProposal(msg.id)}
                              className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                                theme.isDark
                                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.proposal.status === 'CONFIRMED' && (
                        <div
                          className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-semibold ${
                            theme.isDark
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>
                            {msg.proposal.type === 'TRANSACTION'
                              ? `Logged ${formatCurrency(msg.proposal.data.amount, budgetContext.currency)} at ${msg.proposal.data.merchant} (${msg.proposal.data.category})`
                              : `${msg.proposal.data.type === 'OWED_TO_YOU' ? 'Logged: ' + msg.proposal.data.name + ' owes you' : 'Logged: You owe ' + msg.proposal.data.name} ${formatCurrency(msg.proposal.data.amount, budgetContext.currency)}`}
                          </span>
                        </div>
                      )}

                      {msg.proposal.status === 'CANCELLED' && (
                        <div
                          className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-semibold ${
                            theme.isDark
                              ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Cancelled — nothing was logged to your records.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className={`flex items-center gap-2 text-xs pl-9 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Loader2 className={`w-4 h-4 animate-spin ${theme.accentText}`} />
              <span className="text-xs">Analyzing financial data...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar at Bottom */}
        <div
          id="chat-modal-input-bar"
          style={{
            backgroundColor: theme.isDark ? theme.bgCardInner : 'rgba(248, 250, 252, 0.95)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
          }}
          className="p-3 sm:p-4 border-t flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            id="chat-text-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask AI, 'Spent 200 on lunch' or 'Rahul owes me 500'..."
            style={{
              backgroundColor: theme.isDark ? theme.bgCard : '#FFFFFF',
            }}
            className={`flex-1 px-4 py-2.5 border rounded-full text-xs sm:text-sm focus:outline-none transition-colors shadow-xs ${
              theme.isDark
                ? 'border-slate-800 text-white placeholder-slate-500 focus:border-amber-400'
                : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400'
            }`}
          />

          <button
            id="chat-send-btn"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={`p-3 rounded-full ${theme.accentBtnBg} ${theme.accentBtnText} hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all shadow-sm ${theme.accentShadow} shrink-0 cursor-pointer`}
            title="Send message"
            aria-label="Send"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChatModal;
